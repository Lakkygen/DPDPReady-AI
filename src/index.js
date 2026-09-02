// src/index.js

import { AgentRuntime } from "./agents/base/runtime.js";

import {
  validateEnvironment
} from "./config/environment.js";

import {
  Orchestrator
} from "./core/orchestrator.js";

import {
  routeTelegramUpdate
} from "./telegram/router.js";

import {
  Scheduler
} from "./core/scheduler.js";

import {
  COMPANY
} from "./config/company.js";

function json(data, status = 200) {
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
          "application/json; charset=utf-8"
      }
    }
  );
}

function createServices(env) {
  const runtime =
    new AgentRuntime({
      env,
      db: env.DB ?? null
    });

  const orchestrator =
    new Orchestrator({
      env,
      db: env.DB ?? null,
      runtime
    });

  const scheduler =
    new Scheduler();

  return {
    runtime,
    orchestrator,
    scheduler
  };
}

async function handleTelegramWebhook(
  request,
  env,
  services
) {
  let update;

  try {
    update =
      await request.json();
  } catch {
    return json(
      {
        ok: false,
        error: "Invalid JSON."
      },
      400
    );
  }

  try {
    const result =
      await routeTelegramUpdate(
        update,
        env,
        services.orchestrator,
        services.runtime
      );

    return json({
      ok: true,
      result
    });
  } catch (error) {
    console.error(
      "Telegram processing error:",
      error
    );

    return json({
      ok: false,
      error:
        String(
          error?.message ??
          "Telegram processing failed."
        )
    });
  }
}

export default {
  async fetch(
    request,
    env,
    ctx
  ) {
    const url =
      new URL(request.url);

    const services =
      createServices(env);

    try {
      if (
        url.pathname === "/"
      ) {
        return json({
          ok: true,
          service: COMPANY.name,
          status: "online"
        });
      }

      if (
        url.pathname === "/health"
      ) {
        const validation =
          validateEnvironment(
            env,
            {
              strict: false
            }
          );

        return json({
          ok: true,
          service: COMPANY.id,
          timestamp:
            new Date().toISOString(),
          environment:
            validation
        });
      }

      if (
        url.pathname ===
        "/telegram/webhook"
      ) {
        return handleTelegramWebhook(
          request,
          env,
          services
        );
      }

      if (
        url.pathname === "/test-agent" &&
        request.method === "POST"
      ) {
        const body =
          await request.json();

        const result =
          await services.runtime.run({
            agentId:
              body.agentId,
            task:
              body.task,
            context:
              body.context ?? {}
          });

        return json({
          ok: true,
          result
        });
      }

      return json(
        {
          ok: false,
          error: "Not found"
        },
        404
      );
    } catch (error) {
      console.error(
        "Worker error:",
        error
      );

      return json(
        {
          ok: false,
          error:
            String(
              error?.message ??
              "Internal server error"
            )
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
    const services =
      createServices(env);

    /**
     * Deterministic scheduled work first.
     * No LLM call is needed merely to wake up.
     */

    ctx.waitUntil(
      (async () => {
        try {
          const result =
            await services.runtime
              .toolExecutor
              .execute({
                agent:
                  services.orchestrator
                    .getAgent("ops"),

                toolName:
                  "health_check",

                arguments: {
                  url:
                    env.APP_URL ||
                    "https://dpdpready.online"
                }
              });

          console.log(
            "Scheduled health result:",
            result
          );

          if (!result.ok) {
            /**
             * Later:
             * create incident task for Marcus.
             *
             * Notice that normal health
             * checks still don't spend LLM tokens.
             */
          }
        } catch (error) {
          console.error(
            "Scheduled health check failed:",
            error
          );
        }
      })()
    );

    console.log(
      "Cron:",
      controller.cron
    );
  }
};
