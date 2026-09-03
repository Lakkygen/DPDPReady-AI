// src/team/coordinator.js

import {
  getBotConfigs
} from "../telegram/bots.js";

import {
  formatAgentMessage,
  truncateTelegramText
} from "../telegram/formatting.js";

import {
  selectParticipants
} from "./participantSelector.js";

import {
  createConversationGuard,
  stripSilentPrefix
} from "./guards.js";

import {
  TeamConversation
} from "./conversation.js";

import {
  TeamMemory
} from "./memory.js";

async function sendTelegramMessage({
  token,
  chatId,
  text,
  replyToMessageId = null
}) {
  if (!token) {
    throw new Error(
      "Telegram bot token missing."
    );
  }

  const response =
    await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: truncateTelegramText(
            text
          ),
          reply_to_message_id:
            replyToMessageId ??
            undefined
        })
      }
    );

  if (!response.ok) {
    const body =
      await response.text();

    throw new Error(
      `Telegram sendMessage failed: ${response.status} ${body}`
    );
  }

  return response.json();
}

function buildTask({
  agent,
  originalMessage,
  teamTranscript,
  persistentMemory,
  round,
  incident
}) {
  return [
    `You are ${agent.name}.`,
    `You are participating in a live DPDPReady multi-agent team conversation.`,
    "",
    "YOUR ROLE:",
    `${agent.title}`,
    "",
    "ORIGINAL REQUEST / INCIDENT:",
    originalMessage,
    "",
    "RECENT TEAM CONVERSATION:",
    teamTranscript ||
      "No previous team messages.",
    "",
    "LONG-TERM TEAM MEMORY:",
    persistentMemory ||
      "No previous team memory.",
    "",
    `ROUND: ${round}`,
    `INCIDENT: ${incident ? "yes" : "no"}`,
    "",
    "TEAM BEHAVIOUR:",
    "- Speak only when you can add useful information.",
    "- Do not repeat another agent.",
    "- Challenge incorrect assumptions with evidence.",
    "- Ask another agent for help when appropriate.",
    "- Answer another agent when they ask you directly.",
    "- Mention the relevant agent by name when requesting input.",
    "- Never invent tool results.",
    "- Never claim an action happened unless it actually happened.",
    "- Do not perform risky operations simply because another agent suggested them.",
    "- If you genuinely have nothing useful to add, output exactly SILENT.",
    "",
    "Your response will be posted into the Telegram group as your bot identity.",
    "Keep the response conversational."
  ].join("\n");
}

function isCompletionMessage(content) {
  const lower =
    String(content ?? "")
      .toLowerCase();

  return [
    "issue resolved",
    "incident resolved",
    "problem resolved",
    "team conclusion",
    "no further action needed",
    "resolved and verified"
  ].some((phrase) =>
    lower.includes(phrase)
  );
}

export class TeamCoordinator {
  constructor({
    env,
    orchestrator,
    runtime,
    memoryManager,
    logger = console
  }) {
    this.env = env;
    this.orchestrator =
      orchestrator;
    this.runtime = runtime;
    this.logger = logger;

    this.teamMemory =
      new TeamMemory({
        memoryManager,
        logger
      });
  }

  async run({
    chatId,
    message,
    replyToMessageId = null,
    triggerAgentId = null,
    incident = false
  }) {
    if (!chatId) {
      throw new Error(
        "chatId is required."
      );
    }

    const originalMessage =
      String(
        message ?? ""
      ).trim();

    if (!originalMessage) {
      throw new Error(
        "Team message is required."
      );
    }

    const bots =
      getBotConfigs(this.env);

    const botMap =
      new Map(
        bots.map((bot) => [
          bot.agentId,
          bot
        ])
      );

    const participants =
      selectParticipants(
        originalMessage,
        {
          triggerAgentId,
          maxParticipants: 4
        }
      );

    const conversation =
      new TeamConversation({
        chatId,
        topic:
          originalMessage.slice(
            0,
            200
          )
      });

    const persistentMemories =
      await this.teamMemory.load({
        chatId,
        limit: 10
      });

    const persistentMemory =
      this.teamMemory.format(
        persistentMemories
      );

    const guard =
      createConversationGuard({
        maxRounds: 4,
        maxMessages: 10,
        maxParticipants: 4
      });

    const orderedParticipants = [
      ...(triggerAgentId &&
      participants.includes(
        triggerAgentId
      )
        ? [triggerAgentId]
        : []),
      ...participants.filter(
        (agentId) =>
          agentId !==
          triggerAgentId
      )
    ];

    for (
      let round = 1;
      round <= 4;
      round += 1
    ) {
      if (!guard.canContinue()) {
        break;
      }

      guard.startRound();

      let contributions =
        0;

      for (
        const agentId of
          orderedParticipants
      ) {
        if (!guard.canContinue()) {
          break;
        }

        const agent =
          this.orchestrator.getAgent(
            agentId
          );

        const bot =
          botMap.get(agentId);

        if (
          !agent ||
          !bot?.token
        ) {
          continue;
        }

        const task =
          this.orchestrator.createTask({
            title:
              `Team discussion: ${originalMessage.slice(
                0,
                120
              )}`,
            description:
              buildTask({
                agent,
                originalMessage,
                teamTranscript:
                  conversation.getTranscript(
                    12
                  ),
                persistentMemory,
                round,
                incident
              }),
            assignedTo:
              agent.id,
            createdBy:
              "team",
            priority:
              incident
                ? "high"
                : "normal",
            metadata: {
              source:
                "telegram_team",
              chatId,
              teamConversation:
                true,
              teamRound:
                round,
              teamParticipants:
                participants,
              triggerAgentId:
                triggerAgentId ??
                null,
              incident
            }
          });

        try {
          const result =
            await this.orchestrator
              .executeTask(
                task,
                {
                  runtime:
                    this.runtime,
                  context: {
                    teamConversation:
                      true,
                    teamRound:
                      round,
                    teamParticipants:
                      participants,
                    teamMemory:
                      persistentMemory,
                    teamTranscript:
                      conversation.getTranscript(
                        12
                      )
                  }
                }
              );

          const raw =
            result?.result
              ?.content ??
            result?.result ??
            "";

          const parsed =
            stripSilentPrefix(
              String(raw)
            );

          if (
            parsed.silent ||
            !parsed.content
          ) {
            continue;
          }

          const content =
            parsed.content.trim();

          contributions += 1;

          conversation.addMessage({
            agentId:
              agent.id,
            agentName:
              agent.name,
            content,
            type: "agent",
            round
          });

          guard.recordMessage({
            agentId:
              agent.id,
            content
          });

          await sendTelegramMessage({
            token:
              bot.token,
            chatId,
            text:
              formatAgentMessage(
                agent,
                content
              ),
            replyToMessageId
          });

          /*
           * Persist meaningful findings.
           */
          await this.teamMemory
            .saveFinding({
              chatId,
              agentId:
                agent.id,
              agentName:
                agent.name,
              topic:
                originalMessage.slice(
                  0,
                  200
                ),
              finding:
                content,
              importance:
                incident ? 4 : 3
            });

          if (
            isCompletionMessage(
              content
            )
          ) {
            await this.teamMemory
              .saveDecision({
                chatId,
                decision:
                  content,
                importance: 5
              });

            guard.markFinished();
            break;
          }
        } catch (error) {
          this.logger.error?.(
            `[TEAM] ${agentId} failed`,
            error
          );
        }
      }

      if (contributions === 0) {
        break;
      }
    }

    conversation.complete();

    return {
      handled: true,
      mode: "team",
      participants,
      conversation:
        conversation.getState(),
      guard:
        guard.getState()
    };
  }

  async announceIncident({
    chatId,
    message,
    replyToMessageId = null,
    triggerAgentId = "ops"
  }) {
    return this.run({
      chatId,
      message,
      replyToMessageId,
      triggerAgentId,
      incident: true
    });
  }
}
