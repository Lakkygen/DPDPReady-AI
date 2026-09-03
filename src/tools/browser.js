// ============================================================
// DPDPREADY AI — REMOTE BROWSER TOOL
// Designed for Cloudflare Workers.
// Uses Browserless-compatible HTTP APIs.
// ============================================================

import { fetchJson } from "../utils/http.js";
import { assertUrl, assertString, assertNumber } from "../utils/validation.js";

const DEFAULT_TIMEOUT = 30_000;

function createBrowserClient(env) {
  const apiKey = env.BROWSERLESS_API_KEY;
  const baseUrl =
    env.BROWSERLESS_URL || "https://chrome.browserless.io";

  if (!apiKey) {
    throw new Error("BROWSERLESS_API_KEY is not configured");
  }

  async function request(path, options = {}, timeout = DEFAULT_TIMEOUT) {
    const separator = path.includes("?") ? "&" : "?";

    return fetchJson(
      `${baseUrl.replace(/\/$/, "")}${path}${separator}token=${encodeURIComponent(apiKey)}`,
      {
        ...options,
        headers: {
          "content-type": "application/json",
          ...(options.headers || {}),
        },
      },
      timeout
    );
  }

  async function content({ url, waitFor = 1000 }) {
    assertUrl(url);

    return request("/content", {
      method: "POST",
      body: JSON.stringify({
        url,
        waitForTimeout: waitFor,
      }),
    });
  }

  async function screenshot({
    url,
    fullPage = true,
    waitFor = 1000,
  }) {
    assertUrl(url);

    const result = await request("/screenshot", {
      method: "POST",
      body: JSON.stringify({
        url,
        fullPage,
        waitForTimeout: waitFor,
        type: "png",
      }),
    });

    return result;
  }

  async function run({
    code,
    context = {},
  }) {
    assertString(code, "code", 12_000);

    return request("/function", {
      method: "POST",
      body: JSON.stringify({
        code,
        context,
      }),
    });
  }

  async function inspect({ url }) {
    const page = await content({ url });

    return {
      url,
      html:
        typeof page === "string"
          ? page.slice(0, 50_000)
          : page,
    };
  }

  return {
    content,
    screenshot,
    run,
    inspect,
  };
}

export { createBrowserClient };
