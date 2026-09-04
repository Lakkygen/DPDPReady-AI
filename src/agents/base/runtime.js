import { Agent } from "./agent.js";
import { MemoryManager } from "./memoryManager.js";
import { ToolExecutor } from "./toolExecutor.js";
import { getEnvironment } from "../../config/environment.js";
import { getAgentBudget } from "../../config/budgets.js";
import { createToolRegistry } from "../../tools/registry.js";
import { createApprovalController } from "../../telegram/approvals.js";
import { createPersistentStore } from "../../core/persistentStore.js";
import { createApprovalGate } from "../../security/approvalGate.js";
import { createLLMClient } from "../../llm/client.js";

export class AgentRuntime {
  constructor(options = {}) {
    this.env = getEnvironment(options.env ?? {});
    this.db = options.db ?? this.env.DB ?? null;
    this.logger = options.logger ?? console;

    this.memoryManager =
      options.memoryManager ??
      new MemoryManager({
        db: this.db,
        logger: this.logger
      });

    this.store =
      options.store ??
      createPersistentStore(this.env);

    this.approvalController =
      options.approvalController ??
      createApprovalController(this.env);

    this.approvalGate =
      options.approvalGate ??
      createApprovalGate({
        store: this.store,
        approvalController:
          this.approvalController,
        logger: this.logger,
        approvalTtlMs:
          this.env.APPROVAL_TTL_MS
      });

    this.toolExecutor =
      options.toolExecutor ??
      new ToolExecutor({
        registry:
          options.toolRegistry ??
          createToolRegistry(this.env),
        logger: this.logger,
        store: this.store,
        approvalController:
          this.approvalController,
        approvalGate:
          this.approvalGate
      });

    this.llmClient =
      options.llmClient ??
      createLLMClient(
        this.env,
        this.logger
      );
  }

  createAgent(agentId) {
    return new Agent(agentId, {
      environment: this.env,
      memoryManager: this.memoryManager,
      logger: this.logger
    });
  }

  async run({
    agentId,
    task,
    context = {}
  } = {}) {
    const agent = this.createAgent(agentId);

    if (
      typeof task !== "string" ||
      !task.trim()
    ) {
      throw new Error(
        "Task is required."
      );
    }

    const budget =
      getAgentBudget(agentId);

    const privateMemory =
      await this.memoryManager.getRelevant({
        agentId,
        scope: agent.getMemoryScope(),
        limit: 6
      });

    const companyMemory =
      await this.memoryManager.getCompanyMemory(5);

    const systemPrompt =
      this.buildSystemPrompt(
        agent,
        privateMemory,
        companyMemory
      );

    const initialUserPrompt =
      this.buildTaskPrompt({
        task,
        context
      });

    const tools =
      this.toolExecutor.getDefinitionsForAgent(
        agent
      );

    const messages = [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: initialUserPrompt
      }
    ];

    let llmCalls = 0;
    let toolCalls = 0;
    let totalUsage = null;
    let lastProvider = null;

    while (
      llmCalls <
      budget.maxLLMCallsPerTask
    ) {
      llmCalls += 1;

      const response =
        await this.llmClient.chat({
          messages,
          tools,
          maxTokens:
            budget.maxOutputTokens,
          temperature: 0.2
        });

      lastProvider =
        response.provider ??
        lastProvider;

      totalUsage =
        response.usage ??
        totalUsage;

      const message =
        response?.choices?.[0]?.message;

      if (!message) {
        throw new Error(
          "LLM returned no message."
        );
      }

      messages.push(message);

      const requestedToolCalls =
        Array.isArray(
          message.tool_calls
        )
          ? message.tool_calls
          : [];

      if (
        requestedToolCalls.length === 0
      ) {
        return {
          agent: agent.id,
          agentName: agent.name,
          content:
            message.content ?? "",
          provider: lastProvider,
          model:
            response.model ?? null,
          usage: totalUsage,
          llmCalls,
          toolCalls,
          incomplete: false
        };
      }

      for (
        const toolCall
        of requestedToolCalls
      ) {
        if (
          toolCalls >=
          budget.maxToolCallsPerTask
        ) {
          messages.push({
            role: "tool",
            tool_call_id:
              toolCall.id,
            content:
              JSON.stringify({
                ok: false,
                error:
                  "Tool-call budget exhausted."
              })
          });

          break;
        }

        toolCalls += 1;

        const functionName =
          toolCall?.function?.name;

        if (!functionName) {
          messages.push({
            role: "tool",
            tool_call_id:
              toolCall.id,
            content:
              JSON.stringify({
                ok: false,
                error:
                  "LLM returned a tool call without a function name."
              })
          });

          continue;
        }

        const functionArguments =
          toolCall?.function?.arguments ??
          "{}";

        const result =
          await this.toolExecutor.execute({
            agent: {
              ...agent,
              taskId:
                context?.taskId ??
                null
            },
            toolName: functionName,
            arguments:
              functionArguments,
            approvalToken:
              context?.approvalToken ??
              null
          });

        messages.push({
          role: "tool",
          tool_call_id:
            toolCall.id,
          content:
            this.serializeToolResult(
              result
            )
        });
      }
    }

    return {
      agent: agent.id,
      agentName: agent.name,
      content:
        "I reached the task reasoning limit before completing the task.",
      provider: lastProvider,
      model: null,
      usage: totalUsage,
      llmCalls,
      toolCalls,
      incomplete: true
    };
  }

  buildSystemPrompt(
    agent,
    privateMemory,
    companyMemory
  ) {
    return [
      agent.buildSystemIdentity(),
      "",
      "PRIVATE MEMORY:",
      this.memoryManager.formatForPrompt(
        privateMemory
      ),
      "",
      "COMPANY MEMORY:",
      this.memoryManager.formatForPrompt(
        companyMemory
      ),
      "",
      "TOOL POLICY:",
      "- Use tools only when necessary.",
      "- Never invent tool results.",
      "- Never claim an action succeeded without verification.",
      "- Stay within your permissions.",
      "- High-risk or destructive tools may require founder approval.",
      "- Never attempt to bypass an approval gate.",
      "- Never expose secrets, credentials, or approval tokens.",
      "- Stop when the task is complete.",
      "- Do not repeatedly call a tool for the same information."
    ].join("\n");
  }

  buildTaskPrompt({ task, context }) {
    return [
      "TASK:",
      task.trim(),
      "",
      "CONTEXT:",
      this.compactContext(context),
      "",
      "Return a useful final answer when the task is complete."
    ].join("\n");
  }

  compactContext(context) {
    if (
      !context ||
      typeof context !== "object"
    ) {
      return "None.";
    }

    const parts = [];

    for (
      const [key, value]
      of Object.entries(context).slice(
        0,
        15
      )
    ) {
      let text;

      try {
        text =
          typeof value === "string"
            ? value
            : JSON.stringify(value);
      } catch {
        text = String(value);
      }

      parts.push(
        `${key}: ${String(text).slice(
          0,
          1500
        )}`
      );
    }

    return parts.length > 0
      ? parts.join("\n")
      : "None.";
  }

  serializeToolResult(result) {
    try {
      return JSON.stringify(
        result
      ).slice(0, 15000);
    } catch {
      return JSON.stringify({
        ok: false,
        error:
          "Tool result could not be serialized."
      });
    }
  }
}
