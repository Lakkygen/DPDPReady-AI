import {
  fetchJson,
  fetchText,
} from "../utils/http.js";

function cleanQuery(query) {
  const value =
    String(query || "")
      .trim();

  if (!value) {
    throw new Error(
      "query is required"
    );
  }

  if (value.length > 400) {
    throw new Error(
      "query exceeds 400 characters"
    );
  }

  return value;
}

function cleanUrl(url) {
  const value =
    String(url || "")
      .trim();

  if (!/^https?:\/\//i.test(value)) {
    throw new Error(
      "A valid HTTP(S) URL is required"
    );
  }

  return value;
}

export function createWebClient(
  env
) {
  async function search({
    query,

    count = 10,

    country =
      env.SEARCH_COUNTRY || "IN",

    searchLang =
      env.SEARCH_LANG || "en",
  } = {}) {
    const apiKey =
      env.BRAVE_SEARCH_API_KEY;

    if (!apiKey) {
      throw new Error(
        "BRAVE_SEARCH_API_KEY is not configured"
      );
    }

    const safeCount =
      Math.min(
        Math.max(
          Number(count) || 10,
          1
        ),
        20
      );

    const params =
      new URLSearchParams();

    params.set(
      "q",
      cleanQuery(query)
    );

    params.set(
      "count",
      String(safeCount)
    );

    params.set(
      "country",
      country
    );

    params.set(
      "search_lang",
      searchLang
    );

    const data =
      await fetchJson(
        `https://api.search.brave.com/res/v1/web/search?${params.toString()}`,
        {
          headers: {
            "X-Subscription-Token":
              apiKey,

            "Accept-Encoding":
              "gzip",
          },
        }
      );

    const results =
      (
        data?.web?.results ||
        []
      ).map(
        (item) => ({
          title:
            item.title ||
            null,

          url:
            item.url ||
            null,

          description:
            item.description ||
            null,

          age:
            item.age ||
            null,

          language:
            item.language ||
            null,
        })
      );

    return {
      query,
      results,

      count:
        results.length,

      moreResultsAvailable:
        Boolean(
          data?.query
            ?.more_results_available
        ),
    };
  }

  async function fetchPage({
    url,
    maxChars = 20_000,
  } = {}) {
    const normalizedUrl =
      cleanUrl(url);

    const result =
      await fetchText(
        normalizedUrl,
        {
          redirect: "follow",

          headers: {
            "user-agent":
              "DPDPReady-AI/1.0",
          },
        }
      );

    const safeMax =
      Math.min(
        Math.max(
          Number(maxChars) ||
            20_000,
          500
        ),
        50_000
      );

    return {
      url:
        normalizedUrl,

      status:
        result.status,

      text:
        result.text.slice(
          0,
          safeMax
        ),
    };
  }

  return {
    search,
    fetchPage,
  };
}
