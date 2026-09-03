// ============================================================
// DPDPREADY AI — EMAIL TOOL
// Resend integration with suppression + event logging
// ============================================================

const DEFAULT_RESEND_URL = "https://api.resend.com/emails";

function getConfig(env) {
  return {
    apiKey: env.RESEND_API_KEY,
    from: env.EMAIL_FROM,
    url: env.RESEND_API_URL || DEFAULT_RESEND_URL,
  };
}

function assertConfigured(env) {
  const config = getConfig(env);

  if (!config.apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  if (!config.from) {
    throw new Error("EMAIL_FROM is not configured");
  }

  return config;
}

async function isSuppressed(db, email) {
  if (!db || !email) return false;

  const result = await db
    .prepare(
      `
      SELECT email
      FROM ai_email_suppressions
      WHERE lower(email) = lower(?)
      LIMIT 1
      `
    )
    .bind(email)
    .first();

  return Boolean(result);
}

async function logEvent(db, event) {
  if (!db) return;

  try {
    await db
      .prepare(
        `
        INSERT INTO ai_email_events
        (
          email,
          event_type,
          message_id,
          metadata_json,
          created_at
        )
        VALUES (?, ?, ?, ?, datetime('now'))
        `
      )
      .bind(
        event.email || null,
        event.eventType || "unknown",
        event.messageId || null,
        JSON.stringify(event.metadata || {})
      )
      .run();
  } catch {
    // Logging failure should not break the main email operation.
  }
}

async function suppress(db, email, reason) {
  if (!db || !email) return;

  try {
    await db
      .prepare(
        `
        INSERT OR REPLACE INTO ai_email_suppressions
        (
          email,
          reason,
          created_at
        )
        VALUES (?, ?, datetime('now'))
        `
      )
      .bind(email.toLowerCase(), reason || "suppressed")
      .run();
  } catch {
    // Do not crash webhook handling because suppression logging failed.
  }
}

async function send(env, args = {}) {
  const {
    to,
    subject,
    html,
    text,
    replyTo,
    tags,
    metadata,
    approved = false,
    marketing = true,
  } = args;

  if (!approved) {
    throw new Error(
      "Email sending requires explicit approval. Set approved=true after approval."
    );
  }

  if (!to) {
    throw new Error("Recipient email is required");
  }

  if (!subject) {
    throw new Error("Email subject is required");
  }

  if (!html && !text) {
    throw new Error("Either html or text content is required");
  }

  const config = assertConfigured(env);
  const db = env.DB;

  if (marketing && (await isSuppressed(db, to))) {
    return {
      ok: false,
      suppressed: true,
      email: to,
      reason: "Recipient is on the suppression list",
    };
  }

  const payload = {
    from: config.from,
    to: [to],
    subject,
  };

  if (html) payload.html = html;
  if (text) payload.text = text;
  if (replyTo) payload.reply_to = replyTo;
  if (tags) payload.tags = tags;
  if (metadata) payload.headers = metadata;

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    await logEvent(db, {
      email: to,
      eventType: "send_failed",
      metadata: {
        status: response.status,
        response: data,
      },
    });

    throw new Error(
      data?.message ||
        data?.error ||
        `Email provider returned HTTP ${response.status}`
    );
  }

  await logEvent(db, {
    email: to,
    eventType: "sent",
    messageId: data?.id || null,
    metadata: {
      subject,
      marketing,
    },
  });

  return {
    ok: true,
    id: data?.id || null,
    email: to,
  };
}

async function sendBatch(env, args = {}) {
  const messages = Array.isArray(args.messages)
    ? args.messages
    : [];

  if (!messages.length) {
    throw new Error("messages array is required");
  }

  if (messages.length > 50) {
    throw new Error("Maximum batch size is 50 messages");
  }

  const results = [];

  for (const message of messages) {
    try {
      const result = await send(env, {
        ...message,
        approved: args.approved === true,
      });

      results.push({
        ok: true,
        result,
      });
    } catch (error) {
      results.push({
        ok: false,
        error: error.message,
        email: message.to || null,
      });
    }
  }

  return {
    ok: results.every((item) => item.ok),
    total: results.length,
    successful: results.filter((item) => item.ok).length,
    failed: results.filter((item) => !item.ok).length,
    results,
  };
}

async function recordWebhook(env, event = {}) {
  const db = env.DB;

  const type =
    event.type ||
    event.event ||
    event.data?.event ||
    "unknown";

  const email =
    event.data?.to?.[0] ||
    event.data?.email ||
    event.email ||
    null;

  const messageId =
    event.data?.email_id ||
    event.data?.id ||
    event.message_id ||
    null;

  await logEvent(db, {
    email,
    eventType: type,
    messageId,
    metadata: event,
  });

  if (
    email &&
    ["email.bounced", "email.complained", "email.unsubscribed"].includes(type)
  ) {
    await suppress(db, email, type);
  }

  return {
    ok: true,
    eventType: type,
    email,
    messageId,
  };
}

export function createEmailTool(env) {
  return {
    send: (args) => send(env, args),
    sendBatch: (args) => sendBatch(env, args),
    recordWebhook: (event) => recordWebhook(env, event),
  };
}
