export function createEventBus(store) {
  if (!store) {
    throw new Error(
      "store is required"
    );
  }

  const listeners =
    new Map();

  function on(
    eventType,
    handler
  ) {
    if (
      !eventType ||
      typeof eventType !== "string"
    ) {
      throw new Error(
        "eventType must be a non-empty string"
      );
    }

    if (
      typeof handler !== "function"
    ) {
      throw new Error(
        "handler must be a function"
      );
    }

    if (
      !listeners.has(eventType)
    ) {
      listeners.set(
        eventType,
        new Set()
      );
    }

    const handlers =
      listeners.get(eventType);

    handlers.add(handler);

    // Allows the caller to unsubscribe.
    return () => {
      handlers.delete(
        handler
      );

      if (
        handlers.size === 0
      ) {
        listeners.delete(
          eventType
        );
      }
    };
  }

  function once(
    eventType,
    handler
  ) {
    let unsubscribe;

    const wrapped =
      async (event) => {
        unsubscribe?.();

        return handler(event);
      };

    unsubscribe = on(
      eventType,
      wrapped
    );

    return unsubscribe;
  }

  async function emit(
    eventType,
    payload = {},
    source = "system"
  ) {
    if (!eventType) {
      throw new Error(
        "eventType is required"
      );
    }

    // Persist first.
    const event =
      await store.appendEvent({
        type:
          eventType,

        source,

        payload,
      });

    const handlers = [
      ...(listeners.get(
        eventType
      ) || []),
    ];

    const results = [];

    for (
      const handler of handlers
    ) {
      try {
        const result =
          await handler(
            event
          );

        results.push({
          success: true,
          result,
        });
      } catch (error) {
        results.push({
          success: false,

          error:
            error?.message ||
            String(error),
        });
      }
    }

    return {
      event,
      handlersRun:
        handlers.length,
      results,
    };
  }

  async function replay({
    type,
    limit = 50,
  } = {}) {
    return store.recentEvents({
      type,
      limit,
    });
  }

  function listenerCount(
    eventType
  ) {
    return (
      listeners.get(
        eventType
      )?.size || 0
    );
  }

  function clear(
    eventType
  ) {
    if (eventType) {
      listeners.delete(
        eventType
      );
    } else {
      listeners.clear();
    }
  }

  return {
    on,
    once,
    emit,
    replay,
    listenerCount,
    clear,
  };
}
