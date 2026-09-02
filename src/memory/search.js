// src/memory/search.js

export async function searchMemory(
  db,
  {
    agentId = null,
    query,
    limit = 8
  }
) {
  if (!db || !query) {
    return [];
  }

  const like =
    `%${query}%`;

  let sql = `
    SELECT
      memory_key,
      memory_value,
      importance,
      created_at
    FROM agent_memory
    WHERE (
      memory_key LIKE ?
      OR memory_value LIKE ?
    )
  `;

  const bindings = [
    like,
    like
  ];

  if (agentId) {
    sql += `
      AND agent_id = ?
    `;

    bindings.push(agentId);
  }

  sql += `
    ORDER BY importance DESC, created_at DESC
    LIMIT ?
  `;

  bindings.push(
    Math.min(Number(limit) || 8, 20)
  );

  const result =
    await db
      .prepare(sql)
      .bind(...bindings)
      .all();

  return result.results ?? [];
}
