// src/config/environment.js

export function getEnvironment(env) {
  return {
    ...env,

    APP_NAME: env.APP_NAME || "DPDPReady AI",
    APP_URL: env.APP_URL || "https://dpdpready.onrender.com",
    BOT_HOST: env.BOT_HOST || "dpdpready-ai.workers.dev",

    AGENTROUTER_BASE_URL:
      env.AGENTROUTER_BASE_URL || "https://openrouter.ai/api/v1",

    AGENTROUTER_MODEL:
      env.AGENTROUTER_MODEL || "google/gemini-2.5-flash-preview",

    AGENTROUTER_FALLBACK_MODEL:
      env.AGENTROUTER_FALLBACK_MODEL || "openrouter/free",

    LLM_TIMEOUT_MS: Number(env.LLM_TIMEOUT_MS || 25000)
  };
}

export function validateEnvironment(env, { strict = true } = {}) {
  const required = [
    "AGENTROUTER_API_KEY",
    "TELEGRAM_GROUP_ID",
    "TELEGRAM_BOT_TOKEN",
    "TELEGRAM_WEBHOOK_SECRET"
  ];

  const recommended = [
    "ADMIN_API_TOKEN",
    "FOUNDER_API_TOKEN",
    "APP_URL"
  ];

  const missingRequired = required.filter((key) => !env?.[key]);
  const missingRecommended = recommended.filter((key) => !env?.[key]);

  if (strict && missingRequired.length > 0) {
    throw new Error(
      `Missing required environment values: ${missingRequired.join(", ")}`
    );
  }

  return {
    valid: missingRequired.length === 0,
    missing: missingRequired,
    missingRecommended
  };
}
