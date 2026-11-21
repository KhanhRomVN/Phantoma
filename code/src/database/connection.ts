import fs from 'fs';
import path from 'path';
import BetterSqlite3 from 'better-sqlite3';

const SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  logo TEXT,
  name TEXT NOT NULL,
  repository_url TEXT,
  group_id TEXT REFERENCES groups(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_open INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS worktrees (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  path TEXT NOT NULL UNIQUE,
  branch TEXT NOT NULL DEFAULT '',
  visible BOOLEAN NOT NULL DEFAULT 1,
  search_term TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS scopes (
  id TEXT PRIMARY KEY,
  worktree_id TEXT NOT NULL REFERENCES worktrees(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_worktrees_project ON worktrees (project_id);
CREATE INDEX IF NOT EXISTS idx_projects_group ON projects (group_id);
CREATE INDEX IF NOT EXISTS idx_scopes_worktree ON scopes (worktree_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_scopes_worktree_path ON scopes (worktree_id, path);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  worktree_id TEXT NOT NULL UNIQUE REFERENCES worktrees(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New session',
  layout TEXT,
  active_panel_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS workspace_panels (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  content TEXT,
  file_path TEXT,
  cwd TEXT,
  provider_id TEXT,
  zencli_conversation_id TEXT,
  zencli_last_active_at INTEGER,
  agent_conversation_id TEXT,
  agent_title TEXT,
  workflow_agent_id TEXT,
  pinned INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_workspace_panels_session ON workspace_panels (session_id);
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  session_id TEXT,
  branch_name TEXT,
  start_date INTEGER,
  start_time TEXT,
  end_date INTEGER,
  end_time TEXT,
  archived INTEGER NOT NULL DEFAULT 0,
  workflow_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS task_dependencies (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, depends_on_id)
);
CREATE TABLE IF NOT EXISTS task_tags (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  color TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS task_checklist (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS task_attachments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  kind TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS workflows (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL UNIQUE REFERENCES tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks (project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_archived ON tasks (archived);
CREATE INDEX IF NOT EXISTS idx_task_tags_task ON task_tags (task_id);
CREATE INDEX IF NOT EXISTS idx_task_checklist_task ON task_checklist (task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON task_attachments (task_id);`;

let db: BetterSqlite3.Database | null = null;

export function init(dbPath: string): void {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new BetterSqlite3(dbPath);
  sqlite.pragma('journal_mode = DELETE');
  sqlite.pragma('foreign_keys = ON');
  const projectCols = sqlite.prepare('PRAGMA table_info(projects)').all() as { name: string }[];
  if (projectCols.some((c) => c.name === 'repo_url')) {
    sqlite.exec('ALTER TABLE projects RENAME COLUMN repo_url TO repository_url');
  }
  if (projectCols.length > 0 && !projectCols.some((c) => c.name === 'group_id')) {
    sqlite.exec('ALTER TABLE projects ADD COLUMN group_id TEXT REFERENCES groups(id) ON DELETE SET NULL');
  }
  const worktreeCols = sqlite.prepare('PRAGMA table_info(worktrees)').all() as { name: string }[];
  if (worktreeCols.some((c) => c.name === 'group_id')) {
    sqlite.pragma('foreign_keys = OFF');
    sqlite.transaction(() => {
      sqlite.exec(`UPDATE projects SET group_id = (SELECT w.group_id FROM worktrees w WHERE w.project_id = projects.id AND w.group_id IS NOT NULL LIMIT 1) WHERE group_id IS NULL;
DROP INDEX IF EXISTS idx_worktrees_group;
CREATE TABLE worktrees_new (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  path TEXT NOT NULL UNIQUE,
  branch TEXT NOT NULL DEFAULT '',
  visible BOOLEAN NOT NULL DEFAULT 1,
  search_term TEXT NOT NULL DEFAULT ''
);
INSERT INTO worktrees_new (id, project_id, path, branch, visible, search_term) SELECT id, project_id, path, branch, visible, search_term FROM worktrees;
DROP TABLE worktrees;
ALTER TABLE worktrees_new RENAME TO worktrees;`);
    })();
    sqlite.pragma('foreign_keys = ON');
  }
  const sessionCols = sqlite.prepare('PRAGMA table_info(sessions)').all() as { name: string }[];
  if (sessionCols.some((c) => c.name === 'sort_order')) {
    sqlite.transaction(() => {
      sqlite.exec(`CREATE TABLE sessions_new (
  id TEXT PRIMARY KEY,
  worktree_id TEXT NOT NULL UNIQUE REFERENCES worktrees(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New session',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
INSERT INTO sessions_new (id, worktree_id, title, created_at, updated_at)
SELECT s.id, s.worktree_id, s.title, s.created_at, s.updated_at FROM sessions s
WHERE s.rowid = (SELECT s2.rowid FROM sessions s2 WHERE s2.worktree_id = s.worktree_id ORDER BY s2.sort_order DESC, s2.created_at DESC LIMIT 1);
DROP TABLE sessions;
ALTER TABLE sessions_new RENAME TO sessions;`);
    })();
  }
  const sessionColsNow = sqlite.prepare('PRAGMA table_info(sessions)').all() as { name: string }[];
  if (sessionColsNow.length > 0 && !sessionColsNow.some((c) => c.name === 'layout')) {
    sqlite.exec('ALTER TABLE sessions ADD COLUMN layout TEXT');
    sqlite.exec('ALTER TABLE sessions ADD COLUMN active_panel_id TEXT');
  }
  sqlite.exec(SCHEMA_SQL);
  db = sqlite;
}

export function getDb(): BetterSqlite3.Database {
  if (!db) throw new Error('database not initialized — call init() first');
  return db;
}

export function close(): void {
  if (db) {
    db.close();
    db = null;
  }
}