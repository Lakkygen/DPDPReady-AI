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

function extractMessage(update) {
  return (
    update?.message ??
    update?.edited_message ??
    null
  );
}

function extractText(update) {
  const message =
    extractMessage(update);

  return String(
    message?.text ?? ""
  ).trim();
}

function getChatId(update) {
  const message =
    extractMessage(update);

  return (
    message?.chat?.id ??
    null
  );
}

function getMessageId(update) {
  const message =
    extractMessage(update);

  return (
    message?.message_id ??
    null
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
        body: JSON.stringify(body)
      }
    );

  const responseText =
    await response.text();

  let payload = null;

  try {
    payload =
      JSON.parse(
        responseText
      );
  } catch {
    payload = {
      ok: response.ok,
      raw: responseText
    };
  }

  if (!response.ok) {
    throw new Error(
      `Telegram ${method} failed: ${response.status}`
    );
  }

  if (
    payload &&
    payload.ok === false
  ) {
    throw new Error(
      `Telegram ${method} failed.`
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
      text: truncateTelegramText(
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

/**
 * Match a bot by its display name.
 *
 * Example:
 *   "Marcus check production"
 *
 * This intentionally preserves the repo's
 * current name-based direct-agent behaviour.
 */
function findMentionedAgent(
  text,
  botConfigs
) {
  const lower =
    String(text ?? "")
      .toLowerCase();

  for (
    const bot of botConfigs
  ) {
    const name =
      String(
        bot.name ?? ""
      )
        .toLowerCase()
        .trim();

    if (
      name &&
      lower.includes(name)
    ) {
      return bot;
    }
  }

  return null;
}

function removeBotName(
  text,
  botName
) {
  if (!botName) {
    return String(text ?? "")
      .trim();
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
  teamCoordinator = null
) {
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

  /*
   * Direct agent mode:
   *
   * /ops check production
   * /research check latest DPDP update
   * Marcus check production
   */
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

  /*
   * NEW:
   *
   * If the founder doesn't explicitly target
   * one bot, the message becomes a team
   * conversation.
   */
  if (!targetBot) {
    if (!teamCoordinator) {
      return {
        handled: false,
        reason:
          "team_coordinator_unavailable"
      };
    }

    return teamCoordinator.run({
      chatId,
      message: text,
      replyToMessageId:
        messageId,
      triggerAgentId:
        null,
      incident: false
    });
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

  let taskText = text;

  if (command) {
    taskText =
      command.args.join(
        " "
      ).trim();
  } else {
    taskText =
      removeBotName(
        text,
        targetBot.name
      );
  }

  /*
   * Direct mention with no task.
   */
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
      agent:
        agent.id
    };
  }

  const task =
    orchestrator.createTask({
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
    agent:
      agent.id,
    taskId:
      task.id
  };
}
