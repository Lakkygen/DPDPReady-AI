// src/tools/registry.js

import { createGitHubClient } from "./github.js";
import {
  createRenderClient,
  createCloudflareClient
} from "./deployment.js";

import { createDatabase } from "./database.js";
import { createWebClient } from "./web.js";
import { createAnalyticsClient } from "./analytics.js";
import { createTelegramClient } from "./communication.js";

import { createBrowserClient } from "./browser.js";
import { createQAClient } from "./qa.js";
import { createCodeClient } from "./code.js";

import { createEmailClient } from "./email.js";
import {
  createEmailVerificationClient
} from "./emailVerification.js";

import { createLeadsClient } from "./leads.js";
import { createCampaignsClient } from "./campaigns.js";
import { createCRMClient } from "./crm.js";

import { createCustomersClient } from "./customers.js";
import { createTicketsClient } from "./tickets.js";
import { createSupportClient } from "./support.js";

import { createResearchClient } from "./research.js";
import {
  createResearchMemory
} from "../memory/research.js";
import {
  createCitationStore
} from "../memory/citations.js";

import { createMetricsClient } from "./metrics.js";
import {
  createAdvancedAnalyticsClient
} from "./advancedAnalytics.js";

import {
  createForecastingClient
} from "./forecasting.js";

import {
  createExperimentsClient
} from "./experiments.js";

function def(
  name,
  description,
  parameters = {
    type: "object",
    properties: {},
    additionalProperties: false
  }
) {
  return {
    type: "function",
    function: {
      name,
      description,
      parameters
    }
  };
}

function tool(
  name,
  description,
  execute,
  extra = {},
  parameters
) {
  return {
    name,
    definition: def(
      name,
      description,
      parameters
    ),
    execute,
    ...extra
  };
}

export function createToolRegistry(env = {}) {
  const database =
    createDatabase(env);

  const github =
    createGitHubClient(env);

  const render =
    createRenderClient(env);

  const cloudflare =
    createCloudflareClient(env);

  const web =
    createWebClient(env);

  const analytics =
    createAnalyticsClient(database);

  const telegram =
    createTelegramClient(env);

  const browser =
    createBrowserClient(env);

  const qa =
    createQAClient(env);

  const code =
    createCodeClient(github);

  const email =
    createEmailClient(env, {
      database
    });

  const emailVerification =
    createEmailVerificationClient(env);

  const leads =
    createLeadsClient(database, {
      web,
      emailVerification
    });

  const campaigns =
    createCampaignsClient(database, {
      email
    });

  const crm =
    createCRMClient(database);

  const customers =
    createCustomersClient(database);

  const tickets =
    createTicketsClient(database);

  const support =
    createSupportClient({
      database,
      customers,
      tickets,
      email
    });

  const research =
    createResearchClient(database);

  const researchMemory =
    createResearchMemory(database);

  const citations =
    createCitationStore(database);

  const metrics =
    createMetricsClient(database);

  const advancedAnalytics =
    createAdvancedAnalyticsClient(
      database
    );

  const forecasting =
    createForecastingClient(database);

  const experiments =
    createExperimentsClient(database);

  return {
    health_check: tool(
      "health_check",
      "Check the application health.",
      async () => {
        const response =
          await fetch(
            env.APP_URL,
            {
              redirect: "follow"
            }
          );

        return {
          ok: response.ok,
          status: response.status,
          url: env.APP_URL
        };
      },
      {
        permission:
          "website.read"
      },
      {
        type: "object",
        properties: {
          url: {
            type: "string"
          }
        },
        required: [],
        additionalProperties: false
      }
    ),

    get_logs: tool(
      "get_logs",
      "Read recent Render deployment logs.",
      async ({ args }) =>
        render.listLogs(args),
      {
        permission:
          "deployment.read"
      }
    ),

    get_deployment: tool(
      "get_deployment",
      "Get a Render deployment.",
      async ({ args }) =>
        render.getDeployment(args),
      {
        permission:
          "deployment.read"
      }
    ),

    github_repository: tool(
      "github_repository",
      "Get repository metadata.",
      async () =>
        github.getRepository(),
      {
        permission:
          "github.read"
      }
    ),

    github_get_branch: tool(
      "github_get_branch",
      "Get branch information.",
      async ({ args }) =>
        github.getBranch(args),
      {
        permission:
          "github.read"
      }
    ),

    github_list_branches: tool(
      "github_list_branches",
      "List repository branches.",
      async ({ args }) =>
        github.listBranches(args),
      {
        permission:
          "github.read"
      }
    ),

    github_get_file: tool(
      "github_get_file",
      "Read a file from the repository.",
      async ({ args }) =>
        github.getFile(args),
      {
        permission:
          "github.read"
      }
    ),

    github_compare: tool(
      "github_compare",
      "Compare two Git refs.",
      async ({ args }) =>
        github.compare(args),
      {
        permission:
          "github.read"
      }
    ),

    create_branch: tool(
      "create_branch",
      "Create a Git branch.",
      async ({ args }) =>
        github.createBranch(args),
      {
        permission:
          "github.createBranch",
        requiresApproval: true
      }
    ),

    create_pull_request: tool(
      "create_pull_request",
      "Create a GitHub pull request.",
      async ({ args }) =>
        github.createPullRequest(args),
      {
        permission:
          "github.createPR",
        requiresApproval: true
      }
    ),

    github_create_branch: tool(
      "github_create_branch",
      "Create a Git branch.",
      async ({ args }) =>
        github.createBranch(args),
      {
        permission:
          "github.createBranch",
        requiresApproval: true
      }
    ),

    github_update_file: tool(
      "github_update_file",
      "Create or update a repository file.",
      async ({ args }) =>
        github.updateFile(args),
      {
        permission:
          "github.write",
        requiresApproval: true
      }
    ),

    github_create_pr: tool(
      "github_create_pr",
      "Open a pull request.",
      async ({ args }) =>
        github.createPullRequest(args),
      {
        permission:
          "github.createPR",
        requiresApproval: true
      }
    ),

    code_read_file: tool(
      "code_read_file",
      "Read a repository file through the code layer.",
      async ({ args }) =>
        code.readFile(args),
      {
        permission:
          "code.read"
      }
    ),

    code_replace_exact: tool(
      "code_replace_exact",
      "Safely replace one exact code block.",
      async ({ args }) =>
        code.replaceExact(args),
      {
        permission:
          "code.write",
        requiresApproval: true
      }
    ),

    code_apply_patch: tool(
      "code_apply_patch",
      "Apply a bounded exact replacement patch.",
      async ({ args }) =>
        code.applyUnifiedPatch(args),
      {
        permission:
          "code.write",
        requiresApproval: true
      }
    ),

    code_basic_syntax_check: tool(
      "code_basic_syntax_check",
      "Perform a basic JavaScript delimiter/string syntax check.",
      async ({ args }) =>
        code.basicSyntaxCheck(
          args.source
        ),
      {
        permission:
          "code.read"
      }
    ),

    browser_check_page: tool(
      "browser_check_page",
      "Load a page in a remote browser and inspect it.",
      async ({ args }) =>
        browser.inspect(args),
      {
        permission:
          "browser.use"
      }
    ),

    browser_screenshot: tool(
      "browser_screenshot",
      "Capture a rendered webpage screenshot.",
      async ({ args }) =>
        browser.screenshot(args),
      {
        permission:
          "browser.use"
      }
    ),

    browser_run: tool(
      "browser_run",
      "Execute bounded browser code.",
      async ({ args }) =>
        browser.run(args),
      {
        permission:
          "browser.use"
      }
    ),

    qa_smoke_test: tool(
      "qa_smoke_test",
      "Run a production smoke test.",
      async ({ args }) =>
        qa.smokeTest(args),
      {
        permission:
          "browser.use"
      }
    ),

    qa_regression: tool(
      "qa_regression",
      "Run bounded browser journeys.",
      async ({ args }) =>
        qa.regression(args),
      {
        permission:
          "browser.use"
      }
    ),

    render_get_deployment: tool(
      "render_get_deployment",
      "Get a deployment by ID.",
      async ({ args }) =>
        render.getDeployment(args),
      {
        permission:
          "deployment.read"
      }
    ),

    render_list_deployments: tool(
      "render_list_deployments",
      "List recent deployments.",
      async ({ args }) =>
        render.listDeployments(args),
      {
        permission:
          "deployment.read"
      }
    ),

    render_logs: tool(
      "render_logs",
      "Fetch deployment logs.",
      async ({ args }) =>
        render.listLogs(args),
      {
        permission:
          "deployment.read"
      }
    ),

    render_deploy: tool(
      "render_deploy",
      "Trigger a production deployment.",
      async ({ args }) =>
        render.triggerDeploy(args),
      {
        permission:
          "deployment.deploy",
        requiresApproval: true
      }
    ),

    render_rollback: tool(
      "render_rollback",
      "Roll back a production deployment.",
      async ({ args }) =>
        render.rollback?.(args),
      {
        permission:
          "deployment.rollback",
        requiresApproval: true
      }
    ),

    cloudflare_worker_versions: tool(
      "cloudflare_worker_versions",
      "List Worker versions.",
      async ({ args }) =>
        cloudflare.workerVersions(args),
      {
        permission:
          "deployment.read"
      }
    ),

    cloudflare_d1_query: tool(
      "cloudflare_d1_query",
      "Run a D1 query.",
      async ({ args }) =>
        cloudflare.d1Query(args),
      {
        permission:
          "database.read",
        requiresApproval: true
      }
    ),

    web_search: tool(
      "web_search",
      "Search the public web.",
      async ({ args }) =>
        web.search(args),
      {
        permission:
          "web.search"
      }
    ),

    web_fetch: tool(
      "web_fetch",
      "Fetch a public web page.",
      async ({ args }) =>
        web.fetchPage(args),
      {
        permission:
          "web.fetch"
      }
    ),

    get_users: tool(
      "get_users",
      "Get user analytics.",
      async ({ args }) =>
        analytics.users(args),
      {
        permission:
          "database.read"
      }
    ),

    get_audits: tool(
      "get_audits",
      "Get audit analytics.",
      async ({ args }) =>
        analytics.audits(args),
      {
        permission:
          "database.read"
      }
    ),

    get_revenue: tool(
      "get_revenue",
      "Get revenue analytics.",
      async ({ args }) =>
        analytics.revenue(args),
      {
        permission:
          "database.read"
      }
    ),

    get_campaign_stats: tool(
      "get_campaign_stats",
      "Get campaign analytics.",
      async ({ args }) =>
        analytics.campaignStats(args),
      {
        permission:
          "database.read"
      }
    ),

    get_analytics_overview: tool(
      "get_analytics_overview",
      "Get analytics overview.",
      async ({ args }) =>
        analytics.overview(args),
      {
        permission:
          "database.read"
      }
    ),

    metrics_snapshot: tool(
      "metrics_snapshot",
      "Get business KPI snapshot.",
      async () =>
        metrics.snapshot(),
      {
        permission:
          "database.read"
      }
    ),

    advanced_analytics: tool(
      "advanced_analytics",
      "Run advanced business analytics.",
      async ({ args }) =>
        advancedAnalytics[
          args.mode || "health"
        ](args),
      {
        permission:
          "database.read"
      }
    ),

    forecast_metrics: tool(
      "forecast_metrics",
      "Produce a directional business forecast.",
      async ({ args }) =>
        args.mode === "users"
          ? forecasting.forecastUsers(
              args
            )
          : forecasting.forecastRevenue(
              args
            ),
      {
        permission:
          "database.read"
      }
    ),

    create_experiment: tool(
      "create_experiment",
      "Create a measurable product experiment.",
      async ({ args }) =>
        experiments.create(args),
      {
        permission:
          "database.write"
      }
    ),

    record_experiment: tool(
      "record_experiment",
      "Record an experiment observation.",
      async ({ args }) =>
        experiments.record(args),
      {
        permission:
          "database.write"
      }
    ),

    save_lead: tool(
      "save_lead",
      "Create a sales lead.",
      async ({ args }) =>
        leads.create(args),
      {
        permission:
          "database.write"
      }
    ),

    list_leads: tool(
      "list_leads",
      "List sales leads.",
      async ({ args }) =>
        leads.list(args),
      {
        permission:
          "database.read"
      }
    ),

    qualify_lead: tool(
      "qualify_lead",
      "Update lead qualification.",
      async ({ args }) =>
        leads.qualify(args),
      {
        permission:
          "database.write"
      }
    ),

    verify_email: tool(
      "verify_email",
      "Verify a prospect email address.",
      async ({ args }) =>
        leads.verify(args),
      {
        permission:
          "web.search"
      }
    ),

    crm_update_lead: tool(
      "crm_update_lead",
      "Update a lead's pipeline state.",
      async ({ args }) =>
        crm.updateLead(args),
      {
        permission:
          "database.write"
      }
    ),

    campaign_create: tool(
      "campaign_create",
      "Create a campaign.",
      async ({ args }) =>
        campaigns.create(args),
      {
        permission:
          "database.write"
      }
    ),

    campaign_add_message: tool(
      "campaign_add_message",
      "Add a message to a campaign.",
      async ({ args }) =>
        campaigns.addMessage(args),
      {
        permission:
          "database.write"
      }
    ),

    campaign_send: tool(
      "campaign_send",
      "Send approved campaign messages.",
      async ({ args }) =>
        campaigns.send(args),
      {
        permission:
          "communication.email",
        requiresApproval: true
      }
    ),

    email_send: tool(
      "email_send",
      "Send an approved customer or prospect email.",
      async ({ args }) =>
        email.send(args),
      {
        permission:
          "communication.email",
        requiresApproval: true
      }
    ),

    get_customer: tool(
      "get_customer",
      "Find a customer.",
      async ({ args }) =>
        customers.get(args),
      {
        permission:
          "customers.read"
      }
    ),

    get_customer_audit: tool(
      "get_customer_audit",
      "Get a customer's latest audit.",
      async ({ args }) =>
        database.first(
          `
          SELECT *
          FROM audits
          WHERE user_id = ?
          ORDER BY created_at DESC
          LIMIT 1
          `,
          args.customerId
        ),
      {
        permission:
          "database.read"
      }
    ),

    create_support_ticket: tool(
      "create_support_ticket",
      "Create a support ticket.",
      async ({ args }) =>
        tickets.create(args),
      {
        permission:
          "tickets.write"
      }
    ),

    update_support_ticket: tool(
      "update_support_ticket",
      "Update a support ticket.",
      async ({ args }) =>
        tickets.update(args),
      {
        permission:
          "tickets.write"
      }
    ),

    escalate_support_ticket: tool(
      "escalate_support_ticket",
      "Escalate a support ticket.",
      async ({ args }) =>
        tickets.update({
          ...args,
          status: "escalated",
          priority:
            args.priority || "high"
        }),
      {
        permission:
          "tickets.write"
      }
    ),

    customer_context: tool(
      "customer_context",
      "Build a customer support context.",
      async ({ args }) =>
        support.customerContext(
          args
        ),
      {
        permission:
          "customers.read"
      }
    ),

    support_email_send: tool(
      "support_email_send",
      "Send an approved support email.",
      async ({ args }) =>
        support.replyByEmail(args),
      {
        permission:
          "communication.email",
        requiresApproval: true
      }
    ),

    research_save: tool(
      "research_save",
      "Store a research finding.",
      async ({ args }) =>
        research.save(args),
      {
        permission:
          "research.write"
      }
    ),

    research_search: tool(
      "research_search",
      "Search research memory.",
      async ({ args }) =>
        researchMemory.search(args),
      {
        permission:
          "research.read"
      }
    ),

    research_list: tool(
      "research_list",
      "List stored research.",
      async ({ args }) =>
        research.list(args),
      {
        permission:
          "research.read"
      }
    ),

    research_alerts: tool(
      "research_alerts",
      "Create or list research alerts.",
      async ({ args }) =>
        args.action === "list"
          ? research.listAlerts(args)
          : research.createAlert(
              args
            ),
      {
        permission:
          "research.alerts"
      }
    ),

    research_citation_save: tool(
      "research_citation_save",
      "Save a verified research source.",
      async ({ args }) =>
        citations.save(args),
      {
        permission:
          "research.citations"
      }
    ),

    telegram_send: tool(
      "telegram_send",
      "Send a Telegram message.",
      async ({ args }) =>
        telegram.sendMessage(args),
      {
        permission:
          "communication.telegram",
        requiresApproval: true
      }
    )
  };
}

/**
 * Backwards-compatible export.
 *
 * Runtime should normally use createToolRegistry(env),
 * but this keeps older imports from crashing during
 * transitional deployments.
 */
export const TOOL_REGISTRY = {};
