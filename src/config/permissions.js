// src/config/permissions.js

/**
 * DPDPReady AI — Permission Profiles
 *
 * Principle:
 * - deny by default
 * - grant only what an agent needs
 * - permissions are checked by ToolExecutor
 */

export const PERMISSIONS = {
  ops: {
    website: {
      read: true,
      write: false
    },

    github: {
      read: true,
      write: true,
      createBranch: true,
      createPR: true
    },

    deployment: {
      read: true,
      restart: true,
      deploy: true,
      rollback: true
    },

    database: {
      read: true,
      write: true,
      admin: false
    },

    web: {
      search: true,
      fetch: true
    },

    browser: {
      read: true,
      use: true
    },

    code: {
      read: true,
      write: true
    },

    analytics: {
      read: true
    },

    leads: {
      read: true,
      write: false
    },

    campaigns: {
      read: true,
      write: false
    },

    customers: {
      read: true,
      write: false
    },

    tickets: {
      read: true,
      write: true
    },

    research: {
      read: true,
      write: true,
      alerts: true,
      citations: true
    },

    experiments: {
      read: true,
      write: false
    },

    metrics: {
      read: true
    },

    communication: {
      telegram: true,
      email: false,
      send: true
    }
  },

  growth: {
    website: {
      read: true,
      write: false
    },

    github: {
      read: false,
      write: false,
      createBranch: false,
      createPR: false
    },

    deployment: {
      read: false,
      restart: false,
      deploy: false,
      rollback: false
    },

    database: {
      read: true,
      write: true,
      admin: false
    },

    web: {
      search: true,
      fetch: true
    },

    browser: {
      read: false,
      use: false
    },

    code: {
      read: false,
      write: false
    },

    analytics: {
      read: true
    },

    leads: {
      read: true,
      write: true
    },

    campaigns: {
      read: true,
      write: true
    },

    customers: {
      read: true,
      write: false
    },

    tickets: {
      read: false,
      write: false
    },

    research: {
      read: true,
      write: false,
      alerts: false,
      citations: false
    },

    experiments: {
      read: true,
      write: false
    },

    metrics: {
      read: true
    },

    communication: {
      telegram: true,
      email: true,
      send: true
    }
  },

  research: {
    website: {
      read: true,
      write: false
    },

    github: {
      read: false,
      write: false,
      createBranch: false,
      createPR: false
    },

    deployment: {
      read: false,
      restart: false,
      deploy: false,
      rollback: false
    },

    database: {
      read: true,
      write: true,
      admin: false
    },

    web: {
      search: true,
      fetch: true
    },

    browser: {
      read: false,
      use: false
    },

    code: {
      read: false,
      write: false
    },

    analytics: {
      read: false
    },

    leads: {
      read: true,
      write: false
    },

    campaigns: {
      read: false,
      write: false
    },

    customers: {
      read: false,
      write: false
    },

    tickets: {
      read: false,
      write: false
    },

    research: {
      read: true,
      write: true,
      alerts: true,
      citations: true
    },

    experiments: {
      read: false,
      write: false
    },

    metrics: {
      read: false
    },

    communication: {
      telegram: true,
      email: false,
      send: true
    }
  },

  analyst: {
    website: {
      read: true,
      write: false
    },

    github: {
      read: false,
      write: false,
      createBranch: false,
      createPR: false
    },

    deployment: {
      read: true,
      restart: false,
      deploy: false,
      rollback: false
    },

    database: {
      read: true,
      write: true,
      admin: false
    },

    web: {
      search: false,
      fetch: false
    },

    browser: {
      read: false,
      use: false
    },

    code: {
      read: false,
      write: false
    },

    analytics: {
      read: true
    },

    leads: {
      read: true,
      write: false
    },

    campaigns: {
      read: true,
      write: false
    },

    customers: {
      read: true,
      write: false
    },

    tickets: {
      read: true,
      write: false
    },

    research: {
      read: false,
      write: false,
      alerts: false,
      citations: false
    },

    experiments: {
      read: true,
      write: true
    },

    metrics: {
      read: true
    },

    communication: {
      telegram: true,
      email: false,
      send: true
    }
  },

  support: {
    website: {
      read: true,
      write: false
    },

    github: {
      read: false,
      write: false,
      createBranch: false,
      createPR: false
    },

    deployment: {
      read: false,
      restart: false,
      deploy: false,
      rollback: false
    },

    database: {
      read: true,
      write: true,
      admin: false
    },

    web: {
      search: false,
      fetch: false
    },

    browser: {
      read: false,
      use: false
    },

    code: {
      read: false,
      write: false
    },

    analytics: {
      read: false
    },

    leads: {
      read: false,
      write: false
    },

    campaigns: {
      read: false,
      write: false
    },

    customers: {
      read: true,
      write: true
    },

    tickets: {
      read: true,
      write: true
    },

    research: {
      read: false,
      write: false,
      alerts: false,
      citations: false
    },

    experiments: {
      read: false,
      write: false
    },

    metrics: {
      read: false
    },

    communication: {
      telegram: true,
      email: true,
      send: true
    }
  }
};

export function hasPermission(agentId, path) {
  const profile = PERMISSIONS[agentId];

  if (!profile || typeof path !== "string") {
    return false;
  }

  const parts = path.split(".");
  let current = profile;

  for (const part of parts) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== "object" ||
      !(part in current)
    ) {
      return false;
    }

    current = current[part];
  }

  return current === true;
}

export function requirePermission(agentId, path) {
  if (!hasPermission(agentId, path)) {
    throw new Error(
      `Permission denied: agent="${agentId}" permission="${path}"`
    );
  }

  return true;
}

export function getPermissions(agentId) {
  return PERMISSIONS[agentId] ?? {};
}
