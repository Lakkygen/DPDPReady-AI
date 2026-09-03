// ============================================================
// DPDPREADY AI — CODE TOOL
// Safe repository inspection + bounded code changes.
// ============================================================

import {
  assertString,
  assertOptionalString,
} from "../utils/validation.js";

export function createCodeClient(github) {
  if (!github) {
    throw new Error("GitHub client is required");
  }

  async function readFile({
    owner,
    repo,
    path,
    ref,
  }) {
    assertString(path, "path", 1000);

    return github.getFile({
      owner,
      repo,
      path,
      ref,
    });
  }

  async function searchFiles({
    owner,
    repo,
    query,
    ref,
  }) {
    assertString(query, "query", 500);

    const tree = await github.getTree({
      owner,
      repo,
      ref,
      recursive: true,
    });

    const normalized = query.toLowerCase();

    return (tree.tree || [])
      .filter((item) => item.type === "blob")
      .filter((item) =>
        item.path.toLowerCase().includes(normalized)
      )
      .slice(0, 100);
  }

  async function updateFile({
    owner,
    repo,
    path,
    content,
    message,
    branch,
  }) {
    assertString(path, "path", 1000);
    assertString(content, "content", 500_000);
    assertString(message, "message", 500);
    assertString(branch, "branch", 200);

    return github.updateFile({
      owner,
      repo,
      path,
      content,
      message,
      branch,
    });
  }

  return {
    readFile,
    searchFiles,
    updateFile,
  };
}
