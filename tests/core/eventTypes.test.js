// tests/core/eventTypes.test.js

import test from "node:test";
import assert from "node:assert/strict";

import {
  EVENT_TYPES,
  isEventType,
} from "../../src/core/eventTypes.js";

test(
  "event types are unique",
  () => {
    const values =
      Object.values(
        EVENT_TYPES
      );

    assert.equal(
      new Set(values).size,
      values.length
    );
  }
);

test(
  "known event type validates",
  () => {
    assert.equal(
      isEventType(
        EVENT_TYPES.TASK_CREATED
      ),
      true
    );
  }
);

test(
  "unknown event type fails validation",
  () => {
    assert.equal(
      isEventType(
        "something.fake"
      ),
      false
    );
  }
);
