import {
  createDatabase,
} from "../tools/database.js";

function json(value) {
  return JSON.stringify(
    value ?? {}
  );
}

export function createPersistentStore(
  env
) {
  const database =
    createDatabase(env);

  async function createTask(
    task
  ) {
    const id =
      task.id ||
      crypto.randomUUID();

    await database.execute(
      `
      INSERT INTO tasks (
        id,
        type,
        title,
        description,
        status,
        priority,
        assigned_agent,
        created_by,
        payload_json,
        created_at,
        updated_at
      )
      VALUES (
        ?,
        ?,
        ?,
        ?,
        'queued',
        ?,
        ?,
        ?,
        ?,
        datetime('now'),
        datetime('now')
      )
      `,

      id,

      task.type ||
        "general",

      task.title ||
        "Untitled task",

      task.description ||
        "",

      task.priority ||
        "normal",

      task.assignedAgent ||
        null,

      task.createdBy ||
        "system",

      json(
        task.payload
      )
    );

    return getTask(id);
  }

  async function getTask(
    id
  ) {
    if (!id) {
      throw new Error(
        "task id is required"
      );
    }

    return database.first(
      `
      SELECT *
      FROM tasks
      WHERE id = ?
      `,
      id
    );
  }

  async function updateTask(
    id,
    patch = {}
  ) {
    if (!id) {
      throw new Error(
        "task id is required"
      );
    }

    const fields = [];
    const values = [];

    const updates = {
      status:
        patch.status,

      assigned_agent:
        patch.assignedAgent,

      result_json:
        patch.result === undefined
          ? undefined
          : json(
              patch.result
            ),

      error_text:
        patch.errorText,

      started_at:
        patch.startedAt,

      completed_at:
        patch.completedAt,

      updated_at:
        new Date().toISOString(),
    };

    for (
      const [
        column,
        value,
      ] of Object.entries(
        updates
      )
    ) {
      if (
        value !== undefined
      ) {
        fields.push(
          `${column} = ?`
        );

        values.push(
          value
        );
      }
    }

    if (!fields.length) {
      return getTask(id);
    }

    values.push(id);

    await database.execute(
      `
      UPDATE tasks
      SET ${fields.join(", ")}
      WHERE id = ?
      `,
      ...values
    );

    return getTask(id);
  }

  async function listTasks({
    status,
    agent,
    limit = 50,
  } = {}) {
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push(
        "status = ?"
      );

      params.push(
        status
      );
    }

    if (agent) {
      conditions.push(
        "assigned_agent = ?"
      );

      params.push(
        agent
      );
    }

    const safeLimit =
      Math.min(
        Math.max(
          Number(limit) || 50,
          1
        ),
        200
      );

    params.push(
      safeLimit
    );

    const where =
      conditions.length
        ? `WHERE ${conditions.join(
            " AND "
          )}`
        : "";

    return database.all(
      `
      SELECT *
      FROM tasks
      ${where}
      ORDER BY created_at DESC
      LIMIT ?
      `,
      ...params
    );
  }

  async function appendEvent(
    event
  ) {
    const id =
      event.id ||
      crypto.randomUUID();

    await database.execute(
      `
      INSERT INTO events (
        id,
        type,
        source,
        payload_json,
        created_at
      )
      VALUES (
        ?,
        ?,
        ?,
        ?,
        datetime('now')
      )
      `,

      id,

      event.type,

      event.source ||
        "system",

      json(
        event.payload
      )
    );

    return database.first(
      `
      SELECT *
      FROM events
      WHERE id = ?
      `,
      id
    );
  }

  async function recentEvents({
    type,
    limit = 50,
  } = {}) {
    const safeLimit =
      Math.min(
        Math.max(
          Number(limit) || 50,
          1
        ),
        200
      );

    if (type) {
      return database.all(
        `
        SELECT *
        FROM events
        WHERE type = ?
        ORDER BY created_at DESC
        LIMIT ?
        `,
        type,
        safeLimit
      );
    }

    return database.all(
      `
      SELECT *
      FROM events
      ORDER BY created_at DESC
      LIMIT ?
      `,
      safeLimit
    );
  }

  async function createApproval(
    approval
  ) {
    const id =
      approval.id ||
      crypto.randomUUID();

    if (!approval.taskId) {
      throw new Error(
        "taskId is required"
      );
    }

    if (!approval.action) {
      throw new Error(
        "action is required"
      );
    }

    await database.execute(
      `
      INSERT INTO approvals (
        id,
        task_id,
        action,
        requested_by,
        status,
        payload_json,
        created_at,
        updated_at
      )
      VALUES (
        ?,
        ?,
        ?,
        ?,
        'pending',
        ?,
        datetime('now'),
        datetime('now')
      )
      `,

      id,

      approval.taskId,

      approval.action,

      approval.requestedBy ||
        "agent",

      json(
        approval.payload
      )
    );

    return database.first(
      `
      SELECT *
      FROM approvals
      WHERE id = ?
      `,
      id
    );
  }

  async function getApproval(
    id
  ) {
    if (!id) {
      throw new Error(
        "approval id is required"
      );
    }

    return database.first(
      `
      SELECT *
      FROM approvals
      WHERE id = ?
      `,
      id
    );
  }

  async function resolveApproval(
    id,
    status,
    resolvedBy
  ) {
    const validStatuses =
      new Set([
        "approved",
        "rejected",
        "expired",
        "cancelled",
      ]);

    if (
      !validStatuses.has(
        status
      )
    ) {
      throw new Error(
        `Invalid approval status: ${status}`
      );
    }

    await database.execute(
      `
      UPDATE approvals
      SET
        status = ?,
        resolved_by = ?,
        updated_at = datetime('now')
      WHERE id = ?
        AND status = 'pending'
      `,
      status,
      resolvedBy ||
        "system",
      id
    );

    return getApproval(id);
  }

  async function pendingApprovals(
    limit = 50
  ) {
    const safeLimit =
      Math.min(
        Math.max(
          Number(limit) || 50,
          1
        ),
        200
      );

    return database.all(
      `
      SELECT *
      FROM approvals
      WHERE status = 'pending'
      ORDER BY created_at ASC
      LIMIT ?
      `,
      safeLimit
    );
  }

  return {
    database,

    createTask,
    getTask,
    updateTask,
    listTasks,

    appendEvent,
    recentEvents,

    createApproval,
    getApproval,
    resolveApproval,
    pendingApprovals,
  };
}
