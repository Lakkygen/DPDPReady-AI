// tests/security/approvalGate.test.js

import test from "node:test";
import assert from "node:assert/strict";

import {
  createApprovalGate,
} from "../../src/security/approvalGate.js";

test(
  "approval gate accepts a matching approved persistent approval",
  async () => {
    const store = {
      async getApproval(id) {
        assert.equal(
          id,
          "approval-1"
        );

        return {
          id: "approval-1",
          task_id: "task-1",
          action:
            "github_update_file",
          requested_by: "ops",
          status: "approved",
          created_at:
            new Date().toISOString(),
          payload_json:
            JSON.stringify({
              agentId: "ops",
            }),
        };
      },
    };

    const gate =
      createApprovalGate({
        store,
      });

    const result =
      await gate.validate({
        approvalToken:
          "approval-1",

        agent: {
          id: "ops",
        },

        toolName:
          "github_update_file",

        taskId:
          "task-1",
      });

    assert.equal(
      result.valid,
      true
    );
  }
);

test(
  "approval gate rejects an approval for another task",
  async () => {
    const store = {
      async getApproval() {
        return {
          id: "approval-1",
          task_id: "task-A",
          action:
            "github_update_file",
          requested_by: "ops",
          status: "approved",
          created_at:
            new Date().toISOString(),
        };
      },
    };

    const gate =
      createApprovalGate({
        store,
      });

    const result =
      await gate.validate({
        approvalToken:
          "approval-1",

        agent: {
          id: "ops",
        },

        toolName:
          "github_update_file",

        taskId:
          "task-B",
      });

    assert.equal(
      result.valid,
      false
    );

    assert.match(
      result.reason,
      /task/
    );
  }
);

test(
  "approval gate rejects non-approved status",
  async () => {
    const store = {
      async getApproval() {
        return {
          id: "approval-1",
          task_id: "task-1",
          action:
            "github_update_file",
          requested_by: "ops",
          status: "pending",
          created_at:
            new Date().toISOString(),
        };
      },
    };

    const gate =
      createApprovalGate({
        store,
      });

    const result =
      await gate.validate({
        approvalToken:
          "approval-1",

        agent: {
          id: "ops",
        },

        toolName:
          "github_update_file",

        taskId:
          "task-1",
      });

    assert.equal(
      result.valid,
      false
    );
  }
);
