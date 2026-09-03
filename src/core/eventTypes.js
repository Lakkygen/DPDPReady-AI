// src/core/eventTypes.js

export const EVENT_TYPES = Object.freeze({
  TASK_CREATED:
    "task.created",

  TASK_CLAIMED:
    "task.claimed",

  TASK_STARTED:
    "task.started",

  TASK_COMPLETED:
    "task.completed",

  TASK_FAILED:
    "task.failed",

  TASK_RETRY:
    "task.retry",

  TASK_CANCELLED:
    "task.cancelled",

  APPROVAL_REQUIRED:
    "approval.required",

  APPROVAL_GRANTED:
    "approval.granted",

  APPROVAL_REJECTED:
    "approval.rejected",

  APPROVAL_EXPIRED:
    "approval.expired",

  TOOL_STARTED:
    "tool.started",

  TOOL_COMPLETED:
    "tool.completed",

  TOOL_FAILED:
    "tool.failed",

  TOOL_BLOCKED:
    "tool.blocked",
});

export function isEventType(
  value
) {
  return Object.values(
    EVENT_TYPES
  ).includes(value);
}
