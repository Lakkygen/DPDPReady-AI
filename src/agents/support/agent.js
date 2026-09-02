// src/agents/support/agent.js

import { Agent } from "../base/Agent.js";
import { SUPPORT_SYSTEM_PROMPT } from "./prompt.js";
import { SUPPORT_ALLOWED_TOOLS } from "./tools.js";

export class SupportAgent extends Agent {
  constructor(options = {}) {
    super("support", options);

    this.systemPrompt = SUPPORT_SYSTEM_PROMPT;
    this.allowedTools = SUPPORT_ALLOWED_TOOLS;
  }

  getSystemPrompt() {
    return this.systemPrompt;
  }

  getAllowedTools() {
    return [...this.allowedTools];
  }
}
