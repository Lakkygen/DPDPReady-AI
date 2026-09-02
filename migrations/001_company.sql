CREATE TABLE IF NOT EXISTS company_memory (
    id TEXT PRIMARY KEY,
    memory_key TEXT NOT NULL,
    memory_value TEXT NOT NULL,
    importance INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS decisions (
    id TEXT PRIMARY KEY,
    decision TEXT NOT NULL,
    made_by TEXT NOT NULL,
    reason TEXT,
    metadata TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company TEXT NOT NULL,
    website TEXT,
    reason TEXT,
    score REAL,
    created_by TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT,
    leads INTEGER DEFAULT 0,
    replies INTEGER DEFAULT 0,
    customers INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);
