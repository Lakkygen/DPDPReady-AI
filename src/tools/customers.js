// ============================================================
// DPDPREADY AI — CUSTOMER MANAGEMENT
// ============================================================

async function get(env, args = {}) {
  const db = env.DB;

  if (!args.id && !args.email) {
    throw new Error("id or email is required");
  }

  if (args.id) {
    return (
      (await db
        .prepare(
          `
          SELECT *
          FROM ai_customers
          WHERE id = ?
          LIMIT 1
          `
        )
        .bind(args.id)
        .first()) || null
    );
  }

  return (
    (await db
      .prepare(
        `
        SELECT *
        FROM ai_customers
        WHERE lower(email) = lower(?)
        LIMIT 1
        `
      )
      .bind(String(args.email).trim().toLowerCase())
      .first()) || null
  );
}

async function upsert(env, args = {}) {
  const db = env.DB;

  if (!args.email) {
    throw new Error("email is required");
  }

  const email = String(args.email).trim().toLowerCase();

  const existing = await db
    .prepare(
      `
      SELECT id
      FROM ai_customers
      WHERE lower(email) = lower(?)
      LIMIT 1
      `
    )
    .bind(email)
    .first();

  if (existing) {
    const fields = [
      "name",
      "company",
      "plan",
      "status",
      "notes",
      "metadata_json",
    ];

    const updates = [];
    const values = [];

    for (const field of fields) {
      if (args[field] !== undefined) {
        updates.push(`${field} = ?`);

        values.push(
          field === "metadata_json" &&
            typeof args[field] !== "string"
            ? JSON.stringify(args[field])
            : args[field]
        );
      }
    }

    if (!updates.length) {
      return {
        ok: true,
        id: existing.id,
        created: false,
        updated: false,
      };
    }

    values.push(existing.id);

    await db
      .prepare(
        `
        UPDATE ai_customers
        SET ${updates.join(", ")},
            updated_at = datetime('now')
        WHERE id = ?
        `
      )
      .bind(...values)
      .run();

    return {
      ok: true,
      id: existing.id,
      created: false,
      updated: true,
    };
  }

  const result = await db
    .prepare(
      `
      INSERT INTO ai_customers
      (
        email,
        name,
        company,
        plan,
        status,
        notes,
        metadata_json,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `
    )
    .bind(
      email,
      args.name || null,
      args.company || null,
      args.plan || null,
      args.status || "active",
      args.notes || null,
      JSON.stringify(args.metadata || {})
    )
    .run();

  return {
    ok: true,
    id: result.meta?.last_row_id || null,
    created: true,
  };
}

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
      FROM ai_customers
      ORDER BY created_at DESC
      LIMIT ?
      `
    )
    .bind(limit)
    .all();

  return result.results || [];
}

export function createCustomersTool(env) {
  return {
    get: (args) => get(env, args),
    upsert: (args) => upsert(env, args),
    list: (args) => list(env, args),
  };
}
