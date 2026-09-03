// src/security/approvalGate.js

function normalizeToken(
  token
) {
  if (
    token === null ||
    token === undefined
  ) {
    return null;
  }

  if (
    typeof token === "string"
  ) {
    const trimmed =
      token.trim();

    return trimmed || null;
  }

  if (
    typeof token === "object"
  ) {
    return (
      token.approvalId ??
      token.id ??
      null
    );
  }

  return null;
}

function parsePayloadJson(
  value
) {
  if (!value) {
    return {};
  }

  if (
    typeof value === "object"
  ) {
    return value;
  }

  try {
    const parsed =
      JSON.parse(value);

    return parsed &&
      typeof parsed === "object"
      ? parsed
      : {};
  } catch {
    return {};
  }
}

export function createApprovalGate(
  options = {}
) {
  const logger =
    options.logger ?? console;

  const store =
    options.store ?? null;

  const controller =
    options.approvalController ??
    null;

  const approvalTtlMs =
    Math.max(
      Number(
        options.approvalTtlMs ??
        15 * 60 * 1000
      ),
      60 * 1000
    );

  async function validate({
    approvalToken,
    agent,
    toolName,
    taskId = null,
  } = {}) {
    const token =
      normalizeToken(
        approvalToken
      );

    if (!token) {
      return {
        valid: false,
        reason:
          "Approval token is missing.",
      };
    }

    if (
      controller &&
      typeof controller.isApprovalValid ===
        "function"
    ) {
      try {
        const valid =
          await controller.isApprovalValid(
            token,
            {
              agent,
              toolName,
              taskId,
            }
          );

        return {
          valid: Boolean(valid),
          reason: valid
            ? null
            : "Approval controller rejected the approval.",
        };
      } catch (error) {
        logger.error?.(
          "Approval controller validation failed:",
          error
        );

        return {
          valid: false,
          reason:
            "Approval validation failed.",
        };
      }
    }

    if (
      !store ||
      typeof store.getApproval !==
        "function"
    ) {
      return {
        valid: false,
        reason:
          "No persistent approval validator is configured.",
      };
    }

    const approval =
      await store.getApproval(
        token
      );

    if (!approval) {
      return {
        valid: false,
        reason:
          "Approval not found.",
      };
    }

    if (
      approval.status !==
      "approved"
    ) {
      return {
        valid: false,
        approval,
        reason:
          `Approval status is ${approval.status}.`,
      };
    }

    if (
      approval.created_at
    ) {
      const createdAt =
        Date.parse(
          approval.created_at
        );

      if (
        Number.isFinite(
          createdAt
        ) &&
        Date.now() -
          createdAt >
          approvalTtlMs
      ) {
        return {
          valid: false,
          approval,
          reason:
            "Approval has expired.",
        };
      }
    }

    if (
      taskId &&
      approval.task_id &&
      String(
        approval.task_id
      ) !== String(taskId)
    ) {
      return {
        valid: false,
        approval,
        reason:
          "Approval does not belong to this task.",
      };
    }

    if (
      toolName &&
      approval.action &&
      String(
        approval.action
      ) !== String(toolName)
    ) {
      return {
        valid: false,
        approval,
        reason:
          "Approval does not authorize this tool.",
      };
    }

    if (
      agent?.id &&
      approval.requested_by &&
      String(
        approval.requested_by
      ) !== String(agent.id)
    ) {
      return {
        valid: false,
        approval,
        reason:
          "Approval does not belong to this agent.",
      };
    }

    const storedPayload =
      parsePayloadJson(
        approval.payload_json
      );

    if (
      storedPayload.agentId &&
      agent?.id &&
      String(
        storedPayload.agentId
      ) !== String(agent.id)
    ) {
      return {
        valid: false,
        approval,
        reason:
          "Approval agent binding failed.",
      };
    }

    return {
      valid: true,
      approval,
      reason: null,
    };
  }

  async function request({
    taskId,
    toolName,
    agent,
    payload = {},
  } = {}) {
    if (
      controller &&
      typeof controller.requestApproval ===
        "function"
    ) {
      return controller.requestApproval({
        taskId,
        action: toolName,
        requestedBy:
          agent?.id ?? "unknown",
        payload,
      });
    }

    if (
      store &&
      typeof store.createApproval ===
        "function"
    ) {
      return store.createApproval({
        taskId,
        action: toolName,
        requestedBy:
          agent?.id ?? "unknown",
        payload: {
          ...payload,
          agentId:
            agent?.id ?? null,
          toolName,
        },
      });
    }

    throw new Error(
      "No approval request provider is configured."
    );
  }

  return {
    validate,
    request,
  };
}
