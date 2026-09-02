// src/agents/base/toolExecutor.js

import { hasPermission } from "../../config/permissions.js";

export class ToolExecutor {
  constructor(options = {}) {
    this.logger = options.logger ?? console;
    this.registry = options.registry ?? {};
  }

  /**
   * Execute a tool on behalf of an agent.
   *
   * Security model:
   * 1. Tool must exist.
   * 2. Agent must have the required permission.
   * 3. Tool must expose an execute() function.
   * 4. Execution errors are caught and returned safely.
   */
  async execute({
    agent,
    toolName,
    arguments: rawArguments = {}
  }) {
    if (!agent) {
      throw new Error("Agent is required.");
    }

    if (!toolName) {
      throw new Error("Tool name is required.");
    }

    const tool = this.registry[toolName];

    if (!tool) {
      return {
        ok: false,
        error: `Unknown tool: ${toolName}`
      };
    }

    const requiredPermission = tool.permission;

    if (
      requiredPermission &&
      !hasPermission(agent.id, requiredPermission)
    ) {
      this.logger.warn?.(
        `Permission denied: ${agent.id} -> ${toolName}`
      );

      return {
        ok: false,
        error: "Permission denied."
      };
    }

    if (typeof tool.execute !== "function") {
      return {
        ok: false,
        error: `Tool "${toolName}" has no executor.`
      };
    }

    let args = rawArguments;

    if (typeof rawArguments === "string") {
      try {
        args = JSON.parse(rawArguments);
      } catch {
        return {
          ok: false,
          error: `Invalid JSON arguments for tool "${toolName}".`
        };
      }
    }

    if (
      args === null ||
      typeof args !== "object" ||
      Array.isArray(args)
    ) {
      return {
        ok: false,
        error: `Invalid arguments for tool "${toolName}".`
      };
    }

    try {
      const result = await tool.execute({
        agent,
        args
      });

      return {
        ok: true,
        tool: toolName,
        result
      };
    } catch (error) {
      this.logger.error?.(
        `Tool execution failed: ${toolName}`,
        error
      );

      return {
        ok: false,
        tool: toolName,
        error: String(
          error?.message ?? "Tool execution failed."
        )
      };
    }
  }

  /**
   * Convert registered tools into OpenAI/OpenRouter
   * function definitions.
   */
  getDefinitionsForAgent(agent) {
    return Object.values(this.registry)
      .filter((tool) => {
        if (!tool?.definition) {
          return false;
        }

        if (!tool.permission) {
          return true;
        }

        return hasPermission(
          agent.id,
          tool.permission
        );
      })
      .map((tool) => tool.definition);
  }
}
