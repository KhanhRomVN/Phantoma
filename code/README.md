# Code Server

Backend service cho module Code của Phantoma, quản lý projects, worktrees, scopes, tasks và workflows.

## Architecture

```
code/
├── src/
│   ├── config/           # Server configuration
│   ├── database/         # SQLite connection & schema
│   ├── domain/           # Mappers (DB rows → TypeScript types)
│   ├── repositories/     # Data access layer (SQL queries)
│   ├── services/         # Business logic
│   ├── routes/           # API endpoints
│   ├── utils/            # Helpers
│   └── index.ts          # Entry point
├── SCHEMA.md             # Database schema documentation
└── package.json
```

## Database Schema

See [SCHEMA.md](./SCHEMA.md) for full schema details.

**Main tables:**
- `projects` - Project metadata (name, logo, repo URL)
- `groups` - Project/worktree grouping
- `worktrees` - Git worktrees per project
- `scopes` - File/folder access control per worktree
- `tasks` - Task management (title, status, priority, dates)
- `task_dependencies` - Task dependency graph
- `task_tags`, `task_checklist`, `task_attachments` - Task details
- `workflows` - Markdown workflow documents per task

## API Endpoints

### Projects
- `GET /projects` - List all projects with worktrees
- `POST /projects` - Create new project
- `GET /projects/:id` - Get project details
- `PUT /projects/:id` - Update project
- `DELETE /projects/:id` - Delete project
- `PUT /projects` - Bulk save projects (sync all)

### Groups
- `GET /groups` - List all groups
- `POST /groups` - Create group
- `GET /groups/:id` - Get group
- `PUT /groups/:id` - Update group
- `DELETE /groups/:id` - Delete group

### Worktrees
- `GET /projects/:id/worktrees` - List worktrees of project
- `POST /projects/:id/worktrees` - Add worktree
- `GET /projects/:id/worktrees/:worktreeId` - Get worktree
- `PUT /projects/:id/worktrees/:worktreeId` - Update worktree
- `DELETE /projects/:id/worktrees/:worktreeId` - Delete worktree

### Scopes
- `GET /worktrees/:worktreeId/scopes` - List scopes
- `PUT /worktrees/:worktreeId/scopes` - Set scopes (replace all)
- `GET /worktrees/:worktreeId/scopes/:scopeId` - Get scope
- `DELETE /worktrees/:worktreeId/scopes/:scopeId` - Delete scope

### Tasks
- `GET /projects/:projectId/tasks` - List tasks of project
- `POST /projects/:projectId/tasks` - Create task
- `GET /projects/:projectId/tasks/:taskId` - Get task with details
- `PUT /projects/:projectId/tasks/:taskId` - Update task
- `DELETE /projects/:projectId/tasks/:taskId` - Delete task

### Workflows
- `GET /tasks/:taskId/workflow` - Get workflow
- `POST /tasks/:taskId/workflow` - Create workflow
- `PUT /tasks/:taskId/workflow` - Update workflow (replace pattern)

## Development

```bash
# Install dependencies
npm install

# Run dev server (hot reload)
npm run dev

# Build for production
npm run build

# Type check
npx tsc --noEmit
```

## Environment Variables

- `CODE_PORT` - Server port (default: 3001)
- `CODE_DATA_DIR` - Data directory (default: `~/.phantoma/code`)

## Data Storage

All data stored in `~/.phantoma/code/code.sql` (SQLite database).

No per-project folders — everything centralized in one database file.

## Migration from JSON

Current Phantoma stores tasks in JSON files per project (`~/.phantoma/code/<slug>/tasks.json`).

Migration script needed to:
1. Read all existing `tasks.json` files
2. Map project paths to project IDs
3. Insert tasks into SQLite with relationships
4. Convert workflows from markdown files to database rows

## Notes

- Foreign keys enabled: `PRAGMA foreign_keys = ON`
- Cascade deletes: deleting project removes all worktrees, scopes, tasks
- Transactions used for multi-table writes
- All timestamps in milliseconds (JavaScript `Date.now()`)