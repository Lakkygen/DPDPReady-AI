// ============================================================
// DPDPREADY AI — LEAD MANAGEMENT
// ============================================================

function now() {
  return new Date().toISOString();
}

function normalizeEmail(email) {
  return email ? String(email).trim().toLowerCase() : null;
}

async function create(env, args = {}) {
  const db = env.DB;

  if (!db) {
    throw new Error("DB binding is required");
  }

  const email = normalizeEmail(args.email);

  if (!email && !args.company) {
    throw new Error("email or company is required");
  }

  const result = await db
    .prepare(
      `
      INSERT INTO ai_leads
      (
        email,
        name,
        company,
        domain,
        title,
        source,
        status,
        score,
        notes,
        metadata_json,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .bind(
      email,
      args.name || null,
      args.company || null,
      args.domain || null,
      args.title || null,
      args.source || "unknown",
      args.status || "new",
      Number(args.score || 0),
      args.notes || null,
      JSON.stringify(args.metadata || {}),
      now(),
      now()
    )
    .run();

  return {
    ok: true,
    id: result.meta?.last_row_id || null,
  };
}

async function get(env, args = {}) {
  const db = env.DB;

  if (!args.id && !args.email) {
    throw new Error("id or email is required");
  }

  let row;

  if (args.id) {
    row = await db
      .prepare(
        `
        SELECT *
        FROM ai_leads
        WHERE id = ?
        LIMIT 1
        `
      )
      .bind(args.id)
      .first();
  } else {
    row = await db
      .prepare(
        `
        SELECT *
        FROM ai_leads
        WHERE lower(email) = lower(?)
        LIMIT 1
        `
      )
      .bind(normalizeEmail(args.email))
      .first();
  }

  return row || null;
}

async function list(env, args = {}) {
  const db = env.DB;

  const limit = Math.min(
    Math.max(Number(args.limit || 25), 1),
    100
  );

  const status = args.status || null;

  let result;

  if (status) {
    result = await db
      .prepare(
        `
        SELECT *
        FROM ai_leads
        WHERE status = ?
        ORDER BY score DESC, created_at DESC
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
        FROM ai_leads
        ORDER BY score DESC, created_at DESC
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

  const allowed = [
    "name",
    "email",
    "company",
    "domain",
    "title",
    "source",
    "status",
    "score",
    "notes",
    "metadata_json",
  ];

  const changes = [];

  for (const field of allowed) {
    if (args[field] !== undefined) {
      changes.push(field);
    }
  }

  if (!changes.length) {
    throw new Error("No fields to update");
  }

  const values = changes.map((field) => {
    if (field === "email") {
      return normalizeEmail(args[field]);
    }

    if (field === "metadata_json") {
      return typeof args[field] === "string"
        ? args[field]
        : JSON.stringify(args[field]);
    }

    return args[field];
  });

  const assignments = changes
    .map((field) => `${field} = ?`)
    .join(", ");

  await db
    .prepare(
      `
      UPDATE ai_leads
      SET ${assignments},
          updated_at = ?
      WHERE id = ?
      `
    )
    .bind(...values, now(), args.id)
    .run();

  return {
    ok: true,
    id: args.id,
    updated: changes,
  };
}

async function qualify(env, args = {}) {
  if (!args.id) {
    throw new Error("id is required");
  }

  const score = Math.min(
    Math.max(Number(args.score ?? 50), 0),
    100
  );

  const status =
    args.status ||
    (score >= 75
      ? "qualified"
      : score >= 40
        ? "nurture"
        : "unqualified");

  return update(env, {
    id: args.id,
    score,
    status,
    notes: args.notes,
  });
}

async function verify(env, args = {}) {
  if (!args.email) {
    throw new Error("email is required");
  }

  if (!env.__emailVerification) {
    throw new Error(
      "Email verification client is not attached to leads tool"
    );
  }

  const result = await env.__emailVerification.verify({
    email: args.email,
  });

  if (args.id) {
    await update(env, {
      id: args.id,
      metadata_json: {
        emailVerification: result,
      },
    });
  }

  return result;
}

async function discoverFromDomains(env, args = {}) {
  const domains = Array.isArray(args.domains)
    ? args.domains
    : [];

  if (!domains.length) {
    throw new Error("domains array is required");
  }

  const limit = Math.min(Number(args.limit || 10), 50);
  const results = [];

  if (!env.__emailVerification) {
    throw new Error(
      "Email verification client is not attached to leads tool"
    );
  }

  for (const domain of domains.slice(0, 20)) {
    try {
      const data =
        await env.__emailVerification.domainSearch({
          domain,
          limit,
        });

      const emails = data?.emails || [];

      for (const email of emails) {
        const created = await create(env, {
          email: email.value || email.email,
          name: [email.first_name, email.last_name]
            .filter(Boolean)
            .join(" "),
          company: email.company || null,
          domain,
          title: email.position || null,
          source: "domain_search",
          score: email.confidence || 0,
          metadata: email,
        });

        results.push({
          domain,
          email: email.value || email.email,
          created,
        });
      }
    } catch (error) {
      results.push({
        domain,
        error: error.message,
      });
    }
  }

  return {
    ok: true,
    total: results.length,
    results,
  };
}

export function createLeadsTool(env, dependencies = {}) {
  const scopedEnv = {
    ...env,
    __emailVerification:
      dependencies.emailVerification || null,
  };

  return {
    create: (args) => create(scopedEnv, args),
    get: (args) => get(scopedEnv, args),
    list: (args) => list(scopedEnv, args),
    update: (args) => update(scopedEnv, args),
    qualify: (args) => qualify(scopedEnv, args),
    verify: (args) => verify(scopedEnv, args),
    discoverFromDomains: (args) =>
      discoverFromDomains(scopedEnv, args),
  };
}
