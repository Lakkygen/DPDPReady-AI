// src/agents/analyst/agent.js

import { Agent } from "../base/Agent.js";
import { ANALYST_SYSTEM_PROMPT } from "./prompt.js";
import { ANALYST_ALLOWED_TOOLS } from "./tools.js";

export class AnalystAgent extends Agent {
  constructor(options = {}) {
    super("analyst", options);

    this.systemPrompt = ANALYST_SYSTEM_PROMPT;
    this.allowedTools = ANALYST_ALLOWED_TOOLS;
  }

  getSystemPrompt() {
    return this.systemPrompt;
  }

  getAllowedTools() {
    return [...this.allowedTools];
  }
}
