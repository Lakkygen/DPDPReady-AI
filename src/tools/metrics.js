// ============================================================
// DPDPREADY AI — METRICS
// Sofia / Analytics
// ============================================================

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function scalar(db, query, binds = []) {
  const statement = db.prepare(query);

  const result = binds.length
    ? await statement.bind(...binds).first()
    : await statement.first();

  return result || {};
}

async function snapshot(env) {
  const db = env.DB;

  if (!db) {
    throw new Error("DB binding is required");
  }

  const users = await scalar(
    db,
    `
    SELECT COUNT(*) AS total
    FROM users
    `
  );

  const audits = await scalar(
    db,
    `
    SELECT COUNT(*) AS total
    FROM audits
    `
  );

  const payments = await scalar(
    db,
    `
    SELECT
      COUNT(*) AS transactions,
      COALESCE(SUM(amount), 0) AS revenue
    FROM payments
    WHERE status = 'completed'
    `
  );

  const leads = await scalar(
    db,
    `
    SELECT COUNT(*) AS total
    FROM ai_leads
    `
  );

  const customers = await scalar(
    db,
    `
    SELECT COUNT(*) AS total
    FROM ai_customers
    `
  );

  const tickets = await scalar(
    db,
    `
    SELECT
      COUNT(*) AS total,
      SUM(
        CASE
          WHEN status IN ('open', 'pending', 'in_progress')
          THEN 1
          ELSE 0
        END
      ) AS open
    FROM ai_tickets
    `
  );

  return {
    users: number(users.total),
    audits: number(audits.total),
    transactions: number(payments.transactions),
    revenue: number(payments.revenue),
    leads: number(leads.total),
    customers: number(customers.total),
    tickets: {
      total: number(tickets.total),
      open: number(tickets.open),
    },
    generatedAt: new Date().toISOString(),
  };
}

async function funnel(env) {
  const db = env.DB;

  const users = await scalar(
    db,
    `SELECT COUNT(*) AS count FROM users`
  );

  const audited = await scalar(
    db,
    `
    SELECT COUNT(DISTINCT user_id) AS count
    FROM audits
    `
  );

  const paying = await scalar(
    db,
    `
    SELECT COUNT(DISTINCT user_id) AS count
    FROM payments
    WHERE status = 'completed'
    `
  );

  const totalUsers = number(users.count);
  const auditedUsers = number(audited.count);
  const payingUsers = number(paying.count);

  return {
    stages: [
      {
        name: "users",
        count: totalUsers,
        conversion: 100,
      },
      {
        name: "audited",
        count: auditedUsers,
        conversion:
          totalUsers > 0
            ? (auditedUsers / totalUsers) * 100
            : 0,
      },
      {
        name: "paying",
        count: payingUsers,
        conversion:
          auditedUsers > 0
            ? (payingUsers / auditedUsers) * 100
            : 0,
      },
    ],
  };
}

async function daily(env, args = {}) {
  const db = env.DB;

  const days = Math.min(
    Math.max(Number(args.days || 30), 1),
    90
  );

  const result = await db
    .prepare(
      `
      WITH RECURSIVE dates(day) AS (
        SELECT date('now', '-' || (? - 1) || ' days')
        UNION ALL
        SELECT date(day, '+1 day')
        FROM dates
        WHERE day < date('now')
      )
      SELECT
        dates.day,

        (
          SELECT COUNT(*)
          FROM users
          WHERE date(created_at) = dates.day
        ) AS users,

        (
          SELECT COUNT(*)
          FROM audits
          WHERE date(created_at) = dates.day
        ) AS audits,

        (
          SELECT COUNT(*)
          FROM payments
          WHERE date(created_at) = dates.day
            AND status = 'completed'
        ) AS payments,

        (
          SELECT COALESCE(SUM(amount), 0)
          FROM payments
          WHERE date(created_at) = dates.day
            AND status = 'completed'
        ) AS revenue

      FROM dates
      ORDER BY dates.day ASC
      `
    )
    .bind(days)
    .all();

  return (result.results || []).map((row) => ({
    day: row.day,
    users: number(row.users),
    audits: number(row.audits),
    payments: number(row.payments),
    revenue: number(row.revenue),
  }));
}

export function createMetricsTool(env) {
  return {
    snapshot: (args) =>
      snapshot(env, args),

    funnel: (args) =>
      funnel(env, args),

    daily: (args) =>
      daily(env, args),
  };
}
