// src/security/authorization.js

const FOUNDER_ROLES = new Set([
  "founder",
  "owner",
  "admin"
]);

export function isFounder(user) {
  return FOUNDER_ROLES.has(
    String(
      user?.role ?? ""
    ).toLowerCase()
  );
}

export function requireFounder(
  user
) {
  if (!isFounder(user)) {
    throw new Error(
      "Founder authorization required."
    );
  }

  return true;
}
