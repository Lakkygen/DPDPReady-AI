import { createDatabase } from "../tools/database.js";

function json(value) {
  return JSON.stringify(
    value ?? {}
  );
}

function parseJson(
  value,
  fallback = {}
) {
  if (
    value &&
    typeof value === "object"
  ) {
    return value;
  }

  if (!value) {
    return fallback;
  }

  try {
    const parsed =
      JSON.parse(value);

    return (
      parsed &&
      typeof parsed === "object"
        ? parsed
        : fallback
    );
  } catch {
    return fallback;
  }
}

function normalizeTask(row) {
  if (!row) {
    return null;
  }

  const metadata =
    parseJson(
      row.metadata,
      {}
    );

  const result =
    parseJson(
      row.result,
      null
    );

  return {
    ...row,

    assignedAgent:
      row.assigned_to ??
      null,

    assignedTo:
      row.assigned_to ??
      null,

    assigned_agent:
      row.assigned_to ??
      null,

    payload:
      metadata,

    payload_json:
      row.metadata ??
      "{}",

    result_json:
      row.result ??
      null,

    error_text:
      row.error ??
      null,

    result
  };
}

function normalizeEvent(row) {
  if (!row) {
    return null;
  }

  return {
    ...row,

    type:
      row.event_type,

    source:
      row.actor,

    payload_json:
      row.payload,

    payload:
      parseJson(
        row.payload,
        {}
      )
  };
}

function normalizeApproval(row) {
  if (!row) {
    return null;
  }

  const metadata =
    parseJson(
      row.metadata,
      {}
    );

  return {
    ...row,

    task_id:
      metadata.taskId ??
      null,

    payload_json:
      row.metadata ??
      "{}",

    created_at:
      row.created_at,

    resolved_at:
      row.resolved_at ??
      null
  };
}

function normalizeLimit(
  limit,
  fallback = 50,
  maximum = 200
) {
  return Math.min(
    Math.max(
      Number(limit) ||
        fallback,
      1
    ),
    maximum
  );
}

export function createPersistentStore(env) {
  const database =
    createDatabase(env);

  async function createTask(
    task = {}
  ) {
    const assignedTo =
      task.assignedAgent ??
      task.assignedTo ??
      null;

    if (!assignedTo) {
      throw new Error(
        "assignedAgent is required when creating a task."
      );
    }

    const id =
      task.id ??
      crypto.randomUUID();

    const metadata = {
      ...(task.metadata ?? {}),
      ...(task.payload ?? {}),

      type:
        task.type ??
        "general"
    };

    await database.execute(
      `
      INSERT INTO tasks (
        id,
        title,
        description,
        assigned_to,
        created_by,
        priority,
        status,
        metadata,
        result,
        error,
        created_at
      )
      VALUES (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        'queued',
        ?,
        NULL,
        NULL,
        datetime('now')
      )
      `,
      id,
      String(
        task.title ??
          "Untitled task"
      ),
      String(
        task.description ??
          ""
      ),
      assignedTo,
      task.createdBy ??
        "system",
      task.priority ??
        "normal",
      json(metadata)
    );

    return getTask(id);
  }

  async function getTask(id) {
    if (!id) {
      throw new Error(
        "task id is required"
      );
    }

    const row =
      await database.first(
        `SELECT * FROM tasks WHERE id = ?`,
        id
      );

    return normalizeTask(row);
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

    if (
      patch.status !==
      undefined
    ) {
      fields.push(
        "status = ?"
      );
      values.push(
        patch.status
      );
    }

    if (
      patch.assignedAgent !==
      undefined
    ) {
      fields.push(
        "assigned_to = ?"
      );
      values.push(
        patch.assignedAgent
      );
    }

    if (
      patch.result !==
      undefined
    ) {
      fields.push(
        "result = ?"
      );
      values.push(
        json(patch.result)
      );
    }

    if (
      patch.errorText !==
      undefined
    ) {
      fields.push(
        "error = ?"
      );
      values.push(
        String(
          patch.errorText
        )
      );
    }

    if (
      patch.startedAt !==
      undefined
    ) {
      fields.push(
        "started_at = ?"
      );
      values.push(
        patch.startedAt
      );
    }

    if (
      patch.completedAt !==
      undefined
    ) {
      fields.push(
        "completed_at = ?"
      );
      values.push(
        patch.completedAt
      );
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
    limit = 50
  } = {}) {
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push(
        "status = ?"
      );
      params.push(status);
    }

    if (agent) {
      conditions.push(
        "assigned_to = ?"
      );
      params.push(agent);
    }

    const safeLimit =
      normalizeLimit(limit);

    params.push(
      safeLimit
    );

    const where =
      conditions.length
        ? `WHERE ${conditions.join(
            " AND "
          )}`
        : "";

    const rows =
      await database.all(
        `
        SELECT *
        FROM tasks
        ${where}
        ORDER BY created_at DESC
        LIMIT ?
        `,
        ...params
      );

    return rows.map(
      normalizeTask
    );
  }

  async function appendEvent(
    event = {}
  ) {
    const id =
      event.id ??
      crypto.randomUUID();

    await database.execute(
      `
      INSERT INTO events (
        id,
        event_type,
        actor,
        payload,
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
      event.type ??
        "unknown",
      event.source ??
        "system",
      json(event.payload)
    );

    return normalizeEvent(
      await database.first(
        `
        SELECT *
        FROM events
        WHERE id = ?
        `,
        id
      )
    );
  }

  async function recentEvents({
    type,
    limit = 50
  } = {}) {
    const safeLimit =
      normalizeLimit(limit);

    if (type) {
      const rows =
        await database.all(
          `
          SELECT *
          FROM events
          WHERE event_type = ?
          ORDER BY created_at DESC
          LIMIT ?
          `,
          type,
          safeLimit
        );

      return rows.map(
        normalizeEvent
      );
    }

    const rows =
      await database.all(
        `
        SELECT *
        FROM events
        ORDER BY created_at DESC
        LIMIT ?
        `,
        safeLimit
      );

    return rows.map(
      normalizeEvent
    );
  }

  async function createApproval(
    approval = {}
  ) {
    const id =
      approval.id ??
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

    const metadata = {
      ...(approval.metadata ?? {}),
      taskId:
        approval.taskId,
      payload:
        approval.payload ??
        {}
    };

    await database.execute(
      `
      INSERT INTO approvals (
        id,
        requested_by,
        action,
        description,
        metadata,
        status,
        resolved_by,
        created_at,
        resolved_at
      )
      VALUES (
        ?,
        ?,
        ?,
        ?,
        ?,
        'pending',
        NULL,
        datetime('now'),
        NULL
      )
      `,
      id,
      approval.requestedBy ??
        "agent",
      approval.action,
      approval.description ??
        "",
      json(metadata)
    );

    return getApproval(id);
  }

  async function getApproval(id) {
    if (!id) {
      throw new Error(
        "approval id is required"
      );
    }

    const row =
      await database.first(
        `
        SELECT *
        FROM approvals
        WHERE id = ?
        `,
        id
      );

    return normalizeApproval(
      row
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
        "cancelled"
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
        resolved_at = datetime('now')
      WHERE
        id = ?
        AND status = 'pending'
      `,
      status,
      resolvedBy ??
        "system",
      id
    );

    return getApproval(id);
  }

  async function pendingApprovals(
    limit = 50
  ) {
    const safeLimit =
      normalizeLimit(limit);

    const rows =
      await database.all(
        `
        SELECT *
        FROM approvals
        WHERE status = 'pending'
        ORDER BY created_at ASC
        LIMIT ?
        `,
        safeLimit
      );

    return rows.map(
      normalizeApproval
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
    pendingApprovals
  };
}
