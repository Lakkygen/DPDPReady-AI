// src/config/permissions.js

/**
 * DPDPReady AI — Permission Profiles
 *
 * Principle:
 * - deny by default
 * - grant only what an agent needs
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
      deploy: false,
      rollback: false
    },

    database: {
      read: true,
      write: false,
      admin: false
    },

    web: {
      search: true,
      fetch: true
    },

    analytics: {
      read: true
    },

    leads: {
      read: true,
      write: false
    },

    communication: {
      telegram: true,
      email: false
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
      read: false,
      write: false,
      admin: false
    },

    web: {
      search: true,
      fetch: true
    },

    analytics: {
      read: true
    },

    leads: {
      read: true,
      write: true
    },

    communication: {
      telegram: true,
      email: true
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
      read: false,
      write: false,
      admin: false
    },

    web: {
      search: true,
      fetch: true
    },

    analytics: {
      read: false
    },

    leads: {
      read: true,
      write: false
    },

    communication: {
      telegram: true,
      email: false
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
      write: false,
      admin: false
    },

    web: {
      search: false,
      fetch: false
    },

    analytics: {
      read: true
    },

    leads: {
      read: true,
      write: false
    },

    communication: {
      telegram: true,
      email: false
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
      write: false,
      admin: false
    },

    web: {
      search: false,
      fetch: false
    },

    analytics: {
      read: false
    },

    leads: {
      read: false,
      write: false
    },

    communication: {
      telegram: true,
      email: true
    }
  }
};

/**
 * Safely checks whether an agent has a permission.
 *
 * Example:
 * hasPermission("ops", "github.write")
 */
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
