import {
  createPersistentStore,
} from "../core/persistentStore.js";

import {
  createTelegramClient,
} from "../tools/communication.js";

function escapeHtml(
  value
) {
  return String(
    value ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}

function createKeyboard(
  approvalId
) {
  return {
    inline_keyboard: [
      [
        {
          text:
            "✅ Approve",

          callback_data:
            `approval:${approvalId}:approved`,
        },

        {
          text:
            "❌ Reject",

          callback_data:
            `approval:${approvalId}:rejected`,
        },
      ],
    ],
  };
}

export function createApprovalController(
  env
) {
  const store =
    createPersistentStore(
      env
    );

  const telegram =
    createTelegramClient(
      env
    );

  async function requestApproval({
    taskId,

    action,

    requestedBy,

    payload = {},

    chatId =
      env.FOUNDER_CHAT_ID,

    botToken =
      env.TELEGRAM_BOT_TOKEN,
  } = {}) {
    if (!taskId) {
      throw new Error(
        "taskId is required"
      );
    }

    if (!action) {
      throw new Error(
        "action is required"
      );
    }

    if (!requestedBy) {
      throw new Error(
        "requestedBy is required"
      );
    }

    if (!chatId) {
      throw new Error(
        "chatId is required"
      );
    }

    if (!botToken) {
      throw new Error(
        "botToken is required"
      );
    }

    const approval =
      await store.createApproval({
        taskId,
        action,
        requestedBy,
        payload,
      });

    const message =
      [
        "<b>🔐 FOUNDER APPROVAL REQUIRED</b>",
        "",
        `<b>Action:</b> ${escapeHtml(
          action
        )}`,
        `<b>Agent:</b> ${escapeHtml(
          requestedBy
        )}`,
        `<b>Task:</b> <code>${escapeHtml(
          taskId
        )}</code>`,
        "",
        "This action is waiting for founder approval.",
      ].join("\n");

    await telegram.sendMessage({
      token:
        botToken,

      chatId,

      text:
        message,

      replyMarkup:
        createKeyboard(
          approval.id
        ),
    });

    return approval;
  }

  async function handleCallback(
    update
  ) {
    const callback =
      update?.callback_query;

    if (
      !callback ||
      typeof callback.data !==
        "string"
    ) {
      return {
        handled: false,
      };
    }

    if (
      !callback.data.startsWith(
        "approval:"
      )
    ) {
      return {
        handled: false,
      };
    }

    const parts =
      callback.data.split(":");

    const approvalId =
      parts[1];

    const decision =
      parts[2];

    if (
      !approvalId ||
      ![
        "approved",
        "rejected",
      ].includes(
        decision
      )
    ) {
      return {
        handled: false,
      };
    }

    const founderId =
      String(
        env.FOUNDER_TELEGRAM_ID ||
          ""
      );

    const actorId =
      String(
        callback.from?.id ||
          ""
      );

    // Critical security check:
    // only the configured founder can
    // approve/reject production actions.
    if (
      !founderId ||
      actorId !== founderId
    ) {
      await telegram.answerCallbackQuery({
        callbackQueryId:
          callback.id,

        text:
          "⛔ You are not authorized to approve this action.",

        showAlert: true,
      });

      return {
        handled: true,
        authorized: false,
      };
    }

    const actor =
      callback.from?.username
        ? `@${callback.from.username}`
        : actorId;

    const approval =
      await store.resolveApproval(
        approvalId,
        decision,
        actor
      );

    await telegram.answerCallbackQuery({
      callbackQueryId:
        callback.id,

      text:
        approval?.status ===
        decision
          ? `Approval ${decision}`
          : "Approval was already resolved.",
    });

    return {
      handled: true,

      authorized: true,

      approval,

      decision,

      actor,
    };
  }

  async function getPending(
    limit = 50
  ) {
    return store.pendingApprovals(
      limit
    );
  }

  return {
    requestApproval,
    handleCallback,
    getPending,
  };
}
