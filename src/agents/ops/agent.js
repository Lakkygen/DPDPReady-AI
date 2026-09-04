import { Agent } from "../base/agent.js";
import { OPS_SYSTEM_PROMPT } from "./prompt.js";

const OPS_ALLOWED_TOOLS = [
  "health_check",
  "website_inspect",
  "github_repository",
  "github_get_file",
  "github_search_files",
  "github_create_branch",
  "github_update_file",
  "github_create_pr",
  "render_deploy",
  "render_rollback",
  "browser_open",
  "browser_screenshot",
  "browser_run",
  "qa_run",
];

export class OpsAgent extends Agent {
  constructor(options = {}) {
    super("ops", options);
    this.systemPrompt = OPS_SYSTEM_PROMPT;
    this.allowedTools = OPS_ALLOWED_TOOLS;
  }

  getSystemPrompt() {
    return this.systemPrompt;
  }

  getAllowedTools() {
    return [...this.allowedTools];
  }
}
