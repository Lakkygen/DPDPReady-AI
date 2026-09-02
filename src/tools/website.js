import { fetchText } from "../utils/http.js";
import {
  assertUrl,
  clamp,
} from "../utils/validation.js";

const MAX_HTML_SIZE = 250_000;

function stripHtml(html) {
  return html
    .replace(
      /<script[\s\S]*?<\/script>/gi,
      " "
    )
    .replace(
      /<style[\s\S]*?<\/style>/gi,
      " "
    )
    .replace(
      /<noscript[\s\S]*?<\/noscript>/gi,
      " "
    )
    .replace(
      /<svg[\s\S]*?<\/svg>/gi,
      " "
    )
    .replace(
      /<[^>]+>/g,
      " "
    )
    .replace(
      /&nbsp;/gi,
      " "
    )
    .replace(
      /&amp;/gi,
      "&"
    )
    .replace(
      /&quot;/gi,
      '"'
    )
    .replace(
      /&#39;/gi,
      "'"
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function getTitle(html) {
  const match = html.match(
    /<title[^>]*>([\s\S]*?)<\/title>/i
  );

  if (!match) {
    return null;
  }

  return match[1]
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

function getMetaContent(
  html,
  name
) {
  const escapedName = name.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

  const patterns = [
    new RegExp(
      `<meta[^>]+(?:name|property)=["']${escapedName}["'][^>]+content=["']([^"']*)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${escapedName}["']`,
      "i"
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      return match[1].trim().slice(0, 2_000);
    }
  }

  return null;
}

function extractLinks(
  html,
  baseUrl
) {
  const links = new Set();

  for (const match of html.matchAll(
    /<a[^>]+href=["']([^"']+)["']/gi
  )) {
    const href = match[1]?.trim();

    if (!href) {
      continue;
    }

    try {
      const url = new URL(
        href,
        baseUrl
      );

      if (
        url.protocol === "http:" ||
        url.protocol === "https:"
      ) {
        links.add(url.toString());
      }
    } catch {
      // Ignore malformed links.
    }

    if (links.size >= 50) {
      break;
    }
  }

  return [...links];
}

function hasPattern(
  html,
  pattern
) {
  return pattern.test(html);
}

export async function inspectWebsite({
  url,
  maxChars = 12_000,
} = {}) {
  const normalizedUrl = assertUrl(
    String(url || "").trim(),
    "url"
  );

  const result = await fetchText(
    normalizedUrl,
    {
      redirect: "follow",
      headers: {
        "user-agent":
          "DPDPReady-AI/1.0",
      },
    }
  );

  const html = result.text.slice(
    0,
    MAX_HTML_SIZE
  );

  const text = stripHtml(html);

  const safeMaxChars = clamp(
    maxChars,
    500,
    30_000
  );

  const privacyPolicy =
    hasPattern(
      html,
      /privacy[\s_-]?(policy|notice)/i
    );

  const terms =
    hasPattern(
      html,
      /\bterms(?:\s+of\s+(?:service|use))?\b/i
    );

  const cookies =
    hasPattern(
      html,
      /\bcookies?\b/i
    );

  const consent =
    hasPattern(
      html,
      /\b(cookie\s+consent|consent\s+manager|consent\s+preferences|accept\s+cookies?)\b/i
    );

  const dataDeletion =
    hasPattern(
      html,
      /\b(delete|deletion|erase|erasure)\b.{0,80}\b(data|account|personal)\b/i
    );

  const contact =
    hasPattern(
      html,
      /\b(contact|support|email\s+us)\b/i
    );

  const formInputs =
    (
      html.match(
        /<(input|textarea|select)\b/gi
      ) || []
    ).length;

  return {
    url: normalizedUrl,
    status: result.status,

    title: getTitle(html),

    description:
      getMetaContent(
        html,
        "description"
      ),

    viewport:
      Boolean(
        getMetaContent(
          html,
          "viewport"
        )
      ),

    signals: {
      privacyPolicy,
      terms,
      cookies,
      consent,
      dataDeletion,
      contact,
      formInputs,
    },

    text: text.slice(
      0,
      safeMaxChars
    ),

    links: extractLinks(
      html,
      normalizedUrl
    ),
  };
}
