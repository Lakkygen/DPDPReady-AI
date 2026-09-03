// ============================================================
// DPDPREADY AI — RESEARCH MEMORY
// Long-term memory specifically for David
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

async function remember(env, args = {}) {
  const db = env.DB;

  if (!args.key) {
    throw new Error("key is required");
  }

  if (!args.value) {
    throw new Error("value is required");
  }

  const value =
    typeof args.value === "string"
      ? args.value
      : JSON.stringify(args.value);

  const source =
    args.source || null;

  await db
    .prepare(
      `
      INSERT INTO ai_research_memory
      (
        memory_key,
        memory_value,
        source,
        confidence,
        metadata_json,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(memory_key)
      DO UPDATE SET
        memory_value = excluded.memory_value,
        source = excluded.source,
        confidence = excluded.confidence,
        metadata_json = excluded.metadata_json,
        updated_at = datetime('now')
      `
    )
    .bind(
      args.key,
      value,
      source,
      Number(args.confidence ?? 0),
      JSON.stringify(args.metadata || {})
    )
    .run();

  return {
    ok: true,
    key: args.key,
  };
}

async function get(env, args = {}) {
  const db = env.DB;

  if (!args.key) {
    throw new Error("key is required");
  }

  const row = await db
    .prepare(
      `
      SELECT *
      FROM ai_research_memory
      WHERE memory_key = ?
      LIMIT 1
      `
    )
    .bind(args.key)
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

  const limit = Math.min(
    Math.max(Number(args.limit || 20), 1),
    100
  );

  const result = await db
    .prepare(
      `
      SELECT *
      FROM ai_research_memory
      WHERE
        memory_key LIKE ?
        OR memory_value LIKE ?
        OR source LIKE ?
      ORDER BY updated_at DESC
      LIMIT ?
      `
    )
    .bind(
      query,
      query,
      query,
      limit
    )
    .all();

  return (result.results || []).map((row) => ({
    ...row,
    metadata: parseJson(row.metadata_json),
  }));
}

export function createResearchMemoryTool(env) {
  return {
    remember: (args) =>
      remember(env, args),

    get: (args) =>
      get(env, args),

    search: (args) =>
      search(env, args),
  };
}
