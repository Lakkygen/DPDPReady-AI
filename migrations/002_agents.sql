CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    department TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL
);

INSERT OR IGNORE INTO agents
(id, name, title, department, status, created_at)
VALUES
(
    'ops',
    'Marcus',
    'Operations Director',
    'Operations',
    'active',
    datetime('now')
);

INSERT OR IGNORE INTO agents
(id, name, title, department, status, created_at)
VALUES
(
    'growth',
    'Amara',
    'Head of Growth',
    'Growth',
    'active',
    datetime('now')
);

INSERT OR IGNORE INTO agents
(id, name, title, department, status, created_at)
VALUES
(
    'research',
    'David',
    'Research Director',
    'Research',
    'active',
    datetime('now')
);

INSERT OR IGNORE INTO agents
(id, name, title, department, status, created_at)
VALUES
(
    'analyst',
    'Sofia',
    'Business Analyst',
    'Analytics',
    'active',
    datetime('now')
);

INSERT OR IGNORE INTO agents
(id, name, title, department, status, created_at)
VALUES
(
    'support',
    'Maya',
    'Customer Success Lead',
    'Customer Success',
    'active',
    datetime('now')
);
