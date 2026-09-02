CREATE TABLE IF NOT EXISTS agent_memory (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    scope TEXT NOT NULL,
    memory_key TEXT NOT NULL,
    memory_value TEXT NOT NULL,
    importance INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,

    FOREIGN KEY (agent_id)
      REFERENCES agents(id)
);

CREATE INDEX IF NOT EXISTS idx_agent_memory_agent
ON agent_memory(agent_id);

CREATE INDEX IF NOT EXISTS idx_agent_memory_importance
ON agent_memory(importance);
