const DEFAULT_TIMEOUT_MS = 20_000;

/**
 * Fetch JSON with:
 * - timeout protection
 * - automatic JSON parsing
 * - useful HTTP errors
 */
export async function fetchJson(
  url,
  options = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
) {
  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        accept: "application/json",
        ...(options.headers || {}),
      },
    });

    const text = await response.text();

    let body = null;

    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }

    if (!response.ok) {
      const message =
        typeof body === "object" && body?.message
          ? body.message
          : `HTTP ${response.status}`;

      const error = new Error(message);

      error.status = response.status;
      error.body = body;

      throw error;
    }

    return body;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch plain text / HTML.
 */
export async function fetchText(
  url,
  options = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
) {
  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        accept:
          "text/plain,text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        ...(options.headers || {}),
      },
    });

    const text = await response.text();

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);

      error.status = response.status;
      error.body = text.slice(0, 4000);

      throw error;
    }

    return {
      status: response.status,
      headers: response.headers,
      text,
    };
  } finally {
    clearTimeout(timer);
  }
}
