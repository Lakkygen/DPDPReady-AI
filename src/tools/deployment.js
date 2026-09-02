import { fetchJson } from "../utils/http.js";

export function createRenderClient(
  env
) {
  const token =
    env.RENDER_API_KEY;

  const defaultServiceId =
    env.RENDER_SERVICE_ID;

  async function request(
    path,
    options = {}
  ) {
    if (!token) {
      throw new Error(
        "RENDER_API_KEY is not configured"
      );
    }

    return fetchJson(
      `https://api.render.com${path}`,
      {
        ...options,

        headers: {
          Authorization:
            `Bearer ${token}`,

          Accept:
            "application/json",

          ...(options.headers || {}),
        },
      }
    );
  }

  async function getDeployment({
    deploymentId,
    serviceId =
      defaultServiceId,
  } = {}) {
    if (deploymentId) {
      return request(
        `/v1/deploys/${encodeURIComponent(
          deploymentId
        )}`
      );
    }

    if (!serviceId) {
      throw new Error(
        "serviceId is required"
      );
    }

    const result =
      await request(
        `/v1/services/${encodeURIComponent(
          serviceId
        )}/deploys?limit=1`
      );

    return Array.isArray(result)
      ? result[0]
      : result;
  }

  async function listDeployments({
    serviceId =
      defaultServiceId,
    limit = 20,
  } = {}) {
    if (!serviceId) {
      throw new Error(
        "serviceId is required"
      );
    }

    const safeLimit =
      Math.min(
        Math.max(
          Number(limit) || 20,
          1
        ),
        100
      );

    return request(
      `/v1/services/${encodeURIComponent(
        serviceId
      )}/deploys?limit=${safeLimit}`
    );
  }

  async function triggerDeploy({
    serviceId =
      defaultServiceId,
    clearCache =
      "do_not_clear",
    commitId,
  } = {}) {
    if (!serviceId) {
      throw new Error(
        "serviceId is required"
      );
    }

    return request(
      `/v1/services/${encodeURIComponent(
        serviceId
      )}/deploys`,
      {
        method: "POST",

        headers: {
          "content-type":
            "application/json",
        },

        body: JSON.stringify({
          clearCache,

          ...(commitId
            ? { commitId }
            : {}),
        }),
      }
    );
  }

  async function listLogs({
    ownerId =
      env.RENDER_OWNER_ID,
    resource,
    startTime,
    endTime,
    limit = 100,
  } = {}) {
    if (!ownerId) {
      throw new Error(
        "RENDER_OWNER_ID is required"
      );
    }

    if (!resource) {
      throw new Error(
        "resource is required"
      );
    }

    const params =
      new URLSearchParams();

    params.set(
      "ownerId",
      ownerId
    );

    params.set(
      "resource",
      Array.isArray(resource)
        ? resource.join(",")
        : resource
    );

    if (startTime) {
      params.set(
        "startTime",
        startTime
      );
    }

    if (endTime) {
      params.set(
        "endTime",
        endTime
      );
    }

    params.set(
      "limit",
      String(
        Math.min(
          Math.max(
            Number(limit) || 100,
            1
          ),
          500
        )
      )
    );

    return request(
      `/v1/logs?${params.toString()}`
    );
  }

  return {
    getDeployment,
    listDeployments,
    triggerDeploy,
    listLogs,
  };
}

export function createCloudflareClient(
  env
) {
  const accountId =
    env.CLOUDFLARE_ACCOUNT_ID;

  const token =
    env.CLOUDFLARE_API_TOKEN;

  async function request(
    path,
    options = {}
  ) {
    if (!accountId) {
      throw new Error(
        "CLOUDFLARE_ACCOUNT_ID is not configured"
      );
    }

    if (!token) {
      throw new Error(
        "CLOUDFLARE_API_TOKEN is not configured"
      );
    }

    const response =
      await fetchJson(
        `https://api.cloudflare.com/client/v4${path}`,
        {
          ...options,

          headers: {
            Authorization:
              `Bearer ${token}`,

            Accept:
              "application/json",

            ...(options.headers || {}),
          },
        }
      );

    return response;
  }

  async function workerVersions({
    scriptName =
      env.CLOUDFLARE_SCRIPT_NAME,

    page = 1,

    perPage = 20,
  } = {}) {
    if (!scriptName) {
      throw new Error(
        "CLOUDFLARE_SCRIPT_NAME is required"
      );
    }

    return request(
      `/accounts/${accountId}/workers/scripts/${encodeURIComponent(
        scriptName
      )}/versions?page=${page}&per_page=${perPage}`
    );
  }

  async function d1Query({
    databaseId =
      env.CLOUDFLARE_D1_DATABASE_ID,

    sql,

    params = [],
  } = {}) {
    if (!databaseId) {
      throw new Error(
        "CLOUDFLARE_D1_DATABASE_ID is required"
      );
    }

    if (!sql) {
      throw new Error(
        "sql is required"
      );
    }

    return request(
      `/accounts/${accountId}/d1/database/${encodeURIComponent(
        databaseId
      )}/query`,
      {
        method: "POST",

        headers: {
          "content-type":
            "application/json",
        },

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
