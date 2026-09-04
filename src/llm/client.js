const DEFAULT_TIMEOUT_MS = 25_000;

function parseProviders(value) {
  return String(value ?? "")
    .split(",")
    .map((provider) => provider.trim())
    .filter(Boolean)
    .map((provider) => provider.toLowerCase());
}

function envKey(provider, suffix) {
  const normalized = String(provider)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_");

  return `LLM_${normalized}_${suffix}`;
}

const DEFAULT_BASE_URLS = Object.freeze({
  openai: "https://api.openai.com/v1",
  openrouter: "https://openrouter.ai/api/v1"
});

function isRetryable(error) {
  const status = Number(error?.status);

  if ([408, 409, 425, 429].includes(status)) {
    return true;
  }

  if (status >= 500) {
    return true;
  }

  return ["AbortError", "TimeoutError"].includes(error?.name);
}

function buildProviderConfig(env, provider) {
  return {
    id: provider,
    apiKey: env[envKey(provider, "API_KEY")] ?? null,
    baseUrl:
      env[envKey(provider, "BASE_URL")] ??
      DEFAULT_BASE_URLS[provider] ??
      null,
    model: env[envKey(provider, "MODEL")] ?? null,
    timeoutMs: Number(
      env[envKey(provider, "TIMEOUT_MS")] ??
        env.LLM_TIMEOUT_MS ??
        DEFAULT_TIMEOUT_MS
    ),
    allowAnonymous:
      String(
        env[envKey(provider, "ALLOW_ANONYMOUS")] ?? "false"
      ).toLowerCase() === "true"
  };
}

async function callProvider(config, request) {
  if (!config.baseUrl) {
    throw new Error(`LLM provider ${config.id} has no base URL configured.`);
  }

  if (!config.model) {
    throw new Error(`LLM provider ${config.id} has no model configured.`);
  }

  if (!config.apiKey && !config.allowAnonymous) {
    throw new Error(`LLM provider ${config.id} has no API key configured.`);
  }

  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    config.timeoutMs > 0
      ? config.timeoutMs
      : DEFAULT_TIMEOUT_MS
  );

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json"
  };

  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }

  const body = {
    model: request.model || config.model,
    messages: request.messages,
    temperature: request.temperature,
    max_tokens: request.maxTokens
  };

  if (Array.isArray(request.tools) && request.tools.length > 0) {
    body.tools = request.tools;
    body.tool_choice = request.toolChoice ?? "auto";
  }

  try {
    const response = await fetch(
      `${String(config.baseUrl).replace(/\/+$/, "")}/chat/completions`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      }
    );

    const text = await response.text();

    let payload;

    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = text;
    }

    if (!response.ok) {
      const message =
        typeof payload === "object" && payload?.error?.message
          ? payload.error.message
          : typeof payload === "object" && payload?.message
            ? payload.message
            : `HTTP ${response.status}`;

      const error = new Error(
        `LLM provider ${config.id} failed: ${message}`
      );

      error.status = response.status;
      error.provider = config.id;
      error.body = payload;

      throw error;
    }

    if (!payload?.choices?.[0]?.message) {
      const error = new Error(
        `LLM provider ${config.id} returned no assistant message.`
      );

      error.status = response.status;
      error.provider = config.id;

      throw error;
    }

    return {
      ...payload,
      provider: config.id,
      model:
        payload.model ||
        request.model ||
        config.model
    };
  } finally {
    clearTimeout(timer);
  }
}

export function createLLMClient(env = {}, logger = console) {
  const providerNames = parseProviders(env.LLM_PROVIDERS);

  if (providerNames.length === 0) {
    throw new Error(
      "LLM_PROVIDERS must contain at least one provider."
    );
  }

  async function chat({
    messages,
    tools = [],
    model = null,
    maxTokens = 1200,
    temperature = 0.2
  } = {}) {
    let lastError = null;

    for (const providerName of providerNames) {
      const provider = buildProviderConfig(
        env,
        providerName
      );

      try {
        return await callProvider(provider, {
          messages,
          tools,
          model,
          maxTokens,
          temperature
        });
      } catch (error) {
        lastError = error;

        if (!isRetryable(error)) {
          throw error;
        }

        logger.warn?.(
          `[LLM FALLBACK] provider=${provider.id} failed; trying next provider`,
          error
        );
      }
    }

    const message = lastError
      ? lastError.message
      : "All configured LLM providers failed.";

    throw new Error(message);
  }

  return {
    chat,
    providers: [...providerNames]
  };
}
