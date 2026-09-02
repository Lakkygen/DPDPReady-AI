CREATE TABLE IF NOT EXISTS approvals (
    id TEXT PRIMARY KEY,
    requested_by TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT,
    metadata TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    resolved_by TEXT,
    created_at TEXT NOT NULL,
    resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_approvals_status
ON approvals(status);
