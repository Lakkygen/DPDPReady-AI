// src/tools/web.js

import {
  fetchJson,
  fetchText,
} from "../utils/http.js";

const DEFAULT_TAVILY_BASE_URL = "https://api.tavily.com";
const DEFAULT_TIMEOUT_MS = 20_000;

function cleanQuery(query) {
  const value = String(query || "").trim();

  if (!value) {
    throw new Error("query is required");
  }

  if (value.length > 400) {
    throw new Error("query exceeds 400 characters");
  }

  return value;
}

function cleanUrl(url) {
  const value = String(url || "").trim();

  if (!/^https?:\/\//i.test(value)) {
    throw new Error("A valid HTTP(S) URL is required");
  }

  return value;
}

function cleanCount(count) {
  return Math.min(
    Math.max(Number(count) || 10, 1),
    20,
  );
}

function cleanSearchDepth(value) {
  const normalized = String(value || "basic")
    .trim()
    .toLowerCase();

  return normalized === "advanced"
    ? "advanced"
    : "basic";
}

function cleanTopic(value) {
  const normalized = String(value || "general")
    .trim()
    .toLowerCase();

  return normalized === "news"
    ? "news"
    : "general";
}

function normalizeResult(item) {
  return {
    title: item?.title || null,
    url: item?.url || null,
    description:
      item?.content ||
      item?.snippet ||
      null,
    content: item?.content || null,
    score:
      typeof item?.score === "number"
        ? item.score
        : null,
    publishedDate:
      item?.published_date ||
      item?.publishedDate ||
      null,
    rawContent:
      item?.raw_content ||
      item?.rawContent ||
      null,
  };
}

export function createWebClient(env = {}) {
  const tavilyBaseUrl =
    String(
      env.TAVILY_BASE_URL ||
        DEFAULT_TAVILY_BASE_URL,
    ).replace(/\/+$/, "");

  async function search({
    query,
    count = 10,
    country =
      env.SEARCH_COUNTRY || "IN",
    searchLang =
      env.SEARCH_LANG || "en",
    searchDepth = "basic",
    topic = "general",
    includeAnswer = false,
    includeRawContent = false,
    includeImages = false,
    includeDomains = [],
    excludeDomains = [],
  } = {}) {
    const apiKey = env.TAVILY_API_KEY;

    if (!apiKey) {
      throw new Error(
        "TAVILY_API_KEY is not configured",
      );
    }

    const safeCount = cleanCount(count);
    const safeQuery = cleanQuery(query);
    const safeSearchDepth =
      cleanSearchDepth(searchDepth);
    const safeTopic = cleanTopic(topic);

    const body = {
      query: safeQuery,
      search_depth: safeSearchDepth,
      topic: safeTopic,
      max_results: safeCount,
      include_answer: Boolean(includeAnswer),
      include_raw_content: Boolean(
        includeRawContent,
      ),
      include_images: Boolean(includeImages),
    };

    // Tavily does not use Brave's country/search_lang
    // parameters directly. We preserve the existing
    // web tool interface and use the values as optional
    // query hints rather than sending unsupported fields.
    const countryValue = String(country || "").trim();
    const languageValue = String(
      searchLang || "",
    ).trim();

    if (
      countryValue &&
      !safeQuery
        .toLowerCase()
        .includes(countryValue.toLowerCase())
    ) {
      body.query = `${safeQuery} ${countryValue}`;
    }

    if (
      languageValue &&
      languageValue !== "en"
    ) {
      body.query = `${body.query} language:${languageValue}`;
    }

    const normalizedIncludeDomains =
      Array.isArray(includeDomains)
        ? includeDomains
            .map((domain) =>
              String(domain || "").trim(),
            )
            .filter(Boolean)
        : [];

    const normalizedExcludeDomains =
      Array.isArray(excludeDomains)
        ? excludeDomains
            .map((domain) =>
              String(domain || "").trim(),
            )
            .filter(Boolean)
        : [];

    if (normalizedIncludeDomains.length > 0) {
      body.include_domains =
        normalizedIncludeDomains;
    }

    if (normalizedExcludeDomains.length > 0) {
      body.exclude_domains =
        normalizedExcludeDomains;
    }

    const data = await fetchJson(
      `${tavilyBaseUrl}/search`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      },
      Number(
        env.TAVILY_TIMEOUT_MS ||
          DEFAULT_TIMEOUT_MS,
      ),
    );

    const results = Array.isArray(
      data?.results,
    )
      ? data.results.map(normalizeResult)
      : [];

    return {
      query: safeQuery,
      results,
      count: results.length,
      answer:
        typeof data?.answer === "string"
          ? data.answer
          : null,
      images: Array.isArray(data?.images)
        ? data.images
        : [],
      responseTime:
        data?.response_time ?? null,
      searchDepth: safeSearchDepth,
      topic: safeTopic,
    };
  }

  async function fetchPage({
    url,
    maxChars = 20_000,
  } = {}) {
    const normalizedUrl = cleanUrl(url);

    const result = await fetchText(
      normalizedUrl,
      {
        redirect: "follow",

        headers: {
          "user-agent":
            "DPDPReady-AI/1.0",
        },
      },
      Number(
        env.TAVILY_TIMEOUT_MS ||
          DEFAULT_TIMEOUT_MS,
      ),
    );

    const safeMax = Math.min(
      Math.max(
        Number(maxChars) || 20_000,
        500,
      ),
      50_000,
    );

    return {
      url: normalizedUrl,
      status: result.status,
      text: result.text.slice(
        0,
        safeMax,
      ),
    };
  }

  return {
    search,
    fetchPage,
  };
}
