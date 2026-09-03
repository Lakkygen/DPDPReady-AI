// src/agents/growth/tools.js
// NOTE: These are currently STUBS.
// Real implementations should live in the central tool registry.

export const GROWTH_ALLOWED_TOOLS = [
  "web_search",
  "web_fetch",

  // Lead generation (stub)
  "save_lead",
  "list_leads",
  "qualify_lead",
  "verify_email",

  // Campaign management (stub)
  "campaign_create",
  "campaign_add_message",
  "campaign_send",          // requiresApproval: true

  // Email (stub)
  "email_send",             // requiresApproval: true

  // CRM + analytics (stub)
  "crm_update_lead",
  "get_campaign_stats",
  "get_analytics_overview"
];

/**
 * Temporary stub implementations.
 * These prevent the agent from crashing while the real tools are built.
 */
export function createGrowthTools() {
  const stub = (name) => ({
    description: `[STUB] ${name} is not fully implemented yet.`,
    requiresApproval: ["campaign_send", "email_send"].includes(name),
    execute: async () => ({
      ok: false,
      stub: true,
      error: `Tool "${name}" is not implemented yet.`
    })
  });

  return {
    web_search: stub("web_search"),
    web_fetch: stub("web_fetch"),
    save_lead: stub("save_lead"),
    list_leads: stub("list_leads"),
    qualify_lead: stub("qualify_lead"),
    verify_email: stub("verify_email"),
    campaign_create: stub("campaign_create"),
    campaign_add_message: stub("campaign_add_message"),
    campaign_send: stub("campaign_send"),
    email_send: stub("email_send"),
    crm_update_lead: stub("crm_update_lead"),
    get_campaign_stats: stub("get_campaign_stats"),
    get_analytics_overview: stub("get_analytics_overview")
  };
}
