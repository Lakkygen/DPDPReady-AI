// ============================================================
// DPDPREADY AI — CRM TOOL
// ============================================================

async function pipeline(env, args = {}) {
  const db = env.DB;

  const result = await db
    .prepare(
      `
      SELECT
        status,
        COUNT(*) AS count,
        AVG(score) AS average_score
      FROM ai_leads
      GROUP BY status
      ORDER BY count DESC
      `
    )
    .all();

  return result.results || [];
}

async function nextActions(env, args = {}) {
  const db = env.DB;

  const limit = Math.min(
    Math.max(Number(args.limit || 10), 1),
    50
  );

  const result = await db
    .prepare(
      `
      SELECT *
      FROM ai_leads
      WHERE status IN ('new', 'qualified', 'nurture')
      ORDER BY score DESC, updated_at ASC
      LIMIT ?
      `
    )
    .bind(limit)
    .all();

  return (result.results || []).map((lead) => {
    let action = "Review lead";

    if (lead.status === "new") {
      action = "Qualify and verify contact";
    } else if (lead.status === "qualified") {
      action = "Prepare personalized outreach";
    } else if (lead.status === "nurture") {
      action = "Follow up with useful content";
    }

    return {
      lead,
      recommendedAction: action,
    };
  });
}

async function updateLead(env, args = {}) {
  if (!args.id) {
    throw new Error("id is required");
  }

  const allowed = [
    "status",
    "score",
    "notes",
    "title",
    "company",
    "domain",
  ];

  const fields = allowed.filter(
    (field) => args[field] !== undefined
  );

  if (!fields.length) {
    throw new Error("No CRM fields supplied");
  }

  const values = fields.map((field) => args[field]);

  const assignments = fields
    .map((field) => `${field} = ?`)
    .join(", ");

  await env.DB
    .prepare(
      `
      UPDATE ai_leads
      SET ${assignments},
          updated_at = datetime('now')
      WHERE id = ?
      `
    )
    .bind(...values, args.id)
    .run();

  return {
    ok: true,
    id: args.id,
    updated: fields,
  };
}

export function createCRMTool(env) {
  return {
    pipeline: (args) => pipeline(env, args),
    nextActions: (args) => nextActions(env, args),
    updateLead: (args) => updateLead(env, args),
  };
}
