// src/core/approvals.js

const APPROVAL_ACTIONS = new Set([
  "production_deploy",
  "production_rollback",
  "destructive_database_change",
  "credential_change",
  "mass_email",
  "billing_change"
]);

function approvalId() {
  return `approval_${crypto.randomUUID()}`;
}

export class ApprovalManager {
  constructor(options = {}) {
    this.db = options.db ?? null;
    this.logger = options.logger ?? console;
  }

  requiresApproval(action) {
    return APPROVAL_ACTIONS.has(
      String(action)
    );
  }

  create({
    requestedBy,
    action,
    description,
    metadata = {}
  }) {
    if (!requestedBy) {
      throw new Error(
        "requestedBy is required."
      );
    }

    if (!action) {
      throw new Error(
        "Approval action is required."
      );
    }

    return {
      id: approvalId(),
      requestedBy,
      action,
      description:
        String(description ?? ""),
      metadata,
      status: "pending",
      createdAt:
        new Date().toISOString(),
      resolvedAt: null,
      resolvedBy: null
    };
  }

  approve(approval, founderId) {
    this.assertPending(approval);

    return {
      ...approval,
      status: "approved",
      resolvedAt:
        new Date().toISOString(),
      resolvedBy: founderId
    };
  }

  reject(approval, founderId, reason = "") {
    this.assertPending(approval);

    return {
      ...approval,
      status: "rejected",
      resolvedAt:
        new Date().toISOString(),
      resolvedBy: founderId,
      rejectionReason:
        String(reason)
    };
  }

  assertPending(approval) {
    if (!approval?.id) {
      throw new Error(
        "Invalid approval request."
      );
    }

    if (approval.status !== "pending") {
      throw new Error(
        `Approval is already ${approval.status}.`
      );
    }
  }
}
