-- migrations/009_team_memory.sql

-- Shared long-term company/team memory.
-- This is intentionally separate from private agent memory.

CREATE TABLE IF NOT EXISTS company_memory (
  id TEXT PRIMARY KEY,
  memory_key TEXT NOT NULL,
  memory_value TEXT NOT NULL,
  importance INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS
  idx_company_memory_importance
ON company_memory(importance);

CREATE INDEX IF NOT EXISTS
  idx_company_memory_created_at
ON company_memory(created_at);

CREATE INDEX IF NOT EXISTS
  idx_company_memory_key
ON company_memory(memory_key);


-- Persistent Telegram/team conversation memory.
-- This is useful for recent conversation history,
-- incidents, findings and decisions.

CREATE TABLE IF NOT EXISTS team_memory (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  memory_type TEXT NOT NULL DEFAULT 'conversation',
  agent_id TEXT,
  agent_name TEXT,
  topic TEXT,
  content TEXT NOT NULL,
  importance INTEGER NOT NULL DEFAULT 1,
  round INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS
  idx_team_memory_chat
ON team_memory(chat_id);

CREATE INDEX IF NOT EXISTS
  idx_team_memory_chat_created
ON team_memory(chat_id, created_at DESC);

CREATE INDEX IF NOT EXISTS
  idx_team_memory_importance
ON team_memory(chat_id, importance DESC);

CREATE INDEX IF NOT EXISTS
  idx_team_memory_type
ON team_memory(chat_id, memory_type);
