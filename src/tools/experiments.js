// ============================================================
// DPDPREADY AI — EXPERIMENTS
// A/B tests and controlled business experiments
// ============================================================

function timestamp() {
  return new Date().toISOString();
}

async function create(env, args = {}) {
  if (!args.name) {
    throw new Error("Experiment name is required");
  }

  const result = await env.DB
    .prepare(
      `
      INSERT INTO ai_experiments
      (
        name,
        hypothesis,
        metric,
        control_name,
        variant_name,
        status,
        metadata_json,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .bind(
      args.name,
      args.hypothesis || null,
      args.metric || null,
      args.controlName || "control",
      args.variantName || "variant",
      args.status || "draft",
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

async function start(env, args = {}) {
  if (!args.id) {
    throw new Error("id is required");
  }

  await env.DB
    .prepare(
      `
      UPDATE ai_experiments
      SET
        status = 'running',
        started_at = ?,
        updated_at = ?
      WHERE id = ?
      `
    )
    .bind(
      timestamp(),
      timestamp(),
      args.id
    )
    .run();

  return {
    ok: true,
    id: args.id,
    status: "running",
  };
}

async function stop(env, args = {}) {
  if (!args.id) {
    throw new Error("id is required");
  }

  await env.DB
    .prepare(
      `
      UPDATE ai_experiments
      SET
        status = 'stopped',
        stopped_at = ?,
        updated_at = ?
      WHERE id = ?
      `
    )
    .bind(
      timestamp(),
      timestamp(),
      args.id
    )
    .run();

  return {
    ok: true,
    id: args.id,
    status: "stopped",
  };
}

async function record(env, args = {}) {
  if (!args.experimentId) {
    throw new Error(
      "experimentId is required"
    );
  }

  if (!args.variant) {
    throw new Error(
      "variant is required"
    );
  }

  if (args.value === undefined) {
    throw new Error(
      "value is required"
    );
  }

  const result = await env.DB
    .prepare(
      `
      INSERT INTO ai_experiment_observations
      (
        experiment_id,
        variant,
        subject_id,
        metric,
        value,
        metadata_json,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `
    )
    .bind(
      args.experimentId,
      args.variant,
      args.subjectId || null,
      args.metric || null,
      Number(args.value),
      JSON.stringify(args.metadata || {}),
      timestamp()
    )
    .run();

  return {
    ok: true,
    id: result.meta?.last_row_id || null,
  };
}

async function analyze(env, args = {}) {
  if (!args.experimentId) {
    throw new Error(
      "experimentId is required"
    );
  }

  const result = await env.DB
    .prepare(
      `
      SELECT
        variant,
        COUNT(*) AS observations,
        AVG(value) AS average_value,
        MIN(value) AS min_value,
        MAX(value) AS max_value
      FROM ai_experiment_observations
      WHERE experiment_id = ?
      GROUP BY variant
      ORDER BY variant
      `
    )
    .bind(args.experimentId)
    .all();

  const rows = result.results || [];

  if (!rows.length) {
    return {
      experimentId: args.experimentId,
      variants: [],
      conclusion:
        "No observations available.",
    };
  }

  const variants = rows.map((row) => ({
    variant: row.variant,
    observations: Number(
      row.observations || 0
    ),
    average: Number(
      row.average_value || 0
    ),
    min: Number(row.min_value || 0),
    max: Number(row.max_value || 0),
  }));

  const sorted = [...variants].sort(
    (a, b) => b.average - a.average
  );

  return {
    experimentId: args.experimentId,
    variants,
    apparentLeader:
      sorted[0]?.variant || null,
    conclusion:
      "This comparison is descriptive, not a statistical significance test.",
  };
}

export function createExperimentsTool(env) {
  return {
    create: (args) =>
      create(env, args),

    start: (args) =>
      start(env, args),

    stop: (args) =>
      stop(env, args),

    record: (args) =>
      record(env, args),

    analyze: (args) =>
      analyze(env, args),
  };
}
