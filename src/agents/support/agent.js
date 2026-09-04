import { Agent } from "../base/agent.js";
import { SUPPORT_SYSTEM_PROMPT } from "./prompt.js";
import { supportTools as SUPPORT_ALLOWED_TOOLS } from "./tools.js";

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
