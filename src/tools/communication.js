import { fetchJson } from "../utils/http.js";

const TELEGRAM_MAX_MESSAGE_LENGTH =
  4096;

export function createTelegramClient(
  env
) {
  const defaultChatId =
    env.FOUNDER_CHAT_ID;

  function getApiUrl(
    token,
    method
  ) {
    return (
      `https://api.telegram.org/bot${token}/${method}`
    );
  }

  async function call(
    token,
    method,
    payload = {}
  ) {
    if (!token) {
      throw new Error(
        "Telegram bot token is required"
      );
    }

    return fetchJson(
      getApiUrl(
        token,
        method
      ),
      {
        method: "POST",

        headers: {
          "content-type":
            "application/json",
        },

        body: JSON.stringify(
          payload
        ),
      }
    );
  }

  async function sendMessage({
    token =
      env.TELEGRAM_BOT_TOKEN,

    chatId =
      defaultChatId,

    text,

    parseMode = "HTML",

    disableWebPagePreview = true,

    replyToMessageId,

    replyMarkup,

    disableNotification = false,
  } = {}) {
    if (!token) {
      throw new Error(
        "TELEGRAM_BOT_TOKEN is not configured"
      );
    }

    if (
      chatId === undefined ||
      chatId === null ||
      chatId === ""
    ) {
      throw new Error(
        "chatId is required"
      );
    }

    if (!text) {
      throw new Error(
        "text is required"
      );
    }

    const content =
      String(text);

    if (
      content.length >
      TELEGRAM_MAX_MESSAGE_LENGTH
    ) {
      throw new Error(
        `Telegram message exceeds ${TELEGRAM_MAX_MESSAGE_LENGTH} characters`
      );
    }

    return call(
      token,
      "sendMessage",
      {
        chat_id:
          chatId,

        text:
          content,

        parse_mode:
          parseMode,

        disable_web_page_preview:
          Boolean(
            disableWebPagePreview
          ),

        disable_notification:
          Boolean(
            disableNotification
          ),

        ...(replyToMessageId
          ? {
              reply_to_message_id:
                replyToMessageId,
            }
          : {}),

        ...(replyMarkup
          ? {
              reply_markup:
                replyMarkup,
            }
          : {}),
      }
    );
  }

  async function editMessage({
    token =
      env.TELEGRAM_BOT_TOKEN,

    chatId,

    messageId,

    text,

    parseMode = "HTML",

    replyMarkup,
  } = {}) {
    if (!chatId) {
      throw new Error(
        "chatId is required"
      );
    }

    if (!messageId) {
      throw new Error(
        "messageId is required"
      );
    }

    if (!text) {
      throw new Error(
        "text is required"
      );
    }

    if (
      String(text).length >
      TELEGRAM_MAX_MESSAGE_LENGTH
    ) {
      throw new Error(
        `Telegram message exceeds ${TELEGRAM_MAX_MESSAGE_LENGTH} characters`
      );
    }

    return call(
      token,
      "editMessageText",
      {
        chat_id:
          chatId,

        message_id:
          messageId,

        text:
          String(text),

        parse_mode:
          parseMode,

        ...(replyMarkup
          ? {
              reply_markup:
                replyMarkup,
            }
          : {}),
      }
    );
  }

  async function answerCallbackQuery({
    token =
      env.TELEGRAM_BOT_TOKEN,

    callbackQueryId,

    text,

    showAlert = false,
  } = {}) {
    if (!callbackQueryId) {
      throw new Error(
        "callbackQueryId is required"
      );
    }

    return call(
      token,
      "answerCallbackQuery",
      {
        callback_query_id:
          callbackQueryId,

        ...(text
          ? {
              text,
            }
          : {}),

        show_alert:
          Boolean(showAlert),
      }
    );
  }

  async function getMe({
    token =
      env.TELEGRAM_BOT_TOKEN,
  } = {}) {
    return call(
      token,
      "getMe"
    );
  }

  return {
    sendMessage,
    editMessage,
    answerCallbackQuery,
    getMe,
  };
}
