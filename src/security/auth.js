// src/security/auth.js

const DEFAULT_HEADER =
  "Authorization";

function timingSafeEqual(
  a,
  b
) {
  const left =
    String(a ?? "");

  const right =
    String(b ?? "");

  if (
    left.length !==
    right.length
  ) {
    return false;
  }

  let result = 0;

  for (
    let index = 0;
    index < left.length;
    index += 1
  ) {
    result |=
      left.charCodeAt(index) ^
      right.charCodeAt(index);
  }

  return result === 0;
}

function extractBearerToken(
  request
) {
  const header =
    request.headers.get(
      DEFAULT_HEADER
    );

  if (
    typeof header !==
      "string"
  ) {
    return null;
  }

  const match =
    header.match(
      /^Bearer\s+(.+)$/i
    );

  return match
    ? match[1].trim()
    : null;
}

function extractApiToken(
  request
) {
  const bearer =
    extractBearerToken(
      request
    );

  if (bearer) {
    return bearer;
  }

  const custom =
    request.headers.get(
      "X-API-Key"
    );

  return custom?.trim() ||
    null;
}

export function authenticateRequest(
  request,
  env,
  options = {}
) {
  const required =
    options.required ??
    true;

  if (!required) {
    return {
      authenticated: true,
      method: "disabled",
      principal:
        "anonymous",
    };
  }

  const configuredToken =
    env?.ADMIN_API_TOKEN ??
    env?.FOUNDER_API_TOKEN ??
    null;

  if (!configuredToken) {
    return {
      authenticated: false,
      status: 503,
      error:
        "API authentication is not configured.",
    };
  }

  const suppliedToken =
    extractApiToken(
      request
    );

  if (
    !suppliedToken ||
    !timingSafeEqual(
      suppliedToken,
      configuredToken
    )
  ) {
    return {
      authenticated: false,
      status: 401,
      error:
        "Unauthorized.",
    };
  }

  return {
    authenticated: true,
    method: "api_token",
    principal:
      options.principal ??
      "admin",
  };
}

export function requireAdmin(
  request,
  env
) {
  const result =
    authenticateRequest(
      request,
      env,
      {
        required: true,
        principal:
          "admin",
      }
    );

  return result;
}

export function createAuthResponse(
  result
) {
  const status =
    Number(
      result?.status
    ) ||
    401;

  return new Response(
    JSON.stringify({
      ok: false,
      error:
        result?.error ??
        "Unauthorized.",
    }),
    {
      status,

      headers: {
        "Content-Type":
          "application/json; charset=utf-8",

        "Cache-Control":
          "no-store",
      },
    }
  );
}
