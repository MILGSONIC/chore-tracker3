CREATE TABLE IF NOT EXISTS households (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  title TEXT NOT NULL,
  reward REAL NOT NULL,
  difficulty TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  scope TEXT NOT NULL,
  assignee_id TEXT,
  completed_by_id TEXT,
  label TEXT DEFAULT '',
  source TEXT NOT NULL DEFAULT 'parent-dashboard',
  created_by TEXT NOT NULL DEFAULT 'website-parent',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS history (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  task_id TEXT,
  title TEXT NOT NULL,
  reward REAL NOT NULL,
  profile_id TEXT,
  profile_name TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'website-parent',
  created_by TEXT NOT NULL DEFAULT 'website-parent'
);

CREATE INDEX IF NOT EXISTS idx_tasks_household_created_at ON tasks(household_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_household_timestamp ON history(household_id, timestamp DESC);
