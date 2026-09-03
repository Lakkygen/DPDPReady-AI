// src/security/toolPolicies.js

const RISK = Object.freeze({
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical"
});

export const TOOL_POLICIES = Object.freeze({
  health_check: {
    risk: RISK.LOW,
    approval: false,
    roles: ["ops"]
  },

  get_logs: {
    risk: RISK.LOW,
    approval: false,
    roles: ["ops"]
  },

  get_deployment: {
    risk: RISK.LOW,
    approval: false,
    roles: ["ops"]
  },

  github_repository: {
    risk: RISK.LOW,
    approval: false,
    roles: ["ops"]
  },

  github_get_branch: {
    risk: RISK.LOW,
    approval: false,
    roles: ["ops"]
  },

  github_list_branches: {
    risk: RISK.LOW,
    approval: false,
    roles: ["ops"]
  },

  github_get_file: {
    risk: RISK.LOW,
    approval: false,
    roles: ["ops"]
  },

  github_compare: {
    risk: RISK.LOW,
    approval: false,
    roles: ["ops"]
  },

  create_branch: {
    risk: RISK.HIGH,
    approval: true,
    roles: ["ops"]
  },

  create_pull_request: {
    risk: RISK.HIGH,
    approval: true,
    roles: ["ops"]
  },

  github_create_branch: {
    risk: RISK.HIGH,
    approval: true,
    roles: ["ops"]
  },

  github_update_file: {
    risk: RISK.HIGH,
    approval: true,
    roles: ["ops"]
  },

  github_create_pr: {
    risk: RISK.HIGH,
    approval: true,
    roles: ["ops"]
  },

  code_read_file: {
    risk: RISK.LOW,
    approval: false,
    roles: ["ops"]
  },

  code_replace_exact: {
    risk: RISK.HIGH,
    approval: true,
    roles: ["ops"]
  },

  code_apply_patch: {
    risk: RISK.HIGH,
    approval: true,
    roles: ["ops"]
  },

  code_basic_syntax_check: {
    risk: RISK.LOW,
    approval: false,
    roles: ["ops"]
  },

  browser_check_page: {
    risk: RISK.MEDIUM,
    approval: false,
    roles: ["ops"]
  },

  browser_screenshot: {
    risk: RISK.MEDIUM,
    approval: false,
    roles: ["ops"]
  },

  browser_run: {
    risk: RISK.HIGH,
    approval: false,
    roles: ["ops"]
  },

  qa_smoke_test: {
    risk: RISK.MEDIUM,
    approval: false,
    roles: ["ops"]
  },

  qa_regression: {
    risk: RISK.MEDIUM,
    approval: false,
    roles: ["ops"]
  },

  render_get_deployment: {
    risk: RISK.LOW,
    approval: false,
    roles: ["ops"]
  },

  render_list_deployments: {
    risk: RISK.LOW,
    approval: false,
    roles: ["ops"]
  },

  render_logs: {
    risk: RISK.LOW,
    approval: false,
    roles: ["ops"]
  },

  render_deploy: {
    risk: RISK.CRITICAL,
    approval: true,
    roles: ["ops"]
  },

  render_rollback: {
    risk: RISK.CRITICAL,
    approval: true,
    roles: ["ops"]
  },

  cloudflare_worker_versions: {
    risk: RISK.LOW,
    approval: false,
    roles: ["ops"]
  },

  cloudflare_d1_query: {
    risk: RISK.HIGH,
    approval: true,
    roles: ["ops", "analyst"]
  },

  web_search: {
    risk: RISK.LOW,
    approval: false,
    roles: ["growth", "research"]
  },

  web_fetch: {
    risk: RISK.LOW,
    approval: false,
    roles: ["growth", "research"]
  },

  get_users: {
    risk: RISK.LOW,
    approval: false,
    roles: ["analyst"]
  },

  get_audits: {
    risk: RISK.LOW,
    approval: false,
    roles: ["analyst", "support"]
  },

  get_revenue: {
    risk: RISK.LOW,
    approval: false,
    roles: ["analyst"]
  },

  get_campaign_stats: {
    risk: RISK.LOW,
    approval: false,
    roles: ["growth", "analyst"]
  },

  get_analytics_overview: {
    risk: RISK.LOW,
    approval: false,
    roles: ["growth"]
  },

  metrics_snapshot: {
    risk: RISK.LOW,
    approval: false,
    roles: ["analyst"]
  },

  advanced_analytics: {
    risk: RISK.LOW,
    approval: false,
    roles: ["analyst"]
  },

  forecast_metrics: {
    risk: RISK.MEDIUM,
    approval: false,
    roles: ["analyst"]
  },

  create_experiment: {
    risk: RISK.MEDIUM,
    approval: false,
    roles: ["analyst"]
  },

  record_experiment: {
    risk: RISK.LOW,
    approval: false,
    roles: ["analyst"]
  },

  save_lead: {
    risk: RISK.LOW,
    approval: false,
    roles: ["growth"]
  },

  list_leads: {
    risk: RISK.LOW,
    approval: false,
    roles: ["growth"]
  },

  qualify_lead: {
    risk: RISK.LOW,
    approval: false,
    roles: ["growth"]
  },

  verify_email: {
    risk: RISK.LOW,
    approval: false,
    roles: ["growth"]
  },

  crm_update_lead: {
    risk: RISK.MEDIUM,
    approval: false,
    roles: ["growth"]
  },

  campaign_create: {
    risk: RISK.MEDIUM,
    approval: false,
    roles: ["growth"]
  },

  campaign_add_message: {
    risk: RISK.MEDIUM,
    approval: false,
    roles: ["growth"]
  },

  campaign_send: {
    risk: RISK.CRITICAL,
    approval: true,
    roles: ["growth"]
  },

  email_send: {
    risk: RISK.CRITICAL,
    approval: true,
    roles: ["growth", "support"]
  },

  get_customer: {
    risk: RISK.LOW,
    approval: false,
    roles: ["support"]
  },

  get_customer_audit: {
    risk: RISK.LOW,
    approval: false,
    roles: ["support"]
  },

  create_support_ticket: {
    risk: RISK.LOW,
    approval: false,
    roles: ["support"]
  },

  update_support_ticket: {
    risk: RISK.LOW,
    approval: false,
    roles: ["support"]
  },

  escalate_support_ticket: {
    risk: RISK.MEDIUM,
    approval: false,
    roles: ["support"]
  },

  customer_context: {
    risk: RISK.LOW,
    approval: false,
    roles: ["support"]
  },

  support_email_send: {
    risk: RISK.CRITICAL,
    approval: true,
    roles: ["support"]
  },

  research_save: {
    risk: RISK.LOW,
    approval: false,
    roles: ["research"]
  },

  research_search: {
    risk: RISK.LOW,
    approval: false,
    roles: ["research"]
  },

  research_list: {
    risk: RISK.LOW,
    approval: false,
    roles: ["research"]
  },

  research_alerts: {
    risk: RISK.MEDIUM,
    approval: false,
    roles: ["research"]
  },

  research_citation_save: {
    risk: RISK.LOW,
    approval: false,
    roles: ["research"]
  },

  telegram_send: {
    risk: RISK.HIGH,
    approval: true,
    roles: ["ops", "growth", "research", "analyst", "support"]
  }
});

const DEFAULT_POLICY = Object.freeze({
  risk: RISK.HIGH,
  approval: true,
  roles: []
});

const AGENT_ROLE_ALIASES = Object.freeze({
  marcus: "ops",
  operations: "ops",
  ops: "ops",

  amara: "growth",
  growth: "growth",

  david: "research",
  research: "research",

  sofia: "analyst",
  analyst: "analyst",
  analytics: "analyst",

  maya: "support",
  support: "support"
});

export function getToolPolicy(toolName) {
  return TOOL_POLICIES[toolName] ?? DEFAULT_POLICY;
}

export function requiresFounderApproval(toolName) {
  return Boolean(getToolPolicy(toolName).approval);
}

export function isRoleAllowed(toolName, role) {
  const policy = getToolPolicy(toolName);

  const normalized =
    AGENT_ROLE_ALIASES[
      String(role ?? "").toLowerCase()
    ] ??
    String(role ?? "").toLowerCase();

  return (
    !policy.roles.length ||
    policy.roles.includes(normalized)
  );
}

export function describeToolPolicy(toolName) {
  const policy = getToolPolicy(toolName);

  return {
    tool: toolName,
    ...policy
  };
}

export { RISK };
