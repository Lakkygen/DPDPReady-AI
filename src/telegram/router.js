// src/telegram/router.js

import {
  getBotConfigs
} from "./bots.js";

import {
  isAllowedGroup
} from "./group.js";

import {
  parseCommand
} from "./commands.js";

import {
  formatAgentMessage,
  truncateTelegramText
} from "./formatting.js";

function extractText(update) {
  return (
    update?.message?.text ??
    update?.edited_message?.text ??
    ""
  );
}

function getChatId(update) {
  return (
    update?.message?.chat?.id ??
    update?.edited_message?.chat?.id ??
    null
  );
}

async function telegramRequest(
  token,
  method,
  body
) {
  const response =
    await fetch(
      `https://api.telegram.org/bot${token}/${method}`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify(body)
      }
    );

  if (!response.ok) {
    throw new Error(
      `Telegram ${method} failed: ${response.status}`
    );
  }

  return response.json();
}

async function sendMessage(
  token,
  chatId,
  text,
  replyTo = null
) {
  return telegramRequest(
    token,
    "sendMessage",
    {
      chat_id: chatId,
      text: truncateTelegramText(text),
      reply_to_message_id:
        replyTo ?? undefined
    }
  );
}

function findMentionedAgent(
  text,
  botConfigs
) {
  const lower =
    String(text).toLowerCase();

  for (const bot of botConfigs) {
    if (
      lower.includes(
        bot.name.toLowerCase()
      )
    ) {
      return bot;
    }
  }

  return null;
}

export async function routeTelegramUpdate(
  update,
  env,
  orchestrator,
  runtime
) {
  const chatId =
    getChatId(update);

  if (
    !chatId ||
    !isAllowedGroup(chatId, env)
  ) {
    return {
      handled: false,
      reason: "group_not_allowed"
    };
  }

  const text =
    extractText(update).trim();

  if (!text) {
    return {
      handled: false,
      reason: "no_text"
    };
  }

  const bots =
    getBotConfigs(env);

  const command =
    parseCommand(text);

  const mentioned =
    findMentionedAgent(
      text,
      bots
    );

  let targetBot =
    mentioned;

  if (!targetBot && command) {
    targetBot =
      bots.find(
        (bot) =>
          bot.agentId ===
          command.command
      );
  }

  if (!targetBot) {
    return {
      handled: false,
      reason: "no_agent_target"
    };
  }

  const agent =
    orchestrator.getAgent(
      targetBot.agentId
    );

  if (!agent) {
    return {
      handled: false,
      reason: "agent_not_found"
    };
  }

  const taskText =
    command
      ? command.args.join(" ")
      : text.replace(
          new RegExp(
            targetBot.name,
            "ig"
          ),
          ""
        ).trim();

  if (!taskText) {
    await sendMessage(
      targetBot.token,
      chatId,
      formatAgentMessage(
        agent,
        `I'm online. Give me a task.`
      ),
      update?.message?.message_id
    );

    return {
      handled: true
    };
  }

  const task =
    orchestrator.createTask({
      title:
        taskText.slice(0, 200),
      description:
        taskText,
      assignedTo:
        agent.id,
      createdBy:
        "founder",
      priority:
        "normal",
      metadata: {
        source: "telegram",
        chatId,
        messageId:
          update?.message?.message_id
      }
    });

  const result =
    await orchestrator.executeTask(
      task,
      {
        runtime
      }
    );

  const response =
    result?.result?.content ??
    "Task completed.";

  await sendMessage(
    targetBot.token,
    chatId,
    formatAgentMessage(
      agent,
      response
    ),
    update?.message?.message_id
  );

  return {
    handled: true,
    agent: agent.id,
    taskId: task.id
  };
}
