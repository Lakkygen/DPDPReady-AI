// src/tools/registry.js

import { createGitHubClient } from "./github.js";
import {
  createRenderClient,
  createCloudflareClient,
} from "./deployment.js";
import { createWebClient } from "./web.js";
import { createAnalyticsClient } from "./analytics.js";
import { createTelegramClient } from "./communication.js";
import { createBrowserClient } from "./browser.js";
import { createQAClient } from "./qa.js";
import { createCodeClient } from "./code.js";

import { createEmailTool } from "./email.js";
import { createEmailVerificationTool } from "./emailVerification.js";
import { createLeadsTool } from "./leads.js";
import { createCampaignsTool } from "./campaigns.js";
import { createCRMTool } from "./crm.js";
import { createCustomersTool } from "./customers.js";
import { createTicketsTool } from "./tickets.js";
import { createSupportTool } from "./support.js";
import { createResearchTool } from "./research.js";

import { createResearchMemoryTool } from "../memory/research.js";
import { createCitationsTool } from "../memory/citations.js";

import { createMetricsTool } from "./metrics.js";
import { createAdvancedAnalyticsTool } from "./advancedAnalytics.js";
import { createForecastingTool } from "./forecasting.js";
import { createExperimentsTool } from "./experiments.js";

function definition(
  name,
  description,
  properties = {},
  required = []
) {
  return {
    type: "function",
    function: {
      name,
      description,
      parameters: {
        type: "object",
        properties,
        required,
        additionalProperties: false,
      },
    },
  };
}

function makeTool(
  name,
  description,
  execute,
  options = {},
) {
  return {
    name,
    definition: definition(
      name,
      description,
      options.properties || {},
      options.required || [],
    ),
    execute,
    permission: options.permission,
    requiresApproval:
      options.requiresApproval || false,
  };
}

function safeFactory(factory, name) {
  try {
    return factory();
  } catch (error) {
    console.warn(
      `[ToolRegistry] ${name} unavailable: ${error?.message || error}`,
    );
    return null;
  }
}

function unavailable(name) {
  return {
    ok: false,
    error: `${name} integration is not configured.`,
  };
}

export function createToolRegistry(env = {}) {
  const github = safeFactory(
    () => createGitHubClient(env),
    "github",
  );

  const render = safeFactory(
    () => createRenderClient(env),
    "render",
  );

  const cloudflare = safeFactory(
    () => createCloudflareClient(env),
    "cloudflare",
  );

  const web = safeFactory(
    () => createWebClient(env),
    "web",
  );

  const telegram = safeFactory(
    () => createTelegramClient(env),
    "telegram",
  );

  const browser = safeFactory(
    () => createBrowserClient(env),
    "browser",
  );

  const qa = safeFactory(
    () => createQAClient(env),
    "qa",
  );

  const code = safeFactory(
    () => createCodeClient(github),
    "code",
  );

  const database =
    env.DB || null;

  const analytics = safeFactory(
    () => createAnalyticsClient(database),
    "analytics",
  );

  const email = safeFactory(
    () => createEmailTool(env),
    "email",
  );

  const emailVerification = safeFactory(
    () => createEmailVerificationTool(env),
    "emailVerification",
  );

  const leads = safeFactory(
    () =>
      createLeadsTool(env, {
        emailVerification,
      }),
    "leads",
  );

  const campaigns = safeFactory(
    () =>
      createCampaignsTool(env, {
        email,
      }),
    "campaigns",
  );

  const crm = safeFactory(
    () => createCRMTool(env),
    "crm",
  );

  const customers = safeFactory(
    () => createCustomersTool(env),
    "customers",
  );

  const tickets = safeFactory(
    () => createTicketsTool(env),
    "tickets",
  );

  const support = safeFactory(
    () =>
      createSupportTool(env, {
        customers,
        tickets,
        email,
      }),
    "support",
  );

  const research = safeFactory(
    () => createResearchTool(env),
    "research",
  );

  const researchMemory = safeFactory(
    () => createResearchMemoryTool(env),
    "researchMemory",
  );

  const citations = safeFactory(
    () => createCitationsTool(env),
    "citations",
  );

  const metrics = safeFactory(
    () => createMetricsTool(env),
    "metrics",
  );

  const advancedAnalytics = safeFactory(
    () => createAdvancedAnalyticsTool(env),
    "advancedAnalytics",
  );

  const forecasting = safeFactory(
    () => createForecastingTool(env),
    "forecasting",
  );

  const experiments = safeFactory(
    () => createExperimentsTool(env),
    "experiments",
  );

  const registry = {};

  // ============================================================
  // OPERATIONS
  // ============================================================

  registry.health_check = makeTool(
    "health_check",
    "Check application health.",
    async ({ args }) => {
      const url =
        args?.url ||
        env.APP_URL ||
        "https://dpdpready.online";

      try {
        const response = await fetch(url, {
          redirect: "follow",
        });

        return {
          ok: response.ok,
          status: response.status,
          url,
        };
      } catch (error) {
        return {
          ok: false,
          status: null,
          url,
          error: error.message,
        };
      }
    },
    {
      permission: "website.read",
      properties: {
        url: {
          type: "string",
        },
      },
    },
  );

  registry.website_inspect = makeTool(
    "website_inspect",
    "Inspect the live website.",
    async ({ args }) => {
      if (!browser) return unavailable("Browser");

      return browser.inspect(args || {});
    },
    {
      permission: "browser.use",
      properties: {
        url: {
          type: "string",
        },
      },
      required: ["url"],
    },
  );

  registry.github_repository = makeTool(
    "github_repository",
    "Get GitHub repository information.",
    async () => {
      if (!github) return unavailable("GitHub");

      return github.getRepository();
    },
    {
      permission: "github.read",
    },
  );

  registry.github_get_file = makeTool(
    "github_get_file",
    "Read a repository file.",
    async ({ args }) => {
      if (!github) return unavailable("GitHub");

      return github.getFile(args || {});
    },
    {
      permission: "github.read",
    },
  );

  registry.github_search_files = makeTool(
    "github_search_files",
    "Search repository files.",
    async ({ args }) => {
      if (!github) return unavailable("GitHub");

      if (typeof github.searchFiles === "function") {
        return github.searchFiles(args || {});
      }

      return unavailable("GitHub file search");
    },
    {
      permission: "github.read",
    },
  );

  registry.github_create_branch = makeTool(
    "github_create_branch",
    "Create a GitHub branch.",
    async ({ args }) => {
      if (!github) return unavailable("GitHub");

      return github.createBranch(args || {});
    },
    {
      permission: "github.createBranch",
      requiresApproval: true,
    },
  );

  registry.github_update_file = makeTool(
    "github_update_file",
    "Update a GitHub repository file.",
    async ({ args }) => {
      if (!code) return unavailable("Code");

      return code.updateFile(args || {});
    },
    {
      permission: "github.write",
      requiresApproval: true,
    },
  );

  registry.github_create_pr = makeTool(
    "github_create_pr",
    "Create a GitHub pull request.",
    async ({ args }) => {
      if (!github) return unavailable("GitHub");

      return github.createPullRequest(args || {});
    },
    {
      permission: "github.createPR",
      requiresApproval: true,
    },
  );

  registry.render_deploy = makeTool(
    "render_deploy",
    "Trigger a Render deployment.",
    async ({ args }) => {
      if (!render) return unavailable("Render");

      return render.triggerDeploy(args || {});
    },
    {
      permission: "deployment.deploy",
      requiresApproval: true,
    },
  );

  registry.render_rollback = makeTool(
    "render_rollback",
    "Rollback a Render deployment.",
    async ({ args }) => {
      if (!render) return unavailable("Render");

      if (typeof render.rollback !== "function") {
        return {
          ok: false,
          error: "Render rollback is not available.",
        };
      }

      return render.rollback(args || {});
    },
    {
      permission: "deployment.rollback",
      requiresApproval: true,
    },
  );

  registry.browser_open = makeTool(
    "browser_open",
    "Open and inspect a webpage.",
    async ({ args }) => {
      if (!browser) return unavailable("Browser");

      return browser.inspect(args || {});
    },
    {
      permission: "browser.use",
    },
  );

  registry.browser_screenshot = makeTool(
    "browser_screenshot",
    "Capture a webpage screenshot.",
    async ({ args }) => {
      if (!browser) return unavailable("Browser");

      return browser.screenshot(args || {});
    },
    {
      permission: "browser.use",
    },
  );

  registry.browser_run = makeTool(
    "browser_run",
    "Run a bounded browser workflow.",
    async ({ args }) => {
      if (!browser) return unavailable("Browser");

      return browser.run(args || {});
    },
    {
      permission: "browser.use",
    },
  );

  registry.qa_run = makeTool(
    "qa_run",
    "Run a DPDPReady QA smoke test.",
    async ({ args }) => {
      if (!qa) return unavailable("QA");

      return qa.smokeTest(args || {});
    },
    {
      permission: "browser.use",
    },
  );

  // ============================================================
  // GROWTH
  // ============================================================

  registry.web_search = makeTool(
    "web_search",
    "Search the public web.",
    async ({ args }) => {
      if (!web) return unavailable("Web");

      return web.search(args || {});
    },
    {
      permission: "web.search",
    },
  );

  registry.web_fetch = makeTool(
    "web_fetch",
    "Fetch a public web page.",
    async ({ args }) => {
      if (!web) return unavailable("Web");

      return web.fetchPage(args || {});
    },
    {
      permission: "web.fetch",
    },
  );

  registry.save_lead = makeTool(
    "save_lead",
    "Save a lead.",
    async ({ args }) => {
      if (!leads) return unavailable("Leads");

      return leads.create(args || {});
    },
    {
      permission: "database.write",
    },
  );

  registry.list_leads = makeTool(
    "list_leads",
    "List leads.",
    async ({ args }) => {
      if (!leads) return unavailable("Leads");

      return leads.list(args || {});
    },
    {
      permission: "database.read",
    },
  );

  registry.qualify_lead = makeTool(
    "qualify_lead",
    "Qualify a lead.",
    async ({ args }) => {
      if (!leads) return unavailable("Leads");

      return leads.qualify(args || {});
    },
    {
      permission: "database.write",
    },
  );

  registry.verify_email = makeTool(
    "verify_email",
    "Verify an email address.",
    async ({ args }) => {
      if (!emailVerification) {
        return unavailable("Email verification");
      }

      return emailVerification.verify(args || {});
    },
    {
      permission: "web.fetch",
    },
  );

  registry.campaign_create = makeTool(
    "campaign_create",
    "Create an email campaign.",
    async ({ args }) => {
      if (!campaigns) return unavailable("Campaigns");

      return campaigns.create(args || {});
    },
    {
      permission: "database.write",
    },
  );

  registry.campaign_add_message = makeTool(
    "campaign_add_message",
    "Add a message to a campaign.",
    async ({ args }) => {
      if (!campaigns) return unavailable("Campaigns");

      return campaigns.addMessage(args || {});
    },
    {
      permission: "database.write",
    },
  );

  registry.campaign_send = makeTool(
    "campaign_send",
    "Send queued campaign messages.",
    async ({ args }) => {
      if (!campaigns) return unavailable("Campaigns");

      return campaigns.send({
        ...(args || {}),
        approved: true,
      });
    },
    {
      permission: "email.send",
      requiresApproval: true,
    },
  );

  registry.email_send = makeTool(
    "email_send",
    "Send an email.",
    async ({ args }) => {
      if (!email) return unavailable("Email");

      return email.send({
        ...(args || {}),
        approved: true,
      });
    },
    {
      permission: "email.send",
      requiresApproval: true,
    },
  );

  registry.crm_update_lead = makeTool(
    "crm_update_lead",
    "Update a CRM lead.",
    async ({ args }) => {
      if (!crm) return unavailable("CRM");

      return crm.updateLead(args || {});
    },
    {
      permission: "database.write",
    },
  );

  registry.get_campaign_stats = makeTool(
    "get_campaign_stats",
    "Get campaign statistics.",
    async ({ args }) => {
      if (!campaigns) return unavailable("Campaigns");

      return campaigns.stats(args || {});
    },
    {
      permission: "database.read",
    },
  );

  registry.get_analytics_overview = makeTool(
    "get_analytics_overview",
    "Get analytics overview.",
    async ({ args }) => {
      if (!analytics) return unavailable("Analytics");

      if (
        typeof analytics.overview ===
        "function"
      ) {
        return analytics.overview(args || {});
      }

      return unavailable("Analytics overview");
    },
    {
      permission: "database.read",
    },
  );

  // ============================================================
  // ANALYTICS
  // ============================================================

  registry.get_users = makeTool(
    "get_users",
    "Get user analytics.",
    async ({ args }) => {
      if (!analytics) return unavailable("Analytics");

      return analytics.users(args || {});
    },
    {
      permission: "database.read",
    },
  );

  registry.get_audits = makeTool(
    "get_audits",
    "Get audit analytics.",
    async ({ args }) => {
      if (!analytics) return unavailable("Analytics");

      if (typeof analytics.audits === "function") {
        return analytics.audits(args || {});
      }

      return unavailable("Audit analytics");
    },
    {
      permission: "database.read",
    },
  );

  registry.get_revenue = makeTool(
    "get_revenue",
    "Get revenue analytics.",
    async ({ args }) => {
      if (analytics) {
        if (typeof analytics.revenue === "function") {
          return analytics.revenue(args || {});
        }
      }

      if (advancedAnalytics) {
        return advancedAnalytics.revenue(args || {});
      }

      return unavailable("Revenue analytics");
    },
    {
      permission: "database.read",
    },
  );

  registry.metrics_snapshot = makeTool(
    "metrics_snapshot",
    "Get a metrics snapshot.",
    async () => {
      if (!metrics) return unavailable("Metrics");

      return metrics.snapshot({});
    },
    {
      permission: "database.read",
    },
  );

  registry.advanced_analytics = makeTool(
    "advanced_analytics",
    "Run advanced analytics.",
    async ({ args }) => {
      if (!advancedAnalytics) {
        return unavailable(
          "Advanced analytics",
        );
      }

      return advancedAnalytics.health(args || {});
    },
    {
      permission: "database.read",
    },
  );

  registry.forecast_metrics = makeTool(
    "forecast_metrics",
    "Forecast business metrics.",
    async ({ args }) => {
      if (!forecasting) {
        return unavailable("Forecasting");
      }

      const metric =
        args?.metric || "users";

      if (
        metric === "revenue" &&
        typeof forecasting.forecastRevenue ===
          "function"
      ) {
        return forecasting.forecastRevenue(
          args || {},
        );
      }

      return forecasting.forecastUsers(
        args || {},
      );
    },
    {
      permission: "database.read",
    },
  );

  registry.create_experiment = makeTool(
    "create_experiment",
    "Create an experiment.",
    async ({ args }) => {
      if (!experiments) {
        return unavailable("Experiments");
      }

      return experiments.create(args || {});
    },
    {
      permission: "database.write",
    },
  );

  registry.record_experiment = makeTool(
    "record_experiment",
    "Record an experiment observation.",
    async ({ args }) => {
      if (!experiments) {
        return unavailable("Experiments");
      }

      return experiments.record(args || {});
    },
    {
      permission: "database.write",
    },
  );

  // ============================================================
  // RESEARCH
  // ============================================================

  registry.research_search = makeTool(
    "research_search",
    "Search saved research.",
    async ({ args }) => {
      if (!research) return unavailable("Research");

      return research.search(args || {});
    },
    {
      permission: "database.read",
    },
  );

  registry.research_save = makeTool(
    "research_save",
    "Save research.",
    async ({ args }) => {
      if (!research) return unavailable("Research");

      return research.save(args || {});
    },
    {
      permission: "database.write",
    },
  );

  registry.research_list = makeTool(
    "research_list",
    "List saved research.",
    async ({ args }) => {
      if (!research) return unavailable("Research");

      return research.list(args || {});
    },
    {
      permission: "database.read",
    },
  );

  registry.research_alerts = makeTool(
    "research_alerts",
    "List regulatory research alerts.",
    async ({ args }) => {
      if (!research) return unavailable("Research");

      return research.listAlerts(args || {});
    },
    {
      permission: "database.read",
    },
  );

  registry.research_citation_save = makeTool(
    "research_citation_save",
    "Save a research citation.",
    async ({ args }) => {
      if (!citations) return unavailable("Citations");

      return citations.save(args || {});
    },
    {
      permission: "database.write",
    },
  );

  // ============================================================
  // SUPPORT
  // ============================================================

  registry.get_customer = makeTool(
    "get_customer",
    "Get a customer.",
    async ({ args }) => {
      if (!customers) return unavailable("Customers");

      return customers.get(args || {});
    },
    {
      permission: "database.read",
    },
  );

  registry.get_customer_audit = makeTool(
    "get_customer_audit",
    "Get customer audit information.",
    async ({ args }) => {
      if (!analytics) return unavailable("Analytics");

      if (
        typeof analytics.customerAudit ===
        "function"
      ) {
        return analytics.customerAudit(
          args || {},
        );
      }

      return unavailable("Customer audit");
    },
    {
      permission: "database.read",
    },
  );

  registry.create_support_ticket = makeTool(
    "create_support_ticket",
    "Create a support ticket.",
    async ({ args }) => {
      if (!support) return unavailable("Support");

      return support.createTicket(args || {});
    },
    {
      permission: "database.write",
    },
  );

  registry.update_support_ticket = makeTool(
    "update_support_ticket",
    "Update a support ticket.",
    async ({ args }) => {
      if (!support) return unavailable("Support");

      return support.updateTicket(args || {});
    },
    {
      permission: "database.write",
    },
  );

  registry.escalate_support_ticket = makeTool(
    "escalate_support_ticket",
    "Escalate a support ticket.",
    async ({ args }) => {
      if (!tickets) return unavailable("Tickets");

      return tickets.update({
        ...(args || {}),
        status: "in_progress",
      });
    },
    {
      permission: "database.write",
    },
  );

  registry.customer_context = makeTool(
    "customer_context",
    "Get customer support context.",
    async ({ args }) => {
      if (!support) return unavailable("Support");

      return support.customerContext(
        args || {},
      );
    },
    {
      permission: "database.read",
    },
  );

  registry.support_email_send = makeTool(
    "support_email_send",
    "Send a support email.",
    async ({ args }) => {
      if (!support) return unavailable("Support");

      return support.replyByEmail({
        ...(args || {}),
        approved: true,
      });
    },
    {
      permission: "email.send",
      requiresApproval: true,
    },
  );

  // ============================================================
  // OPTIONAL HELPERS
  // ============================================================

  registry.research_memory_save = makeTool(
    "research_memory_save",
    "Save research memory.",
    async ({ args }) => {
      if (!researchMemory) {
        return unavailable("Research memory");
      }

      return researchMemory.remember(
        args || {},
      );
    },
    {
      permission: "database.write",
    },
  );

  registry.research_memory_get = makeTool(
    "research_memory_get",
    "Get research memory.",
    async ({ args }) => {
      if (!researchMemory) {
        return unavailable("Research memory");
      }

      return researchMemory.get(args || {});
    },
    {
      permission: "database.read",
    },
  );

  registry.research_memory_search = makeTool(
    "research_memory_search",
    "Search research memory.",
    async ({ args }) => {
      if (!researchMemory) {
        return unavailable("Research memory");
      }

      return researchMemory.search(
        args || {},
      );
    },
    {
      permission: "database.read",
    },
  );

  registry.citation_search = makeTool(
    "citation_search",
    "Search saved citations.",
    async ({ args }) => {
      if (!citations) return unavailable("Citations");

      return citations.search(args || {});
    },
    {
      permission: "database.read",
    },
  );

  registry.metrics_daily = makeTool(
    "metrics_daily",
    "Get daily metrics.",
    async ({ args }) => {
      if (!metrics) return unavailable("Metrics");

      return metrics.daily(args || {});
    },
    {
      permission: "database.read",
    },
  );

  registry.metrics_funnel = makeTool(
    "metrics_funnel",
    "Get the analytics funnel.",
    async ({ args }) => {
      if (!metrics) return unavailable("Metrics");

      return metrics.funnel(args || {});
    },
    {
      permission: "database.read",
    },
  );

  registry.forecast_revenue = makeTool(
    "forecast_revenue",
    "Forecast revenue.",
    async ({ args }) => {
      if (!forecasting) {
        return unavailable("Forecasting");
      }

      return forecasting.forecastRevenue(
        args || {},
      );
    },
    {
      permission: "database.read",
    },
  );

  registry.forecast_users = makeTool(
    "forecast_users",
    "Forecast users.",
    async ({ args }) => {
      if (!forecasting) {
        return unavailable("Forecasting");
      }

      return forecasting.forecastUsers(
        args || {},
      );
    },
    {
      permission: "database.read",
    },
  );

  registry.experiment_start = makeTool(
    "experiment_start",
    "Start an experiment.",
    async ({ args }) => {
      if (!experiments) {
        return unavailable("Experiments");
      }

      return experiments.start(args || {});
    },
    {
      permission: "database.write",
    },
  );

  registry.experiment_stop = makeTool(
    "experiment_stop",
    "Stop an experiment.",
    async ({ args }) => {
      if (!experiments) {
        return unavailable("Experiments");
      }

      return experiments.stop(args || {});
    },
    {
      permission: "database.write",
    },
  );

  registry.experiment_analyze = makeTool(
    "experiment_analyze",
    "Analyze an experiment.",
    async ({ args }) => {
      if (!experiments) {
        return unavailable("Experiments");
      }

      return experiments.analyze(args || {});
    },
    {
      permission: "database.read",
    },
  );

  // Keep the Telegram client initialized for future
  // Telegram-facing tools and callbacks.
  void telegram;
  void cloudflare;

  return registry;
}
