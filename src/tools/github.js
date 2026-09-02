import { fetchJson } from "../utils/http.js";

const GITHUB_API = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";

function required(value, name) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function encodePath(value) {
  return encodeURIComponent(value)
    .replaceAll("%2F", "/");
}

export function createGitHubClient(env) {
  const token = env.GITHUB_TOKEN;

  const defaultOwner =
    env.GITHUB_OWNER;

  const defaultRepo =
    env.GITHUB_REPO;

  if (!token) {
    throw new Error(
      "GITHUB_TOKEN is not configured"
    );
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept:
      "application/vnd.github+json",
    "X-GitHub-Api-Version":
      GITHUB_API_VERSION,
    "User-Agent":
      "DPDPReady-AI",
  };

  async function request(
    path,
    options = {}
  ) {
    return fetchJson(
      `${GITHUB_API}${path}`,
      {
        ...options,
        headers: {
          ...headers,
          ...(options.headers || {}),
        },
      }
    );
  }

  function repository(args = {}) {
    return {
      owner:
        args.owner ||
        defaultOwner,

      repo:
        args.repo ||
        defaultRepo,
    };
  }

  async function getRepository(
    args = {}
  ) {
    const { owner, repo } =
      repository(args);

    required(owner, "owner");
    required(repo, "repo");

    return request(
      `/repos/${encodeURIComponent(
        owner
      )}/${encodeURIComponent(repo)}`
    );
  }

  async function getBranch(
    args = {}
  ) {
    const { owner, repo } =
      repository(args);

    required(owner, "owner");
    required(repo, "repo");
    required(args.branch, "branch");

    return request(
      `/repos/${encodeURIComponent(
        owner
      )}/${encodeURIComponent(
        repo
      )}/branches/${encodeURIComponent(
        args.branch
      )}`
    );
  }

  async function listBranches(
    args = {}
  ) {
    const { owner, repo } =
      repository(args);

    required(owner, "owner");
    required(repo, "repo");

    const page =
      Math.max(
        Number(args.page) || 1,
        1
      );

    const perPage =
      Math.min(
        Math.max(
          Number(args.perPage) || 30,
          1
        ),
        100
      );

    return request(
      `/repos/${owner}/${repo}/branches?page=${page}&per_page=${perPage}`
    );
  }

  async function getFile(
    args = {}
  ) {
    const { owner, repo } =
      repository(args);

    required(owner, "owner");
    required(repo, "repo");
    required(args.path, "path");

    const ref = args.ref
      ? `?ref=${encodeURIComponent(
          args.ref
        )}`
      : "";

    return request(
      `/repos/${owner}/${repo}/contents/${encodePath(
        args.path
      )}${ref}`
    );
  }

  async function createBranch(
    args = {}
  ) {
    const { owner, repo } =
      repository(args);

    required(owner, "owner");
    required(repo, "repo");
    required(args.branch, "branch");

    const base =
      args.fromBranch ||
      args.baseBranch ||
      "main";

    const baseRef =
      await request(
        `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(
          base
        )}`
      );

    const sha =
      baseRef?.object?.sha;

    if (!sha) {
      throw new Error(
        `Could not resolve SHA for branch ${base}`
      );
    }

    return request(
      `/repos/${owner}/${repo}/git/refs`,
      {
        method: "POST",

        headers: {
          "content-type":
            "application/json",
        },

        body: JSON.stringify({
          ref: `refs/heads/${args.branch}`,
          sha,
        }),
      }
    );
  }

  async function updateFile(
    args = {}
  ) {
    const { owner, repo } =
      repository(args);

    required(owner, "owner");
    required(repo, "repo");
    required(args.path, "path");
    required(args.content, "content");
    required(args.branch, "branch");
    required(args.message, "message");

    let sha;

    try {
      const existing =
        await getFile({
          owner,
          repo,
          path: args.path,
          ref: args.branch,
        });

      sha = existing?.sha;
    } catch (error) {
      if (error.status !== 404) {
        throw error;
      }
    }

    return request(
      `/repos/${owner}/${repo}/contents/${encodePath(
        args.path
      )}`,
      {
        method: "PUT",

        headers: {
          "content-type":
            "application/json",
        },

        body: JSON.stringify({
          message: args.message,

          content:
            Buffer.from(
              args.content,
              "utf8"
            ).toString("base64"),

          branch: args.branch,

          ...(sha
            ? { sha }
            : {}),
        }),
      }
    );
  }

  async function createPullRequest(
    args = {}
  ) {
    const { owner, repo } =
      repository(args);

    required(owner, "owner");
    required(repo, "repo");

    required(
      args.title,
      "title"
    );

    required(
      args.head,
      "head"
    );

    required(
      args.base,
      "base"
    );

    const body =
      args.body || "";

    return request(
      `/repos/${owner}/${repo}/pulls`,
      {
        method: "POST",

        headers: {
          "content-type":
            "application/json",
        },

        body: JSON.stringify({
          title: args.title,
          head: args.head,
          base: args.base,
          body,
          draft:
            Boolean(args.draft),
        }),
      }
    );
  }

  async function getPullRequest(
    args = {}
  ) {
    const { owner, repo } =
      repository(args);

    required(owner, "owner");
    required(repo, "repo");
    required(
      args.number,
      "number"
    );

    return request(
      `/repos/${owner}/${repo}/pulls/${args.number}`
    );
  }

  async function listPullRequests(
    args = {}
  ) {
    const { owner, repo } =
      repository(args);

    required(owner, "owner");
    required(repo, "repo");

    const state =
      args.state || "open";

    return request(
      `/repos/${owner}/${repo}/pulls?state=${encodeURIComponent(
        state
      )}&per_page=50`
    );
  }

  return {
    getRepository,
    getBranch,
    listBranches,
    getFile,
    createBranch,
    updateFile,
    createPullRequest,
    getPullRequest,
    listPullRequests,
  };
}
