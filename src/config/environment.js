// src/config/environment.js

export function getEnvironment(env) {
  return {
    ...env,

    APP_NAME:
      env.APP_NAME ||
      "DPDPReady AI",

    APP_URL:
      env.APP_URL ||
      "https://dpdpready.online",

    BOT_HOST:
      env.BOT_HOST ||
      "dpdpready-ai.workers.dev",

    OPENROUTER_BASE_URL:
      env.OPENROUTER_BASE_URL ||
      "https://openrouter.ai/api/v1",

    OPENROUTER_MODEL:
      env.OPENROUTER_MODEL ||
      "google/gemini-2.5-flash-preview",

    OPENROUTER_FALLBACK_MODEL:
      env.OPENROUTER_FALLBACK_MODEL ||
      "openrouter/free",

    LLM_TIMEOUT_MS:
      Number(
        env.LLM_TIMEOUT_MS || 25000
      )
  };
}

export function validateEnvironment(
  env,
  { strict = true } = {}
) {
  const required = [
    "OPENROUTER_API_KEY",
    "TELEGRAM_GROUP_ID"
  ];

  const missing =
    required.filter(
      (key) => !env?.[key]
    );

  if (
    strict &&
    missing.length
  ) {
    throw new Error(
      `Missing required environment values: ${missing.join(
        ", "
      )}`
    );
  }

  return {
    valid:
      missing.length === 0,
    missing
  };
}
