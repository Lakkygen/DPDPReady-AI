export function createTaskManager(
  store
) {
  if (!store) {
    throw new Error(
      "store is required"
    );
  }

  async function create(
    task
  ) {
    return store.createTask(
      task
    );
  }

  async function get(
    id
  ) {
    return store.getTask(
      id
    );
  }

  async function claim(
    id,
    agent
  ) {
    if (!agent) {
      throw new Error(
        "agent is required"
      );
    }

    const task =
      await store.getTask(id);

    if (!task) {
      throw new Error(
        `Task ${id} not found`
      );
    }

    const allowedStatuses =
      new Set([
        "queued",
        "retry",
      ]);

    if (
      !allowedStatuses.has(
        task.status
      )
    ) {
      throw new Error(
        `Task ${id} cannot be claimed from status ${task.status}`
      );
    }

    return store.updateTask(
      id,
      {
        status:
          "running",

        assignedAgent:
          agent,

        startedAt:
          new Date().toISOString(),
      }
    );
  }

  async function complete(
    id,
    result = {}
  ) {
    return store.updateTask(
      id,
      {
        status:
          "completed",

        result,

        completedAt:
          new Date().toISOString(),
      }
    );
  }

  async function fail(
    id,
    error
  ) {
    return store.updateTask(
      id,
      {
        status:
          "failed",

        errorText:
          error?.message ||
          String(error),

        completedAt:
          new Date().toISOString(),
      }
    );
  }

  async function retry(
    id,
    error
  ) {
    return store.updateTask(
      id,
      {
        status:
          "retry",

        errorText:
          error?.message ||
          String(error),
      }
    );
  }

  async function cancel(
    id,
    reason = "Cancelled"
  ) {
    return store.updateTask(
      id,
      {
        status:
          "cancelled",

        errorText:
          reason,

        completedAt:
          new Date().toISOString(),
      }
    );
  }

  async function list(
    filters = {}
  ) {
    return store.listTasks(
      filters
    );
  }

  return {
    create,
    get,
    claim,
    complete,
    fail,
    retry,
    cancel,
    list,
  };
}
