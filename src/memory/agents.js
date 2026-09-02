// src/memory/agents.js

export async function saveAgentMemory(
  db,
  {
    agentId,
    key,
    value,
    importance = 1
  }
) {
  if (!db) {
    return null;
  }

  const id =
    crypto.randomUUID();

  await db
    .prepare(
      `
      INSERT INTO agent_memory
      (id, agent_id, scope, memory_key, memory_value, importance, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `
    )
    .bind(
      id,
      agentId,
      agentId,
      key,
      String(value).slice(0, 2000),
      Number(importance) || 1,
      new Date().toISOString()
    )
    .run();

  return id;
}
