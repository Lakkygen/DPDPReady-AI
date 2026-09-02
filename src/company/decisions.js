// src/company/decisions.js

export class DecisionStore {
  constructor(options = {}) {
    this.db = options.db ?? null;
  }

  async record({
    decision,
    madeBy = "founder",
    reason = "",
    metadata = {}
  }) {
    const record = {
      id: crypto.randomUUID(),
      decision,
      madeBy,
      reason,
      metadata,
      createdAt:
        new Date().toISOString()
    };

    if (!this.db) {
      return record;
    }

    await this.db
      .prepare(
        `
        INSERT INTO decisions
        (id, decision, made_by, reason, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        `
      )
      .bind(
        record.id,
        record.decision,
        record.madeBy,
        record.reason,
        JSON.stringify(
          record.metadata
        ),
        record.createdAt
      )
      .run();

    return record;
  }
}
