// src/agents/base/runtime.js

import { Agent } from "./Agent.js";
import { MemoryManager } from "./memoryManager.js";
import { ToolExecutor } from "./toolExecutor.js";
import {
  getEnvironment
} from "../../config/environment.js";
import {
  getAgentBudget
} from "../../config/budgets.js";
import {
  TOOL_REGISTRY
} from "../../tools/registry.js";

const DEFAULT_TIMEOUT_MS = 25000;

function abortSignal(timeoutMs) {
  return AbortSignal.timeout(
    Number(timeoutMs) > 0
      ? Number(timeoutMs)
      : DEFAULT_TIMEOUT_MS
  );
}

export class AgentRuntime {
  constructor(options = {}) {
    this.env = getEnvironment(
      options.env ?? {}
    );

    this.db = options.db ?? null;
    this.logger = options.logger ?? console;

    this.memoryManager =
      options.memoryManager ??
      new MemoryManager({
        db: this.db,
        logger: this.logger
      });

    this.toolExecutor =
      options.toolExecutor ??
      new ToolExecutor({
        registry:
          options.toolRegistry ??
          TOOL_REGISTRY,
        logger: this.logger
      });
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
  }) {
    const agent = this.createAgent(agentId);

    if (!task?.trim()) {
      throw new Error("Task is required.");
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
      this.toolExecutor
        .getDefinitionsForAgent(agent);

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

    while (
      llmCalls < budget.maxLLMCallsPerTask
    ) {
      llmCalls += 1;

      const response =
        await this.callLLM({
          messages,
          tools,
          model:
            this.env.OPENROUTER_MODEL,
          maxTokens:
            budget.maxOutputTokens
        });

      const message =
        response?.choices?.[0]?.message;

      if (!message) {
        throw new Error(
          "LLM returned no message."
        );
      }

      messages.push(message);

      const requestedToolCalls =
        Array.isArray(message.tool_calls)
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
          model:
            response.model ||
            this.env.OPENROUTER_MODEL,
          usage:
            response.usage ?? null,
          llmCalls,
          toolCalls
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

        const functionArguments =
          toolCall?.function?.arguments ??
          "{}";

        const result =
          await this.toolExecutor.execute({
            agent,
            toolName:
              functionName,
            arguments:
              functionArguments
          });

        messages.push({
          role: "tool",
          tool_call_id:
            toolCall.id,
          content:
            JSON.stringify(
              result
            ).slice(0, 15000)
        });
      }
    }

    return {
      agent: agent.id,
      agentName: agent.name,
      content:
        "I reached the task reasoning limit before completing the task.",
      model:
        this.env.OPENROUTER_MODEL,
      usage: null,
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
      "- Stop when the task is complete.",
      "- Do not repeatedly call a tool for the same information."
    ].join("\n");
  }

  buildTaskPrompt({
    task,
    context
  }) {
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
      of Object.entries(context).slice(0, 15)
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
        `${key}: ${String(text).slice(0, 1500)}`
      );
    }

    return parts.length > 0
      ? parts.join("\n")
      : "None.";
  }

  async callLLM({
    messages,
    tools,
    model,
    maxTokens
  }) {
    const apiKey =
      this.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new Error(
        "OPENROUTER_API_KEY is not configured."
      );
    }

    const body = {
      model:
        model ||
        this.env.OPENROUTER_MODEL,
      messages,
      temperature: 0.2,
      max_tokens: maxTokens
    };

    if (tools.length > 0) {
      body.tools = tools;
      body.tool_choice = "auto";
    }

    const response = await fetch(
      `${this.env.OPENROUTER_BASE_URL}/chat/completions`,
      {
        method: "POST",

        headers: {
          "Authorization":
            `Bearer ${apiKey}`,
          "Content-Type":
            "application/json",
          "HTTP-Referer":
            this.env.APP_URL ||
            "https://dpdpready.online",
          "X-Title":
            this.env.APP_NAME ||
            "DPDPReady AI"
        },

        body: JSON.stringify(body),

        signal: abortSignal(
          this.env.LLM_TIMEOUT_MS ||
          DEFAULT_TIMEOUT_MS
        )
      }
    );

    if (!response.ok) {
      const error =
        await response.text();

      throw new Error(
        `OpenRouter error ${response.status}: ${error.slice(
          0,
          1500
        )}`
      );
    }

    return await response.json();
  }
}
