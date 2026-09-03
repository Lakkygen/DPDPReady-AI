// src/core/orchestrator.js

import { OpsAgent } from "../agents/ops/agent.js";
import { GrowthAgent } from "../agents/growth/agent.js";
import { ResearchAgent } from "../agents/research/agent.js";
import { AnalystAgent } from "../agents/analyst/agent.js";
import { SupportAgent } from "../agents/support/agent.js";

import {
  createPersistentStore,
} from "./persistentStore.js";

import {
  createTaskManager,
} from "./taskManager.js";

import {
  createEventBus,
} from "./eventbus.js";

import {
  ApprovalManager,
} from "./approvals.js";

import {
  EVENT_TYPES,
} from "./eventTypes.js";

export class Orchestrator {
  constructor(options = {}) {
    this.env = options.env ?? {};
    this.db = options.db ?? this.env.DB ?? null;
    this.logger = options.logger ?? console;

    this.store =
      options.store ??
      createPersistentStore(this.env);

    this.runtime =
      options.runtime ?? null;

    this.taskManager =
      options.taskManager ??
      createTaskManager(this.store);

    this.eventBus =
      options.eventBus ??
      createEventBus(this.store);

    this.approvalManager =
      options.approvalManager ??
      new ApprovalManager({
        db: this.db,
        logger: this.logger,
      });

    const agentOptions = {
      environment: this.env,
      db: this.db,
      logger: this.logger,
      memoryManager:
        options.memoryManager,
    };

    this.agents = {
      ops: new OpsAgent(agentOptions),
      growth: new GrowthAgent(agentOptions),
      research: new ResearchAgent(agentOptions),
      analyst: new AnalystAgent(agentOptions),
      support: new SupportAgent(agentOptions),
    };

    this.registerEvents();
  }

  setRuntime(runtime) {
    this.runtime = runtime;
    return this;
  }

  getAgent(agentId) {
    return this.agents[agentId] ?? null;
  }

  requireAgent(agentId) {
    const agent = this.getAgent(agentId);

    if (!agent) {
      throw new Error(
        `Unknown agent: ${agentId}`
      );
    }

    return agent;
  }

  async createTask(input = {}) {
    const assignedTo =
      input.assignedTo ??
      input.assignedAgent ??
      null;

    if (!input.title?.trim()) {
      throw new Error(
        "Task title is required."
      );
    }

    if (assignedTo) {
      this.requireAgent(assignedTo);
    }

    const task = await this.taskManager.create({
      id: input.id,
      type: input.type ?? "general",
      title: input.title.trim(),
      description:
        String(input.description ?? ""),
      assignedAgent: assignedTo,
      createdBy:
        input.createdBy ?? "system",
      priority:
        input.priority ?? "normal",
      payload:
        input.payload ??
        input.metadata ??
        {},
    });

    await this.eventBus.emit(
      EVENT_TYPES.TASK_CREATED,
      {
        task,
      },
      input.createdBy ?? "system"
    );

    return task;
  }

  async executeTask(task, options = {}) {
    if (!this.runtime) {
      throw new Error(
        "Orchestrator runtime is not configured."
      );
    }

    if (!task?.id) {
      throw new Error(
        "Task with a valid id is required."
      );
    }

    const assignedAgent =
      task.assigned_agent ??
      task.assignedAgent ??
      task.assignedTo;

    const agent =
      this.requireAgent(
        assignedAgent
      );

    const runningTask =
      await this.taskManager.claim(
        task.id,
        agent.id
      );

    await this.eventBus.emit(
      EVENT_TYPES.TASK_STARTED,
      {
        task: runningTask,
      },
      agent.id
    );

    try {
      const payload =
        this.parseTaskPayload(runningTask);

      const result =
        await this.runtime.run({
          agentId: agent.id,

          task: [
            runningTask.title,
            runningTask.description
              ? `\n${runningTask.description}`
              : "",
          ].join(""),

          context: {
            taskId: runningTask.id,
            priority:
              runningTask.priority ??
              "normal",

            ...payload,

            ...(options.context ?? {}),
          },
        });

      const completedTask =
        await this.taskManager.complete(
          runningTask.id,
          result
        );

      await this.eventBus.emit(
        EVENT_TYPES.TASK_COMPLETED,
        {
          task: completedTask,
        },
        agent.id
      );

      return completedTask;
    } catch (error) {
      const failedTask =
        await this.taskManager.fail(
          runningTask.id,
          error
        );

      await this.eventBus.emit(
        EVENT_TYPES.TASK_FAILED,
        {
          task: failedTask,
          error: {
            message:
              error?.message ??
              String(error),
          },
        },
        agent.id
      );

      throw error;
    }
  }

  async executeTaskById(taskId, options = {}) {
    const task =
      await this.taskManager.get(taskId);

    if (!task) {
      throw new Error(
        `Task ${taskId} not found.`
      );
    }

    return this.executeTask(
      task,
      options
    );
  }

  async delegate({
    from,
    to,
    title,
    description = "",
    priority = "normal",
    metadata = {},
    payload,
    type = "delegated",
  } = {}) {
    this.requireAgent(from);
    this.requireAgent(to);

    return this.createTask({
      type,
      title,
      description,
      assignedTo: to,
      createdBy: from,
      priority,
      payload:
        payload ?? {
          delegatedBy: from,
          ...metadata,
        },
    });
  }

  requestApproval({
    requestedBy,
    action,
    description = "",
    metadata = {},
  } = {}) {
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

    if (
      !this.approvalManager.requiresApproval(
        action
      )
    ) {
      throw new Error(
        `Approval is not required for action: ${action}`
      );
    }

    const approval =
      this.approvalManager.create({
        requestedBy,
        action,
        description,
        metadata,
      });

    // Keep this event emission intentionally async-safe.
    this.eventBus
      .emit(
        EVENT_TYPES.APPROVAL_REQUIRED,
        {
          approval,
        },
        requestedBy
      )
      .catch((error) => {
        this.logger.error?.(
          "Failed to emit approval event:",
          error
        );
      });

    return approval;
  }

  async listTasks(filters = {}) {
    return this.taskManager.list(
      filters
    );
  }

  async getTask(taskId) {
    return this.taskManager.get(
      taskId
    );
  }

  async cancelTask(
    taskId,
    reason = "Cancelled"
  ) {
    const existing =
      await this.taskManager.get(
        taskId
      );

    if (!existing) {
      throw new Error(
        `Task ${taskId} not found.`
      );
    }

    const task =
      await this.taskManager.cancel(
        taskId,
        reason
      );

    await this.eventBus.emit(
      EVENT_TYPES.TASK_CANCELLED,
      {
        task,
        reason,
      },
      "system"
    );

    return task;
  }

  parseTaskPayload(task) {
    if (!task) {
      return {};
    }

    if (
      task.payload &&
      typeof task.payload === "object"
    ) {
      return task.payload;
    }

    const raw =
      task.payload_json;

    if (!raw) {
      return {};
    }

    try {
      const parsed =
        JSON.parse(raw);

      return parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed)
        ? parsed
        : {};
    } catch (error) {
      this.logger.warn?.(
        "Could not parse task payload:",
        error
      );

      return {};
    }
  }

  registerEvents() {
    this.eventBus.on(
      EVENT_TYPES.TASK_FAILED,
      async (event) => {
        this.logger.error?.(
          `[TASK FAILED] ${
            event?.payload?.task?.id ??
            event?.task?.id ??
            "unknown"
          }`,
          event?.payload?.error ??
            event?.error ??
            ""
        );
      }
    );

    this.eventBus.on(
      EVENT_TYPES.APPROVAL_REQUIRED,
      async (event) => {
        const approval =
          event?.payload?.approval ??
          event?.approval;

        this.logger.warn?.(
          `[APPROVAL REQUIRED] ${
            approval?.action ??
            "unknown"
          }`
        );
      }
    );

    this.eventBus.on(
      EVENT_TYPES.TASK_COMPLETED,
      async (event) => {
        this.logger.info?.(
          `[TASK COMPLETED] ${
            event?.payload?.task?.id ??
            event?.task?.id ??
            "unknown"
          }`
        );
      }
    );
  }
}
