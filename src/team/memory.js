// src/team/memory.js

const TEAM_MEMORY_KEY_PREFIX =
  "team_chat";

const MAX_MEMORY_LENGTH = 1200;

function compact(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_MEMORY_LENGTH);
}

function makeKey(chatId, suffix) {
  const safeChatId =
    String(chatId)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 80);

  return `${TEAM_MEMORY_KEY_PREFIX}_${safeChatId}_${suffix}`;
}

export class TeamMemory {
  constructor({
    memoryManager,
    logger = console
  }) {
    if (!memoryManager) {
      throw new Error(
        "memoryManager is required."
      );
    }

    this.memoryManager =
      memoryManager;
    this.logger = logger;
  }

  async load({
    chatId,
    limit = 10
  }) {
    /*
     * Team knowledge is written to company memory,
     * so every agent can access the same long-lived
     * context.
     */
    const memories =
      await this.memoryManager
        .getCompanyMemory(limit);

    const chatKey =
      `${TEAM_MEMORY_KEY_PREFIX}_${String(
        chatId
      )}_`;

    return memories.filter((item) =>
      String(item.memory_key ?? "")
        .startsWith(chatKey)
    );
  }

  async saveFinding({
    chatId,
    agentId,
    agentName,
    topic,
    finding,
    importance = 3
  }) {
    const value = compact(
      `[${agentName ?? agentId ?? "agent"}] ${
        finding
      }`
    );

    if (!value) {
      return null;
    }

    if (
      typeof this.memoryManager
        .saveCompanyMemory !==
      "function"
    ) {
      throw new Error(
        "MemoryManager.saveCompanyMemory() is required for team memory."
      );
    }

    return this.memoryManager
      .saveCompanyMemory({
        key: makeKey(
          chatId,
          `finding_${Date.now()}`
        ),
        value: compact(
          `${topic ? `Topic: ${topic}. ` : ""}${value}`
        ),
        importance
      });
  }

  async saveDecision({
    chatId,
    decision,
    importance = 5
  }) {
    const value =
      compact(decision);

    if (!value) {
      return null;
    }

    if (
      typeof this.memoryManager
        .saveCompanyMemory !==
      "function"
    ) {
      throw new Error(
        "MemoryManager.saveCompanyMemory() is required for team memory."
      );
    }

    return this.memoryManager
      .saveCompanyMemory({
        key: makeKey(
          chatId,
          `decision_${Date.now()}`
        ),
        value,
        importance
      });
  }

  format(memories = []) {
    if (
      !Array.isArray(memories) ||
      memories.length === 0
    ) {
      return "No previous team memory for this group.";
    }

    return memories
      .map(
        (item) =>
          `- ${item.memory_key}: ${item.memory_value}`
      )
      .join("\n");
  }
}
