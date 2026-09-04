import { AgentRuntime } from "./agents/base/runtime.js";
import { MemoryManager } from "./agents/base/memoryManager.js";

import {
  validateEnvironment
} from "./config/environment.js";

import {
  Orchestrator
} from "./core/orchestrator.js";

import {
  Scheduler
} from "./core/scheduler.js";

import {
  COMPANY
} from "./config/company.js";

import {
  TeamCoordinator
} from "./team/coordinator.js";

import {
  routeTelegramUpdate
} from "./telegram/router.js";

import {
  createApprovalController
} from "./telegram/approvals.js";

import {
  getBotConfigs
} from "./telegram/bots.js";

import {
  authenticateRequest,
  createAuthResponse
} from "./security/auth.js";

function json(
  data,
  status = 200
) {
  return new Response(
    JSON.stringify(
      data,
      null,
      2
    ),
    {
      status,
      headers: {
        "Content-Type":
          "application/json; charset=utf-8",
        "Cache-Control":
          "no-store"
      }
    }
  );
}

function errorMessage(
  error
) {
  if (!error) {
    return "Unknown error.";
  }

  if (
    typeof error ===
    "string"
  ) {
    return error;
  }

  return (
    error?.message ??
    String(error)
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

function getOpsBot(env) {
  const bots =
    getBotConfigs(env);

  return (
    bots.find(
      (bot) =>
        bot.agentId ===
        "ops"
    ) ??
    bots[0] ??
    null
  );
}

async function telegramSendMessage({
  token,
  chatId,
  text
}) {
  if (!token || !chatId) {
    return false;
  }

  try {
    const response =
      await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: String(
              text ?? ""
            ).slice(0, 4000),
            allow_sending_without_reply:
              true
          })
        }
      );

    return response.ok;
  } catch {
    return false;
  }
}

async function notifyProcessingFailure({
  env,
  chatId,
  error
}) {
  const bot =
    getOpsBot(env);

  if (!bot || !chatId) {
    return false;
  }

  const message = [
    "⚠️ DPDPReady processing error",
    "",
    `Chat: ${chatId}`,
    `Error: ${errorMessage(error).slice(0, 1200)}`,
    "",
    "The Telegram update was acknowledged and will not be retried."
  ].join("\n");

  return telegramSendMessage({
    token: bot.token,
    chatId,
    text: message
  });
}

function createServices(env) {
  const logger = console;

  const memoryManager =
    new MemoryManager({
      db: env.DB ??
        null,
      logger
    });

  const approvalController =
    createApprovalController(
      env
    );

  const runtime =
    new AgentRuntime({
      env,
      db:
        env.DB ??
        null,
      logger,
      memoryManager,
      approvalController
    });

  const orchestrator =
    new Orchestrator({
      env,
      db:
        env.DB ??
        null,
      logger,
      runtime,
      memoryManager
    });

  const scheduler =
    new Scheduler({
      logger
    });

  const teamCoordinator =
    new TeamCoordinator({
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
    teamCoordinator,
    approvalController
  };
}

async function parseTelegramUpdate(
  request
) {
  try {
    const update =
      await request.json();

    return {
      ok: true,
      update
    };
  } catch {
    return {
      ok: false,
      update: null
    };
  }
}

async function handleTelegramWebhook(
  request,
  env,
  services
) {
  const parsed =
    await parseTelegramUpdate(
      request
    );

  if (!parsed.ok) {
    /*
     * Invalid bodies are not legitimate Telegram
     * updates, so this is a true client error.
     */
    return json(
      {
        ok: false,
        error:
          "Invalid JSON."
      },
      400
    );
  }

  const update =
    parsed.update;

  const chatId =
    update?.message?.chat?.id ??
    update?.edited_message?.chat?.id ??
    null;

  try {
    const result =
      await routeTelegramUpdate(
        update,
        env,
        services.orchestrator,
        services.runtime,
        services.teamCoordinator,
        services.approvalController
      );

    /*
     * Telegram only needs a successful acknowledgement.
     * The detailed result is still returned to direct
     * HTTP callers, but Telegram gets a normal 200.
     */
    return json({
      ok: true,
      result
    });
  } catch (error) {
    /*
     * This is the critical change.
     *
     * The webhook request has already been received.
     * Returning 500 here causes Telegram to retry the
     * same update. A processing failure should therefore
     * be acknowledged as handled, while the application
     * sends a controlled error notice.
     */
    console.error(
      "Telegram processing error:",
      error
    );

    await notifyProcessingFailure({
      env,
      chatId,
      error
    });

    return json({
      ok: true,
      handled: false,
      failed: true,
      error:
        "Telegram update acknowledged; processing failed."
    });
  }
}

async function runScheduledHealthCheck(
  env,
  services
) {
  if (!env.APP_URL) {
    throw new Error(
      "APP_URL is not configured."
    );
  }

  const url =
    new URL(
      "/health",
      env.APP_URL
    ).toString();

  try {
    const response =
      await fetch(
        url,
        {
          redirect:
            "follow"
        }
      );

    if (response.ok) {
      return {
        ok: true,
        notified: false,
        status:
          response.status
      };
    }

    const chatId =
      getTeamChatId(env);

    if (chatId) {
      try {
        await services.teamCoordinator.announceIncident(
          {
            chatId,
            message: [
              "🚨 PRODUCTION HEALTH CHECK FAILED",
              "",
              `Status: ${response.status}`,
              `URL: ${url}`,
              "",
              "The team is investigating automatically."
            ].join("\n"),
            triggerAgentId:
              "ops"
          }
        );
      } catch (incidentError) {
        console.error(
          "Failed to announce health incident:",
          incidentError
        );
      }
    }

    return {
      ok: false,
      notified:
        Boolean(chatId),
      status:
        response.status
    };
  } catch (error) {
    console.error(
      "Scheduled health check error:",
      error
    );

    return {
      ok: false,
      notified: false,
      error:
        errorMessage(error)
    };
  }
}

async function handleTestAgent(
  request,
  env
) {
  const auth =
    authenticateRequest(
      request,
      env,
      {
        required: true,
        principal: "admin"
      }
    );

  if (!auth.authenticated) {
    return createAuthResponse(
      auth
    );
  }

  let body;

  try {
    body =
      await request.json();
  } catch {
    return json(
      {
        ok: false,
        error:
          "Invalid JSON."
      },
      400
    );
  }

  if (
    !body?.agentId ||
    !body?.task
  ) {
    return json(
      {
        ok: false,
        error:
          "agentId and task are required."
      },
      400
    );
  }

  const services =
    createServices(env);

  try {
    const result =
      await services.runtime.run({
        agentId:
          body.agentId,
        task:
          body.task,
        context:
          body.context ??
          {}
      });

    return json({
      ok: true,
      result
    });
  } catch (error) {
    return json(
      {
        ok: false,
        error:
          errorMessage(error)
      },
      502
    );
  }
}

export default {
  async fetch(
    request,
    env
  ) {
    const url =
      new URL(
        request.url
      );

    try {
      /*
       * Root
       */
      if (
        request.method ===
          "GET" &&
        url.pathname ===
          "/"
      ) {
        return json({
          ok: true,
          service:
            COMPANY.name,
          status:
            "online"
        });
      }

      /*
       * Health
       */
      if (
        request.method ===
          "GET" &&
        url.pathname ===
          "/health"
      ) {
        const validation =
          validateEnvironment(
            env,
            {
              strict: false
            }
          );

        const databaseConfigured =
          Boolean(
            env.DB
          );

        const healthy =
          validation.valid &&
          databaseConfigured;

        return json(
          {
            ok:
              healthy,
            service:
              COMPANY.id,
            timestamp:
              new Date().toISOString(),
            environment:
              validation,
            teamChatConfigured:
              Boolean(
                getTeamChatId(
                  env
                )
              ),
            databaseConfigured
          },
          healthy
            ? 200
            : 503
        );
      }

      /*
       * Telegram webhook
       */
      if (
        url.pathname ===
        "/telegram/webhook"
      ) {
        if (
          request.method !==
          "POST"
        ) {
          return json(
            {
              ok: false,
              error:
                "Method not allowed."
            },
            405
          );
        }

        const secretToken =
          request.headers.get(
            "X-Telegram-Bot-Api-Secret-Token"
          );

        if (
          !secretToken ||
          secretToken !==
            env.TELEGRAM_WEBHOOK_SECRET
        ) {
          return json(
            {
              ok: false,
              error:
                "Unauthorized."
            },
            401
          );
        }

        const services =
          createServices(
            env
          );

        return handleTelegramWebhook(
          request,
          env,
          services
        );
      }

      /*
       * Direct agent test
       */
      if (
        url.pathname ===
          "/test-agent" &&
        request.method ===
          "POST"
      ) {
        return handleTestAgent(
          request,
          env
        );
      }

      /*
       * Everything else
       */
      return json(
        {
          ok: false,
          error:
            "Not found"
        },
        404
      );
    } catch (error) {
      console.error(
        "Worker error:",
        error
      );

      /*
       * Do not leak internal stack traces
       * to public HTTP clients.
       */
      return json(
        {
          ok: false,
          error:
            "Internal server error."
        },
        500
      );
    }
  },

  async scheduled(
    controller,
    env,
    ctx
  ) {
    try {
      const services =
        createServices(
          env
        );

      ctx.waitUntil(
        runScheduledHealthCheck(
          env,
          services
        ).catch(
          (error) => {
            console.error(
              "Scheduled service failure:",
              error
            );
          }
        )
      );
    } catch (error) {
      console.error(
        "Scheduled service initialization failed:",
        error
      );
    }

    console.log(
      "Cron:",
      controller.cron
    );
  }
};
