// src/core/scheduler.js

export class Scheduler {
  constructor(options = {}) {
    this.logger = options.logger ?? console;
    this.jobs = new Map();
  }

  register(name, handler) {
    if (
      !name ||
      typeof handler !== "function"
    ) {
      throw new Error(
        "Scheduler job requires a name and handler."
      );
    }

    this.jobs.set(
      name,
      handler
    );
  }

  async run(name, context = {}) {
    const job =
      this.jobs.get(name);

    if (!job) {
      throw new Error(
        `Unknown scheduled job: ${name}`
      );
    }

    return job(context);
  }

  async runAll(context = {}) {
    const results = [];

    for (
      const [name, job]
      of this.jobs
    ) {
      try {
        results.push({
          name,
          ok: true,
          result:
            await job(context)
        });
      } catch (error) {
        this.logger.error?.(
          `Scheduled job failed: ${name}`,
          error
        );

        results.push({
          name,
          ok: false,
          error:
            String(
              error?.message ??
              error
            )
        });
      }
    }

    return results;
  }
}
