import {
  fetchJson,
} from "../utils/http.js";

function telegramApi(
  token,
  method
) {
  if (!token) {
    throw new Error(
      "Telegram bot token is required"
    );
  }

  return (
    `https://api.telegram.org/bot${token}/${method}`
  );
}

export async function registerTelegramWebhook({
  token,

  webhookUrl,

  secretToken,

  allowedUpdates = [
    "message",
    "callback_query",
  ],

  dropPendingUpdates = false,
} = {}) {
  if (!token) {
    throw new Error(
      "token is required"
    );
  }

  if (!webhookUrl) {
    throw new Error(
      "webhookUrl is required"
    );
  }

  const url =
    new URL(webhookUrl);

  if (
    url.protocol !==
      "https:"
  ) {
    throw new Error(
      "Telegram webhooks must use HTTPS"
    );
  }

  return fetchJson(
    telegramApi(
      token,
      "setWebhook"
    ),
    {
      method: "POST",

      headers: {
        "content-type":
          "application/json",
      },

      body: JSON.stringify({
        url:
          webhookUrl,

        ...(secretToken
          ? {
              secret_token:
                secretToken,
            }
          : {}),

        allowed_updates:
          allowedUpdates,

        drop_pending_updates:
          Boolean(
            dropPendingUpdates
          ),
      }),
    }
  );
}

export async function deleteTelegramWebhook({
  token,

  dropPendingUpdates = false,
} = {}) {
  return fetchJson(
    telegramApi(
      token,
      "deleteWebhook"
    ),
    {
      method: "POST",

      headers: {
        "content-type":
          "application/json",
      },

      body: JSON.stringify({
        drop_pending_updates:
          Boolean(
            dropPendingUpdates
          ),
      }),
    }
  );
}

export async function getTelegramWebhookInfo({
  token,
} = {}) {
  return fetchJson(
    telegramApi(
      token,
      "getWebhookInfo"
    )
  );
}

export async function getTelegramBotInfo({
  token,
} = {}) {
  return fetchJson(
    telegramApi(
      token,
      "getMe"
    )
  );
}
