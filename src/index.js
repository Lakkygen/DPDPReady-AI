// src/index.js

import { AgentRuntime } from "./agents/base/runtime.js";
import { MemoryManager } from "./agents/base/memoryManager.js";
import { validateEnvironment } from "./config/environment.js";
import { Orchestrator } from "./core/orchestrator.js";
import { routeTelegramUpdate } from "./telegram/router.js";
import { Scheduler } from "./core/scheduler.js";
import { COMPANY } from "./config/company.js";
import { TeamCoordinator } from "./team/coordinator.js";
import { authenticateRequest, createAuthResponse } from "./security/auth.js";

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data, null, 2),
    {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    }
  );
}

function getTeamChatId(env) {
  return (
    env.TELEGRAM_TEAM_CHAT_ID ??
    env.TELEGRAM_GROUP_ID ??
    env.FOUNDER_CHAT_ID ??
    null
  );
}

function createServices(env) {
  const logger = console;

  const memoryManager = new MemoryManager({
    db: env.DB ?? null,
    logger
  });

  const runtime = new AgentRuntime({
    env,
    db: env.DB ?? null,
    logger,
    memoryManager
  });

  const orchestrator = new Orchestrator({
    env,
    db: env.DB ?? null,
    logger,
    runtime,
    memoryManager
  });

  const scheduler = new Scheduler({
    logger
  });

  const teamCoordinator = new TeamCoordinator({
    env,
    orchestrator,
    runtime,
    memoryManager,
    logger
  });

  return {
    runtime,
    orchestrator,
    scheduler,
    memoryManager,
    teamCoordinator
  };
}

async function handleTelegramWebhook(request, env, services) {
  let update;

  try {
    update = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON." }, 400);
  }

  try {
    const result = await routeTelegramUpdate(
      update,
      env,
      services.orchestrator,
      services.runtime,
      services.teamCoordinator
    );

    return json({ ok: true, result });
  } catch (error) {
    console.error("Telegram processing error:", error);
    return json({ ok: false, error: "Telegram processing failed." }, 500);
  }
}

async function runScheduledHealthCheck(env, services) {
  const url = env.APP_URL ?? "https://dpdpready.online";

  try {
    const response = await fetch(url, { redirect: "follow" });
    const ok = response.ok;
    const status = response.status;

    if (!ok) {
      const chatId = getTeamChatId(env);

      if (chatId) {
        await services.teamCoordinator.announceIncident({
          chatId,
          message: [
            "🚨 PRODUCTION HEALTH CHECK FAILED",
            "",
            `Status: ${status}`,
            `URL: ${url}`,
            "",
            "The team is investigating automatically."
          ].join("\n"),
          triggerAgentId: "ops"
        });
      }

      return { ok: false, notified: Boolean(chatId), status };
    }

    return { ok: true, notified: false, status };
  } catch (error) {
    console.error("Scheduled health check error:", error);

    const chatId = getTeamChatId(env);

    if (chatId) {
      try {
        await services.teamCoordinator.announceIncident({
          chatId,
          message: [
            "🚨 HEALTH CHECK EXECUTION FAILED",
            "",
            `Error: ${error?.message ?? "Unknown error"}`,
            `URL: ${url}`,
            "",
            "The team is investigating the failure."
          ].join("\n"),
          triggerAgentId: "ops"
        });
      } catch (teamError) {
        console.error("Team incident handling failed:", teamError);
      }
    }

    return { ok: false, notified: Boolean(chatId), error: error?.message };
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const services = createServices(env);

    try {
      if (request.method === "GET" && url.pathname === "/") {
        return json({
          ok: true,
          service: COMPANY.name,
          status: "online"
        });
      }

      if (request.method === "GET" && url.pathname === "/health") {
        const validation = validateEnvironment(env, { strict: false });

        return json({
          ok: true,
          service: COMPANY.id,
          timestamp: new Date().toISOString(),
          environment: validation,
          teamChatConfigured: Boolean(getTeamChatId(env)),
          databaseConfigured: Boolean(env.DB)
        });
      }

      if (url.pathname === "/telegram/webhook") {
        if (request.method !== "POST") {
          return json({ ok: false, error: "Method not allowed." }, 405);
        }

        const secretToken = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
        if (!secretToken || secretToken !== env.TELEGRAM_WEBHOOK_SECRET) {
          return json({ ok: false, error: "Unauthorized." }, 401);
        }

        return handleTelegramWebhook(request, env, services);
      }

      if (url.pathname === "/test-agent" && request.method === "POST") {
        const auth = authenticateRequest(request, env, { required: true, principal: "admin" });
        if (!auth.authenticated) {
          return createAuthResponse(auth);
        }

        let body;
        try {
          body = await request.json();
        } catch {
          return json({ ok: false, error: "Invalid JSON." }, 400);
        }

        if (!body?.agentId || !body?.task) {
          return json({ ok: false, error: "agentId and task are required." }, 400);
        }

        const result = await services.runtime.run({
          agentId: body.agentId,
          task: body.task,
          context: body.context ?? {}
        });

        return json({ ok: true, result });
      }

      return json({ ok: false, error: "Not found" }, 404);
    } catch (error) {
      console.error("Worker error:", error);
      return json({ ok: false, error: "Internal server error" }, 500);
    }
  },

  async scheduled(controller, env, ctx) {
    const services = createServices(env);

    ctx.waitUntil(
      (async () => {
        try {
          await runScheduledHealthCheck(env, services);
        } catch (error) {
          console.error("Scheduled health check failed:", error);

          const chatId = getTeamChatId(env);
          if (!chatId) return;

          try {
            await services.teamCoordinator.announceIncident({
              chatId,
              message: [
                "🚨 HEALTH CHECK EXECUTION FAILED",
                "",
                `Error: ${error?.message ?? "Unknown error"}`,
                "",
                "The team is investigating the failure."
              ].join("\n"),
              triggerAgentId: "ops"
            });
          } catch (teamError) {
            console.error("Team incident handling failed:", teamError);
          }
        }
      })()
    );

    console.log("Cron:", controller.cron);
  }
};
