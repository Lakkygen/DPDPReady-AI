// ============================================================
// DPDPREADY AI — CAMPAIGNS
// ============================================================

function timestamp() {
  return new Date().toISOString();
}

async function create(env, args = {}) {
  const db = env.DB;

  if (!args.name) {
    throw new Error("Campaign name is required");
  }

  const result = await db
    .prepare(
      `
      INSERT INTO ai_campaigns
      (
        name,
        description,
        status,
        channel,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?)
      `
    )
    .bind(
      args.name,
      args.description || null,
      args.status || "draft",
      args.channel || "email",
      timestamp(),
      timestamp()
    )
    .run();

  return {
    ok: true,
    id: result.meta?.last_row_id || null,
  };
}

async function addMessage(env, args = {}) {
  const db = env.DB;

  if (!args.campaignId) {
    throw new Error("campaignId is required");
  }

  if (!args.to) {
    throw new Error("Recipient email is required");
  }

  if (!args.subject) {
    throw new Error("Subject is required");
  }

  if (!args.html && !args.text) {
    throw new Error("Email body is required");
  }

  const result = await db
    .prepare(
      `
      INSERT INTO ai_campaign_messages
      (
        campaign_id,
        lead_id,
        recipient,
        subject,
        html,
        text,
        status,
        scheduled_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .bind(
      args.campaignId,
      args.leadId || null,
      args.to.toLowerCase(),
      args.subject,
      args.html || null,
      args.text || null,
      "queued",
      args.scheduledAt || null,
      timestamp(),
      timestamp()
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
        FROM ai_campaigns
        WHERE id = ?
        LIMIT 1
        `
      )
      .bind(args.id)
      .first()) || null
  );
}

async function listMessages(env, args = {}) {
  const db = env.DB;

  if (!args.campaignId) {
    throw new Error("campaignId is required");
  }

  const result = await db
    .prepare(
      `
      SELECT *
      FROM ai_campaign_messages
      WHERE campaign_id = ?
      ORDER BY created_at ASC
      LIMIT ?
      `
    )
    .bind(
      args.campaignId,
      Math.min(Number(args.limit || 100), 200)
    )
    .all();

  return result.results || [];
}

async function send(env, args = {}) {
  if (!args.campaignId) {
    throw new Error("campaignId is required");
  }

  if (!args.approved) {
    throw new Error(
      "Campaign sending requires explicit approval"
    );
  }

  const messages = await listMessages(env, {
    campaignId: args.campaignId,
    limit: 50,
  });

  if (!env.__email) {
    throw new Error("Email client is not attached");
  }

  const results = [];

  for (const message of messages) {
    if (message.status !== "queued") {
      continue;
    }

    try {
      const result = await env.__email.send({
        to: message.recipient,
        subject: message.subject,
        html: message.html,
        text: message.text,
        approved: true,
        marketing: true,
      });

      await env.DB
        .prepare(
          `
          UPDATE ai_campaign_messages
          SET status = ?,
              provider_message_id = ?,
              sent_at = ?,
              updated_at = ?
          WHERE id = ?
          `
        )
        .bind(
          "sent",
          result.id || null,
          timestamp(),
          timestamp(),
          message.id
        )
        .run();

      results.push({
        id: message.id,
        ok: true,
        result,
      });
    } catch (error) {
      await env.DB
        .prepare(
          `
          UPDATE ai_campaign_messages
          SET status = ?,
              error_message = ?,
              updated_at = ?
          WHERE id = ?
          `
        )
        .bind(
          "failed",
          error.message,
          timestamp(),
          message.id
        )
        .run();

      results.push({
        id: message.id,
        ok: false,
        error: error.message,
      });
    }
  }

  return {
    ok: results.every((item) => item.ok),
    total: results.length,
    sent: results.filter((item) => item.ok).length,
    failed: results.filter((item) => !item.ok).length,
    results,
  };
}

async function stats(env, args = {}) {
  const db = env.DB;

  if (!args.campaignId) {
    throw new Error("campaignId is required");
  }

  const result = await db
    .prepare(
      `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) AS queued,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS sent,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed
      FROM ai_campaign_messages
      WHERE campaign_id = ?
      `
    )
    .bind(args.campaignId)
    .first();

  return result || {
    total: 0,
    queued: 0,
    sent: 0,
    failed: 0,
  };
}

export function createCampaignsTool(env, dependencies = {}) {
  const scopedEnv = {
    ...env,
    __email: dependencies.email || null,
  };

  return {
    create: (args) => create(scopedEnv, args),
    get: (args) => get(scopedEnv, args),
    addMessage: (args) => addMessage(scopedEnv, args),
    listMessages: (args) =>
      listMessages(scopedEnv, args),
    send: (args) => send(scopedEnv, args),
    stats: (args) => stats(scopedEnv, args),
  };
}
