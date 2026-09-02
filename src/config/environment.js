// src/config/environment.js

const REQUIRED_SECRETS = [
  "OPENROUTER_API_KEY",
  "TELEGRAM_GROUP_ID"
];

const OPTIONAL_SECRETS = [
  "OPS_BOT_TOKEN",
  "GROWTH_BOT_TOKEN",
  "RESEARCH_BOT_TOKEN",
  "ANALYST_BOT_TOKEN",
  "SUPPORT_BOT_TOKEN"
];

export function getEnvironment(env) {
  if (!env || typeof env !== "object") {
    throw new Error("Worker environment is unavailable.");
  }

  return {
    ...env,
    APP_NAME: env.APP_NAME || "DPDPReady AI",
    BOT_HOST: env.BOT_HOST || "dpdpready-ai.workers.dev",

    OPENROUTER_BASE_URL:
      env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",

    OPENROUTER_MODEL:
      env.OPENROUTER_MODEL || "google/gemini-2.5-flash-preview:free",

    OPENROUTER_FALLBACK_MODEL:
      env.OPENROUTER_FALLBACK_MODEL || "openrouter/free"
  };
}

export function validateEnvironment(env, { strict = true } = {}) {
  const missingRequired = REQUIRED_SECRETS.filter(
    (key) => !env?.[key]
  );

  if (strict && missingRequired.length > 0) {
    throw new Error(
      `Missing required environment values: ${missingRequired.join(", ")}`
    );
  }

  return {
    valid: missingRequired.length === 0,
    missingRequired,
    optionalPresent: OPTIONAL_SECRETS.filter(
      (key) => Boolean(env?.[key])
    )
  };
}

export function getTelegramBotToken(env, agentConfig) {
  const key = agentConfig?.telegramEnvKey;

  if (!key) {
    throw new Error(
      `No Telegram token environment key configured for agent ${agentConfig?.id}`
    );
  }

  const token = env?.[key];

  if (!token) {
    throw new Error(
      `Missing Telegram bot token: ${key}`
    );
  }

  return token;
}
