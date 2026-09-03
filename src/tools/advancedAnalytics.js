// ============================================================
// DPDPREADY AI — ADVANCED ANALYTICS
// ============================================================

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function cohort(env, args = {}) {
  const db = env.DB;

  const months = Math.min(
    Math.max(Number(args.months || 6), 1),
    24
  );

  const result = await db
    .prepare(
      `
      WITH cohorts AS (
        SELECT
          id,
          strftime('%Y-%m', created_at) AS cohort_month
        FROM users
      ),
      activity AS (
        SELECT
          user_id,
          strftime('%Y-%m', created_at) AS activity_month
        FROM audits
        GROUP BY user_id, activity_month
      )
      SELECT
        cohorts.cohort_month,
        activity.activity_month,
        COUNT(DISTINCT cohorts.id) AS users
      FROM cohorts
      LEFT JOIN activity
        ON activity.user_id = cohorts.id
      WHERE cohorts.cohort_month >=
        strftime(
          '%Y-%m',
          date('now', '-' || ? || ' months')
        )
      GROUP BY
        cohorts.cohort_month,
        activity.activity_month
      ORDER BY
        cohorts.cohort_month,
        activity.activity_month
      `
    )
    .bind(months)
    .all();

  return result.results || [];
}

async function revenue(env, args = {}) {
  const db = env.DB;

  const days = Math.min(
    Math.max(Number(args.days || 90), 1),
    365
  );

  const result = await db
    .prepare(
      `
      SELECT
        date(created_at) AS day,
        COUNT(*) AS transactions,
        COALESCE(SUM(amount), 0) AS revenue,
        COALESCE(AVG(amount), 0) AS average_transaction
      FROM payments
      WHERE
        status = 'completed'
        AND date(created_at) >=
          date('now', '-' || ? || ' days')
      GROUP BY date(created_at)
      ORDER BY day ASC
      `
    )
    .bind(days)
    .all();

  return (result.results || []).map((row) => ({
    day: row.day,
    transactions: number(row.transactions),
    revenue: number(row.revenue),
    averageTransaction: number(
      row.average_transaction
    ),
  }));
}

async function campaignEfficiency(env) {
  const db = env.DB;

  const result = await db
    .prepare(
      `
      SELECT
        c.id,
        c.name,
        COUNT(m.id) AS messages,
        SUM(
          CASE
            WHEN m.status = 'sent'
            THEN 1
            ELSE 0
          END
        ) AS sent,
        SUM(
          CASE
            WHEN m.status = 'failed'
            THEN 1
            ELSE 0
          END
        ) AS failed
      FROM ai_campaigns c
      LEFT JOIN ai_campaign_messages m
        ON m.campaign_id = c.id
      GROUP BY c.id, c.name
      ORDER BY c.created_at DESC
      `
    )
    .all();

  return (result.results || []).map((row) => {
    const messages = number(row.messages);
    const sent = number(row.sent);
    const failed = number(row.failed);

    return {
      id: row.id,
      name: row.name,
      messages,
      sent,
      failed,
      deliveryRate:
        messages > 0
          ? (sent / messages) * 100
          : 0,
      failureRate:
        messages > 0
          ? (failed / messages) * 100
          : 0,
    };
  });
}

async function health(env) {
  const db = env.DB;

  const openTickets = await db
    .prepare(
      `
      SELECT COUNT(*) AS count
      FROM ai_tickets
      WHERE status IN (
        'open',
        'pending',
        'in_progress'
      )
      `
    )
    .first();

  const failedCampaignMessages =
    await db
      .prepare(
        `
        SELECT COUNT(*) AS count
        FROM ai_campaign_messages
        WHERE status = 'failed'
        `
      )
      .first();

  const activeAlerts =
    await db
      .prepare(
        `
        SELECT COUNT(*) AS count
        FROM ai_research_alerts
        WHERE status = 'active'
        AND severity IN ('high', 'critical')
        `
      )
      .first();

  return {
    support: {
      openTickets: number(openTickets?.count),
    },

    growth: {
      failedCampaignMessages: number(
        failedCampaignMessages?.count
      ),
    },

    research: {
      highPriorityAlerts: number(
        activeAlerts?.count
      ),
    },

    generatedAt: new Date().toISOString(),
  };
}

export function createAdvancedAnalyticsTool(env) {
  return {
    cohort: (args) =>
      cohort(env, args),

    revenue: (args) =>
      revenue(env, args),

    campaignEfficiency: (args) =>
      campaignEfficiency(env, args),

    health: (args) =>
      health(env, args),
  };
}
