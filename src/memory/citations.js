// ============================================================
// DPDPREADY AI — RESEARCH CITATIONS
// Persistent source/citation database
// ============================================================

function parseJson(value, fallback = {}) {
  if (!value) return fallback;

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function save(env, args = {}) {
  const db = env.DB;

  if (!args.url) {
    throw new Error("url is required");
  }

  const result = await db
    .prepare(
      `
      INSERT INTO ai_citations
      (
        title,
        url,
        publisher,
        published_at,
        accessed_at,
        claim,
        reliability,
        metadata_json,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `
    )
    .bind(
      args.title || null,
      args.url,
      args.publisher || null,
      args.publishedAt || null,
      args.accessedAt ||
        new Date().toISOString(),
      args.claim || null,
      args.reliability || "unknown",
      JSON.stringify(args.metadata || {})
    )
    .run();

  return {
    ok: true,
    id: result.meta?.last_row_id || null,
  };
}

async function get(env, args = {}) {
  const db = env.DB;

  if (!args.id) {
    throw new Error("id is required");
  }

  const row = await db
    .prepare(
      `
      SELECT *
      FROM ai_citations
      WHERE id = ?
      LIMIT 1
      `
    )
    .bind(args.id)
    .first();

  if (!row) {
    return null;
  }

  return {
    ...row,
    metadata: parseJson(row.metadata_json),
  };
}

async function search(env, args = {}) {
  const db = env.DB;

  if (!args.query) {
    throw new Error("query is required");
  }

  const query = `%${String(args.query).trim()}%`;

  const result = await db
    .prepare(
      `
      SELECT *
      FROM ai_citations
      WHERE
        title LIKE ?
        OR publisher LIKE ?
        OR claim LIKE ?
        OR url LIKE ?
      ORDER BY created_at DESC
      LIMIT ?
      `
    )
    .bind(
      query,
      query,
      query,
      query,
      Math.min(Number(args.limit || 20), 100)
    )
    .all();

  return (result.results || []).map((row) => ({
    ...row,
    metadata: parseJson(row.metadata_json),
  }));
}

function format(citation) {
  if (!citation) {
    return "";
  }

  const title =
    citation.title ||
    citation.url ||
    "Untitled source";

  const publisher =
    citation.publisher
      ? ` — ${citation.publisher}`
      : "";

  const date =
    citation.published_at
      ? ` (${citation.published_at})`
      : "";

  return `${title}${publisher}${date}\n${citation.url}`;
}

export function createCitationsTool(env) {
  return {
    save: (args) =>
      save(env, args),

    get: (args) =>
      get(env, args),

    search: (args) =>
      search(env, args),

    format,
  };
}
