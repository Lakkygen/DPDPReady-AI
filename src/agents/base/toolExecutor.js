// src/agents/base/toolExecutor.js

import {
  hasPermission,
} from "../../config/permissions.js";

import {
  getToolPolicy,
  isRoleAllowed,
} from "../../security/toolPolicies.js";

import {
  createApprovalGate,
} from "../../security/approvalGate.js";

export class ToolExecutor {
  constructor(options = {}) {
    this.logger =
      options.logger ?? console;

    this.registry =
      options.registry ?? {};

    this.authorization =
      options.authorization ?? null;

    this.approvalController =
      options.approvalController ??
      null;

    this.approvalGate =
      options.approvalGate ??
      createApprovalGate({
        store:
          options.store ??
          null,

        approvalController:
          this.approvalController,

        logger:
          this.logger,

        approvalTtlMs:
          options.approvalTtlMs,
      });
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
        tool: toolName,
        error:
          `Unknown tool: ${toolName}`,
      };
    }

    const policy = {
      ...getToolPolicy(
        toolName
      ),
      ...tool,
    };

    const role =
      agent.role ??
      agent.id ??
      "";

    if (
      !isRoleAllowed(
        toolName,
        role
      )
    ) {
      this.logger.warn?.(
        `[TOOL BLOCKED] role=${role} tool=${toolName}`
      );

      return {
        ok: false,
        blocked: true,
        tool: toolName,
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
      this.logger.warn?.(
        `[TOOL BLOCKED] permission denied agent=${agent.id} tool=${toolName}`
      );

      return {
        ok: false,
        blocked: true,
        tool: toolName,
        error:
          "Permission denied.",
      };
    }

    const requiresApproval =
      Boolean(
        policy.requiresApproval ??
        policy.approval ??
        false
      );

    if (requiresApproval) {
      const validation =
        await this.approvalGate.validate({
          approvalToken,
          agent,
          toolName,
          taskId:
            agent.taskId ??
            null,
        });

      if (!validation.valid) {
        let approval = null;

        try {
          approval =
            await this.approvalGate.request({
              taskId:
                agent.taskId ??
                null,

              toolName,

              agent,

              payload:
                this.safeApprovalPayload(
                  rawArguments
                ),
            });
        } catch (error) {
          this.logger.error?.(
            `[APPROVAL REQUEST FAILED] ${toolName}`,
            error
          );

          return {
            ok: false,
            blocked: true,
            requiresApproval: true,
            tool: toolName,
            error:
              "Founder approval is required, but the approval request could not be created.",
          };
        }

        return {
          ok: false,
          blocked: true,
          requiresApproval: true,
          tool: toolName,
          approvalId:
            approval?.id ??
            null,
          error:
            validation.reason ??
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
        tool: toolName,
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
          tool: toolName,
          error:
            `Invalid JSON arguments for tool "${toolName}".`,
        };
      }
    }

    if (
      !args ||
      typeof args !== "object" ||
      Array.isArray(args)
    ) {
      return {
        ok: false,
        tool: toolName,
        error:
          `Invalid arguments for tool "${toolName}".`,
      };
    }

    try {
      const result =
        await tool.execute({
          agent,
          args,
        });

      this.logger.info?.(
        `[TOOL COMPLETED] agent=${agent.id} tool=${toolName}`
      );

      return {
        ok: true,
        tool: toolName,
        result,
      };
    } catch (error) {
      this.logger.error?.(
        `[TOOL FAILED] ${toolName}`,
        error
      );

      return {
        ok: false,
        tool: toolName,
        error:
          String(
            error?.message ??
            "Tool execution failed."
          ),
      };
    }
  }

  getDefinitionsForAgent(
    agent
  ) {
    if (!agent) {
      return [];
    }

    return Object.values(
      this.registry
    )
      .filter((tool) => {
        if (!tool?.definition) {
          return false;
        }

        const toolName =
          tool.definition
            ?.function
            ?.name ??
          tool.name;

        if (!toolName) {
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
            toolName,
            agent.role ??
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

  safeApprovalPayload(
    rawArguments
  ) {
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
          argumentParseError:
            true,
        };
      }
    }

    if (
      !args ||
      typeof args !== "object" ||
      Array.isArray(args)
    ) {
      return {};
    }

    // Do not persist obvious credential material
    // into the approval record.
    return this.redactSecrets(
      args
    );
  }

  redactSecrets(
    value,
    depth = 0
  ) {
    if (depth > 5) {
      return "[redacted-depth]";
    }

    if (
      value === null ||
      value === undefined
    ) {
      return value;
    }

    if (
      typeof value === "string"
    ) {
      return value.slice(
        0,
        4000
      );
    }

    if (
      Array.isArray(value)
    ) {
      return value
        .slice(0, 50)
        .map((item) =>
          this.redactSecrets(
            item,
            depth + 1
          )
        );
    }

    if (
      typeof value === "object"
    ) {
      const sensitiveKeys =
        new Set([
          "password",
          "passwd",
          "secret",
          "token",
          "access_token",
          "refresh_token",
          "api_key",
          "apikey",
          "authorization",
          "cookie",
          "private_key",
          "privateKey",
        ]);

      const output = {};

      for (
        const [
          key,
          item,
        ] of Object.entries(
          value
        )
      ) {
        if (
          sensitiveKeys.has(
            key.toLowerCase()
          )
        ) {
          output[key] =
            "[redacted]";
          continue;
        }

        output[key] =
          this.redactSecrets(
            item,
            depth + 1
          );
      }

      return output;
    }

    return String(
      value
    );
  }
}
