// ============================================================
// DPDPREADY AI — GITHUB CLIENT
// ============================================================

import { fetchJson } from "../utils/http.js";
import {
  assertString,
  assertOptionalString,
} from "../utils/validation.js";

const GITHUB_API = "https://api.github.com";
const GITHUB_VERSION = "2022-11-28";

export function createGitHubClient(env) {
  const token = env.GITHUB_TOKEN;

  if (!token) {
    throw new Error("GITHUB_TOKEN is not configured");
  }

  const defaultOwner = env.GITHUB_OWNER;
  const defaultRepo = env.GITHUB_REPO;

  function target(params = {}) {
    return {
      owner: params.owner || defaultOwner,
      repo: params.repo || defaultRepo,
    };
  }

  async function request(path, options = {}) {
    return fetchJson(
      `${GITHUB_API}${path}`,
      {
        ...options,
        headers: {
          accept: "application/vnd.github+json",
          authorization: `Bearer ${token}`,
          "x-github-api-version": GITHUB_VERSION,
          ...(options.headers || {}),
        },
      }
    );
  }

  async function getRepository(params = {}) {
    const { owner, repo } = target(params);

    return request(`/repos/${owner}/${repo}`);
  }

  async function getBranch(params = {}) {
    const { owner, repo } = target(params);

    assertString(params.branch, "branch", 200);

    return request(
      `/repos/${owner}/${repo}/branches/${encodeURIComponent(
        params.branch
      )}`
    );
  }

  async function listBranches(params = {}) {
    const { owner, repo } = target(params);

    return request(
      `/repos/${owner}/${repo}/branches?per_page=100`
    );
  }

  async function getFile(params = {}) {
    const { owner, repo } = target(params);

    assertString(params.path, "path", 1000);

    const ref = params.ref
      ? `?ref=${encodeURIComponent(params.ref)}`
      : "";

    return request(
      `/repos/${owner}/${repo}/contents/${params.path}${ref}`
    );
  }

  async function getTree(params = {}) {
    const { owner, repo } = target(params);

    const branch =
      params.ref ||
      env.GITHUB_DEFAULT_BRANCH ||
      "main";

    const branchInfo = await getBranch({
      owner,
      repo,
      branch,
    });

    const sha = branchInfo?.commit?.sha;

    if (!sha) {
      throw new Error("Unable to determine branch commit SHA");
    }

    return request(
      `/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`
    );
  }

  async function createBranch(params = {}) {
    const { owner, repo } = target(params);

    assertString(params.base, "base", 200);
    assertString(params.branch, "branch", 200);

    const base = await getBranch({
      owner,
      repo,
      branch: params.base,
    });

    return request(
      `/repos/${owner}/${repo}/git/refs`,
      {
        method: "POST",
        body: JSON.stringify({
          ref: `refs/heads/${params.branch}`,
          sha: base.commit.sha,
        }),
      }
    );
  }

  async function updateFile(params = {}) {
    const { owner, repo } = target(params);

    assertString(params.path, "path", 1000);
    assertString(params.content, "content", 500_000);
    assertString(params.message, "message", 500);
    assertString(params.branch, "branch", 200);

    let existingSha = undefined;

    try {
      const existing = await getFile({
        owner,
        repo,
        path: params.path,
        ref: params.branch,
      });

      existingSha = existing?.sha;
    } catch (error) {
      if (error.status !== 404) {
        throw error;
      }
    }

    const body = {
      message: params.message,
      content: btoa(unescape(encodeURIComponent(params.content))),
      branch: params.branch,
    };

    if (existingSha) {
      body.sha = existingSha;
    }

    return request(
      `/repos/${owner}/${repo}/contents/${params.path}`,
      {
        method: "PUT",
        body: JSON.stringify(body),
      }
    );
  }

  async function createPullRequest(params = {}) {
    const { owner, repo } = target(params);

    assertString(params.title, "title", 500);
    assertString(params.head, "head", 200);
    assertString(params.base, "base", 200);

    return request(
      `/repos/${owner}/${repo}/pulls`,
      {
        method: "POST",
        body: JSON.stringify({
          title: params.title,
          head: params.head,
          base: params.base,
          body: params.body || "",
          draft: Boolean(params.draft),
        }),
      }
    );
  }

  async function getPullRequest(params = {}) {
    const { owner, repo } = target(params);

    return request(
      `/repos/${owner}/${repo}/pulls/${params.number}`
    );
  }

  async function listPullRequests(params = {}) {
    const { owner, repo } = target(params);

    const state = params.state || "open";

    return request(
      `/repos/${owner}/${repo}/pulls?state=${encodeURIComponent(
        state
      )}&per_page=100`
    );
  }

  return {
    getRepository,
    getBranch,
    listBranches,
    getFile,
    getTree,
    createBranch,
    updateFile,
    createPullRequest,
    getPullRequest,
    listPullRequests,
  };
}
