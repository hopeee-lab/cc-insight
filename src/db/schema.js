export const CREATE_TABLES = `
  CREATE TABLE IF NOT EXISTS sessions (
    id            TEXT PRIMARY KEY,
    source        TEXT NOT NULL DEFAULT 'claude-code',
    start_time    INTEGER NOT NULL,
    end_time      INTEGER,
    duration_sec  INTEGER,
    project_path  TEXT,
    message_count INTEGER DEFAULT 0,
    tool_use_count INTEGER DEFAULT 0,
    jsonl_file    TEXT,
    topic              TEXT,
    topic_keywords     TEXT,
    first_user_msg     TEXT
  );

  CREATE TABLE IF NOT EXISTS tools (
    id                  TEXT PRIMARY KEY,
    name                TEXT NOT NULL,
    type                TEXT NOT NULL,
    subtype             TEXT,
    description         TEXT,
    source_type         TEXT DEFAULT 'downloaded',
    source_url          TEXT,
    installed_at        INTEGER,
    updated_at          INTEGER,
    security_scan_result TEXT DEFAULT 'unscanned'
  );

  CREATE TABLE IF NOT EXISTS tool_invocations (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    tool_name  TEXT NOT NULL,
    invoked_at INTEGER NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
  );

  CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_start ON sessions(start_time);
  CREATE INDEX IF NOT EXISTS idx_invocations_tool ON tool_invocations(tool_name);
  CREATE INDEX IF NOT EXISTS idx_invocations_session ON tool_invocations(session_id);
`
