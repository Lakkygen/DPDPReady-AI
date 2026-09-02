CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to TEXT NOT NULL,
    created_by TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal',
    status TEXT NOT NULL DEFAULT 'queued',
    metadata TEXT,
    result TEXT,
    error TEXT,
    created_at TEXT NOT NULL,
    started_at TEXT,
    completed_at TEXT,

    FOREIGN KEY (assigned_to)
      REFERENCES agents(id)
);

CREATE INDEX IF NOT EXISTS idx_tasks_status
ON tasks(status);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned
ON tasks(assigned_to);
