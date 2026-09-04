import { Agent } from "../base/agent.js";
import { OPS_SYSTEM_PROMPT } from "./prompt.js";
import { OPS_ALLOWED_TOOLS } from "./tools.js";

export class OpsAgent extends Agent {
  constructor(options = {}) {
    super("ops", options);
    this.systemPrompt =
      OPS_SYSTEM_PROMPT;
    this.allowedTools =
      OPS_ALLOWED_TOOLS;
  }

  getSystemPrompt() {
    return this.systemPrompt;
  }

  getAllowedTools() {
    return [...this.allowedTools];
  }
}
