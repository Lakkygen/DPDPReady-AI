// src/team/conversation.js

const MAX_TRANSCRIPT_MESSAGES = 30;

export class TeamConversation {
  constructor({
    chatId,
    topic = "",
    maxMessages = MAX_TRANSCRIPT_MESSAGES
  }) {
    this.chatId = String(chatId);
    this.topic = String(topic ?? "");
    this.maxMessages = maxMessages;
    this.messages = [];
    this.startedAt = new Date().toISOString();
    this.updatedAt = this.startedAt;
    this.status = "active";
  }

  addMessage({
    agentId,
    agentName,
    content,
    type = "agent",
    round = 0
  }) {
    const text = String(content ?? "").trim();

    if (!text) {
      return;
    }

    this.messages.push({
      agentId: agentId ?? null,
      agentName: agentName ?? null,
      content: text,
      type,
      round,
      timestamp: new Date().toISOString()
    });

    if (
      this.messages.length >
      this.maxMessages
    ) {
      this.messages =
        this.messages.slice(
          -this.maxMessages
        );
    }

    this.updatedAt =
      new Date().toISOString();
  }

  getRecent(limit = 12) {
    return this.messages.slice(
      -Math.max(1, Number(limit) || 12)
    );
  }

  getTranscript(limit = 12) {
    return this.getRecent(limit)
      .map((message) => {
        const speaker =
          message.agentName ??
          message.type ??
          "system";

        return `[${speaker}] ${message.content}`;
      })
      .join("\n\n");
  }

  getState() {
    return {
      chatId: this.chatId,
      topic: this.topic,
      startedAt: this.startedAt,
      updatedAt: this.updatedAt,
      status: this.status,
      messageCount:
        this.messages.length
    };
  }

  complete() {
    this.status = "completed";
    this.updatedAt =
      new Date().toISOString();
  }
}
    
