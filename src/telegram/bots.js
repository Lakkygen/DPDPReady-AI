import { AGENTS } from "../config/agent.js";

export function getBotConfigs(env) {
  return Object.values(
    AGENTS
  )
    .map((agent) => ({
      agentId: agent.id,
      name: agent.name,
      token:
        env[
          agent.telegramEnvKey
        ] ?? null
    }))
    .filter((bot) =>
      Boolean(bot.token)
    );
}

export function getBotConfig(
  env,
  agentId
) {
  const agent =
    AGENTS[agentId];

  if (!agent) {
    return null;
  }

  return {
    agentId,
    name: agent.name,
    token:
      env[
        agent.telegramEnvKey
      ] ?? null
  };
}
