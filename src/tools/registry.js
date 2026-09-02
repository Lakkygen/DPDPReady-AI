// src/tools/registry.js

function assertHttpsUrl(url) {
  if (!/^https:\/\//i.test(url)) {
    throw new Error(
      "Only HTTPS URLs are allowed."
    );
  }
}

export const TOOL_REGISTRY = {
  health_check: {
    permission: "website.read",

    definition: {
      type: "function",
      function: {
        name: "health_check",
        description:
          "Check whether a public HTTPS URL is responding.",
        parameters: {
          type: "object",
          properties: {
            url: {
              type: "string"
            }
          },
          required: ["url"],
          additionalProperties: false
        }
      }
    },

    async execute({ args }) {
      const url = String(args.url ?? "").trim();

      assertHttpsUrl(url);

      const started = Date.now();

      const response = await fetch(url, {
        method: "GET",
        redirect: "follow"
      });

      return {
        url,
        status: response.status,
        ok: response.ok,
        latencyMs: Date.now() - started
      };
    }
  },

  get_logs: {
    permission: "deployment.read",

    definition: {
      type: "function",
      function: {
        name: "get_logs",
        description:
          "Retrieve recent logs for an application service.",
        parameters: {
          type: "object",
          properties: {
            service: {
              type: "string"
            },
            limit: {
              type: "integer",
              minimum: 1,
              maximum: 100
            }
          },
          required: ["service"],
          additionalProperties: false
        }
      }
    },

    async execute({ args, agent }) {
      if (!agent.environment?.LOGS_API_URL) {
        return {
          configured: false,
          message:
            "Logs provider is not configured."
        };
      }

      const service =
        encodeURIComponent(
          String(args.service ?? "")
        );

      const limit = Math.min(
        Number(args.limit) || 20,
        100
      );

      const url =
        `${agent.environment.LOGS_API_URL}` +
        `?service=${service}&limit=${limit}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Logs provider returned ${response.status}.`
        );
      }

      return await response.json();
    }
  },

  get_deployment: {
    permission: "deployment.read",

    definition: {
      type: "function",
      function: {
        name: "get_deployment",
        description:
          "Get deployment status for a service.",
        parameters: {
          type: "object",
          properties: {
            service: {
              type: "string"
            }
          },
          required: ["service"],
          additionalProperties: false
        }
      }
    },

    async execute({ args, agent }) {
      if (!agent.environment?.DEPLOYMENT_API_URL) {
        return {
          configured: false,
          message:
            "Deployment provider is not configured."
        };
      }

      const service =
        encodeURIComponent(
          String(args.service ?? "")
        );

      const response = await fetch(
        `${agent.environment.DEPLOYMENT_API_URL}` +
        `?service=${service}`
      );

      if (!response.ok) {
        throw new Error(
          `Deployment provider returned ${response.status}.`
        );
      }

      return await response.json();
    }
  },

  create_branch: {
    permission: "github.createBranch",

    definition: {
      type: "function",
      function: {
        name: "create_branch",
        description:
          "Create a Git branch.",
        parameters: {
          type: "object",
          properties: {
            branchName: {
              type: "string"
            },
            baseBranch: {
              type: "string"
            }
          },
          required: ["branchName"],
          additionalProperties: false
        }
      }
    },

    async execute({ args }) {
      return {
        configured: false,
        action: "create_branch",
        branchName: args.branchName,
        baseBranch:
          args.baseBranch || "main",
        message:
          "GitHub API integration is not configured yet."
      };
    }
  },

  create_pull_request: {
    permission: "github.createPR",

    definition: {
      type: "function",
      function: {
        name: "create_pull_request",
        description:
          "Create a GitHub pull request.",
        parameters: {
          type: "object",
          properties: {
            title: {
              type: "string"
            },
            body: {
              type: "string"
            },
            branch: {
              type: "string"
            }
          },
          required: [
            "title",
            "body",
            "branch"
          ],
          additionalProperties: false
        }
      }
    },

    async execute({ args }) {
      return {
        configured: false,
        action: "create_pull_request",
        title: args.title,
        branch: args.branch,
        message:
          "GitHub API integration is not configured yet."
      };
    }
  },

  web_search: {
    permission: "web.search",

    definition: {
      type: "function",
      function: {
        name: "web_search",
        description:
          "Search the configured web-search provider.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string"
            }
          },
          required: ["query"],
          additionalProperties: false
        }
      }
    },

    async execute({ args, agent }) {
      const query =
        String(args.query ?? "").trim();

      if (!query) {
        throw new Error(
          "Search query is required."
        );
      }

      if (!agent.environment?.WEB_SEARCH_URL) {
        return {
          configured: false,
          query,
          message:
            "Web search provider is not configured."
        };
      }

      const url =
        `${agent.environment.WEB_SEARCH_URL}` +
        `?q=${encodeURIComponent(query)}`;

      const response =
        await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Search provider returned ${response.status}.`
        );
      }

      return await response.json();
    }
  },

  web_fetch: {
    permission: "web.fetch",

    definition: {
      type: "function",
      function: {
        name: "web_fetch",
        description:
          "Fetch a public HTTPS webpage.",
        parameters: {
          type: "object",
          properties: {
            url: {
              type: "string"
            }
          },
          required: ["url"],
          additionalProperties: false
        }
      }
    },

    async execute({ args }) {
      const url =
        String(args.url ?? "").trim();

      assertHttpsUrl(url);

      const response =
        await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Page returned ${response.status}.`
        );
      }

      const content =
        await response.text();

      return {
        url,
        status: response.status,
        content: content.slice(0, 20000)
      };
    }
  },

  save_lead: {
    permission: "leads.write",

    definition: {
      type: "function",
      function: {
        name: "save_lead",
        description:
          "Save a qualified business prospect.",
        parameters: {
          type: "object",
          properties: {
            company: {
              type: "string"
            },
            website: {
              type: "string"
            },
            reason: {
              type: "string"
            },
            score: {
              type: "number",
              minimum: 0,
              maximum: 100
            }
          },
          required: [
            "company",
            "reason",
            "score"
          ],
          additionalProperties: false
        }
      }
    },

    async execute({ args, agent }) {
      if (!agent.environment?.DB) {
        return {
          configured: false,
          message:
            "Database is not configured."
        };
      }

      const now =
        new Date().toISOString();

      await agent.environment.DB
        .prepare(
          `
          INSERT INTO leads
          (company, website, reason, score, created_by, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
          `
        )
        .bind(
          args.company,
          args.website ?? null,
          args.reason,
          Number(args.score),
          agent.id,
          now
        )
        .run();

      return {
        saved: true,
        company: args.company,
        score: Number(args.score)
      };
    }
  },

  get_campaign_stats: {
    permission: "analytics.read",

    definition: {
      type: "function",
      function: {
        name: "get_campaign_stats",
        description:
          "Retrieve campaign performance metrics.",
        parameters: {
          type: "object",
          properties: {
            campaignId: {
              type: "string"
            }
          },
          required: ["campaignId"],
          additionalProperties: false
        }
      }
    },

    async execute({ args, agent }) {
      if (!agent.environment?.DB) {
        return {
          configured: false
        };
      }

      const result =
        await agent.environment.DB
          .prepare(
            `
            SELECT *
            FROM campaigns
            WHERE id = ?
            `
          )
          .bind(args.campaignId)
          .first();

      return result ?? {
        found: false
      };
    }
  },

  get_users: {
    permission: "analytics.read",

    definition: {
      type: "function",
      function: {
        name: "get_users",
        description:
          "Retrieve user metrics for a date range.",
        parameters: {
          type: "object",
          properties: {
            from: { type: "string" },
            to: { type: "string" }
          },
          required: ["from", "to"],
          additionalProperties: false
        }
      }
    },

    async execute({ args, agent }) {
      if (!agent.environment?.DB) {
        return {
          configured: false
        };
      }

      const result =
        await agent.environment.DB
          .prepare(
            `
            SELECT COUNT(*) AS total
            FROM users
            WHERE created_at >= ?
              AND created_at <= ?
            `
          )
          .bind(args.from, args.to)
          .first();

      return {
        from: args.from,
        to: args.to,
        total: Number(
          result?.total ?? 0
        )
      };
    }
  },

  get_audits: {
    permission: "analytics.read",

    definition: {
      type: "function",
      function: {
        name: "get_audits",
        description:
          "Retrieve audit metrics for a date range.",
        parameters: {
          type: "object",
          properties: {
            from: { type: "string" },
            to: { type: "string" }
          },
          required: ["from", "to"],
          additionalProperties: false
        }
      }
    },

    async execute({ args, agent }) {
      if (!agent.environment?.DB) {
        return {
          configured: false
        };
      }

      const result =
        await agent.environment.DB
          .prepare(
            `
            SELECT COUNT(*) AS total
            FROM audits
            WHERE created_at >= ?
              AND created_at <= ?
            `
          )
          .bind(args.from, args.to)
          .first();

      return {
        from: args.from,
        to: args.to,
        total: Number(
          result?.total ?? 0
        )
      };
    }
  },

  get_revenue: {
    permission: "analytics.read",

    definition: {
      type: "function",
      function: {
        name: "get_revenue",
        description:
          "Retrieve revenue for a period.",
        parameters: {
          type: "object",
          properties: {
            from: { type: "string" },
            to: { type: "string" }
          },
          required: ["from", "to"],
          additionalProperties: false
        }
      }
    },

    async execute({ args, agent }) {
      if (!agent.environment?.DB) {
        return {
          configured: false
        };
      }

      const result =
        await agent.environment.DB
          .prepare(
            `
            SELECT COALESCE(SUM(amount), 0) AS revenue
            FROM payments
            WHERE created_at >= ?
              AND created_at <= ?
              AND status = 'paid'
            `
          )
          .bind(args.from, args.to)
          .first();

      return {
        from: args.from,
        to: args.to,
        revenue:
          Number(
            result?.revenue ?? 0
          )
      };
    }
  },

  get_customer: {
    permission: "database.read",

    definition: {
      type: "function",
      function: {
        name: "get_customer",
        description:
          "Retrieve limited customer information.",
        parameters: {
          type: "object",
          properties: {
            customerId: {
              type: "string"
            }
          },
          required: ["customerId"],
          additionalProperties: false
        }
      }
    },

    async execute({ args, agent }) {
      if (!agent.environment?.DB) {
        return {
          configured: false
        };
      }

      const result =
        await agent.environment.DB
          .prepare(
            `
            SELECT
              id,
              name,
              email,
              plan,
              created_at
            FROM users
            WHERE id = ?
            `
          )
          .bind(args.customerId)
          .first();

      return result ?? {
        found: false
      };
    }
  },

  get_customer_audit: {
    permission: "database.read",

    definition: {
      type: "function",
      function: {
        name: "get_customer_audit",
        description:
          "Retrieve a customer's audit result.",
        parameters: {
          type: "object",
          properties: {
            auditId: {
              type: "string"
            }
          },
          required: ["auditId"],
          additionalProperties: false
        }
      }
    },

    async execute({ args, agent }) {
      if (!agent.environment?.DB) {
        return {
          configured: false
        };
      }

      const result =
        await agent.environment.DB
          .prepare(
            `
            SELECT *
            FROM audits
            WHERE id = ?
            `
          )
          .bind(args.auditId)
          .first();

      return result ?? {
        found: false
      };
    }
  },

  create_support_ticket: {
    permission: "database.write",

    definition: {
      type: "function",
      function: {
        name: "create_support_ticket",
        description:
          "Create a customer support ticket.",
        parameters: {
          type: "object",
          properties: {
            customerId: {
              type: "string"
            },
            subject: {
              type: "string"
            },
            description: {
              type: "string"
            },
            priority: {
              type: "string",
              enum: [
                "low",
                "normal",
                "high",
                "critical"
              ]
            }
          },
          required: [
            "customerId",
            "subject",
            "description"
          ],
          additionalProperties: false
        }
      }
    },

    async execute({ args, agent }) {
      if (!agent.environment?.DB) {
        return {
          configured: false
        };
      }

      const id =
        crypto.randomUUID();

      await agent.environment.DB
        .prepare(
          `
          INSERT INTO support_tickets
          (id, customer_id, subject, description, priority, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
          `
        )
        .bind(
          id,
          args.customerId,
          args.subject,
          args.description,
          args.priority ?? "normal",
          new Date().toISOString()
        )
        .run();

      return {
        created: true,
        ticketId: id
      };
    }
  }
};
