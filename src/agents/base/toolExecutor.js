// src/agents/base/toolExecutor.js

import {
  hasPermission,
} from "../../config/permissions.js";

import {
  getToolPolicy,
  isRoleAllowed,
} from "../../security/toolPolicies.js";

export class ToolExecutor {
  constructor(options = {}) {
    this.logger =
      options.logger ?? console;

    this.registry =
      options.registry ?? {};

    this.authorization =
      options.authorization ?? null;

    this.approvalController =
      options.approvalController ?? null;
  }

  async execute({
    agent,
    toolName,
    arguments: rawArguments = {},
    approvalToken = null,
  } = {}) {
    if (!agent) {
      throw new Error(
        "Agent is required."
      );
    }

    if (!toolName) {
      throw new Error(
        "Tool name is required."
      );
    }

    const tool =
      this.registry[toolName];

    if (!tool) {
      return {
        ok: false,
        error:
          `Unknown tool: ${toolName}`,
      };
    }

    const policy = {
      ...getToolPolicy(toolName),
      ...tool,
    };

    const role =
      agent.role ||
      agent.id ||
      "";

    if (
      !isRoleAllowed(
        toolName,
        role
      )
    ) {
      return {
        ok: false,
        error:
          `Role ${role} is not allowed to use ${toolName}.`,
      };
    }

    if (
      tool.permission &&
      !hasPermission(
        agent.id,
        tool.permission
      )
    ) {
      return {
        ok: false,
        error: "Permission denied.",
      };
    }

    if (
      policy.requiresApproval ||
      policy.approval
    ) {
      const approved = Boolean(
        approvalToken &&
        this.approvalController?.isApprovalValid?.(
          approvalToken,
          {
            agent,
            toolName,
          }
        )
      );

      if (!approved) {
        const approval =
          this.approvalController
            ?.requestApproval
            ? await this.approvalController.requestApproval({
                taskId:
                  agent.taskId ||
                  null,

                action:
                  toolName,

                requestedBy:
                  agent.id,

                payload:
                  rawArguments,
              })
            : null;

        return {
          ok: false,
          requiresApproval: true,
          approvalId:
            approval?.id ||
            null,
          error:
            "Founder approval is required before this action can execute.",
        };
      }
    }

    if (
      typeof tool.execute !==
      "function"
    ) {
      return {
        ok: false,
        error:
          `Tool "${toolName}" has no executor.`,
      };
    }

    let args =
      rawArguments;

    if (
      typeof rawArguments ===
      "string"
    ) {
      try {
        args =
          JSON.parse(
            rawArguments
          );
      } catch {
        return {
          ok: false,
          error:
            `Invalid JSON arguments for tool "${toolName}".`,
        };
      }
    }

    if (
      !args ||
      typeof args !==
        "object" ||
      Array.isArray(args)
    ) {
      return {
        ok: false,
        error:
          `Invalid arguments for tool "${toolName}".`,
      };
    }

    if (
      (
        policy.requiresApproval ||
        policy.approval
      ) &&
      approvalToken
    ) {
      args = {
        ...args,
        approved: true,
      };
    }

    try {
      const result =
        await tool.execute({
          agent,
          args,
        });

      return {
        ok: true,
        tool: toolName,
        result,
      };
    } catch (error) {
      this.logger.error?.(
        `Tool execution failed: ${toolName}`,
        error
      );

      return {
        ok: false,
        tool: toolName,
        error:
          String(
            error?.message ||
            "Tool execution failed."
          ),
      };
    }
  }

  getDefinitionsForAgent(
    agent
  ) {
    return Object.values(
      this.registry
    )
      .filter((tool) => {
        if (!tool?.definition) {
          return false;
        }

        if (
          tool.permission &&
          !hasPermission(
            agent.id,
            tool.permission
          )
        ) {
          return false;
        }

        if (
          !isRoleAllowed(
            tool.definition?.function?.name ||
              tool.name,
            agent.role ||
              agent.id
          )
        ) {
          return false;
        }

        return true;
      })
      .map(
        (tool) =>
          tool.definition
      );
  }
}
