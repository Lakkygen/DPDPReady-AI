// src/security/rateLimits.js

export class RateLimiter {
  constructor(options = {}) {
    this.limit =
      Number(options.limit) || 20;

    this.windowMs =
      Number(options.windowMs) ||
      60_000;

    this.buckets = new Map();
  }

  allow(key) {
    const now = Date.now();

    const current =
      this.buckets.get(key);

    if (
      !current ||
      now - current.startedAt >=
        this.windowMs
    ) {
      this.buckets.set(key, {
        startedAt: now,
        count: 1
      });

      return true;
    }

    if (
      current.count >=
      this.limit
    ) {
      return false;
    }

    current.count += 1;

    return true;
  }
}
