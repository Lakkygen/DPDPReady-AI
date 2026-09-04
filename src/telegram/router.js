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
    extractMessage(update)?.text ?? ""
  ).trim();
}

function getChatId(update) {
  return (
    extractMessage(update)?.chat?.id ??
    null
  );
}

function getMessageId(update) {
  return (
    extractMessage(update)?.message_id ??
    null
  );
}

function getSender(update) {
  const message = extractMessage(update);
  const from = message?.from ?? {};

  return {
    id: from.id ?? null,
    username: from.username ?? null,
    firstName: from.first_name ?? null,
    lastName: from.last_name ?? null
  };
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

  const response = await fetch(
    `https://api.telegram.org/bot${token}/${method}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );

  const responseText =
    await response.text();

  let payload;

  try {
    payload = responseText
      ? JSON.parse(responseText)
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
    const telegramError =
      payload?.description ??
      payload?.error?.message ??
      `HTTP ${response.status}`;

    const error = new Error(
      `Telegram ${method} failed: ${telegramError}`
    );

    error.status = response.status;
    error.telegram = true;
    error.body = payload;

    throw error;
  }

  return payload;
}

async function sendMessage({
  token,
  chatId,
  text,
  replyToMessageId = null
}) {
  if (!chatId) {
    throw new Error(
      "Telegram chat id is missing."
    );
  }

  const safeText = truncateTelegramText(
    String(text ?? "Task completed.")
  );

  return telegramRequest(
    token,
    "sendMessage",
    {
      chat_id: chatId,
      text: safeText,
      reply_to_message_id:
        replyToMessageId ??
        undefined,
      allow_sending_without_reply: true
    }
  );
}

function findMentionedAgent(
  text,
  botConfigs
) {
  const lower = String(text ?? "")
    .toLowerCase();

  return (
    botConfigs.find((bot) => {
      const name = String(
        bot.name ?? ""
      )
        .toLowerCase()
        .trim();

      return (
        Boolean(name) &&
        lower.includes(name)
      );
    }) ?? null
  );
}

function removeBotName(
  text,
  botName
) {
  if (!botName) {
    return String(text ?? "").trim();
  }

  const escaped = String(botName).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

  return String(text ?? "")
    .replace(
      new RegExp(escaped, "ig"),
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
        bot.agentId === command.command
    ) ?? null
  );
}

function stringifyError(error) {
  if (!error) {
    return "Unknown error.";
  }

  if (
    typeof error === "string"
  ) {
    return error;
  }

  return (
    error?.message ??
    String(error)
  );
}

function buildTaskMetadata({
  update,
  chatId,
  messageId,
  sender,
  directAgent
}) {
  return {
    source: "telegram",
    chatId,
    messageId,
    sender,
    directAgent,
    updateId:
      update?.update_id ?? null
  };
}

async function safeErrorReply({
  token,
  chatId,
  messageId,
  agent,
  error,
  context = "task"
}) {
  if (!token || !chatId) {
    return false;
  }

  const message = [
    formatAgentMessage(
      agent,
      "I received your request, but I could not complete it."
    ),
    "",
    `Failure: ${String(
      error?.message ??
        error ??
        "Unknown error"
    ).slice(0, 700)}`,
    "",
    context === "task"
      ? "The failed task has been stopped safely."
      : "The request has been stopped safely."
  ].join("\n");

  try {
    await sendMessage({
      token,
      chatId,
      text: message,
      replyToMessageId: messageId
    });

    return true;
  } catch {
    return false;
  }
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

    try {
      return await approvalController.handleCallback(
        update
      );
    } catch (error) {
      return {
        handled: false,
        reason: "approval_callback_failed",
        error: stringifyError(error)
      };
    }
  }

  const message =
    extractMessage(update);

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
      reason: "group_not_allowed"
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

  const sender =
    getSender(update);

  const bots =
    getBotConfigs(env);

  if (!bots.length) {
    throw new Error(
      "No Telegram bot tokens are configured."
    );
  }

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

  /*
   * Team mode.
   *
   * When a message does not explicitly target
   * one of the known agents, let the coordinator
   * handle it exactly as before.
   */
  if (!targetBot) {
    if (!teamCoordinator) {
      return {
        handled: false,
        reason:
          "team_coordinator_unavailable"
      };
    }

    try {
      return await teamCoordinator.run({
        chatId,
        message: text,
        replyToMessageId:
          messageId,
        triggerAgentId:
          null,
        incident: false,
        sender
      });
    } catch (error) {
      /*
       * Team coordination is allowed to fail
       * without turning the Telegram webhook into
       * a retrying 500.
       */
      const fallbackBot =
        bots.find(
          (bot) =>
            bot.agentId === "ops"
        ) ??
        bots[0];

      const fallbackAgent =
        orchestrator.getAgent(
          fallbackBot.agentId
        );

      await safeErrorReply({
        token: fallbackBot.token,
        chatId,
        messageId,
        agent:
          fallbackAgent,
        error,
        context: "team"
      });

      return {
        handled: true,
        mode: "team",
        failed: true,
        reason:
          "team_execution_failed",
        error: stringifyError(error)
      };
    }
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
      ? command.args
          .join(" ")
          .trim()
      : removeBotName(
          text,
          targetBot.name
        );

  if (!taskText) {
    await sendMessage({
      token: targetBot.token,
      chatId,
      text: formatAgentMessage(
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

  let task;

  try {
    task =
      await orchestrator.createTask({
        title: taskText.slice(
          0,
          200
        ),
        description:
          taskText,
        assignedTo:
          agent.id,
        assignedAgent:
          agent.id,
        createdBy:
          "founder",
        priority:
          "normal",
        type: "telegram",
        payload:
          buildTaskMetadata({
            update,
            chatId,
            messageId,
            sender,
            directAgent: true
          }),
        metadata:
          buildTaskMetadata({
            update,
            chatId,
            messageId,
            sender,
            directAgent: true
          })
      });
  } catch (error) {
    await safeErrorReply({
      token:
        targetBot.token,
      chatId,
      messageId,
      agent,
      error,
      context: "task_creation"
    });

    return {
      handled: true,
      mode: "direct",
      agent: agent.id,
      failed: true,
      reason:
        "task_creation_failed",
      error:
        stringifyError(error)
    };
  }

  try {
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
      agent: agent.id,
      taskId: task.id
    };
  } catch (error) {
    /*
     * IMPORTANT:
     * Never throw execution errors back to
     * Telegram. The update was received and
     * processed, so returning handled=true
     * prevents Telegram from repeatedly
     * retrying the same update.
     */
    await safeErrorReply({
      token:
        targetBot.token,
      chatId,
      messageId,
      agent,
      error,
      context: "task_execution"
    });

    return {
      handled: true,
      mode: "direct",
      agent: agent.id,
      taskId: task.id,
      failed: true,
      reason:
        "task_execution_failed",
      error:
        stringifyError(error)
    };
  }
}
