// ============================================================
// DPDPREADY AI — EMAIL VERIFICATION
// Hunter integration
// ============================================================

const HUNTER_BASE_URL = "https://api.hunter.io/v2";

function assertKey(env) {
  if (!env.HUNTER_API_KEY) {
    throw new Error("HUNTER_API_KEY is not configured");
  }
}

async function hunterRequest(env, endpoint, params = {}) {
  assertKey(env);

  const url = new URL(`${HUNTER_BASE_URL}${endpoint}`);

  url.searchParams.set("api_key", env.HUNTER_API_KEY);

  for (const [key, value] of Object.entries(params)) {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString());

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.errors?.[0]?.details ||
        data?.errors?.[0]?.message ||
        `Hunter returned HTTP ${response.status}`
    );
  }

  return data;
}

async function verify(env, args = {}) {
  if (!args.email) {
    throw new Error("email is required");
  }

  const data = await hunterRequest(env, "/email-verifier", {
    email: args.email,
  });

  const result = data?.data || {};

  return {
    email: args.email,
    status: result.status || null,
    result: result.result || null,
    score: result.score ?? null,
    regexp: result.regexp ?? null,
    gibberish: result.gibberish ?? null,
    disposable: result.disposable ?? null,
    webmail: result.webmail ?? null,
    mx_records: result.mx_records ?? null,
    smtp_server: result.smtp_server ?? null,
    smtp_check: result.smtp_check ?? null,
    accept_all: result.accept_all ?? null,
    raw: result,
  };
}

async function find(env, args = {}) {
  if (!args.domain && !args.company) {
    throw new Error("domain or company is required");
  }

  const data = await hunterRequest(env, "/email-finder", {
    domain: args.domain,
    company: args.company,
    first_name: args.firstName,
    last_name: args.lastName,
  });

  return data?.data || data;
}

async function domainSearch(env, args = {}) {
  if (!args.domain) {
    throw new Error("domain is required");
  }

  const data = await hunterRequest(env, "/domain-search", {
    domain: args.domain,
    limit: Math.min(Number(args.limit || 10), 50),
    offset: Number(args.offset || 0),
  });

  return data?.data || data;
}

export function createEmailVerificationTool(env) {
  return {
    verify: (args) => verify(env, args),
    find: (args) => find(env, args),
    domainSearch: (args) => domainSearch(env, args),
  };
}
