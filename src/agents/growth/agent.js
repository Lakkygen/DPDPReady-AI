import { Agent } from "../base/agent.js";
import { GROWTH_SYSTEM_PROMPT } from "./prompt.js";
import { GROWTH_ALLOWED_TOOLS } from "./tools.js";

export class GrowthAgent extends Agent {
  constructor(options = {}) {
    super("growth", options);
    this.systemPrompt =
      GROWTH_SYSTEM_PROMPT;
    this.allowedTools =
      GROWTH_ALLOWED_TOOLS;
  }

  getSystemPrompt() {
    return this.systemPrompt;
  }

  getAllowedTools() {
    return [...this.allowedTools];
  }
}
