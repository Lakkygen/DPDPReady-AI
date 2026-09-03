// ============================================================
// DPDPREADY AI — RESEARCH OPERATIONS
// David / Research Director
// ============================================================

function timestamp() {
  return new Date().toISOString();
}

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

// ------------------------------------------------------------
// Save research
// ------------------------------------------------------------

async function save(env, args = {}) {
  const db = env.DB;

  if (!args.title) {
    throw new Error("Research title is required");
  }

  if (!args.summary && !args.content) {
    throw new Error(
      "Research summary or content is required"
    );
  }

  const result = await db
    .prepare(
      `
      INSERT INTO ai_research_items
      (
        title,
        topic,
        summary,
        content,
        confidence,
        status,
        researcher,
        metadata_json,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .bind(
      args.title,
      args.topic || null,
      args.summary || null,
      args.content || null,
      Number(args.confidence ?? 0),
      args.status || "active",
      args.researcher || "david",
      JSON.stringify(args.metadata || {}),
      timestamp(),
      timestamp()
    )
    .run();

  return {
    ok: true,
    id: result.meta?.last_row_id || null,
  };
}

// ------------------------------------------------------------
// Get research
// ------------------------------------------------------------

async function get(env, args = {}) {
  const db = env.DB;

  if (!args.id) {
    throw new Error("id is required");
  }

  const row = await db
    .prepare(
      `
      SELECT *
      FROM ai_research_items
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

// ------------------------------------------------------------
// Search research
// ------------------------------------------------------------

async function search(env, args = {}) {
  const db = env.DB;

  if (!args.query) {
    throw new Error("query is required");
  }

  const limit = Math.min(
    Math.max(Number(args.limit || 20), 1),
    100
  );

  const query = `%${String(args.query).trim()}%`;

  const result = await db
    .prepare(
      `
      SELECT *
      FROM ai_research_items
      WHERE
        title LIKE ?
        OR topic LIKE ?
        OR summary LIKE ?
        OR content LIKE ?
      ORDER BY updated_at DESC
      LIMIT ?
      `
    )
    .bind(
      query,
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

// ------------------------------------------------------------
// List research
// ------------------------------------------------------------

async function list(env, args = {}) {
  const db = env.DB;

  const limit = Math.min(
    Math.max(Number(args.limit || 25), 1),
    100
  );

  const result = await db
    .prepare(
      `
      SELECT *
      FROM ai_research_items
      ORDER BY updated_at DESC
      LIMIT ?
      `
    )
    .bind(limit)
    .all();

  return (result.results || []).map((row) => ({
    ...row,
    metadata: parseJson(row.metadata_json),
  }));
}

// ------------------------------------------------------------
// Regulatory alerts
// ------------------------------------------------------------

async function createAlert(env, args = {}) {
  const db = env.DB;

  if (!args.title) {
    throw new Error("Alert title is required");
  }

  if (!args.trigger) {
    throw new Error(
      "Alert trigger is required"
    );
  }

  const result = await db
    .prepare(
      `
      INSERT INTO ai_research_alerts
      (
        title,
        description,
        trigger,
        severity,
        status,
        source_url,
        metadata_json,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .bind(
      args.title,
      args.description || null,
      args.trigger,
      args.severity || "medium",
      args.status || "active",
      args.sourceUrl || null,
      JSON.stringify(args.metadata || {}),
      timestamp(),
      timestamp()
    )
    .run();

  return {
    ok: true,
    id: result.meta?.last_row_id || null,
  };
}

// ------------------------------------------------------------
// List regulatory alerts
// ------------------------------------------------------------

async function listAlerts(env, args = {}) {
  const db = env.DB;

  const limit = Math.min(
    Math.max(Number(args.limit || 25), 1),
    100
  );

  const result = await db
    .prepare(
      `
      SELECT *
      FROM ai_research_alerts
      WHERE status = ?
      ORDER BY
        CASE severity
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          ELSE 4
        END,
        updated_at DESC
      LIMIT ?
      `
    )
    .bind(
      args.status || "active",
      limit
    )
    .all();

  return (result.results || []).map((row) => ({
    ...row,
    metadata: parseJson(row.metadata_json),
  }));
}

// ------------------------------------------------------------
// Close alert
// ------------------------------------------------------------

async function closeAlert(env, args = {}) {
  const db = env.DB;

  if (!args.id) {
    throw new Error("id is required");
  }

  await db
    .prepare(
      `
      UPDATE ai_research_alerts
      SET
        status = 'closed',
        updated_at = ?
      WHERE id = ?
      `
    )
    .bind(timestamp(), args.id)
    .run();

  return {
    ok: true,
    id: args.id,
    status: "closed",
  };
}

export function createResearchTool(env) {
  return {
    save: (args) => save(env, args),
    get: (args) => get(env, args),
    search: (args) => search(env, args),
    list: (args) => list(env, args),
    createAlert: (args) =>
      createAlert(env, args),
    listAlerts: (args) =>
      listAlerts(env, args),
    closeAlert: (args) =>
      closeAlert(env, args),
  };
}
