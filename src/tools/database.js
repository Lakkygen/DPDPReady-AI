export function createDatabase(
  env
) {
  const db = env.DB;

  if (!db) {
    throw new Error(
      "D1 binding DB is not configured"
    );
  }

  async function execute(
    sql,
    ...params
  ) {
    if (
      !sql ||
      typeof sql !== "string"
    ) {
      throw new Error(
        "sql is required"
      );
    }

    return db
      .prepare(sql)
      .bind(...params)
      .run();
  }

  async function first(
    sql,
    ...params
  ) {
    if (
      !sql ||
      typeof sql !== "string"
    ) {
      throw new Error(
        "sql is required"
      );
    }

    return db
      .prepare(sql)
      .bind(...params)
      .first();
  }

  async function all(
    sql,
    ...params
  ) {
    if (
      !sql ||
      typeof sql !== "string"
    ) {
      throw new Error(
        "sql is required"
      );
    }

    const result =
      await db
        .prepare(sql)
        .bind(...params)
        .all();

    return result?.results || [];
  }

  async function batch(
    statements
  ) {
    if (
      !Array.isArray(
        statements
      ) ||
      statements.length === 0
    ) {
      throw new Error(
        "statements must be a non-empty array"
      );
    }

    return db.batch(
      statements
    );
  }

  return {
    execute,
    first,
    all,
    batch,
  };
}
