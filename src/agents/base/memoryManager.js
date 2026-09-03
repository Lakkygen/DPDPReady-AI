// src/agents/base/memoryManager.js

const MAX_ITEMS = 20;
const MAX_VALUE_LENGTH = 800;

export class MemoryManager {
  constructor(options = {}) {
    this.db = options.db ?? null;
    this.logger =
      options.logger ?? console;
  }

  async save({
    agentId,
    scope = "agent",
    key,
    value,
    importance = 1
  }) {
    if (!agentId) {
      throw new Error(
        "agentId is required."
      );
    }

    if (!key) {
      throw new Error(
        "Memory key is required."
      );
    }

    const normalizedValue =
      String(value ?? "")
        .slice(0, MAX_VALUE_LENGTH);

    if (!normalizedValue) {
      return null;
    }

    if (!this.db) {
      return {
        agentId,
        scope,
        key,
        value: normalizedValue,
        importance
      };
    }

    await this.db
      .prepare(
        `
        INSERT INTO agent_memory
          (
            agent_id,
            scope,
            memory_key,
            memory_value,
            importance,
            created_at
          )
        VALUES (?, ?, ?, ?, ?, ?)
        `
      )
      .bind(
        agentId,
        scope,
        key,
        normalizedValue,
        Number(importance) || 1,
        new Date().toISOString()
      )
      .run();

    return {
      agentId,
      scope,
      key,
      value: normalizedValue,
      importance
    };
  }

  async saveCompanyMemory({
    key,
    value,
    importance = 1
  }) {
    if (!key) {
      throw new Error(
        "Company memory key is required."
      );
    }

    const normalizedValue =
      String(value ?? "")
        .slice(0, MAX_VALUE_LENGTH);

    if (!normalizedValue) {
      return null;
    }

    if (!this.db) {
      return {
        scope: "company",
        key,
        value: normalizedValue,
        importance
      };
    }

    await this.db
      .prepare(
        `
        INSERT INTO company_memory
          (
            memory_key,
            memory_value,
            importance,
            created_at
          )
        VALUES (?, ?, ?, ?)
        `
      )
      .bind(
        key,
        normalizedValue,
        Number(importance) || 1,
        new Date().toISOString()
      )
      .run();

    return {
      scope: "company",
      key,
      value: normalizedValue,
      importance
    };
  }

  async getRelevant({
    agentId,
    scope = "agent",
    limit = 8
  }) {
    const safeLimit = Math.min(
      Math.max(
        Number(limit) || 1,
        1
      ),
      MAX_ITEMS
    );

    if (!this.db) {
      return [];
    }

    const result =
      await this.db
        .prepare(
          `
          SELECT
            memory_key,
            memory_value,
            importance,
            created_at
          FROM agent_memory
          WHERE agent_id = ?
            AND scope = ?
          ORDER BY importance DESC, created_at DESC
          LIMIT ?
          `
        )
        .bind(
          agentId,
          scope,
          safeLimit
        )
        .all();

    return result.results ?? [];
  }

  async getCompanyMemory(limit = 8) {
    const safeLimit = Math.min(
      Math.max(
        Number(limit) || 1,
        1
      ),
      MAX_ITEMS
    );

    if (!this.db) {
      return [];
    }

    const result =
      await this.db
        .prepare(
          `
          SELECT
            memory_key,
            memory_value,
            importance,
            created_at
          FROM company_memory
          ORDER BY importance DESC, created_at DESC
          LIMIT ?
          `
        )
        .bind(safeLimit)
        .all();

    return result.results ?? [];
  }

  formatForPrompt(memories = []) {
    if (
      !Array.isArray(memories) ||
      memories.length === 0
    ) {
      return "No relevant memory available.";
    }

    return memories
      .map((item) => {
        const key =
          String(
            item.memory_key ??
              "memory"
          );

        const value =
          String(
            item.memory_value ??
              ""
          );

        return `- ${key}: ${value}`;
      })
      .join("\n");
  }
}
