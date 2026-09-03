// ============================================================
// DPDPREADY AI — FORECASTING
// Simple directional trend forecasting
// ============================================================

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function linearRegression(values) {
  const n = values.length;

  if (n < 2) {
    return {
      slope: 0,
      intercept: values[0] || 0,
    };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = number(values[i]);

    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denominator =
    n * sumXX - sumX * sumX;

  if (denominator === 0) {
    return {
      slope: 0,
      intercept: sumY / n,
    };
  }

  const slope =
    (n * sumXY - sumX * sumY) /
    denominator;

  const intercept =
    (sumY - slope * sumX) / n;

  return {
    slope,
    intercept,
  };
}

async function getDailyData(
  env,
  days = 30
) {
  const result = await env.DB
    .prepare(
      `
      SELECT
        date(created_at) AS day,
        COUNT(*) AS count
      FROM users
      WHERE date(created_at) >=
        date('now', '-' || ? || ' days')
      GROUP BY date(created_at)
      ORDER BY day ASC
      `
    )
    .bind(days)
    .all();

  return result.results || [];
}

async function forecastUsers(env, args = {}) {
  const historyDays = Math.min(
    Math.max(Number(args.historyDays || 30), 7),
    180
  );

  const forecastDays = Math.min(
    Math.max(Number(args.forecastDays || 7), 1),
    90
  );

  const rows = await getDailyData(
    env,
    historyDays
  );

  const values = rows.map((row) =>
    number(row.count)
  );

  if (values.length < 2) {
    return {
      ok: false,
      reason:
        "Not enough historical data for a forecast",
      historyDays,
      forecastDays,
    };
  }

  const { slope, intercept } =
    linearRegression(values);

  const predictions = [];

  for (
    let i = 0;
    i < forecastDays;
    i++
  ) {
    const x = values.length + i;

    predictions.push({
      dayOffset: i + 1,
      predictedUsers: Math.max(
        0,
        intercept + slope * x
      ),
    });
  }

  return {
    ok: true,
    metric: "users",
    method: "linear_trend",
    historyPoints: values.length,
    trendPerDay: slope,
    predictions,
    note:
      "Directional estimate only; not a guaranteed outcome.",
  };
}

async function forecastRevenue(
  env,
  args = {}
) {
  const historyDays = Math.min(
    Math.max(Number(args.historyDays || 30), 7),
    180
  );

  const forecastDays = Math.min(
    Math.max(Number(args.forecastDays || 7), 1),
    90
  );

  const result = await env.DB
    .prepare(
      `
      SELECT
        date(created_at) AS day,
        COALESCE(SUM(amount), 0) AS revenue
      FROM payments
      WHERE
        status = 'completed'
        AND date(created_at) >=
          date('now', '-' || ? || ' days')
      GROUP BY date(created_at)
      ORDER BY day ASC
      `
    )
    .bind(historyDays)
    .all();

  const rows = result.results || [];

  const values = rows.map((row) =>
    number(row.revenue)
  );

  if (values.length < 2) {
    return {
      ok: false,
      reason:
        "Not enough historical revenue data for a forecast",
      historyDays,
      forecastDays,
    };
  }

  const { slope, intercept } =
    linearRegression(values);

  const predictions = [];

  for (
    let i = 0;
    i < forecastDays;
    i++
  ) {
    const x = values.length + i;

    predictions.push({
      dayOffset: i + 1,
      predictedRevenue: Math.max(
        0,
        intercept + slope * x
      ),
    });
  }

  return {
    ok: true,
    metric: "revenue",
    method: "linear_trend",
    historyPoints: values.length,
    trendPerDay: slope,
    predictions,
    note:
      "Directional estimate only; actual revenue can differ significantly.",
  };
}

export function createForecastingTool(env) {
  return {
    forecastRevenue: (args) =>
      forecastRevenue(env, args),

    forecastUsers: (args) =>
      forecastUsers(env, args),
  };
}
