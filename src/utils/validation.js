export function assertObject(value, name = "value") {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(`${name} must be an object`);
  }

  return value;
}

export function assertString(
  value,
  name,
  max = 10_000
) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `${name} must be a non-empty string`
    );
  }

  if (value.length > max) {
    throw new Error(
      `${name} exceeds ${max} characters`
    );
  }

  return value.trim();
}

export function assertOptionalString(
  value,
  name,
  max = 10_000
) {
  if (value === undefined || value === null) {
    return null;
  }

  return assertString(value, name, max);
}

export function assertNumber(
  value,
  name,
  {
    min = -Infinity,
    max = Infinity,
    integer = false,
  } = {}
) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new Error(`${name} must be a valid number`);
  }

  if (integer && !Number.isInteger(number)) {
    throw new Error(`${name} must be an integer`);
  }

  if (number < min) {
    throw new Error(`${name} must be >= ${min}`);
  }

  if (number > max) {
    throw new Error(`${name} must be <= ${max}`);
  }

  return number;
}

export function assertEnum(
  value,
  name,
  allowed
) {
  if (!allowed.includes(value)) {
    throw new Error(
      `${name} must be one of: ${allowed.join(", ")}`
    );
  }

  return value;
}

export function safeJsonParse(
  value,
  fallback = null
) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function isValidUrl(value) {
  try {
    const url = new URL(value);

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
}

export function assertUrl(
  value,
  name = "url"
) {
  if (!isValidUrl(value)) {
    throw new Error(
      `${name} must be a valid HTTP(S) URL`
    );
  }

  return new URL(value).toString();
}

export function clamp(
  value,
  min,
  max
) {
  return Math.min(
    Math.max(Number(value), min),
    max
  );
}
