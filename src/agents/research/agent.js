// src/agents/research/agent.js

import { Agent } from "../base/Agent.js";
import { RESEARCH_SYSTEM_PROMPT } from "./prompt.js";
import { RESEARCH_ALLOWED_TOOLS } from "./tools.js";

export class ResearchAgent extends Agent {
  constructor(options = {}) {
    super("research", options);

    this.systemPrompt = RESEARCH_SYSTEM_PROMPT;
    this.allowedTools = RESEARCH_ALLOWED_TOOLS;
  }

  getSystemPrompt() {
    return this.systemPrompt;
  }

  getAllowedTools() {
    return [...this.allowedTools];
  }
}
