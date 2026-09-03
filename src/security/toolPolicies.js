// ============================================================
// DPDPREADY AI — TOOL SECURITY POLICIES
// Central risk classification for every agent tool.
// ============================================================

export const TOOL_POLICIES = {
  // ----------------------------------------------------------
  // SAFE READ-ONLY OPERATIONS
  // ----------------------------------------------------------

  health_check: {
    risk: "low",
    requiresApproval: false,
    permissions: [],
  },

  website_inspect: {
    risk: "low",
    requiresApproval: false,
    permissions: ["web.read"],
  },

  web_search: {
    risk: "low",
    requiresApproval: false,
    permissions: ["web.search"],
  },

  web_fetch: {
    risk: "low",
    requiresApproval: false,
    permissions: ["web.read"],
  },

  github_repository: {
    risk: "low",
    requiresApproval: false,
    permissions: ["github.read"],
  },

  github_get_branch: {
    risk: "low",
    requiresApproval: false,
    permissions: ["github.read"],
  },

  github_list_branches: {
    risk: "low",
    requiresApproval: false,
    permissions: ["github.read"],
  },

  github_get_file: {
    risk: "low",
    requiresApproval: false,
    permissions: ["github.read"],
  },

  github_get_pr: {
    risk: "low",
    requiresApproval: false,
    permissions: ["github.read"],
  },

  github_list_prs: {
    risk: "low",
    requiresApproval: false,
    permissions: ["github.read"],
  },

  render_get_deployment: {
    risk: "low",
    requiresApproval: false,
    permissions: ["deployment.read"],
  },

  render_list_deployments: {
    risk: "low",
    requiresApproval: false,
    permissions: ["deployment.read"],
  },

  render_logs: {
    risk: "low",
    requiresApproval: false,
    permissions: ["deployment.read"],
  },

  cloudflare_worker_versions: {
    risk: "low",
    requiresApproval: false,
    permissions: ["deployment.read"],
  },

  get_users: {
    risk: "low",
    requiresApproval: false,
    permissions: ["analytics.read"],
  },

  get_audits: {
    risk: "low",
    requiresApproval: false,
    permissions: ["analytics.read"],
  },

  get_revenue: {
    risk: "low",
    requiresApproval: false,
    permissions: ["analytics.read"],
  },

  get_campaign_stats: {
    risk: "low",
    requiresApproval: false,
    permissions: ["analytics.read"],
  },

  get_analytics_overview: {
    risk: "low",
    requiresApproval: false,
    permissions: ["analytics.read"],
  },

  // ----------------------------------------------------------
  // ENGINEERING / WRITE OPERATIONS
  // ----------------------------------------------------------

  code_read_file: {
    risk: "low",
    requiresApproval: false,
    permissions: ["github.read"],
  },

  code_search: {
    risk: "low",
    requiresApproval: false,
    permissions: ["github.read"],
  },

  github_create_branch: {
    risk: "medium",
    requiresApproval: true,
    permissions: ["github.createBranch"],
  },

  github_update_file: {
    risk: "high",
    requiresApproval: true,
    permissions: ["github.write"],
  },

  github_create_pr: {
    risk: "medium",
    requiresApproval: true,
    permissions: ["github.createPR"],
  },

  github_merge_pr: {
    risk: "critical",
    requiresApproval: true,
    permissions: ["github.merge"],
  },

  render_deploy: {
    risk: "critical",
    requiresApproval: true,
    permissions: ["deployment.deploy"],
  },

  render_rollback: {
    risk: "critical",
    requiresApproval: true,
    permissions: ["deployment.deploy"],
  },

  cloudflare_d1_query: {
    risk: "medium",
    requiresApproval: true,
    permissions: ["database.read"],
  },

  // ----------------------------------------------------------
  // BROWSER / QA
  // ----------------------------------------------------------

  browser_open: {
    risk: "low",
    requiresApproval: false,
    permissions: ["browser.read"],
  },

  browser_screenshot: {
    risk: "low",
    requiresApproval: false,
    permissions: ["browser.read"],
  },

  browser_run: {
    risk: "medium",
    requiresApproval: false,
    permissions: ["browser.execute"],
  },

  qa_run: {
    risk: "medium",
    requiresApproval: false,
    permissions: ["browser.execute"],
  },

  // ----------------------------------------------------------
  // SALES / COMMUNICATION
  // ----------------------------------------------------------

  lead_create: {
    risk: "low",
    requiresApproval: false,
    permissions: ["leads.write"],
  },

  lead_update: {
    risk: "low",
    requiresApproval: false,
    permissions: ["leads.write"],
  },

  lead_search: {
    risk: "low",
    requiresApproval: false,
    permissions: ["leads.read"],
  },

  campaign_create: {
    risk: "medium",
    requiresApproval: false,
    permissions: ["campaigns.write"],
  },

  campaign_start: {
    risk: "high",
    requiresApproval: true,
    permissions: ["campaigns.send"],
  },

  email_verify: {
    risk: "low",
    requiresApproval: false,
    permissions: ["email.verify"],
  },

  email_send: {
    risk: "high",
    requiresApproval: true,
    permissions: ["communication.email"],
  },

  email_reply: {
    risk: "high",
    requiresApproval: true,
    permissions: ["communication.email"],
  },

  // ----------------------------------------------------------
  // CUSTOMER SUPPORT
  // ----------------------------------------------------------

  customer_get: {
    risk: "low",
    requiresApproval: false,
    permissions: ["customers.read"],
  },

  customer_update: {
    risk: "medium",
    requiresApproval: false,
    permissions: ["customers.write"],
  },

  ticket_create: {
    risk: "low",
    requiresApproval: false,
    permissions: ["support.write"],
  },

  ticket_update: {
    risk: "low",
    requiresApproval: false,
    permissions: ["support.write"],
  },

  ticket_escalate: {
    risk: "medium",
    requiresApproval: false,
    permissions: ["support.write"],
  },

  // ----------------------------------------------------------
  // RESEARCH
  // ----------------------------------------------------------

  research_search: {
    risk: "low",
    requiresApproval: false,
    permissions: ["research.read"],
  },

  research_save: {
    risk: "low",
    requiresApproval: false,
    permissions: ["research.write"],
  },

  citation_save: {
    risk: "low",
    requiresApproval: false,
    permissions: ["research.write"],
  },

  regulatory_alert: {
    risk: "medium",
    requiresApproval: false,
    permissions: ["research.write"],
  },

  // ----------------------------------------------------------
  // ANALYTICS
  // ----------------------------------------------------------

  metrics_get: {
    risk: "low",
    requiresApproval: false,
    permissions: ["analytics.read"],
  },

  analytics_advanced: {
    risk: "low",
    requiresApproval: false,
    permissions: ["analytics.read"],
  },

  experiment_create: {
    risk: "medium",
    requiresApproval: false,
    permissions: ["analytics.write"],
  },

  experiment_start: {
    risk: "medium",
    requiresApproval: true,
    permissions: ["analytics.write"],
  },

  forecast_generate: {
    risk: "low",
    requiresApproval: false,
    permissions: ["analytics.read"],
  },
};

export function getToolPolicy(toolName) {
  return (
    TOOL_POLICIES[toolName] || {
      risk: "critical",
      requiresApproval: true,
      permissions: [],
      unknown: true,
    }
  );
}

export function toolRequiresApproval(toolName) {
  return getToolPolicy(toolName).requiresApproval === true;
}

export function getToolRisk(toolName) {
  return getToolPolicy(toolName).risk;
}

export function getToolPermissions(toolName) {
  return getToolPolicy(toolName).permissions || [];
}
