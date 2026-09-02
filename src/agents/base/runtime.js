// src/agents/base/runtime.js

import { Agent } from "./Agent.js";
import { MemoryManager } from "./memoryManager.js";
import { getEnvironment } from "../../config/environment.js";

const DEFAULT_TIMEOUT_MS = 25000;

function createAbortSignal(timeoutMs) {
  return AbortSignal.timeout(
    Number(timeoutMs) > 0 ? Number(timeoutMs) : DEFAULT_TIMEOUT_MS
  );
}

export class AgentRuntime {
  constructor(options = {}) {
    this.env = getEnvironment(options.env ?? {});
    this.db = options.db ?? null;
    this.logger = options.logger ?? console;

    this.memoryManager =
      options.memoryManager ??
      new MemoryManager({
        db: this.db,
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
    context = {},
    tools = {},
    model = null
  }) {
    const agent = this.createAgent(agentId);

    if (!task || typeof task !== "string") {
      throw new Error("A non-empty task is required.");
    }

    const budget = agent.getBudget();

    const privateMemory = await this.memoryManager.getRelevant({
      agentId: agent.id,
      scope: agent.getMemoryScope(),
      limit: 6
    });

    const companyMemory =
      await this.memoryManager.getCompanyMemory(5);

    const systemPrompt = this.buildSystemPrompt(
      agent,
      privateMemory,
      companyMemory
    );

    const userPrompt = this.buildTaskPrompt({
      agent,
      task,
      context
    });

    return this.callLLM({
      agent,
      systemPrompt,
      userPrompt,
      model: model || agent.config.defaultModel,
      budget,
      tools
    });
  }

  buildSystemPrompt(
    agent,
    privateMemory = [],
    companyMemory = []
  ) {
    return [
      agent.buildSystemIdentity(),
      "",
      "PRIVATE AGENT MEMORY:",
      this.memoryManager.formatForPrompt(privateMemory),
      "",
      "COMPANY MEMORY:",
      this.memoryManager.formatForPrompt(companyMemory)
    ].join("\n");
  }

  buildTaskPrompt({ agent, task, context }) {
    const compactContext = this.compactContext(context);

    return [
      `Current task for ${agent.name}:`,
      task,
      "",
      "Relevant context:",
      compactContext || "None provided.",
      "",
      "Complete the task using available tools when necessary."
    ].join("\n");
  }

  compactContext(context) {
    if (!context || typeof context !== "object") {
      return "";
    }

    return Object.entries(context)
      .slice(0, 20)
      .map(([key, value]) => {
        const stringValue =
          typeof value === "string"
            ? value
            : JSON.stringify(value);

        return `${key}: ${String(stringValue).slice(0, 1500)}`;
      })
      .join("\n");
  }

  async callLLM({
    agent,
    systemPrompt,
    userPrompt,
    model,
    budget,
    tools = {}
  }) {
    const apiKey = this.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is not configured.");
    }

    const selectedModel =
      model ||
      this.env.OPENROUTER_MODEL ||
      "google/gemini-2.5-flash-preview:free";

    const url =
      `${this.env.OPENROUTER_BASE_URL}/chat/completions`;

    const toolDefinitions = Object.values(tools)
      .filter((tool) => tool?.definition)
      .map((tool) => tool.definition);

    const body = {
      model: selectedModel,

      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],

      temperature: 0.2,

      max_tokens: budget.maxOutputTokens
    };

    if (toolDefinitions.length > 0) {
      body.tools = toolDefinitions;
      body.tool_choice = "auto";
    }

    const response = await fetch(url, {
      method: "POST",

      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",

        "HTTP-Referer":
          this.env.APP_URL ||
          "https://dpdpready.online",

        "X-Title":
          this.env.APP_NAME ||
          "DPDPReady AI"
      },

      body: JSON.stringify(body),

      signal: createAbortSignal(
        this.env.LLM_TIMEOUT_MS || DEFAULT_TIMEOUT_MS
      )
    });

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(
        `LLM request failed (${response.status}): ${errorText.slice(
          0,
          1000
        )}`
      );
    }

    const data = await response.json();

    const message = data?.choices?.[0]?.message;

    if (!message) {
      throw new Error(
        "LLM returned no usable message."
      );
    }

    return {
      agent: agent.id,
      model:
        data.model ||
        selectedModel,

      message,

      usage: data.usage || null,

      finishReason:
        data.choices?.[0]?.finish_reason || null
    };
  }
}
