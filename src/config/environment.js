const DEFAULT_LLM_TIMEOUT_MS = 25_000;
const DEFAULT_APPROVAL_TTL_MS = 15 * 60 * 1000;

const DEFAULT_BASE_URLS = Object.freeze({
  openai: "https://api.openai.com/v1",
  openrouter: "https://openrouter.ai/api/v1"
});

function parseList(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function envKey(provider, suffix) {
  const normalized = String(provider)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_");

  return `LLM_${normalized}_${suffix}`;
}

export function getLLMProviders(env = {}) {
  return parseList(env.LLM_PROVIDERS).map((provider) => {
    const baseKey = envKey(provider, "BASE_URL");
    const modelKey = envKey(provider, "MODEL");
    const apiKeyKey = envKey(provider, "API_KEY");
    const timeoutKey = envKey(provider, "TIMEOUT_MS");
    const anonymousKey = envKey(provider, "ALLOW_ANONYMOUS");

    return {
      id: provider.toLowerCase(),
      apiKey: env[apiKeyKey] ?? null,
      baseUrl:
        env[baseKey] ??
        DEFAULT_BASE_URLS[provider.toLowerCase()] ??
        null,
      model: env[modelKey] ?? null,
      timeoutMs: Number(
        env[timeoutKey] ??
          env.LLM_TIMEOUT_MS ??
          DEFAULT_LLM_TIMEOUT_MS
      ),
      allowAnonymous:
        String(env[anonymousKey] ?? "false").toLowerCase() === "true"
    };
  });
}

export function getEnvironment(env = {}) {
  return {
    ...env,
    APP_NAME: env.APP_NAME || "DPDPReady AI",
    APP_URL: env.APP_URL || "https://dpdpready.online",
    LLM_PROVIDERS: String(env.LLM_PROVIDERS ?? "").trim(),
    LLM_TIMEOUT_MS: Number(
      env.LLM_TIMEOUT_MS || DEFAULT_LLM_TIMEOUT_MS
    ),
    APPROVAL_TTL_MS: Number(
      env.APPROVAL_TTL_MS || DEFAULT_APPROVAL_TTL_MS
    )
  };
}

export function validateEnvironment(env, { strict = true } = {}) {
  const required = [
    "APP_URL",
    "TELEGRAM_GROUP_ID",
    "FOUNDER_CHAT_ID",
    "FOUNDER_TELEGRAM_ID",
    "TELEGRAM_WEBHOOK_SECRET",
    "OPS_BOT_TOKEN"
  ];

  const missingRequired = required.filter((key) => !env?.[key]);
  const providers = getLLMProviders(env);

  const usableProviders = providers.filter(
    (provider) =>
      provider.baseUrl &&
      provider.model &&
      (provider.apiKey || provider.allowAnonymous)
  );

  const missingLLM = providers
    .filter(
      (provider) =>
        !provider.baseUrl ||
        !provider.model ||
        (!provider.apiKey && !provider.allowAnonymous)
    )
    .map((provider) => provider.id);

  if (!env?.LLM_PROVIDERS) {
    missingRequired.push("LLM_PROVIDERS");
  }

  if (providers.length > 0 && usableProviders.length === 0) {
    missingRequired.push("at least one usable LLM provider configuration");
  }

  if (strict && missingRequired.length > 0) {
    throw new Error(
      `Missing or invalid environment values: ${missingRequired.join(", ")}`
    );
  }

  return {
    valid: missingRequired.length === 0,
    missing: missingRequired,
    llm: {
      providers: providers.map((provider) => ({
        id: provider.id,
        baseUrlConfigured: Boolean(provider.baseUrl),
        modelConfigured: Boolean(provider.model),
        apiKeyConfigured: Boolean(provider.apiKey),
        anonymousAllowed: provider.allowAnonymous
      })),
      usableProviders: usableProviders.map((provider) => provider.id),
      invalidProviders: missingLLM
    }
  };
}
