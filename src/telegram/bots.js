// src/telegram/bots.js

import {
  AGENTS
} from "../config/agents.js";

export function getBotConfigs(env) {
  return Object.values(AGENTS)
    .map((agent) => ({
      agentId: agent.id,
      name: agent.name,
      token: env[agent.telegramEnvKey]
    }))
    .filter(
      (bot) => Boolean(bot.token)
    );
}

export function getBotConfig(
  env,
  agentId
) {
  const agent = AGENTS[agentId];

  if (!agent) {
    return null;
  }

  return {
    agentId,
    name: agent.name,
    token:
      env[agent.telegramEnvKey] ?? null
  };
}
