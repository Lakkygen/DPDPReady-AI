export function createAnalyticsClient(database) {
  if (!database) {
    throw new Error(
      "database is required"
    );
  }

  async function scalar(
    sql,
    ...params
  ) {
    const row =
      await database.first(
        sql,
        ...params
      );

    if (!row) {
      return 0;
    }

    const value =
      Object.values(row)[0];

    const number =
      Number(value);

    return Number.isFinite(number)
      ? number
      : 0;
  }

  async function getUsers() {
    const total =
      await scalar(
        `
        SELECT COUNT(*) AS count
        FROM users
        `
      );

    const active30d =
      await scalar(
        `
        SELECT COUNT(*) AS count
        FROM users
        WHERE updated_at >= datetime(
          'now',
          '-30 day'
        )
        `
      );

    return {
      total,
      active30d,
    };
  }

  async function getAudits() {
    const total =
      await scalar(
        `
        SELECT COUNT(*) AS count
        FROM audits
        `
      );

    const last30d =
      await scalar(
        `
        SELECT COUNT(*) AS count
        FROM audits
        WHERE created_at >= datetime(
          'now',
          '-30 day'
        )
        `
      );

    const averageScore =
      await scalar(
        `
        SELECT COALESCE(
          AVG(score),
          0
        ) AS average_score
        FROM audits
        `
      );

    return {
      total,
      last30d,
      averageScore:
        Number(
          averageScore.toFixed(2)
        ),
    };
  }

  async function getRevenue() {
    const total =
      await scalar(
        `
        SELECT COALESCE(
          SUM(amount),
          0
        ) AS total
        FROM payments
        WHERE status = 'paid'
        `
      );

    const last30d =
      await scalar(
        `
        SELECT COALESCE(
          SUM(amount),
          0
        ) AS total
        FROM payments
        WHERE status = 'paid'
          AND created_at >= datetime(
            'now',
            '-30 day'
          )
        `
      );

    return {
      total,
      last30d,
    };
  }

  async function getCampaignStats({
    campaignId,
  } = {}) {
    if (!campaignId) {
      throw new Error(
        "campaignId is required"
      );
    }

    const row =
      await database.first(
        `
        SELECT
          COUNT(*) AS leads,

          SUM(
            CASE
              WHEN status = 'contacted'
              THEN 1
              ELSE 0
            END
          ) AS contacted,

          SUM(
            CASE
              WHEN status = 'replied'
              THEN 1
              ELSE 0
            END
          ) AS replied,

          SUM(
            CASE
              WHEN status = 'converted'
              THEN 1
              ELSE 0
            END
          ) AS converted

        FROM leads
        WHERE campaign_id = ?
        `,
        campaignId
      );

    return {
      campaignId,

      leads:
        Number(
          row?.leads || 0
        ),

      contacted:
        Number(
          row?.contacted || 0
        ),

      replied:
        Number(
          row?.replied || 0
        ),

      converted:
        Number(
          row?.converted || 0
        ),
    };
  }

  async function getOverview() {
    const [
      users,
      audits,
      revenue,
    ] = await Promise.all([
      getUsers(),
      getAudits(),
      getRevenue(),
    ]);

    return {
      users,
      audits,
      revenue,
      generatedAt:
        new Date().toISOString(),
    };
  }

  return {
    users: getUsers,
    audits: getAudits,
    revenue: getRevenue,
    campaignStats:
      getCampaignStats,
    overview:
      getOverview,
  };
}
