import { getBotConfigs } from "./bots.js";
import { isAllowedGroup } from "./group.js";
import { parseCommand } from "./commands.js";
import {
  formatAgentMessage,
  truncateTelegramText
} from "./formatting.js";

function extractMessage(update) {
  return (
    update?.message ??
    update?.edited_message ??
    null
  );
}

function extractText(update) {
  return String(
    extractMessage(update)
      ?.text ?? ""
  ).trim();
}

function getChatId(update) {
  return (
    extractMessage(update)
      ?.chat?.id ?? null
  );
}

function getMessageId(update) {
  return (
    extractMessage(update)
      ?.message_id ?? null
  );
}

async function telegramRequest(
  token,
  method,
  body
) {
  if (!token) {
    throw new Error(
      "Telegram bot token is missing."
    );
  }

  const response =
    await fetch(
      `https://api.telegram.org/bot${token}/${method}`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify(
          body
        )
      }
    );

  const responseText =
    await response.text();

  let payload;

  try {
    payload =
      responseText
        ? JSON.parse(
            responseText
          )
        : null;
  } catch {
    payload = {
      ok: response.ok,
      raw: responseText
    };
  }

  if (
    !response.ok ||
    payload?.ok === false
  ) {
    throw new Error(
      `Telegram ${method} failed: ${response.status}`
    );
  }

  return payload;
}

async function sendMessage({
  token,
  chatId,
  text,
  replyToMessageId = null
}) {
  return telegramRequest(
    token,
    "sendMessage",
    {
      chat_id: chatId,
      text:
        truncateTelegramText(
          text
        ),
      reply_to_message_id:
        replyToMessageId ??
        undefined,
      allow_sending_without_reply:
        true
    }
  );
}

function findMentionedAgent(
  text,
  botConfigs
) {
  const lower =
    String(text ?? "")
      .toLowerCase();

  return (
    botConfigs.find(
      (bot) => {
        const name =
          String(
            bot.name ?? ""
          )
            .toLowerCase()
            .trim();

        return (
          name &&
          lower.includes(name)
        );
      }
    ) ?? null
  );
}

function removeBotName(
  text,
  botName
) {
  if (!botName) {
    return String(
      text ?? ""
    ).trim();
  }

  return String(text ?? "")
    .replace(
      new RegExp(
        botName.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        ),
        "ig"
      ),
      ""
    )
    .replace(
      /^\s*[:,\-]+\s*/,
      ""
    )
    .trim();
}

function isCommandForKnownAgent(
  command,
  botConfigs
) {
  if (!command) {
    return null;
  }

  return (
    botConfigs.find(
      (bot) =>
        bot.agentId ===
        command.command
    ) ?? null
  );
}

export async function routeTelegramUpdate(
  update,
  env,
  orchestrator,
  runtime,
  teamCoordinator = null,
  approvalController = null
) {
  if (
    update?.callback_query
  ) {
    if (!approvalController) {
      return {
        handled: false,
        reason:
          "approval_controller_unavailable"
      };
    }

    return approvalController.handleCallback(
      update
    );
  }

  const chatId =
    getChatId(update);

  if (
    !chatId ||
    !isAllowedGroup(
      chatId,
      env
    )
  ) {
    return {
      handled: false,
      reason:
        "group_not_allowed"
    };
  }

  const text =
    extractText(update);

  if (!text) {
    return {
      handled: false,
      reason: "no_text"
    };
  }

  const messageId =
    getMessageId(update);

  const bots =
    getBotConfigs(env);

  const command =
    parseCommand(text);

  let targetBot =
    findMentionedAgent(
      text,
      bots
    );

  if (!targetBot) {
    targetBot =
      isCommandForKnownAgent(
        command,
        bots
      );
  }

  if (!targetBot) {
    if (!teamCoordinator) {
      return {
        handled: false,
        reason:
          "team_coordinator_unavailable"
      };
    }

    return teamCoordinator.run(
      {
        chatId,
        message: text,
        replyToMessageId:
          messageId,
        triggerAgentId:
          null,
        incident: false
      }
    );
  }

  const agent =
    orchestrator.getAgent(
      targetBot.agentId
    );

  if (!agent) {
    return {
      handled: false,
      reason:
        "agent_not_found"
    };
  }

  const taskText = command
    ? command.args
        .join(" ")
        .trim()
    : removeBotName(
        text,
        targetBot.name
      );

  if (!taskText) {
    await sendMessage({
      token:
        targetBot.token,
      chatId,
      text:
        formatAgentMessage(
          agent,
          "I'm online. Give me a task."
        ),
      replyToMessageId:
        messageId
    });

    return {
      handled: true,
      mode: "direct",
      agent: agent.id
    };
  }

  const task =
    await orchestrator.createTask(
      {
        title:
          taskText.slice(
            0,
            200
          ),
        description:
          taskText,
        assignedTo:
          agent.id,
        createdBy:
          "founder",
        priority:
          "normal",
        metadata: {
          source:
            "telegram",
          chatId,
          messageId,
          directAgent:
            true
        }
      }
    );

  const result =
    await orchestrator.executeTask(
      task,
      { runtime }
    );

  const response =
    result?.result?.content ??
    result?.result ??
    "Task completed.";

  await sendMessage({
    token:
      targetBot.token,
    chatId,
    text:
      formatAgentMessage(
        agent,
        response
      ),
    replyToMessageId:
      messageId
  });

  return {
    handled: true,
    mode: "direct",
    agent: agent.id,
    taskId: task.id
  };
}
