// src/agents/base/Agent.js

import { requireAgent } from "../../config/agent.js";
import {
  getPermissions,
  hasPermission
} from "../../config/permissions.js";
import { getAgentBudget } from "../../config/budgets.js";

export class Agent {
  constructor(agentId, options = {}) {
    this.config = requireAgent(agentId);

    this.id = this.config.id;
    this.name = this.config.name;
    this.title = this.config.title;
    this.department = this.config.department;

    this.environment = options.environment ?? null;
    this.memoryManager = options.memoryManager ?? null;
    this.logger = options.logger ?? console;

    this.permissions = getPermissions(agentId);
    this.budget = getAgentBudget(agentId);
  }

  getIdentity() {
    return {
      id: this.id,
      name: this.name,
      title: this.title,
      department: this.department,
      description: this.config.description,
      mission: this.config.mission,
      personality: [...this.config.personality]
    };
  }

  can(permission) {
    return hasPermission(this.id, permission);
  }

  assertPermission(permission) {
    if (!this.can(permission)) {
      throw new Error(
        `${this.name} does not have permission: ${permission}`
      );
    }

    return true;
  }

  getBudget() {
    return { ...this.budget };
  }

  getMemoryScope() {
    return this.config.memoryScope;
  }

  getPermissions() {
    return structuredClone(this.permissions);
  }

  buildSystemIdentity() {
    return [
      `You are ${this.name}, the ${this.title} at DPDPReady.`,
      `Department: ${this.department}.`,
      `Mission: ${this.config.mission}`,
      `Your personality: ${this.config.personality.join(", ")}.`,
      "",
      "Operating rules:",
      "- Never claim an action happened unless it was actually executed and verified.",
      "- Use tools when factual information is required.",
      "- Do not invent system status, customer data, metrics or research.",
      "- Stay within your permissions.",
      "- Be concise unless the task requires detail."
    ].join("\n");
  }
}
