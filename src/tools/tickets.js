// ============================================================
// DPDPREADY AI — SUPPORT TICKETS
// ============================================================

function normalizeStatus(status) {
  const allowed = [
    "open",
    "pending",
    "in_progress",
    "resolved",
    "closed",
  ];

  return allowed.includes(status)
    ? status
    : "open";
}

async function create(env, args = {}) {
  const db = env.DB;

  if (!args.subject) {
    throw new Error("subject is required");
  }

  const result = await db
    .prepare(
      `
      INSERT INTO ai_tickets
      (
        customer_id,
        customer_email,
        subject,
        description,
        priority,
        status,
        assigned_to,
        metadata_json,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `
    )
    .bind(
      args.customerId || null,
      args.customerEmail || null,
      args.subject,
      args.description || null,
      args.priority || "normal",
      normalizeStatus(args.status),
      args.assignedTo || null,
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

  return (
    (await db
      .prepare(
        `
        SELECT *
        FROM ai_tickets
        WHERE id = ?
        LIMIT 1
        `
      )
      .bind(args.id)
      .first()) || null
  );
}

async function list(env, args = {}) {
  const db = env.DB;

  const limit = Math.min(
    Math.max(Number(args.limit || 25), 1),
    100
  );

  const status = args.status
    ? normalizeStatus(args.status)
    : null;

  let result;

  if (status) {
    result = await db
      .prepare(
        `
        SELECT *
        FROM ai_tickets
        WHERE status = ?
        ORDER BY created_at DESC
        LIMIT ?
        `
      )
      .bind(status, limit)
      .all();
  } else {
    result = await db
      .prepare(
        `
        SELECT *
        FROM ai_tickets
        ORDER BY created_at DESC
        LIMIT ?
        `
      )
      .bind(limit)
      .all();
  }

  return result.results || [];
}

async function update(env, args = {}) {
  const db = env.DB;

  if (!args.id) {
    throw new Error("id is required");
  }

  const fields = [
    "subject",
    "description",
    "priority",
    "status",
    "assigned_to",
    "customer_email",
    "metadata_json",
  ];

  const updates = [];
  const values = [];

  for (const field of fields) {
    let inputName = field;

    if (field === "assigned_to") {
      inputName = "assignedTo";
    }

    if (field === "customer_email") {
      inputName = "customerEmail";
    }

    if (args[inputName] !== undefined) {
      updates.push(`${field} = ?`);

      let value = args[inputName];

      if (field === "status") {
        value = normalizeStatus(value);
      }

      if (
        field === "metadata_json" &&
        typeof value !== "string"
      ) {
        value = JSON.stringify(value);
      }

      values.push(value);
    }
  }

  if (!updates.length) {
    throw new Error("No fields to update");
  }

  values.push(args.id);

  await db
    .prepare(
      `
      UPDATE ai_tickets
      SET ${updates.join(", ")},
          updated_at = datetime('now')
      WHERE id = ?
      `
    )
    .bind(...values)
    .run();

  return {
    ok: true,
    id: args.id,
    updated: updates.map((item) =>
      item.split(" = ")[0]
    ),
  };
}

export function createTicketsTool(env) {
  return {
    create: (args) => create(env, args),
    get: (args) => get(env, args),
    list: (args) => list(env, args),
    update: (args) => update(env, args),
  };
}
