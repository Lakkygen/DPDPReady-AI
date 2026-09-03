// ============================================================
// DPDPREADY AI — DEPLOYMENT CLIENT
// Render + Cloudflare
// ============================================================

import { fetchJson } from "../utils/http.js";
import { assertString } from "../utils/validation.js";

export function createRenderClient(env) {
  const apiKey = env.RENDER_API_KEY;
  const defaultServiceId = env.RENDER_SERVICE_ID;

  if (!apiKey) {
    throw new Error("RENDER_API_KEY is not configured");
  }

  async function request(path, options = {}) {
    return fetchJson(
      `https://api.render.com${path}`,
      {
        ...options,
        headers: {
          accept: "application/json",
          authorization: `Bearer ${apiKey}`,
          ...(options.headers || {}),
        },
      }
    );
  }

  async function getDeployment({
    deploymentId,
  }) {
    assertString(deploymentId, "deploymentId");

    return request(
      `/v1/deploys/${deploymentId}`
    );
  }

  async function listDeployments({
    serviceId = defaultServiceId,
    limit = 20,
  } = {}) {
    assertString(serviceId, "serviceId");

    return request(
      `/v1/services/${serviceId}/deploys?limit=${Math.min(
        Number(limit) || 20,
        100
      )}`
    );
  }

  async function triggerDeploy({
    serviceId = defaultServiceId,
    clearCache = false,
  } = {}) {
    assertString(serviceId, "serviceId");

    return request(
      `/v1/services/${serviceId}/deploys`,
      {
        method: "POST",
        body: JSON.stringify({
          clearCache: Boolean(clearCache),
        }),
      }
    );
  }

  async function rollback({
    serviceId = defaultServiceId,
    commitId,
  }) {
    assertString(serviceId, "serviceId");
    assertString(commitId, "commitId");

    return request(
      `/v1/services/${serviceId}/deploys`,
      {
        method: "POST",
        body: JSON.stringify({
          commitId,
        }),
      }
    );
  }

  async function listLogs({
    ownerId,
    resource,
    startTime,
    endTime,
  } = {}) {
    const params = new URLSearchParams();

    if (ownerId) params.set("ownerId", ownerId);
    if (resource) params.set("resource", resource);
    if (startTime) params.set("startTime", startTime);
    if (endTime) params.set("endTime", endTime);

    return request(
      `/v1/logs?${params.toString()}`
    );
  }

  return {
    getDeployment,
    listDeployments,
    triggerDeploy,
    rollback,
    listLogs,
  };
}

export function createCloudflareClient(env) {
  const token = env.CLOUDFLARE_API_TOKEN;
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;

  if (!token || !accountId) {
    throw new Error(
      "CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required"
    );
  }

  async function request(path, options = {}) {
    return fetchJson(
      `https://api.cloudflare.com/client/v4${path}`,
      {
        ...options,
        headers: {
          accept: "application/json",
          authorization: `Bearer ${token}`,
          ...(options.headers || {}),
        },
      }
    );
  }

  async function workerVersions({
    scriptName,
    page = 1,
    perPage = 20,
  }) {
    assertString(scriptName, "scriptName");

    return request(
      `/accounts/${accountId}/workers/scripts/${scriptName}/versions?page=${page}&per_page=${perPage}`
    );
  }

  async function d1Query({
    databaseId,
    sql,
    params = [],
  }) {
    assertString(databaseId, "databaseId");
    assertString(sql, "sql", 20_000);

    return request(
      `/accounts/${accountId}/d1/database/${databaseId}/query`,
      {
        method: "POST",
        body: JSON.stringify({
          sql,
          params,
        }),
      }
    );
  }

  return {
    workerVersions,
    d1Query,
  };
}
