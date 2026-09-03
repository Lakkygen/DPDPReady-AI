// ============================================================
// DPDPREADY AI — MARCUS / OPS TOOLS
// ============================================================

export function createOpsTools({
  registry,
  code,
  browser,
  qa,
}) {
  return {
    health_check: {
      description:
        "Check whether the DPDPReady application is healthy.",
      execute: async ({ url }) =>
        registry.execute("health_check", { url }),
    },

    website_inspect: {
      description:
        "Inspect the deployed DPDPReady website.",
      execute: async ({ url }) =>
        registry.execute("website_inspect", { url }),
    },

    github_repository: {
      description:
        "Inspect the GitHub repository.",
      execute: async (args) =>
        registry.execute("github_repository", args),
    },

    github_get_file: {
      description:
        "Read a file from the repository.",
      execute: async (args) =>
        code.readFile(args),
    },

    github_search_files: {
      description:
        "Find repository files by path.",
      execute: async (args) =>
        code.searchFiles(args),
    },

    github_create_branch: {
      description:
        "Create an engineering branch. Requires approval.",
      requiresApproval: true,
      execute: async (args) =>
        registry.execute("github_create_branch", args),
    },

    github_update_file: {
      description:
        "Update a repository file. Requires approval.",
      requiresApproval: true,
      execute: async (args) =>
        code.updateFile(args),
    },

    github_create_pr: {
      description:
        "Create a pull request. Requires approval.",
      requiresApproval: true,
      execute: async (args) =>
        registry.execute("github_create_pr", args),
    },

    render_deploy: {
      description:
        "Deploy the application to Render. Requires founder approval.",
      requiresApproval: true,
      execute: async (args) =>
        registry.execute("render_deploy", args),
    },

    render_rollback: {
      description:
        "Rollback a Render deployment. Requires founder approval.",
      requiresApproval: true,
      execute: async (args) =>
        registry.execute("render_rollback", args),
    },

    browser_open: {
      description:
        "Open and inspect the live website.",
      execute: async (args) =>
        browser.inspect(args),
    },

    browser_screenshot: {
      description:
        "Capture a screenshot of a live page.",
      execute: async (args) =>
        browser.screenshot(args),
    },

    browser_run: {
      description:
        "Execute a bounded browser QA workflow.",
      execute: async (args) =>
        browser.run(args),
    },

    qa_run: {
      description:
        "Run a DPDPReady smoke test.",
      execute: async (args) =>
        qa.smokeTest(args),
    },
  };
}
