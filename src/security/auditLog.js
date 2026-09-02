// src/security/auditLog.js

export async function writeAuditLog(
  db,
  {
    actor,
    action,
    target = null,
    result = "success",
    metadata = {}
  }
) {
  const record = {
    id: crypto.randomUUID(),
    actor,
    action,
    target,
    result,
    metadata,
    createdAt:
      new Date().toISOString()
  };

  if (!db) {
    return record;
  }

  await db
    .prepare(
      `
      INSERT INTO audit_logs
      (id, actor, action, target, result, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `
    )
    .bind(
      record.id,
      actor,
      action,
      target,
      result,
      JSON.stringify(
        metadata
      ),
      record.createdAt
    )
    .run();

  return record;
}
