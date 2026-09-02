// src/memory/company.js

export async function saveCompanyMemory(
  db,
  {
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
      INSERT INTO company_memory
      (id, memory_key, memory_value, importance, created_at)
      VALUES (?, ?, ?, ?, ?)
      `
    )
    .bind(
      id,
      key,
      String(value).slice(0, 2000),
      Number(importance) || 1,
      new Date().toISOString()
    )
    .run();

  return id;
}

export async function getCompanyMemory(
  db,
  limit = 10
) {
  if (!db) {
    return [];
  }

  const result =
    await db
      .prepare(
        `
        SELECT *
        FROM company_memory
        ORDER BY importance DESC, created_at DESC
        LIMIT ?
        `
      )
      .bind(limit)
      .all();

  return result.results ?? [];
}
