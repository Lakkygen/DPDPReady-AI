// src/config/budgets.js

/**
 * DPDPReady AI — Agent Resource Budgets
 *
 * These values limit how much reasoning and
 * tool usage an agent may perform during one task.
 */

export const DEFAULT_BUDGET = {
  maxLLMCallsPerTask: 3,
  maxToolCallsPerTask: 8,
  maxContextTokens: 6000,
  maxOutputTokens: 1200
};

export const AGENT_BUDGETS = {
  ops: {
    maxLLMCallsPerTask: 4,
    maxToolCallsPerTask: 10,
    maxContextTokens: 6000,
    maxOutputTokens: 1400
  },

  growth: {
    maxLLMCallsPerTask: 5,
    maxToolCallsPerTask: 15,
    maxContextTokens: 7000,
    maxOutputTokens: 1600
  },

  research: {
    maxLLMCallsPerTask: 5,
    maxToolCallsPerTask: 20,
    maxContextTokens: 8000,
    maxOutputTokens: 1800
  },

  analyst: {
    maxLLMCallsPerTask: 3,
    maxToolCallsPerTask: 10,
    maxContextTokens: 6000,
    maxOutputTokens: 1400
  },

  support: {
    maxLLMCallsPerTask: 3,
    maxToolCallsPerTask: 8,
    maxContextTokens: 5000,
    maxOutputTokens: 1200
  }
};

export function getAgentBudget(
  agentId
) {
  const custom =
    AGENT_BUDGETS[
      agentId
    ] ?? {};

  return {
    ...DEFAULT_BUDGET,
    ...custom
  };
}

/**
 * Global safety limits.
 *
 * These are execution guards and are separate
 * from provider billing.
 */
export const GLOBAL_LIMITS = {
  maxTasksPerMinute: 20,
  maxConcurrentTasks: 10,
  maxAgentDelegationsPerTask: 3
};
