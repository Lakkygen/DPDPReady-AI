// src/core/orchestrator.js

import { OpsAgent } from "../agents/ops/agent.js";
import { GrowthAgent } from "../agents/growth/agent.js";
import { ResearchAgent } from "../agents/research/agent.js";
import { AnalystAgent } from "../agents/analyst/agent.js";
import { SupportAgent } from "../agents/support/agent.js";

import { TaskManager } from "./tasks.js";
import {
  EventBus,
  EVENT_TYPES
} from "./events.js";

import { ApprovalManager } from "./approvals.js";

export class Orchestrator {
  constructor(options = {}) {
    this.env = options.env ?? {};
    this.db = options.db ?? null;
    this.logger = options.logger ?? console;

    this.runtime =
      options.runtime ?? null;

    this.taskManager =
      options.taskManager ??
      new TaskManager({
        db: this.db,
        logger: this.logger
      });

    this.eventBus =
      options.eventBus ??
      new EventBus({
        logger: this.logger
      });

    this.approvalManager =
      options.approvalManager ??
      new ApprovalManager({
        db: this.db,
        logger: this.logger
      });

    const agentOptions = {
      environment: this.env,
      db: this.db,
      logger: this.logger,
      memoryManager:
        options.memoryManager
    };

    this.agents = {
      ops: new OpsAgent(agentOptions),
      growth: new GrowthAgent(agentOptions),
      research:
        new ResearchAgent(agentOptions),
      analyst:
        new AnalystAgent(agentOptions),
      support:
        new SupportAgent(agentOptions)
    };

    this.registerEvents();
  }

  setRuntime(runtime) {
    this.runtime = runtime;
  }

  getAgent(agentId) {
    return (
      this.agents[agentId] ?? null
    );
  }

  requireAgent(agentId) {
    const agent =
      this.getAgent(agentId);

    if (!agent) {
      throw new Error(
        `Unknown agent: ${agentId}`
      );
    }

    return agent;
  }

  createTask(input) {
    const task =
      this.taskManager.create(input);

    this.eventBus.emit({
      type:
        EVENT_TYPES.TASK_CREATED,
      task
    });

    return task;
  }

  async executeTask(
    task,
    options = {}
  ) {
    if (!this.runtime) {
      throw new Error(
        "Orchestrator runtime is not configured."
      );
    }

    const agent =
      this.requireAgent(
        task.assignedTo
      );

    let runningTask =
      this.taskManager.start(task);

    await this.eventBus.emit({
      type:
        EVENT_TYPES.TASK_STARTED,
      task: runningTask
    });

    try {
      const result =
        await this.runtime.run({
          agentId: agent.id,
          task: [
            runningTask.title,
            runningTask.description
              ? `\n${runningTask.description}`
              : ""
          ].join(""),
          context: {
            taskId: runningTask.id,
            priority:
              runningTask.priority,
            ...runningTask.metadata,
            ...(options.context ?? {})
          }
        });

      runningTask =
        this.taskManager.complete(
          runningTask,
          result
        );

      await this.eventBus.emit({
        type:
          EVENT_TYPES.TASK_COMPLETED,
        task: runningTask
      });

      return runningTask;
    } catch (error) {
      runningTask =
        this.taskManager.fail(
          runningTask,
          error
        );

      await this.eventBus.emit({
        type:
          EVENT_TYPES.TASK_FAILED,
        task: runningTask
      });

      throw error;
    }
  }

  delegate({
    from,
    to,
    title,
    description = "",
    priority = "normal",
    metadata = {}
  }) {
    this.requireAgent(from);
    this.requireAgent(to);

    return this.createTask({
      title,
      description,
      assignedTo: to,
      createdBy: from,
      priority,
      metadata: {
        delegatedBy: from,
        ...metadata
      }
    });
  }

  requestApproval({
    requestedBy,
    action,
    description,
    metadata = {}
  }) {
    if (
      !this.approvalManager
        .requiresApproval(action)
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
        metadata
      });

    this.eventBus.emit({
      type:
        EVENT_TYPES.APPROVAL_REQUIRED,
      approval
    });

    return approval;
  }

  registerEvents() {
    this.eventBus.on(
      EVENT_TYPES.TASK_FAILED,
      async ({ task }) => {
        this.logger.error?.(
          `[TASK FAILED] ${task?.id}`
        );
      }
    );

    this.eventBus.on(
      EVENT_TYPES.APPROVAL_REQUIRED,
      async ({ approval }) => {
        this.logger.warn?.(
          `[APPROVAL REQUIRED] ${approval?.action}`
        );
      }
    );
  }
}
