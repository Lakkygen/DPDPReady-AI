// tests/security/toolExecutor.test.js

import test from "node:test";
import assert from "node:assert/strict";

import {
  ToolExecutor,
} from "../../src/agents/base/toolExecutor.js";

function makeAgent(
  overrides = {}
) {
  return {
    id: "ops",
    role: "ops",
    taskId: "task-1",
    ...overrides,
  };
}

test(
  "tool executor blocks a high-risk tool without approval",
  async () => {
    let executions = 0;

    const executor =
      new ToolExecutor({
        registry: {
          github_update_file: {
            name:
              "github_update_file",

            permission:
              "github.write",

            requiresApproval:
              true,

            definition: {
              type: "function",
              function: {
                name:
                  "github_update_file",
                description:
                  "test tool",
                parameters: {
                  type: "object",
                  properties: {},
                  additionalProperties:
                    false,
                },
              },
            },

            execute: async () => {
              executions += 1;
              return {
                changed: true,
              };
            },
          },
        },

        approvalGate: {
          async validate() {
            return {
              valid: false,
              reason:
                "Approval not found.",
            };
          },

          async request() {
            return {
              id:
                "approval-123",
            };
          },
        },
      });

    const result =
      await executor.execute({
        agent:
          makeAgent(),

        toolName:
          "github_update_file",

        arguments: {
          path:
            "src/index.js",
        },
      });

    assert.equal(
      result.ok,
      false
    );

    assert.equal(
      result.requiresApproval,
      true
    );

    assert.equal(
      result.approvalId,
      "approval-123"
    );

    assert.equal(
      executions,
      0
    );
  }
);

test(
  "tool executor executes after valid approval",
  async () => {
    let executions = 0;

    const executor =
      new ToolExecutor({
        registry: {
          github_update_file: {
            name:
              "github_update_file",

            permission:
              "github.write",

            requiresApproval:
              true,

            definition: {
              type: "function",
              function: {
                name:
                  "github_update_file",
                description:
                  "test tool",
                parameters: {
                  type: "object",
                  properties: {},
                  additionalProperties:
                    false,
                },
              },
            },

            execute: async ({
              args,
            }) => {
              executions += 1;

              return {
                received:
                  args,
              };
            },
          },
        },

        approvalGate: {
          async validate({
            approvalToken,
          }) {
            return {
              valid:
                approvalToken ===
                "approved-123",
              reason:
                "invalid approval",
            };
          },

          async request() {
            throw new Error(
              "Should not request approval."
            );
          },
        },
      });

    const result =
      await executor.execute({
        agent:
          makeAgent(),

        toolName:
          "github_update_file",

        approvalToken:
          "approved-123",

        arguments: {
          path:
            "src/index.js",
        },
      });

    assert.equal(
      result.ok,
      true
    );

    assert.equal(
      executions,
      1
    );

    assert.equal(
      result.result.received.path,
      "src/index.js"
    );
  }
);

test(
  "tool executor rejects invalid JSON arguments",
  async () => {
    const executor =
      new ToolExecutor({
        registry: {
          health_check: {
            name:
              "health_check",

            permission:
              "website.read",

            definition: {
              type: "function",
              function: {
                name:
                  "health_check",
                description:
                  "test tool",
                parameters: {
                  type: "object",
                  properties: {},
                  additionalProperties:
                    false,
                },
              },
            },

            execute: async () => ({
              ok: true,
            }),
          },
        },
      });

    const result =
      await executor.execute({
        agent:
          makeAgent(),

        toolName:
          "health_check",

        arguments:
          "{bad-json",
      });

    assert.equal(
      result.ok,
      false
    );

    assert.match(
      result.error,
      /Invalid JSON/
    );
  }
);
