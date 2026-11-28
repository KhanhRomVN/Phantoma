# Kế hoạch Restructure + Cleancode (Server + UI)

> Giai đoạn 1 — Lập kế hoạch. File này do Planner tạo; Planner **không** sửa bất kỳ file code nào.
> Phạm vi: `code/src/**` (server) và `src/renderer/src/modules/Code/**` (UI). Mọi nhận định đều kèm `file:dòng` đã đọc thật; điều chưa xác minh nằm ở mục 7.
> Nguồn quét: `code.zip` (server, 56 file) và `Code.zip` (UI, 525 file gồm 406 file `.ts/.tsx`). Ngày quét: 2026-11-22.

## 0. Tóm tắt

- **Hiện trạng server:** 56 file / 5.070 dòng, 105 endpoint. Phân tầng `routes → services → repositories` đúng hướng, nhưng: bind mọi interface + CORS `*` + không xác thực trong khi có endpoint ghi/xóa file và `GET /fs/read-file?trusted=true` bỏ qua cả `withinProject` lẫn `allowSensitive` (V01); `search.route` không qua `safePath` (V02); `utils/guard` import ngược `repositories` (V03); logic "default branch" có **hai thuật toán** khác nhau (V04); nhóm git tách 7 file thiếu ranh giới; payload lỗi `{error}` nằm trong `success:true` (V06); `PUT /projects` xóa mọi project không có trong payload (V09).
- **Hiện trạng UI:** 406 file / ≈65,2k dòng. 14 file > 800 dòng, 47 file > 300 dòng (ngoài prompts/templates); `ProjectPanel.tsx` 3.446 dòng với **một** component ≈2.990 dòng (118 hook/handler cấp 1), `FileExplore.tsx` 2.467 dòng. 29 file gọi `window.api` ngoài `*.handler.ts`; 21 file bị feature khác import sâu; 9 file mồ côi (≈1,2k dòng); template `mobile/` và `website/` **giống hệt từng byte** (6 file, 718 dòng); phân loại branch local/remote-only tính ở UI với 3 request/project (V16).
- **Đồng bộ hai phía:** `codeApi` có 93 phương thức, 18 phương thức không có nơi gọi; 8 endpoint server không có `codeApi` tương ứng (5 `/groups*`, `GET /sessions`, `GET /sessions/:id`, `GET /projects/:id/worktrees/:worktreeId`); type response bị khai báo lặp (V12, V24).
- **Mục tiêu:** server có hạ tầng HTTP/process dùng chung, bảo mật mặc định an toàn, git chia theo trách nhiệm; UI chia theo `features/<name>/{components,hooks,stores,services,utils,types}`, component chỉ render, IPC đi qua lớp bọc có kiểu, type request/response có **một** nguồn sự thật, endpoint theo use-case màn hình. Giữ nguyên hành vi và giao diện.
- **Quy mô:** 7 phase, ≈130 task (mỗi task ≤ 5 file ghi, commit riêng, build được, server + UI luôn khớp nhau ở cuối phase).
- **Điểm cần quyết định sớm (xem mục 7):** (1) xác nhận `/groups*` thật sự chết; (2) kênh phát token cho server (cần sửa `src/main`, ngoài phạm vi); (3) hợp nhất hai thuật toán default-branch.

## 1. Hiện trạng

### 1.1 Cây thư mục server (`code/src`, 56 file, 5.070 dòng — đếm bằng `wc -l`)

```
src/config/  (34 dòng)
     34  server.config.ts
src/database/  (301 dòng)
    203  connection.ts
     98  integrity.ts
src/domain/  (169 dòng)
    169  mappers.ts
src/  (53 dòng)
     53  index.ts
src/repositories/  (649 dòng)
     66  group.repository.ts
     68  project.repository.ts
     43  scope.repository.ts
     58  session.repository.ts
     33  task-attachment.repository.ts
     50  task-checklist.repository.ts
     25  task-dependency.repository.ts
     25  task-tag.repository.ts
     97  task.repository.ts
     35  workflow.repository.ts
     63  workspace-panel.repository.ts
     86  worktree.repository.ts
src/routes/  (911 dòng)
    176  fs.route.ts
    343  git.route.ts
     19  group.route.ts
    114  pr.route.ts
     54  project.route.ts
     24  routes.ts
     34  scope.route.ts
     60  search.route.ts
     23  session.route.ts
     64  task.route.ts
src/services/  (2885 dòng)
    281  fs-read.service.ts
     88  fs.service.ts
    179  git-explorer.service.ts
     25  git-extra.service.ts
    526  git-read.service.ts
     89  git-remote.service.ts
     24  git-runner.ts
    191  git-write.service.ts
    127  git.service.ts
     47  group.service.ts
    296  image.service.ts
    251  pr.service.ts
    147  project.service.ts
     80  scope.service.ts
    145  search.service.ts
     96  session.service.ts
    187  task.service.ts
     36  workflow.service.ts
     70  worktree.service.ts
src/utils/  (111 dòng)
     69  guard.ts
     42  http.ts
```

### 1.2 Cây thư mục UI `modules/Code` (406 file ts/tsx ≈ 65,2k dòng; +3 `.md`, +4 `.png`)

Tổng hợp theo nhóm (agent/prompts, agent/tools, design/templates là dữ liệu/mô tả, liệt kê gộp):

| Nhóm                        | File |  Dòng |
| --------------------------- | ---: | ----: |
| `(root)`                    |    5 |   722 |
| `agent/(root)`              |    1 |   192 |
| `agent/components`          |    1 |   106 |
| `agent/prompts`             |   72 |  6809 |
| `agent/services`            |   11 |   572 |
| `agent/stores`              |    1 |   187 |
| `agent/tools`               |  120 |  7846 |
| `app/layout`                |    5 |  2787 |
| `app/stores`                |    1 |    63 |
| `features/account`          |    2 |    19 |
| `features/debug`            |    3 |   935 |
| `features/design`           |    6 |   604 |
| `features/design/templates` |   18 |  2416 |
| `features/file-explorer`    |    8 |  3289 |
| `features/git`              |   24 |  8320 |
| `features/projects`         |   24 | 10414 |
| `features/pull-request`     |   16 |  1950 |
| `features/search`           |    5 |  1179 |
| `features/settings`         |    4 |   641 |
| `features/skills`           |    2 |    30 |
| `features/tasks`            |   14 |  3186 |
| `features/workflow`         |   12 |  1248 |
| `features/workspace`        |   19 |  6229 |
| `shared/api`                |    2 |   663 |
| `shared/components`         |    2 |   296 |
| `shared/constants`          |    4 |   287 |
| `shared/hooks`              |    1 |    86 |
| `shared/services`           |    6 |  1001 |
| `shared/stores`             |    3 |  1540 |
| `shared/types`              |    5 |   210 |
| `shared/utils`              |    9 |  1578 |

Chi tiết từng file (trừ `agent/prompts/**`, `agent/tools/**`, `features/design/templates/**`; dòng đầu = số dòng):

```
  238  Code.tsx
    5  CodeModule.ts
  181  CodeSkeleton.tsx
  106  agent/components/AgentMessageBox/AgentMessageBox.tsx
   44  agent/services/agent-panel.service.ts
   44  agent/services/file-lock.service.ts
   19  agent/services/orchestrator-task-context.service.ts
   59  agent/services/raw-content-diff.ts
   67  agent/services/tool-behaviors.ts
  122  agent/services/tool-display-formatters.ts
   79  agent/services/tool-mutations.ts
   24  agent/services/tool-output-formatter.ts
   32  agent/services/tool-output-transformer.ts
   28  agent/services/tool-status-checker.ts
   50  agent/services/workflow.service.ts
  187  agent/stores/workflow.store.ts
  192  agent/tag-registry.ts
  537  app/layout/ActivityPanel.tsx
  591  app/layout/ContentPanel.tsx
  973  app/layout/FooterBar.tsx
  663  app/layout/Headerbar.tsx
   20  app/layout/NoSessionEmpty.tsx
   62  app/stores/activity-panel.store.ts
  277  code.module.ts
   18  features/account/components/Account.tsx
    1  features/account/index.ts
  404  features/debug/components/Debug.tsx
    1  features/debug/index.ts
  529  features/debug/stores/debug.store.ts
  103  features/design/components/Design.tsx
  143  features/design/components/DesignCard.tsx
  159  features/design/components/modals/DesignModal.tsx
    1  features/design/index.ts
  142  features/design/stores/design.store.ts
   53  features/design/utils/template-files.util.ts
  193  features/file-explorer/components/ExplorerSearch.tsx
 2467  features/file-explorer/components/FileExplore.tsx
   58  features/file-explorer/components/FolderBadges.tsx
   74  features/file-explorer/components/ScopeWarnBell.tsx
  219  features/file-explorer/components/modals/CommitSyncedFilesModal.tsx
  124  features/file-explorer/components/modals/ConfirmDeleteFileModal.tsx
  148  features/file-explorer/components/modals/RemoteDiffModal.tsx
    1  features/file-explorer/index.ts
   45  features/git/components/Avatar.tsx
  195  features/git/components/BranchSidebar.tsx
  338  features/git/components/ChangedFiles.tsx
  155  features/git/components/CommitContextMenu.tsx
  534  features/git/components/CommitDetail.tsx
  196  features/git/components/DiffView.tsx
   21  features/git/components/EmptyState.tsx
 1188  features/git/components/GitView.tsx
  203  features/git/components/GraphCell.tsx
  490  features/git/components/LocalCommitBar.tsx
  115  features/git/components/ScopeFilterTabs.tsx
  712  features/git/components/modals/BranchScopeModal.tsx
  479  features/git/components/modals/ConfirmCreateBranchModal.tsx
  181  features/git/components/modals/ConfirmDeleteBranchModal.tsx
  120  features/git/components/modals/ConfirmFileChangeModal.tsx
   67  features/git/components/modals/ConfirmUnlinkBranchModal.tsx
  480  features/git/components/modals/CreateBranchModal.tsx
 1579  features/git/components/modals/SyncBranchModal.tsx
  572  features/git/components/modals/SyncFileDiffModal.tsx
  224  features/git/components/modals/TreeUIPreview.tsx
   54  features/git/components/scope/scopeBadges.ts
  149  features/git/components/scope/scopeTree.tsx
    1  features/git/index.ts
  203  features/git/utils/graph.util.ts
   54  features/projects/components/ProjectLogo.tsx
  178  features/projects/components/ProjectPanel/GroupPickerForm.tsx
 1341  features/projects/components/ProjectPanel/ProjectCard.tsx
 3446  features/projects/components/ProjectPanel/ProjectPanel.tsx
  117  features/projects/components/ProjectPanel/ScrollToSessionButton.tsx
  979  features/projects/components/ProjectPanel/SessionCard.tsx
  353  features/projects/components/ProjectPanel/modals/AssignTaskModal.tsx
   70  features/projects/components/ProjectPanel/modals/ConfirmUnassignTaskModal.tsx
  108  features/projects/components/ProjectPanel/modals/ConfirmUnlinkTaskModal.tsx
  285  features/projects/components/ProjectPanel/modals/NewGroupModal.tsx
  299  features/projects/components/ProjectPanel/modals/ProjectConflictModal.tsx
   64  features/projects/components/modals/ConfirmDeleteProjectModal.tsx
   94  features/projects/components/modals/ConfirmLinkProjectModal.tsx
  503  features/projects/components/modals/CreateProjectModal.tsx
  108  features/projects/components/modals/DuplicateRepoModal.tsx
 1510  features/projects/components/modals/OpenProjectModal.tsx
  144  features/projects/components/modals/ProjectSettingsModal/index.tsx
  148  features/projects/components/modals/ProjectSettingsModal/shared.tsx
  124  features/projects/components/modals/ProjectSettingsModal/tabs/GeneralTab.tsx
  208  features/projects/components/modals/ProjectSettingsModal/tabs/LogoTab.tsx
  137  features/projects/components/modals/ProjectSettingsModal/tabs/OverviewTab.tsx
   73  features/projects/hooks/useSessionTasks.ts
   52  features/projects/hooks/useWorkflowSubTasks.ts
    2  features/projects/index.ts
   44  features/pull-request/components/PrAvatar.tsx
  183  features/pull-request/components/PrBlocker.tsx
   85  features/pull-request/components/PrCard.tsx
   53  features/pull-request/components/PrCommits.tsx
  124  features/pull-request/components/PrConversation.tsx
  113  features/pull-request/components/PrCreateForm.tsx
  343  features/pull-request/components/PrDetail.tsx
   95  features/pull-request/components/PrEmptyState.tsx
  126  features/pull-request/components/PrFiles.tsx
   48  features/pull-request/components/PrFilterBar.tsx
   86  features/pull-request/components/PrSkeleton.tsx
  367  features/pull-request/components/PullRequestPanel.tsx
   86  features/pull-request/components/PullRequestView.tsx
    1  features/pull-request/index.ts
   88  features/pull-request/types/pull-request.types.ts
   93  features/pull-request/utils/pull-request.util.ts
  609  features/search/components/Search.tsx
   47  features/search/components/SearchEmptyState.tsx
  400  features/search/components/SearchResults.tsx
  119  features/search/hooks/useSearch.ts
    1  features/search/index.ts
  172  features/settings/components/Keybindings.tsx
  365  features/settings/components/Layout.tsx
  100  features/settings/components/SettingsView.tsx
    1  features/settings/index.ts
   28  features/skills/components/Skill.tsx
    1  features/skills/index.ts
  197  features/tasks/components/ArchivedTaskCard.tsx
  338  features/tasks/components/FilterSection.tsx
   70  features/tasks/components/TaskEmptyState.tsx
  403  features/tasks/components/TaskManager.tsx
  366  features/tasks/components/TaskTable.tsx
  158  features/tasks/components/modals/ArchivedTasksModal.tsx
   67  features/tasks/components/modals/ConfirmArchiveTaskModal.tsx
   58  features/tasks/components/modals/ConfirmDeleteTaskModal.tsx
   64  features/tasks/components/modals/ConfirmDiscardTaskModal.tsx
  117  features/tasks/components/modals/ConfirmForceStartTaskModal.tsx
 1327  features/tasks/components/modals/TaskModal.tsx
    8  features/tasks/constants/status-meta.constants.ts
    2  features/tasks/index.ts
    0  features/tasks/utils/task-drag.util.ts
  399  features/workflow/components/AgentWorkflow/AgentWorkflow.tsx
   48  features/workflow/components/Workflow/DetailHeader.tsx
   31  features/workflow/components/Workflow/HeaderSection.tsx
  208  features/workflow/components/Workflow/TabContent.tsx
   84  features/workflow/components/Workflow/TimelineTask.tsx
   39  features/workflow/components/Workflow/Workflow.tsx
   82  features/workflow/components/Workflow/WorkflowShared.tsx
  208  features/workflow/constants/workflow-mock.constants.ts
   67  features/workflow/constants/workflow.constants.ts
    2  features/workflow/index.ts
   47  features/workflow/types/workflow.types.ts
   23  features/workflow/utils/workflow.util.ts
   26  features/workspace/components/AgentTools.tsx
  526  features/workspace/components/Browser.tsx
  544  features/workspace/components/Design.tsx
  121  features/workspace/components/File.tsx
  238  features/workspace/components/FileBreadcrumb.tsx
  615  features/workspace/components/Terminal.tsx
  277  features/workspace/components/WorkspaceEmptyStates.tsx
 1058  features/workspace/components/WorkspacePanes.tsx
 1384  features/workspace/components/WorkspaceViews.tsx
  217  features/workspace/components/Zen.tsx
   65  features/workspace/components/modals/ConfirmDeleteOrchestratorModal.tsx
   81  features/workspace/components/modals/ConfirmReloadModal.tsx
   85  features/workspace/components/modals/ConfirmSaveFileModal.tsx
   72  features/workspace/components/modals/ConfirmSmartPlaceModal.tsx
  428  features/workspace/components/modals/QuickOpenModal.tsx
  240  features/workspace/hooks/useWorkspaceInteractions.ts
  166  features/workspace/hooks/useWorkspaceSettings.ts
    3  features/workspace/index.ts
   72  features/workspace/utils/send-to-zen.util.ts
   20  index.ts
   25  shared/api/code-base-url.ts
  637  shared/api/code.api.ts
  216  shared/components/Toast.tsx
   78  shared/components/ToastContainer.tsx
   19  shared/constants/file-mutating-tools.constants.ts
   10  shared/constants/index.ts
   75  shared/constants/motion.constants.ts
  180  shared/constants/workspace-agents.constants.ts
   85  shared/hooks/useGitFileStatus.ts
   48  shared/services/diff-provider.service.ts
  200  shared/services/document-manager.service.ts
  290  shared/services/file-watcher.service.ts
  283  shared/services/task.service.ts
  125  shared/services/toast.service.ts
   50  shared/services/unsaved.service.ts
   90  shared/stores/branch-scope.store.ts
 1340  shared/stores/code.store.ts
  109  shared/stores/scope-stats.store.ts
   45  shared/types/agent-group.types.ts
   70  shared/types/agents.types.ts
   22  shared/types/design.types.ts
   43  shared/types/mcp.types.ts
   29  shared/types/task.types.ts
  250  shared/utils/ai-agent-detector.util.ts
  264  shared/utils/detect-stack.util.ts
  212  shared/utils/diff.util.ts
  131  shared/utils/fuzzy-matcher.util.ts
   39  shared/utils/git-status-parser.util.ts
   40  shared/utils/path-resolver.util.ts
  134  shared/utils/security.util.ts
   68  shared/utils/tree-builder.util.ts
  435  shared/utils/workspace-layout.util.ts
```

`agent/tools/*` (mỗi tool gồm `index.ts`, `*.parser.ts`, `*.executor.ts`, `*.handler.ts`, `*.renderer.tsx`; tổng 120 file / 7.846 dòng). Tool lớn nhất: `run-command.renderer.tsx` 822, `grep.renderer.tsx` 495, `git-status.renderer.tsx` 412, `replace-in-file.renderer.tsx` 391, `create-agent.renderer.tsx` 370, `git-diff.renderer.tsx` 323. `agent/prompts/{code,executor,orchestrator,planner,reviewer,tester}` = 72 file / 6.809 dòng; lớn nhất `code/example.ts` 932, `executor/example.ts` 637, `code/tools-reference.ts` 611, `orchestrator/tools-reference.ts` 353.

### 1.3 Bảng UI nơi gọi → codeApi/IPC → Endpoint → Service

Nguồn: `shared/api/code.api.ts` (93 phương thức) đối chiếu `code/src/routes/*.route.ts` (105 endpoint). Cột _File gọi_ = số file UI (ngoài `code.api.ts`) tham chiếu `codeApi.<ns>.<method>`; `0` = không có nơi gọi nào tìm thấy.

| codeApi                      | HTTP + Path                                             | Route (file:dòng)   | Service                                                    | File gọi |
| ---------------------------- | ------------------------------------------------------- | ------------------- | ---------------------------------------------------------- | -------: |
| `projects.list`              | GET `/projects`                                         | project.route.ts:10 | projectService.list                                        |        2 |
| `projects.get`               | GET `/projects/:x`                                      | project.route.ts:19 | projectService.get                                         |        0 |
| `projects.create`            | POST `/projects`                                        | project.route.ts:11 | projectService.create                                      |        0 |
| `projects.update`            | PUT `/projects/:x`                                      | project.route.ts:20 | projectService.update                                      |        0 |
| `projects.saveAll`           | PUT `/projects`                                         | project.route.ts:12 | projectService.saveAll                                     |        1 |
| `projects.remove`            | DELETE `/projects/:x`                                   | project.route.ts:24 | projectService.remove                                      |        0 |
| `sessions.create`            | POST `/sessions`                                        | session.route.ts:10 | sessionService.create                                      |        1 |
| `sessions.update`            | PUT `/sessions/:x`                                      | session.route.ts:12 | sessionService.update                                      |        0 |
| `sessions.saveWorkspace`     | PUT `/sessions/:x/workspace`                            | session.route.ts:16 | sessionService.saveWorkspace                               |        1 |
| `sessions.remove`            | DELETE `/sessions/:x`                                   | session.route.ts:20 | sessionService.remove                                      |        1 |
| `worktrees.list`             | GET `/projects/:x/worktrees`                            | project.route.ts:26 | worktreeService.list                                       |        1 |
| `worktrees.create`           | POST `/projects/:x/worktrees`                           | project.route.ts:30 | worktreeService.create                                     |        0 |
| `worktrees.update`           | PUT `/projects/:x/worktrees/:x`                         | project.route.ts:40 | worktreeService.update                                     |        0 |
| `worktrees.remove`           | DELETE `/projects/:x/worktrees/:x`                      | project.route.ts:46 | worktreeService.remove                                     |        0 |
| `tasks.list`                 | GET `/projects/:x/tasks`                                | task.route.ts:11    | taskService.list                                           |        1 |
| `tasks.get`                  | GET `/projects/:x/tasks/:x`                             | task.route.ts:19    | taskService.get                                            |        1 |
| `tasks.create`               | POST `/projects/:x/tasks`                               | task.route.ts:15    | taskService.create                                         |        1 |
| `tasks.update`               | PUT `/projects/:x/tasks/:x`                             | task.route.ts:25    | taskService.update                                         |        1 |
| `tasks.remove`               | DELETE `/projects/:x/tasks/:x`                          | task.route.ts:31    | taskService.remove                                         |        1 |
| `workflows.get`              | GET `/tasks/:x/workflow`                                | task.route.ts:39    | workflowService.get                                        |        1 |
| `workflows.create`           | POST `/tasks/:x/workflow`                               | task.route.ts:47    | workflowService.create                                     |        1 |
| `workflows.update`           | PUT `/tasks/:x/workflow`                                | task.route.ts:54    | workflowService.update                                     |        1 |
| `fs.listDir`                 | GET `/fs/list-dir?path=:x`                              | fs.route.ts:12      | fsService.listDir                                          |        6 |
| `fs.readDir`                 | GET `/fs/list-dir`                                      | fs.route.ts:12      | fsService.listDir                                          |        1 |
| `fs.writeFile`               | POST `/fs/write-file`                                   | fs.route.ts:19      | fsService.writeFile                                        |        5 |
| `fs.readFile`                | GET `/fs/read-file?:x`                                  | fs.route.ts:72      | fsReadService.readLines                                    |        6 |
| `fs.grep`                    | POST `/fs/grep`                                         | fs.route.ts:124     | fsReadService.grep                                         |        1 |
| `fs.stat`                    | GET `/fs/stat`                                          | fs.route.ts:87      | fsReadService.stat                                         |        2 |
| `fs.tree`                    | GET `/fs/tree?:x`                                       | fs.route.ts:96      | fsReadService.tree                                         |        1 |
| `fs.findFiles`               | GET `/fs/find-files?:x`                                 | fs.route.ts:113     | fsReadService.findFiles                                    |        2 |
| `fs.listProjectFiles`        | GET `/fs/list-project-files?root=:x`                    | fs.route.ts:146     | fsReadService.listProjectFiles                             |        1 |
| `fs.scanSquareImages`        | GET `/fs/scan-square-images?root=:x`                    | fs.route.ts:153     | imageService.scanSquareImages                              |        2 |
| `fs.image`                   | GET `/fs/image?path=:x${side ? `                        | fs.route.ts:161     | imageService.readImageDataUrl                              |        1 |
| `fs.downloadLogo`            | POST `/projects/logo/download`                          | fs.route.ts:168     | imageService.downloadProjectLogo                           |        1 |
| `fs.mkdir`                   | POST `/fs/mkdir`                                        | fs.route.ts:31      | fsService.mkdir                                            |        2 |
| `fs.rename`                  | POST `/fs/rename`                                       | fs.route.ts:38      | fsService.rename                                           |        2 |
| `fs.copy`                    | POST `/fs/copy`                                         | fs.route.ts:47      | fsService.copy                                             |        1 |
| `fs.deleteFile`              | DELETE `/fs/delete-file?path=:x`                        | fs.route.ts:56      | fsService.deleteFile                                       |        2 |
| `fs.removeDir`               | DELETE `/fs/remove-dir?path=:x`                         | fs.route.ts:64      | fsService.removeDir                                        |        1 |
| `git.status`                 | GET `/git/status?gitRoot=:x`                            | git.route.ts:16     | gitService.status                                          |        8 |
| `git.ignoredPaths`           | GET `/git/ignored-paths?gitRoot=:x`                     | git.route.ts:23     | gitService.ignoredPaths                                    |        1 |
| `git.explorerState`          | GET `/git/explorer-state?root=:x&scope=:x&active=:x`    | git.route.ts:30     | gitExplorerService.state                                   |        1 |
| `git.changedInOtherBranches` | GET `/git/changed-in-other-branches?root=:x`            | git.route.ts:45     | gitService.changedInOtherBranches                          |        3 |
| `git.remoteDiff`             | GET `/git/remote-diff?root=:x&remoteHash=:x`            | git.route.ts:52     | gitService.remoteDiff                                      |        1 |
| `git.defaultBranch`          | GET `/git/default-branch?root=:x`                       | git.route.ts:61     | gitExtraService.defaultBranch                              |        4 |
| `git.fetch`                  | POST `/git/fetch`                                       | git.route.ts:68     | gitRemoteService.fetch                                     |        2 |
| `git.fileDiffVsRemote`       | GET `/git/file-diff-vs-remote?root=:x&filePath=:x`      | git.route.ts:75     | gitRemoteService.fileDiffVsRemote                          |        1 |
| `git.commitPushFiles`        | POST `/git/commit-push-files`                           | git.route.ts:84     | gitRemoteService.commitPushFiles                           |        1 |
| `git.push`                   | POST `/git/push`                                        | git.route.ts:94     | gitRemoteService.push                                      |        1 |
| `git.stagedDiff`             | GET `/git/staged-diff?root=:x`                          | git.route.ts:101    | gitReadService.stagedDiff                                  |        1 |
| `git.unpushed`               | GET `/git/unpushed?root=:x`                             | git.route.ts:108    | gitReadService.unpushed                                    |        1 |
| `git.checkout`               | POST `/git/checkout`                                    | git.route.ts:255    | gitWriteService.checkout                                   |        1 |
| `git.commit`                 | POST `/git/commit`                                      | git.route.ts:262    | gitWriteService.commit                                     |        2 |
| `git.stage`                  | POST `/git/stage`                                       | git.route.ts:269    | gitWriteService.stage                                      |        1 |
| `git.stageAll`               | POST `/git/stage-all`                                   | git.route.ts:276    | gitWriteService.stageAll                                   |        0 |
| `git.unstage`                | POST `/git/unstage`                                     | git.route.ts:283    | gitWriteService.unstage                                    |        0 |
| `git.unstageAll`             | POST `/git/unstage-all`                                 | git.route.ts:290    | gitWriteService.unstageAll                                 |        0 |
| `git.pruneOrphanBranches`    | POST `/git/prune-orphan-branches`                       | git.route.ts:297    | gitWriteService.pruneOrphanBranches                        |        1 |
| `git.clone`                  | POST `/git/clone`                                       | git.route.ts:304    | gitWriteService.clone                                      |        1 |
| `git.protectStatus`          | GET `/git/protect-status?root=:x`                       | git.route.ts:314    | gitWriteService.protectStatus                              |        0 |
| `git.protectEnable`          | POST `/git/protect-enable`                              | git.route.ts:321    | gitWriteService.protectEnable                              |        0 |
| `git.protectDisable`         | POST `/git/protect-disable`                             | git.route.ts:328    | gitWriteService.protectDisable                             |        0 |
| `git.checkReady`             | GET `/git/check-ready?root=:x`                          | git.route.ts:335    | gitWriteService.checkReady                                 |        0 |
| `git.log`                    | GET `/git/log?:x`                                       | git.route.ts:117    | gitReadService.log                                         |        2 |
| `git.branches`               | GET `/git/branches?root=:x`                             | git.route.ts:126    | gitReadService.listBranches                                |        3 |
| `git.tags`                   | GET `/git/tags?root=:x`                                 | git.route.ts:133    | gitReadService.listTags                                    |        1 |
| `git.resolveRef`             | GET `/git/resolve-ref?root=:x&ref=:x`                   | git.route.ts:140    | gitReadService.resolveRef                                  |        1 |
| `git.isRepo`                 | GET `/git/is-repo?root=:x`                              | git.route.ts:147    | gitReadService.isRepo                                      |        2 |
| `git.repoIdentity`           | GET `/git/repo-identity?root=:x`                        | git.route.ts:154    | gitReadService.repoIdentity                                |        2 |
| `git.commitDiff`             | GET `/git/commit-diff?root=:x&hash=:x`                  | git.route.ts:161    | gitReadService.commitDiff                                  |        1 |
| `git.localDiff`              | GET `/git/local-diff?root=:x&branch=:x[&branchRoot=:x]` | git.route.ts:168    | gitReadService.localDiff                                   |        1 |
| `git.commitBody`             | GET `/git/commit-body?root=:x&hash=:x`                  | git.route.ts:183    | gitReadService.commitBody                                  |        2 |
| `git.commitFiles`            | GET `/git/commit-files?root=:x&hash=:x`                 | git.route.ts:190    | gitReadService.commitFiles                                 |        2 |
| `git.remoteUrl`              | GET `/git/remote-url?root=:x`                           | git.route.ts:197    | gitReadService.remoteUrl                                   |        1 |
| `git.localChanges`           | GET `/git/local-changes?root=:x[&clones=:json]`         | git.route.ts:204    | gitReadService.localChanges (route tự parse JSON `clones`) |        1 |
| `git.fileDiff`               | GET `/git/file-diff?root=:x&filePath=:x`                | git.route.ts:226    | gitReadService.fileDiff                                    |        1 |
| `git.languageStats`          | GET `/git/language-stats?root=:x`                       | git.route.ts:233    | gitReadService.languageStats                               |        1 |
| `git.repoInfo`               | GET `/git/repo-info?root=:x`                            | git.route.ts:240    | gitReadService.repoInfo                                    |        1 |
| `pr.status`                  | GET `/pr/status?root=:x`                                | pr.route.ts:12      | prService.status                                           |        1 |
| `pr.loginToken`              | POST `/pr/login-token`                                  | pr.route.ts:19      | prService.loginToken                                       |        1 |
| `pr.loginWeb`                | POST `/pr/login-web`                                    | pr.route.ts:26      | prService.loginWeb                                         |        1 |
| `pr.cancelLoginWeb`          | POST `/pr/login-web/cancel`                             | pr.route.ts:33      | prService.cancelLoginWeb                                   |        1 |
| `pr.list`                    | GET `/pr/list?root=:x&state=:x&limit=:x`                | pr.route.ts:40      | prService.list                                             |        1 |
| `pr.view`                    | GET `/pr/:x?root=:x`                                    | pr.route.ts:55      | prService.view                                             |        1 |
| `pr.diff`                    | GET `/pr/:x/diff?root=:x`                               | pr.route.ts:62      | prService.diff                                             |        0 |
| `pr.create`                  | POST `/pr`                                              | pr.route.ts:47      | prService.create                                           |        1 |
| `pr.action`                  | POST `/pr/:number/{verb}`                               | pr.route.ts:69-105  | prService.merge/close/reopen/ready/comment/review          |        1 |
| `scopes.list`                | GET `/worktrees/:x/scopes`                              | scope.route.ts:9    | scopeService.list                                          |        1 |
| `scopes.set`                 | PUT `/worktrees/:x/scopes`                              | scope.route.ts:13   | scopeService.set                                           |        1 |
| `scopes.get`                 | GET `/worktrees/:x/scopes/:x`                           | scope.route.ts:20   | scopeService.get                                           |        0 |
| `scopes.remove`              | DELETE `/worktrees/:x/scopes/:x`                        | scope.route.ts:26   | scopeService.remove                                        |        0 |
| `search.stream`              | GET `/search/stream`                                    | search.route.ts:10  | searchService.search (route tự dựng SSE)                   |        1 |
| `search.cancel`              | POST `/search/cancel`                                   | search.route.ts:50  | searchService.cancel                                       |        1 |

**Endpoint server không có phương thức `codeApi` tương ứng:** `GET/POST /groups`, `GET/PUT/DELETE /groups/:id` (group.route.ts:9-16); `GET /sessions` (session.route.ts:9); `GET /sessions/:id` (session.route.ts:11); `GET /projects/:id/worktrees/:worktreeId` (project.route.ts:34).

**Kênh IPC / `window.api` gọi ngoài `*.handler.ts`** (29 file; thống kê theo tên kênh chuỗi literal):

| Kiểu   | Kênh                               | Số file | Ví dụ file                                                 |
| ------ | ---------------------------------- | ------: | ---------------------------------------------------------- |
| invoke | `dialog:select-paths`              |       5 | features/git/components/LocalCommitBar.tsx                 |
| invoke | `fs:unwatch-dir`                   |       3 | app/layout/FooterBar.tsx                                   |
| invoke | `fs:watch-dir`                     |       3 | app/layout/FooterBar.tsx                                   |
| invoke | `fs:write-file`                    |       3 | Code.tsx                                                   |
| invoke | `pr:open-external`                 |       3 | features/pull-request/components/PrBlocker.tsx             |
| invoke | `shell:open-path`                  |       3 | features/file-explorer/components/FileExplore.tsx          |
| on     | `fs:dir-changed`                   |       3 | app/layout/FooterBar.tsx                                   |
| invoke | `dialog:show-save`                 |       2 | Code.tsx                                                   |
| off    | `fs:dir-changed`                   |       2 | app/layout/FooterBar.tsx                                   |
| off    | `git:index-changed`                |       2 | app/layout/FooterBar.tsx                                   |
| on     | `git:index-changed`                |       2 | app/layout/FooterBar.tsx                                   |
| invoke | `debug:create-launch`              |       1 | features/debug/components/Debug.tsx                        |
| invoke | `design:create`                    |       1 | features/design/stores/design.store.ts                     |
| invoke | `design:delete`                    |       1 | features/design/stores/design.store.ts                     |
| invoke | `design:list`                      |       1 | features/design/stores/design.store.ts                     |
| invoke | `design:update`                    |       1 | features/design/stores/design.store.ts                     |
| invoke | `fs:get-homedir`                   |       1 | features/projects/components/ProjectPanel/ProjectPanel.tsx |
| invoke | `fs:replace-all`                   |       1 | features/search/components/Search.tsx                      |
| invoke | `fs:unwatch-file`                  |       1 | shared/services/file-watcher.service.ts                    |
| invoke | `fs:validate-paths`                |       1 | features/projects/components/ProjectPanel/ProjectPanel.tsx |
| invoke | `fs:watch-file`                    |       1 | shared/services/file-watcher.service.ts                    |
| invoke | `git:branch-sync-apply`            |       1 | features/git/components/modals/SyncBranchModal.tsx         |
| invoke | `git:branch-sync-preview`          |       1 | features/git/components/modals/SyncBranchModal.tsx         |
| invoke | `git:create-branch-worktree`       |       1 | features/git/components/modals/CreateBranchModal.tsx       |
| invoke | `git:delete-branch`                |       1 | features/projects/components/ProjectPanel/ProjectPanel.tsx |
| invoke | `git:unpushed-files`               |       1 | features/git/components/modals/SyncBranchModal.tsx         |
| invoke | `git:worktree-preview`             |       1 | features/git/components/modals/CreateBranchModal.tsx       |
| invoke | `git:worktree-preview-cancel`      |       1 | features/git/components/modals/CreateBranchModal.tsx       |
| invoke | `openFolder`                       |       1 | app/layout/ContentPanel.tsx                                |
| invoke | `shell:open-external`              |       1 | features/git/components/CommitContextMenu.tsx              |
| invoke | `terminal:kill`                    |       1 | features/workspace/components/Terminal.tsx                 |
| invoke | `terminal:kill-foreground`         |       1 | features/projects/components/ProjectPanel/ProjectPanel.tsx |
| invoke | `terminal:spawn`                   |       1 | features/workspace/components/Terminal.tsx                 |
| off    | `browser:did-navigate`             |       1 | features/workspace/components/Browser.tsx                  |
| off    | `browser:favicon-updated`          |       1 | features/workspace/components/Browser.tsx                  |
| off    | `browser:load-start`               |       1 | features/workspace/components/Browser.tsx                  |
| off    | `browser:load-stop`                |       1 | features/workspace/components/Browser.tsx                  |
| off    | `browser:navigation-state-changed` |       1 | features/workspace/components/Browser.tsx                  |
| off    | `browser:title-updated`            |       1 | features/workspace/components/Browser.tsx                  |
| off    | `terminal:data`                    |       1 | features/workspace/components/Terminal.tsx                 |
| off    | `terminal:exit`                    |       1 | features/workspace/components/Terminal.tsx                 |
| off    | `terminal:foreground-process`      |       1 | features/workspace/components/Terminal.tsx                 |
| off    | `terminal:process-info`            |       1 | features/workspace/components/WorkspaceViews.tsx           |
| on     | `browser:did-navigate`             |       1 | features/workspace/components/Browser.tsx                  |
| on     | `browser:favicon-updated`          |       1 | features/workspace/components/Browser.tsx                  |
| on     | `browser:load-start`               |       1 | features/workspace/components/Browser.tsx                  |
| on     | `browser:load-stop`                |       1 | features/workspace/components/Browser.tsx                  |
| on     | `browser:navigation-state-changed` |       1 | features/workspace/components/Browser.tsx                  |
| on     | `browser:title-updated`            |       1 | features/workspace/components/Browser.tsx                  |
| on     | `debug:exit`                       |       1 | features/debug/stores/debug.store.ts                       |
| on     | `debug:message`                    |       1 | features/debug/stores/debug.store.ts                       |
| on     | `fs:file-changed`                  |       1 | shared/services/file-watcher.service.ts                    |
| on     | `git:create-branch-progress`       |       1 | features/git/components/modals/CreateBranchModal.tsx       |
| on     | `git:worktree-preview-progress`    |       1 | features/git/components/modals/CreateBranchModal.tsx       |
| on     | `terminal:data`                    |       1 | features/workspace/components/Terminal.tsx                 |
| on     | `terminal:exit`                    |       1 | features/workspace/components/Terminal.tsx                 |
| on     | `terminal:foreground-process`      |       1 | features/workspace/components/Terminal.tsx                 |
| on     | `terminal:process-info`            |       1 | features/workspace/components/WorkspaceViews.tsx           |
| send   | `browser:destroy`                  |       1 | features/workspace/components/Browser.tsx                  |
| send   | `browser:force-repaint`            |       1 | features/workspace/components/Browser.tsx                  |
| send   | `browser:go-back`                  |       1 | features/workspace/components/Browser.tsx                  |
| send   | `browser:go-forward`               |       1 | features/workspace/components/Browser.tsx                  |
| send   | `browser:navigate`                 |       1 | features/workspace/components/Browser.tsx                  |
| send   | `browser:open-external`            |       1 | features/workspace/components/Browser.tsx                  |
| send   | `browser:reload`                   |       1 | features/workspace/components/Browser.tsx                  |
| send   | `browser:set-bounds`               |       1 | features/workspace/components/Browser.tsx                  |
| send   | `browser:set-device-metrics`       |       1 | features/workspace/components/Browser.tsx                  |
| send   | `terminal:history-delete`          |       1 | features/workspace/components/WorkspaceViews.tsx           |
| send   | `terminal:history-save`            |       1 | features/workspace/components/Terminal.tsx                 |
| send   | `terminal:resize`                  |       1 | features/workspace/components/Terminal.tsx                 |
| send   | `terminal:write`                   |       1 | features/workspace/components/Terminal.tsx                 |

### 1.4 Danh sách vấn đề

Mức: **C** = cao (bảo mật/mất dữ liệu/chặn bảo trì), **T** = trung, **Th** = thấp. Phía: S = server, U = UI, S+U = cả hai.

| ID  | Mức | Phía | Vấn đề                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Bằng chứng (file:dòng đã đọc)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --- | --- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V01 | C   | S    | Server bind mọi interface, CORS `*`, không xác thực, trong khi có endpoint ghi/xóa file và clone; `trusted=true` từ query string tắt `withinProject` và bật `allowSensitive`. Bất kỳ trang web/host LAN nào chạm được cổng đều đọc/ghi được file.                                                                                                                                                                                                                                                                                                 | `index.ts:11-17` (cors `origin:'*'`), `index.ts:31` (`app.listen(cfg.port` không host), `fs.route.ts:19,56,64` (ghi/xóa), `git.route.ts:304-308` (clone), `fs.route.ts:75-76,90-91` (`trusted`), `utils/guard.ts:51-68`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| V02 | C   | S    | `/search/stream` truyền `projectPath` thẳng vào `rg` làm `cwd` mà không qua `safePath`; tham số thiếu trả 404 (`found`) thay vì 400.                                                                                                                                                                                                                                                                                                                                                                                                              | `search.route.ts:13-15,53`, `search.service.ts:56`, `utils/guard.ts:8-11`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| V03 | T   | S    | Đảo tầng: `utils/guard.ts` import `repositories`; helper dùng chung nằm trong service khác.                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `utils/guard.ts:2`; `resolveDefaultBranch` định nghĩa `git-write.service.ts:7`, import ở `git-explorer.service.ts:4`, `git-remote.service.ts:3`, `scope.service.ts:5`; `detectBranch` ở `worktree.service.ts:15` ← `project.service.ts:16`, `session.service.ts:11`                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| V04 | T   | S    | Cùng khái niệm "default branch" có **hai** thuật toán (symbolic-ref của remote đầu tiên + fallback `main` vs `origin/HEAD` + `init.defaultBranch` + `show-ref`). Helper `lines` lặp 3 lần; type trạng thái file lặp 3 lần; `git-extra.service.ts` chỉ 24 dòng, 1 hàm.                                                                                                                                                                                                                                                                             | `git-extra.service.ts:3-24`, `git-write.service.ts:7-21`, `git.service.ts:6,4`, `git-read.service.ts:46,6`, `git-explorer.service.ts:15`; UI gọi bản "extra" ở `FileExplore.tsx:1265`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| V05 | T   | S    | Route chứa parsing/nghiệp vụ: parse JSON `scope`/`clones`, nhánh `readLines`/`readFile`, parse `exclude`/`depth`, dựng SSE inline.                                                                                                                                                                                                                                                                                                                                                                                                                | `git.route.ts:30-44,204-225`, `fs.route.ts:72-84,96-111,113-122,124-144`, `search.route.ts:10-47`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| V06 | T   | S+U  | Không có "outcome" thống nhất: service git/pr trả `{error}` trong HTTP 200 `success:true`, lúc `ok`, lúc `success`; `search.route` bỏ qua `json()`. UI đọc `.error` ≈67 dòng/26 file (ước lượng regex). Tên tham số không nhất quán (`gitRoot` vs `root`).                                                                                                                                                                                                                                                                                        | số dòng `{ error` : `git-read.service.ts`=3, `git-remote.service.ts`=9, `git-write.service.ts`=10, `pr.service.ts`=21; `search.route.ts:55`; `code.api.ts:166,180` (`GitErr`), `code.api.ts:347,349` (`gitRoot`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| V07 | T   | S    | Tiến trình con không đi qua runner chung: `execFileSync` chặn event loop, `runCmd` riêng cho `pr`, `spawn` rải rác, `process: any`.                                                                                                                                                                                                                                                                                                                                                                                                               | `worktree.service.ts:1,17`, `pr.service.ts:31-45,110,130`, `search.service.ts:24,56`, `git-runner.ts:14`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| V08 | T   | S    | Cách gọi `safePath` không đồng đều (wrapper cục bộ ở mỗi route; 17 lần gọi inline ở `fs.route`; một lần trong service).                                                                                                                                                                                                                                                                                                                                                                                                                           | `git.route.ts:11`, `pr.route.ts:6`, `fs.route.ts` (17 vị trí), `fs-read.service.ts:243`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| V09 | C   | S+U  | `PUT /projects` (saveAll) xóa mọi project vắng trong payload; UI gọi mỗi khi store đổi (debounce 300 ms), phải dựa cờ `projectsLoaded` để khỏi mất dữ liệu. Endpoint từng-project (`create/update/remove`) đã có nhưng UI không gọi.                                                                                                                                                                                                                                                                                                              | `project.route.ts:12`, `project.service.ts:121-139`, `code.store.ts:170-172,236-282`, `code.api.ts:232-238` (0 nơi gọi `create/update/remove`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| V10 | Th  | S+U  | Endpoint/phương thức không có nơi gọi: `/groups*` (5), `GET /sessions`, `GET /sessions/:id`, `GET /projects/:id/worktrees/:worktreeId`; 18 phương thức `codeApi` không có tham chiếu. UI giữ `agentGroups` và nhóm project cục bộ.                                                                                                                                                                                                                                                                                                                | `group.route.ts:9-16`, `session.route.ts:9,11`, `project.route.ts:34`; danh sách 18 ở bảng 1.3 (cột _File gọi_ = 0); `code.store.ts:1006-1115`, `ProjectPanel.tsx:164,479,503`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| V11 | Th  | S    | Log `[DEBUG]` còn trong bootstrap; `any`; comment `ASSUMED` về `DEFAULT_CODE_PORT`.                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `index.ts:35`, `search.service.ts:24`, `git-extra.service.ts:21`, `server.config.ts:24`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| V12 | T   | S+U  | Type response khai ở service server rồi **khai lại** ở UI, thậm chí nhiều lần.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `DirEntry` `fs.service.ts:5` ↔ `code.api.ts:149`, `FileExplore.tsx:116`, `FileBreadcrumb.tsx:9`, `Code.tsx:42`; `FileStat`/`TreeNode` `fs-read.service.ts:8,16` ↔ `code.api.ts:182,190`; `SquareImage` `image.service.ts:6` ↔ `code.api.ts:197`; `GitStatusPayload` `git.service.ts:34` ↔ `GitStatusResult` `code.api.ts:157`                                                                                                                                                                                                                                                                                                                                                                                                       |
| V13 | C   | U    | `ProjectPanel` là **một** component ≈2.990 dòng: 39 `useState`, 54 `useCallback`, 118 hook/handler cấp 1; trộn lọc/sắp xếp, dropdown, chọn/mở rộng, thao tác project/branch/task/group, engine kéo-thả đa cấp, khóa đa cửa sổ, và ≈1.250 dòng render; 22 `any`.                                                                                                                                                                                                                                                                                   | `ProjectPanel.tsx:456-3446`; vùng: `:579-683` state, `:684-842` updater, `:843-862` derived, `:1138-1366` project actions, `:1367-1534` branch actions, `:1535-1604` task actions, `:1624-1889` DnD, `:1957-2124` target lock, `:2194-3446` render                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| V14 | C   | U    | `FileExplore.tsx`: `TreeNode` ≈550 dòng, `ScopeBlocks` ≈295 dòng, `FileExplore()` ≈930 dòng với 7 `useEffect`, 7 Map/Set cấp module làm cache, 9 lần `window.api`, 13 lần `codeApi`, bộ đếm render debug còn trong code.                                                                                                                                                                                                                                                                                                                          | `FileExplore.tsx:487-1035`, `:1244-1538`, `:1539-2467`, effect `:1554,1587,1631,1904,2016,2079,2085`, cache `:124,151,186,189,205,1145,1146`, debug `:458-475`, IPC `:748,1593,1620-1625,2056-2062`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| V15 | C   | U    | Nhiều file > 800 dòng ôm cả fetch + logic + render: `SyncBranchModal` 1.579 (component chính ≈1.225, 22 `useState`, 13 `useEffect`, 15 `any`), `OpenProjectModal` 1.510 (≥3 component export), `WorkspaceViews` 1.384 (1 component, 19 `useEffect`), `ProjectCard` 1.341 (≥8 component), `code.store` 1.340 (≥13 vùng action), `TaskModal` 1.327 (29 `useState`; 7 component phụ cuối file), `GitView` 1.188 (26 `useState`, 15 `codeApi`, 13 `console.log`), `WorkspacePanes` 1.058, `SessionCard` 979, `FooterBar` 973 (≥11 component tooltip). | `SyncBranchModal.tsx:354`, `OpenProjectModal.tsx:230,536,561`, `WorkspaceViews.tsx:82`, `ProjectCard.tsx:221,294,327,458,469,478,535,800`, `code.store.ts:546-1264` (marker), `TaskModal.tsx:115,940-1309`, `GitView.tsx:66,173,231,354`, `FooterBar.tsx:99-320`                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| V16 | C   | S+U  | Logic dẫn xuất nằm ở UI thay vì server: phân loại branch local/remote-only + heuristic tên remote (3 request/project: `fetch`+`branches`+`status`); parse text `git status` ở UI trong khi `GET /git/status` đã trả map `files`.                                                                                                                                                                                                                                                                                                                  | `ProjectPanel.tsx:204-273`; `shared/utils/git-status-parser.util.ts:1-39` (dùng ở `FooterBar.tsx`, `SyncBranchModal.tsx`, `agent/tools/git-status/git-status.parser.ts`); `git.service.ts:34-41`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| V17 | T   | U    | State trùng giữa store và state cục bộ; cache rải rác.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `ProjectPanel.tsx:457` (`rawProjects` store) vs `:475` (`projects` local); `:503` `groups` local vs server có `/groups`; `:615` `gitRepoByProject` vs `ProjectCard.tsx:325` `gitRepoCache`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| V18 | T   | U    | `code.store.ts` vừa là store, vừa là bộ lưu trữ tùy biến (`PersistStorage`) gọi server, vừa chứa state UI tạm (modal, content view, ZenCLI); state UI theo project không được lưu server.                                                                                                                                                                                                                                                                                                                                                         | `code.store.ts:236-282,1285-1300`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| V19 | T   | U    | Feature import sâu nội bộ feature khác (21 file đích, 10 cặp feature).                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | xem bảng cạnh import ở mục 2.3                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| V20 | T   | U    | 29 file gọi `window.api` ngoài `*.handler.ts` (≈40 kênh khác nhau); `fs:write-file` qua IPC trùng chức năng `codeApi.fs.writeFile`.                                                                                                                                                                                                                                                                                                                                                                                                               | bảng "Kênh IPC" ở 1.3; `Code.tsx:192-194`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| V21 | T   | U    | `fetch` trực tiếp ngoài `codeApi`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `agent/tools/create-agent/create-agent.renderer.tsx:123,136,172`, `shared/utils/detect-stack.util.ts:155,187`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| V22 | Th  | U    | Code chết/trùng: 9 file mồ côi ≈1,2k dòng; `task-drag.util.ts` rỗng nhưng vẫn được import; template mobile = website; 2 cặp file prompt trùng nội dung.                                                                                                                                                                                                                                                                                                                                                                                           | mồ côi: `features/git/components/modals/SyncFileDiffModal.tsx`(572), `shared/services/document-manager.service.ts`(200), `CodeSkeleton.tsx`(181), `features/workspace/components/modals/ConfirmReloadModal.tsx`(81), `features/workspace/utils/send-to-zen.util.ts`(72), `shared/services/diff-provider.service.ts`(48), `shared/types/task.types.ts`(29), `shared/constants/file-mutating-tools.constants.ts`(19), `agent/services/orchestrator-task-context.service.ts`(19); `agent/prompts/code/agents-md.ts`(9) trùng `executor/agents-md.ts`; `reviewer/types.ts` trùng `tester/types.ts`; `SessionCard.tsx:32` import `TASK_DRAG_TYPE` từ file 0 dòng; templates: `features/design/templates/{mobile,website}/*.tsx` diff = 0 |
| V23 | Th  | U    | Vệ sinh: 244 `any`, 17 `console.log`, 11 `@ts-ignore/eslint-disable`, 52 `TODO/FIXME/ASSUMED` (ngoài prompts/templates).                                                                                                                                                                                                                                                                                                                                                                                                                          | điểm nóng `any`: `ProjectPanel.tsx`(22), `SyncBranchModal.tsx`(15), `CreateBranchModal.tsx`(10), `debug.store.ts`(10), `GitView.tsx`(7); `console.log`: `GitView.tsx`(13), `FileExplore.tsx`(2)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| V24 | T   | U    | Type/hằng khai báo lặp.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `DirEntry`×4, `TreeNode`(interface ×4 + component `FileExplore.tsx:487`), `FileStatus`×2 (`SyncBranchModal.tsx:57`, `SyncFileDiffModal.tsx:60`), `GitFileStatus`×2 (`useGitFileStatus.ts:4`, `FileExplore.tsx:149`), `BranchInfo`×2, `FileNode`×2, `PROJECT_COLORS`×2 (`ProjectPanel.tsx:192`, `ProjectCard.tsx:268`), `STATUS_META`×5, `DefaultBadge`×2 (`ProjectCard.tsx:458`, `SyncBranchModal.tsx:119`)                                                                                                                                                                                                                                                                                                                         |
| V25 | T   | U    | `shared/services/task.service.ts` (283 dòng, 25 file import) trộn 3 trách nhiệm: `dialogService`, tiện ích lịch/blocker, `taskService` gọi `codeApi`.                                                                                                                                                                                                                                                                                                                                                                                             | `task.service.ts:38,113-207,208-283`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| V26 | Th  | S+U  | Đặt tên không nhất quán giữa các tầng: `pr` (server/codeApi) vs `pull-request` (feature); `workflows`(api) vs `workflow`(feature); `fs.readDir` trùng `fs.listDir` cùng endpoint; `/projects/logo/download` nằm trong `fs.route`.                                                                                                                                                                                                                                                                                                                 | `code.api.ts:280,282,505`, `fs.route.ts:168`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| V27 | Th  | U    | `agent/prompts` lặp cấu trúc 6 vai trò (config/constraints/identity/workflow/...); chỉ 2 cặp trùng byte. Rủi ro ngữ nghĩa cao → chỉ khử phần trùng chắc chắn.                                                                                                                                                                                                                                                                                                                                                                                     | `agent/prompts/*/` (72 file, 6.809 dòng)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

## 2. Kiến trúc đích

### 2.1 Cây thư mục server mới (`code/src`)

```
index.ts                         # chỉ bootstrap: init DB → createApp → listen → shutdown (≈25 dòng)
app.ts                     [new] # createApp(): cors có allowlist, auth, json, routes, errorHandler
config/server.config.ts          # + host (mặc định 127.0.0.1), allowedOrigins, token
database/{connection,integrity}.ts
http/                      [new] # hạ tầng HTTP, KHÔNG import services/repositories
  envelope.ts                    #   AppError, json, fail, handle, errorHandler   (← utils/http.ts)
  params.ts                      #   param, requireString, queryBool/Int/Csv/Json, bodyStringArray (← logic parse trong routes)
  guard.ts                       #   safePath, found; nhận RootProvider được inject (← utils/guard.ts)
  auth.ts                        #   requireToken (bật khi cfg.token có giá trị)
  sse.ts                         #   openSse(res) → { send(event,data), close() }
infra/                     [new] # chạy tiến trình, không biết nghiệp vụ
  process-runner.ts              #   runProcess(bin,args,{cwd,env,maxBuffer,stdin}) + spawnStream
  git-runner.ts                  #   runGit, gitText   (← services/git-runner.ts, dùng process-runner)
  gh-runner.ts                   #   runGh, ghJson     (← runCmd/ghJson trong pr.service.ts)
domain/
  mappers.ts
  api-types.ts             [new] # NGUỒN SỰ THẬT type request/response: Outcome<T>, FileStatus, DirEntry, TreeNode,
                                 #   FileStat, SquareImage, GitStatusPayload, ExplorerState, BranchOverview, ...
repositories/                    # giữ nguyên 12 file
services/
  project.service.ts  worktree.service.ts  session.service.ts  scope.service.ts
  task.service.ts     workflow.service.ts  group.service.ts   # group.service: chờ xác nhận V10
  fs/
    fs-write.service.ts          #   (← fs.service.ts)  write/mkdir/rename/copy/delete
    fs-query.service.ts          #   (← fs-read.service.ts) read/stat/tree/findFiles/grep/listProjectFiles
    image.service.ts
  git/
    default-branch.ts            #   resolveDefaultBranch — DUY NHẤT (hợp nhất V04)
    git-status.service.ts        #   (← git.service.ts)  status, ignoredPaths, changedInOtherBranches, remoteDiff
    git-branch.service.ts        #   list/overview/worktreePaths/prune (← git-read + git-write)
    git-history.service.ts       #   log, commitDiff/Body/Files, resolveRef, tags, unpushed
    git-diff.service.ts          #   stagedDiff, localDiff, fileDiff, localChanges
    git-repo.service.ts          #   isRepo, repoIdentity, remoteUrl, repoInfo, languageStats (+ language-stats.ts)
    git-write.service.ts         #   checkout, commit, stage*, unstage*, clone
    git-protect.service.ts       #   protectStatus/Enable/Disable + hook templates
    git-remote.service.ts        #   fetch, push, fileDiffVsRemote, commitPushFiles
    git-explorer.service.ts      #   explorer-state (giữ)
  pull-request/pull-request.service.ts   # (← pr.service.ts)
  search/search.service.ts
routes/
  routes.ts  project.route.ts  group.route.ts  scope.route.ts  session.route.ts  task.route.ts
  fs.route.ts  git.route.ts  pull-request.route.ts (← pr.route.ts)  search.route.ts
  # route CHỈ: lấy tham số qua http/params + guard → gọi 1 hàm service → json(). Không nghiệp vụ.
```

Lý do chọn: giữ phân tầng theo layer (server nhỏ, 5k dòng) nhưng gom theo domain trong từng layer khi domain ≥ 3 file. Hướng loại: (a) tách theo module dọc `modules/<domain>/{route,service,repo}` — đổi toàn bộ import, lợi ích thấp với quy mô này; (b) tách `git.route.ts` (342 dòng) thành 7 route — sau khi dùng helper `params` file còn ≈200 dòng, tách thêm chỉ làm tăng import.

### 2.2 Cây thư mục UI mới (`modules/Code`)

```
Code.tsx  index.ts  code.module.ts  CodeSkeleton.tsx(xác nhận)   # CodeModule.ts (shim) xóa ở P6 nếu không có importer ngoài
app/{layout,stores,hooks}                      # layout tách: FooterBar/ Headerbar/ ContentPanel/ ActivityPanel → thư mục con theo vùng
agent/                                          # giữ cấu trúc: components, prompts, services, stores, tools/*, tag-registry.ts
  prompts/_shared/                              # CHỈ file trùng byte (agents-md.ts, types.ts) — xem V27
features/<name>/{components,hooks,stores,services,utils,types,constants}/ + index.ts  # index.ts = API công khai duy nhất
  projects/   components/{ProjectPanel/, ProjectCard/, SessionCard/, modals/}  hooks/  services/  types/
  file-explorer/  components/{FileExplorer.tsx, TreeNode.tsx, ScopeBlocks.tsx, ...}  hooks/  services/
  git/        components/{GitView.tsx, graph/, modals/SyncBranch/, ...}  hooks/  stores/(branch-sync)  utils/
  pull-request/  workspace/  tasks/(+services/task.service.ts, utils/schedule.util.ts)  workflow/  search/  settings/  debug/  design/ (templates/ dùng chung cho mobile+website)
shared/
  api/        client.ts  code-base-url.ts  code.api.ts(compose)  types/*.types.ts  endpoints/*.api.ts
  ipc/  [new] fs.ipc.ts  shell.ipc.ts  dialog.ipc.ts  watch.ipc.ts  terminal.ipc.ts  browser.ipc.ts  git.ipc.ts  design.ipc.ts  debug.ipc.ts  runtime.ipc.ts
  components/ (Toast, ProjectLogo, git/DiffView, EmptyState ...)   constants/ (project-colors, dnd, ...)
  hooks/  services/(dialog, toast, unsaved, file-watcher, document...)  stores/(code.store slices, branch-scope, scope-stats)  types/  utils/
```

Lý do chọn: theo đúng mục 4 của đề bài (feature/component/hook/service) + bổ sung `shared/ipc` để mọi `window.api` ngoài agent có điểm vào có kiểu. Hướng loại: gom tất cả store vào `shared/stores` (làm phình shared); cấm hoàn toàn IPC ngoài handler (không khả thi: `Terminal.tsx` 26 lần, `Browser.tsx` 34 lần gọi IPC bản chất).

### 2.3 Quy ước đặt tên & quy tắc phụ thuộc

**Bảng domain (cùng tên ở mọi tầng; file/thư mục dạng kebab-case số ít, namespace `codeApi` dạng camelCase số nhiều):**

| Domain       | Route server                                   | Service server           | `codeApi`               | Store/UI                                                           |
| ------------ | ---------------------------------------------- | ------------------------ | ----------------------- | ------------------------------------------------------------------ |
| project      | `project.route.ts`                             | `project.service.ts`     | `projects`              | `shared/stores/code.store` (slice `projects`), `features/projects` |
| worktree     | `project.route.ts` (`/projects/:id/worktrees`) | `worktree.service.ts`    | `worktrees`             | `features/projects`, `features/git`                                |
| session      | `session.route.ts`                             | `session.service.ts`     | `sessions`              | `features/workspace`, `features/projects/SessionCard`              |
| scope        | `scope.route.ts`                               | `scope.service.ts`       | `scopes`                | `shared/stores/branch-scope.store`                                 |
| task         | `task.route.ts`                                | `task.service.ts`        | `tasks`                 | `features/tasks`                                                   |
| workflow     | `task.route.ts` (`/tasks/:id/workflow`)        | `workflow.service.ts`    | `workflows`             | `features/workflow`, `agent/stores/workflow.store`                 |
| fs           | `fs.route.ts`                                  | `services/fs/*`          | `fs`                    | `features/file-explorer`                                           |
| git          | `git.route.ts`                                 | `services/git/*`         | `git`                   | `features/git`                                                     |
| pull-request | `pull-request.route.ts`                        | `services/pull-request/` | `pullRequests` (← `pr`) | `features/pull-request`                                            |
| search       | `search.route.ts`                              | `services/search/`       | `search`                | `features/search`                                                  |

Đổi tên duy nhất có hợp đồng: `pr` → `pull-request(s)` (V26). Quy tắc tên: `<domain>.route.ts`, `<domain>.service.ts`, `<entity>.repository.ts`; UI: `Component.tsx` (một component chính/file), `useXxx.ts`, `<name>.service.ts`, `<name>.store.ts`, `<name>.util.ts`, `<name>.types.ts`, `<name>.constants.ts`, `<name>.ipc.ts`.

**Server — phụ thuộc một chiều:**
`routes → http, services, domain` · `services → infra, repositories, domain, http/guard(types)` · `repositories → database, domain` · `http → (không import services/repositories)` · `infra → (không import gì của app)`.
Service gọi service chỉ theo DAG: `project → worktree`, `session → worktree`, `scope → git/default-branch`, `git-explorer → git-status + default-branch`, `git-remote → default-branch`. Helper dùng chung nhiều domain đặt ở `infra/` hoặc `domain/`, **không** đặt trong một service.
Mọi route chạm fs/git đi qua `http/guard.safePath` (đọc tham số bằng helper `params`); git chạy qua `infra/git-runner`, gh qua `infra/gh-runner`, rg qua `infra/process-runner`; không `execFileSync`.

**UI — phụ thuộc một chiều:**
`app → features → shared`; `agent → shared` (+ `features/*/index.ts`); `shared` không import `features/app/agent`.
Feature A chỉ import feature B qua `features/B/index.ts`. Component chỉ render + gắn sự kiện; fetch/logic ở `hooks/` + `services/`; `codeApi` chỉ gọi trong `services/`, `hooks/`, `stores/`. `window.api` chỉ trong `shared/ipc/*` và `agent/tools/**/*.handler.ts`.
Giới hạn kích thước: component ≤ 300 dòng, hook ≤ 250, service ≤ 300 (ngoại lệ ghi chú trong PR).

> **Điều chỉnh quy tắc mục 4 đề bài (có lý do):** "chỉ `*.handler.ts` được gọi IPC" giữ nguyên cho `agent/tools`, nhưng phần còn lại của UI được gọi IPC **qua `shared/ipc/*.ipc.ts`** (lớp bọc có kiểu, một điểm đổi tên kênh). Lý do: 29 file đang gọi trực tiếp, trong đó `Terminal`/`Browser` gọi IPC theo bản chất. Phase 7 phải ghi điều chỉnh này vào `AGENTS.md`.

**Đồng bộ hai phía:**

- Type request/response định nghĩa **một chỗ**: `code/src/domain/api-types.ts`. UI mirror ở `shared/api/types/*.types.ts`, đầu file ghi `// Mirror of code/src/domain/api-types.ts`. Phase 7 có kiểm tra trôi lệch bằng so sánh danh sách tên export.
- Quy ước "outcome": `Outcome<T> = ({ ok: true } & T) | { ok: false; error: string; code?: string }`. Dùng cho thao tác git/pr mà thất bại là kết quả nghiệp vụ hợp lệ (conflict, nothing to commit). Lỗi hệ thống/validate vẫn ném `AppError` → `{ success:false, error }`. Thay `success`/`ok` lẫn lộn bằng đúng `ok`.
- Tham số: mọi endpoint git/pr/fs dùng `root` (không `gitRoot`).
- Khi một endpoint đổi hợp đồng, **cùng phase** sửa `codeApi`, type, và mọi nơi gọi (mục 4).

**Cạnh import chéo hiện tại và cách xử lý (V19):**

| File đích (bị import sâu)                                                                                                          | Bị import bởi                                                                    | Xử lý                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `git/components/DiffView.tsx`                                                                                                      | `file-explorer/modals/RemoteDiffModal.tsx`                                       | chuyển `shared/components/git/DiffView.tsx`                                                           |
| `git/components/EmptyState.tsx`                                                                                                    | `file-explorer/ExplorerSearch.tsx`                                               | chuyển `shared/components/EmptyState.tsx`                                                             |
| `git/components/scope/scopeBadges.ts`                                                                                              | `file-explorer/ExplorerSearch.tsx`                                               | chuyển `shared/utils/scope-badges.util.ts`                                                            |
| `git/utils/graph.util.ts`                                                                                                          | `pull-request/PrAvatar.tsx`                                                      | xác minh phần dùng; nếu generic → `shared/utils/graph.util.ts`, nếu không → export qua `git/index.ts` |
| `git/components/modals/{BranchScopeModal,ConfirmDeleteBranchModal,ConfirmUnlinkBranchModal,CreateBranchModal,SyncBranchModal}.tsx` | `projects/ProjectCard.tsx`, `projects/ProjectPanel.tsx`                          | export từ `features/git/index.ts`                                                                     |
| `projects/components/ProjectLogo.tsx`                                                                                              | `git/modals/TreeUIPreview.tsx`                                                   | chuyển `shared/components/ProjectLogo.tsx`                                                            |
| `projects/…/ProjectCard.tsx`                                                                                                       | `pull-request/PullRequestView.tsx`                                               | export từ `features/projects/index.ts`                                                                |
| `projects/…/SessionCard.tsx`, `modals/CreateProjectModal.tsx`, `modals/OpenProjectModal.tsx`                                       | `workspace/WorkspacePanes.tsx`, `WorkspaceViews.tsx`, `WorkspaceEmptyStates.tsx` | export từ `features/projects/index.ts`                                                                |
| `tasks/…/ConfirmForceStartTaskModal.tsx`                                                                                           | `projects/ProjectPanel.tsx`                                                      | export từ `features/tasks/index.ts`                                                                   |
| `tasks/constants/status-meta.constants.ts`                                                                                         | `projects/modals/AssignTaskModal.tsx`                                            | export từ `features/tasks/index.ts`                                                                   |
| `tasks/utils/task-drag.util.ts` (0 dòng!)                                                                                          | `projects/SessionCard.tsx`                                                       | khôi phục nội dung, chuyển `shared/constants/dnd.constants.ts`                                        |
| `workspace/components/WorkspacePanes.tsx`, `hooks/useWorkspaceSettings.ts`                                                         | `settings/components/Layout.tsx`                                                 | export từ `features/workspace/index.ts`                                                               |
| `debug/stores/debug.store.ts`                                                                                                      | `workspace/WorkspaceViews.tsx`                                                   | export từ `features/debug/index.ts`                                                                   |
| `design/stores/design.store.ts`                                                                                                    | `workspace/Design.tsx`, `Zen.tsx`                                                | export từ `features/design/index.ts`                                                                  |

### 2.4 Danh sách endpoint đích + ánh xạ `codeApi` + type dùng chung

**Nguyên tắc:** 105 endpoint hiện có giữ nguyên (ánh xạ ở bảng 1.3 vẫn đúng) trừ các thay đổi sau. Ưu tiên endpoint theo use-case màn hình; thao tác ghi giữ mỗi hành động một endpoint.

| #   | Thay đổi                                       | Trước → Sau                                                                                                                                                  | `codeApi` / type                                                                                                                               | Phase   | Điều kiện                                                                          |
| --- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------- |
| E1  | Hợp nhất 3 request/project thành 1             | `POST /git/fetch` + `GET /git/branches` + `GET /git/status` (ở `ProjectPanel.tsx:204-217`) → `GET /git/branch-overview?root&fetch=0\|1` trả `BranchOverview` | `codeApi.git.branchOverview(root, {fetch})`; `BranchOverview { current; defaultBranch; local: {name; worktreePath?}[]; remoteOnly: string[] }` | P5      | giữ `GET /git/branches` nếu còn nơi gọi khác (Executor grep trước)                 |
| E2  | Một nguồn default-branch                       | `GET /git/default-branch` (git-extra) → dùng `resolveDefaultBranch`; đồng thời đưa `defaultBranch` vào `explorer-state` và `branch-overview`                 | `ExplorerState.defaultBranch`; bỏ effect ở `FileExplore.tsx:1260-1280`                                                                         | P3 + P5 | xác nhận kết quả hai thuật toán trên repo không có `origin` (mục 7)                |
| E3  | Bỏ lệnh gọi remote-diff riêng của FileExplorer | `GET /git/remote-diff` (`FileExplore.tsx:1366`) → lấy từ `explorer-state` (server đã tính `stats.diff` qua `loadRemoteDiff`, `git-explorer.service.ts:148`)  | `ExplorerState.stats.diff`                                                                                                                     | P5      | chỉ làm nếu xác nhận hai nguồn trùng nhau (mục 7)                                  |
| E4  | `gitRoot` → `root`                             | `GET /git/status?gitRoot`, `GET /git/ignored-paths?gitRoot` → `?root`                                                                                        | `codeApi.git.status/ignoredPaths`                                                                                                              | P5      | xác nhận server đang đọc `gitRoot` (mục 7)                                         |
| E5  | `pr` → `pull-requests`                         | `/pr/*` → `/pull-requests/*`; `codeApi.pr` → `codeApi.pullRequests`                                                                                          | 2 file UI gọi (`PullRequestPanel`, … — Executor grep)                                                                                          | P5      | —                                                                                  |
| E6  | `saveAll` không còn xóa ngầm                   | `PUT /projects` (xóa project vắng) → upsert-only; xóa chỉ qua `DELETE /projects/:id`                                                                         | `codeApi.projects.saveAll` giữ, thêm gọi `remove` ở thao tác xóa                                                                               | P5      | phải sửa `removeProjectFromStore` (`ProjectPanel.tsx:1186`) và mọi chỗ xóa project |
| E7  | Outcome thống nhất                             | mọi thao tác ghi git/pr trả `Outcome<T>`                                                                                                                     | `shared/api/types/outcome.types.ts`                                                                                                            | P5      | migrate theo lô ≤5 file                                                            |
| E8  | Chuyển handler cho đúng domain                 | `POST /projects/logo/download` từ `fs.route.ts:168` → `project.route.ts` (path giữ nguyên)                                                                   | `codeApi.fs.downloadLogo` → `codeApi.projects.downloadLogo`                                                                                    | P3 + P5 | —                                                                                  |
| E9  | Xóa endpoint chết                              | `/groups*` (5), `GET /sessions`, `GET /sessions/:id`, `GET /projects/:id/worktrees/:worktreeId`                                                              | xóa phương thức `codeApi` không dùng (18)                                                                                                      | P6      | chỉ sau khi xác nhận (mục 7)                                                       |
| E10 | Siết bảo mật                                   | bind `127.0.0.1`, allowlist CORS, token tùy chọn, `trusted` chỉ hợp lệ khi có token                                                                          | header `Authorization` trong `shared/api/client.ts`                                                                                            | P1      | token cần `src/main` (mục 5)                                                       |

Type dùng chung (nguồn → mirror): `Outcome`, `FileStatus`, `DirEntry`, `TreeNode`, `FileStat`, `SquareImage`, `GitStatusPayload`(=`GitStatusResult`), `ExplorerState`, `BranchOverview`, `CodeProject/Worktree/Session/Task/Workflow` (hiện nằm trong `code.api.ts:3-148`) → `domain/api-types.ts` ↔ `shared/api/types/{project,session,task,workflow,fs,git,pull-request,search,outcome}.types.ts`.

### 2.5 Sơ đồ tách các màn hình lớn

**Projects — `ProjectPanel.tsx` (3.446 dòng) → container ≤ 250 dòng.** Đã đọc banner/hook; vùng và đơn vị đích:

| Vùng nguồn (dòng)                                                 | Đơn vị đích                                                                                                                                                                          |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `131-190` accent/types/SORTS                                      | `projects/utils/accent.util.ts`, `projects/types/project-panel.types.ts`                                                                                                             |
| `192-296` màu, `mkSum`, `fetchRealBranches`, `seedProject`        | `shared/constants/project-colors.ts` (khử trùng `ProjectCard.tsx:268`), `projects/services/project-branches.service.ts` (→ thay bằng E1 ở P5), `projects/utils/seed-project.util.ts` |
| `298-432` `MenuLabel/ck/GroupHeader`                              | `components/ProjectPanel/GroupHeader.tsx`, `menu-helpers.tsx`                                                                                                                        |
| `435-455` layout persistence                                      | `projects/services/project-layout.service.ts` + `hooks/useProjectLayout.ts`                                                                                                          |
| `479-578`, `1605-1623`, `2161-2193` nhóm                          | `hooks/useProjectGroups.ts` (bỏ state `groups` trùng)                                                                                                                                |
| `579-683` ≈14 `useState` modal/target                             | `hooks/useProjectDialogs.ts` (một union `{kind, payload}` + `open/close`)                                                                                                            |
| `684-842` updater, `validateAndPrune`, `patchSession`             | `hooks/useProjectMutations.ts` (bỏ `projects` local `:475`, dùng store `:457`)                                                                                                       |
| `843-878` lọc + sắp xếp + dropdown                                | `hooks/useProjectListView.ts`                                                                                                                                                        |
| `879-1137` mở rộng/chọn project, chọn session, toggle Git/PR/Task | `hooks/useProjectSelection.ts`                                                                                                                                                       |
| `1138-1366` project actions                                       | `hooks/useProjectActions.ts`                                                                                                                                                         |
| `1367-1534` branch actions                                        | `hooks/useBranchActions.ts`                                                                                                                                                          |
| `1535-1604` task actions                                          | `hooks/useProjectTaskActions.ts`                                                                                                                                                     |
| `1624-1889` engine kéo-thả                                        | `hooks/useProjectDnd.ts` + `utils/dnd.util.ts` (phần thuần)                                                                                                                          |
| `1957-2124` target lock đa cửa sổ                                 | `hooks/useProjectConflict.ts`                                                                                                                                                        |
| `2194-3446` render (≈1.250 dòng)                                  | `ProjectPanel.tsx` + `ProjectToolbar.tsx` + `ProjectList.tsx` + `ProjectGroupSection.tsx` + `ProjectDialogs.tsx` (Executor đọc `2194-3446` theo 3 đoạn rồi chốt ranh giới)           |

Endpoint nuôi màn hình: `GET /projects`, `PUT /projects` (E6), `GET /git/branch-overview` (E1), `GET/POST /sessions`, `GET /projects/:id/tasks`. Store: slice `projects` (nguồn duy nhất), `branch-scope.store`.

**File Explorer — `FileExplore.tsx` (2.467 dòng) → `FileExplorer.tsx` (đổi tên, sửa lỗi chính tả).**

| Vùng nguồn (dòng)                                                                                     | Đơn vị đích                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `65-260` helper, `scanDirectory`, `lazyNodeRegistry`, caches, `refreshProjectTree`, `useTreeScanning` | `services/file-tree.service.ts` + `services/file-tree.cache.ts` (thay 7 Map/Set cấp module bằng một cache có khóa `projectId`) + `hooks/useFileTree.ts` |
| `262-320` context                                                                                     | `FileExplorerContext.ts`                                                                                                                                |
| `321-457` `InlineNewInput/InlineRenameInput`                                                          | `components/InlineNewInput.tsx`, `components/InlineRenameInput.tsx`                                                                                     |
| `458-475` bộ đếm render debug                                                                         | xóa                                                                                                                                                     |
| `476-1034` `TreeNode` (+ context-menu actions `674-…`)                                                | `components/TreeNode.tsx` + `hooks/useTreeNodeActions.ts`                                                                                               |
| `1035-1195` `ScopeLayout/GutterDot/SelectionBlocks/BorderRun`                                         | `components/ScopeGutter.tsx`, `utils/scope-runs.util.ts`                                                                                                |
| `1196-1538` `useActiveBranchName/TreeNodeGate/useScopesBelow/ScopeBlocks`                             | `components/ScopeBlocks.tsx` + `hooks/useScopesBelow.ts`                                                                                                |
| `1546-1585` nạp scope                                                                                 | `hooks/useExplorerScope.ts`                                                                                                                             |
| `1586-1640` file watcher                                                                              | `hooks/useExplorerWatcher.ts` (IPC qua `shared/ipc/watch.ipc.ts`)                                                                                       |
| `1641-1716` click/multi-select                                                                        | `hooks/useExplorerSelection.ts`                                                                                                                         |
| `1717-1902` delete/clipboard                                                                          | `hooks/useExplorerClipboard.ts` + `services/explorer-ops.service.ts`                                                                                    |
| `1903-1988` phím tắt                                                                                  | `hooks/useExplorerShortcuts.ts`                                                                                                                         |
| `1989-2065` git state (explorerState)                                                                 | `hooks/useExplorerGitState.ts`                                                                                                                          |
| `2066-2196` auto-reveal                                                                               | `hooks/useRevealActiveFile.ts`                                                                                                                          |
| `2200-2467` toolbar, loading/empty, render                                                            | `components/ExplorerToolbar.tsx` + `FileExplorer.tsx` (≤300)                                                                                            |

Endpoint: `GET /fs/list-dir`, `POST /fs/{write-file,mkdir,rename,copy}`, `DELETE /fs/{delete-file,remove-dir}`, `GET /git/explorer-state` (+E2/E3), `GET /git/default-branch` (bỏ ở E2), `POST /git/fetch`.

**Các màn hình còn lại** (ranh giới đã đo; Bước 0 của mỗi task là Executor chạy script lập bản đồ ở mục 6 để chốt chi tiết trước khi tách):

| Màn hình                                                                                        | Hiện trạng đã đo                                                                                                                    | Đích                                                                                                                                               |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Git — `GitView.tsx` 1.188                                                                       | `VirtualRow 66`, `BranchRow 173`, `CommitRow 231`, `GitView 354-1188`; 15 `codeApi`, 13 `console.log`                               | `components/graph/{VirtualRow,BranchRow,CommitRow}.tsx`, `hooks/{useGitLog,useGitGraph,useGitSelection}.ts`, `GitView.tsx` ≤250; xóa `console.log` |
| Git — `SyncBranchModal.tsx` 1.579                                                               | `SyncDiffPanel 133`, `WarningBox 235`, `Checkbox 318`, `Counts 344`, main `354-1579`; IPC `git:branch-sync-*`, `git:unpushed-files` | `modals/SyncBranch/{SyncBranchModal,SyncDiffPanel,WarningBox,SyncCounts}.tsx` + `hooks/useSyncPreview.ts`; IPC qua `shared/ipc/git.ipc.ts`         |
| Projects — `ProjectCard.tsx` 1.341                                                              | 8 component ở `221-800+`                                                                                                            | `components/ProjectCard/{ProjectCard,BranchBlock,CollapsedTree,BranchScopeButton,badges}.tsx`                                                      |
| Projects — `OpenProjectModal.tsx` 1.510                                                         | `ProjectDetailPanel 230`, `Field 536`, `NewRepositoryForm 561`; `TECH_DOMAIN_MAP/LANG_COLORS/TONE_*` đầu file                       | `modals/OpenProject/{OpenProjectModal,ProjectDetailPanel,NewRepositoryForm}.tsx` + `constants/tech-domain.constants.ts`                            |
| Tasks — `TaskModal.tsx` 1.327                                                                   | main `115-940`; `Select 940, Section 998, DateTimeField 1021, StatusTimeline 1098, TaskCard 1157, TaskPicker 1227, IconButton 1309` | `components/modals/TaskModal/*` (7 component phụ → file riêng) + `hooks/useTaskForm.ts`                                                            |
| Workspace — `WorkspaceViews.tsx` 1.384, `WorkspacePanes.tsx` 1.058                              | 1 component/19 `useEffect`; `Terminal.tsx` (26 IPC), `Browser.tsx` (34 IPC)                                                         | tách theo loại panel + `shared/ipc/{terminal,browser}.ipc.ts`                                                                                      |
| App — `FooterBar.tsx` 973, `Headerbar.tsx` 663, `ContentPanel.tsx` 591, `ActivityPanel.tsx` 537 | `FooterBar` có ≥11 component tooltip                                                                                                | `app/layout/footer/{GitOverviewTooltip,GitGroupTooltip,...}.tsx`                                                                                   |
| Store — `code.store.ts` 1.340                                                                   | ≥13 vùng action + `PersistStorage` tùy biến                                                                                         | `shared/stores/code/{projects,file-tabs,panels,file-tree,save,design,agent-group,mcp,content-view,zen}.slice.ts` + `projects.persist.ts`           |

## 3. Bảng ánh xạ file cũ → file mới

Chỉ liệt kê file có thay đổi; file không nêu = giữ nguyên (repositories ×12, `database/*`, `domain/mappers.ts`, `routes/{group,scope,session,task,project}.route.ts` chỉ sửa import khi cần).

### 3.1 Server (`code/src`)

| Hành động   | Cũ                                                                                       | Mới                                                                                                                  | Ghi chú / import cần cập nhật                                                                                                                                                                                     |
| ----------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| edit        | `index.ts`                                                                               | `index.ts`                                                                                                           | rút còn bootstrap; log `[DEBUG]` xóa (V11)                                                                                                                                                                        |
| create      | —                                                                                        | `app.ts`                                                                                                             | chuyển cors/json/health/routes/errorHandler từ `index.ts:9-29`                                                                                                                                                    |
| edit        | `config/server.config.ts`                                                                | idem                                                                                                                 | thêm `host`, `allowedOrigins`, `token`; bỏ comment `ASSUMED`                                                                                                                                                      |
| move        | `utils/http.ts`                                                                          | `http/envelope.ts`                                                                                                   | để shim `utils/http.ts` re-export trong lúc migrate; importer: mọi `routes/*`, `services/*` dùng `AppError/newId/json/handle`                                                                                     |
| create      | —                                                                                        | `http/params.ts`, `http/sse.ts`, `http/auth.ts`                                                                      | gom parse trong `git.route.ts:30-44,204-225`, `fs.route.ts:72-144`, `search.route.ts:10-47`                                                                                                                       |
| move        | `utils/guard.ts`                                                                         | `http/guard.ts`                                                                                                      | bỏ import `worktreeRepository` → `registerRootProvider()`; importer: `routes/{fs,git,pr,search}.route.ts`, `services/{fs-read,worktree,project,session,task,scope,…}.service.ts` dùng `found/requireString/param` |
| create      | —                                                                                        | `infra/process-runner.ts`                                                                                            | nền cho git/gh/rg                                                                                                                                                                                                 |
| move        | `services/git-runner.ts`                                                                 | `infra/git-runner.ts`                                                                                                | importer: toàn bộ `services/git-*.service.ts`, `git.service.ts`                                                                                                                                                   |
| create      | —                                                                                        | `infra/gh-runner.ts`                                                                                                 | tách `runCmd/ghJson` khỏi `pr.service.ts:31-80`                                                                                                                                                                   |
| create      | —                                                                                        | `domain/api-types.ts`                                                                                                | type dùng chung (V12)                                                                                                                                                                                             |
| move        | `services/pr.service.ts`                                                                 | `services/pull-request/pull-request.service.ts`                                                                      | importer `routes/pr.route.ts`                                                                                                                                                                                     |
| move        | `routes/pr.route.ts`                                                                     | `routes/pull-request.route.ts`                                                                                       | importer `routes/routes.ts:8,18`                                                                                                                                                                                  |
| move        | `services/fs.service.ts`                                                                 | `services/fs/fs-write.service.ts`                                                                                    | importer `routes/fs.route.ts`                                                                                                                                                                                     |
| move        | `services/fs-read.service.ts`                                                            | `services/fs/fs-query.service.ts`                                                                                    | importer `routes/fs.route.ts`                                                                                                                                                                                     |
| move        | `services/image.service.ts`                                                              | `services/fs/image.service.ts`                                                                                       | importer `routes/fs.route.ts` (+ `project.route.ts` ở E8)                                                                                                                                                         |
| move        | `services/search.service.ts`                                                             | `services/search/search.service.ts`                                                                                  | importer `routes/search.route.ts`                                                                                                                                                                                 |
| move+split  | `services/git.service.ts`                                                                | `services/git/git-status.service.ts`                                                                                 | type `FileStatus` → `domain/api-types.ts`                                                                                                                                                                         |
| split       | `services/git-read.service.ts` (526)                                                     | `git-branch.service.ts`, `git-history.service.ts`, `git-diff.service.ts`, `git-repo.service.ts`, `language-stats.ts` | `LANGUAGE_BY_EXT` `:17-44` → `language-stats.ts`; `lines`/`failure` → `infra/git-runner.ts`                                                                                                                       |
| split       | `services/git-write.service.ts` (190)                                                    | `git-write.service.ts`, `git-protect.service.ts`, `default-branch.ts`                                                | hooks `:23-66,141-181` → protect; `resolveDefaultBranch` `:7-21` → `default-branch.ts` (importer: `git-explorer`, `git-remote`, `scope.service`)                                                                  |
| delete      | `services/git-extra.service.ts`                                                          | —                                                                                                                    | route `/git/default-branch` gọi `default-branch.ts` (E2)                                                                                                                                                          |
| move        | `services/git-remote.service.ts`, `git-explorer.service.ts`                              | `services/git/…`                                                                                                     | importer `routes/git.route.ts`                                                                                                                                                                                    |
| edit        | `services/worktree.service.ts`                                                           | idem                                                                                                                 | `detectBranch` → async qua `git-runner` (V07); importer `project.service.ts:16`, `session.service.ts:11`                                                                                                          |
| edit        | `routes/git.route.ts`, `fs.route.ts`, `search.route.ts`, `project.route.ts`              | idem                                                                                                                 | dùng `params`; `search` + `safePath`; E8                                                                                                                                                                          |
| delete (P6) | `routes/group.route.ts`, `services/group.service.ts`, `repositories/group.repository.ts` | —                                                                                                                    | **chỉ sau khi V10 xác nhận**; kiểm `domain/mappers.ts` và `database/connection.ts` còn bảng/ánh xạ group                                                                                                          |

### 3.2 UI (`modules/Code`)

| Hành động    | Cũ                                                                                                                             | Mới                                                                                                        | Ghi chú                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| split        | `shared/api/code.api.ts` (637)                                                                                                 | `shared/api/{client.ts, code.api.ts, types/*.types.ts, endpoints/*.api.ts}`                                | `codeApi` giữ nguyên tên export; 48 file UI import không đổi                        |
| create       | —                                                                                                                              | `shared/ipc/*.ipc.ts` (10 file)                                                                            | thay 29 file gọi `window.api`                                                       |
| move         | `features/git/components/DiffView.tsx`                                                                                         | `shared/components/git/DiffView.tsx`                                                                       | importer `RemoteDiffModal.tsx` + nội bộ git                                         |
| move         | `features/git/components/EmptyState.tsx`                                                                                       | `shared/components/EmptyState.tsx`                                                                         | importer `ExplorerSearch.tsx` + nội bộ git                                          |
| move         | `features/git/components/scope/scopeBadges.ts`                                                                                 | `shared/utils/scope-badges.util.ts`                                                                        | importer `ExplorerSearch.tsx` + nội bộ git                                          |
| move         | `features/projects/components/ProjectLogo.tsx`                                                                                 | `shared/components/ProjectLogo.tsx`                                                                        | importer `TreeUIPreview.tsx` + nội bộ projects; cache `ProjectLogo.tsx:6-7` đi cùng |
| move         | `shared/services/task.service.ts`                                                                                              | `features/tasks/services/task.service.ts` + `utils/schedule.util.ts` + `shared/services/dialog.service.ts` | 25 file import (agent, projects, tasks) — dùng shim                                 |
| move         | `shared/utils/workspace-layout.util.ts`                                                                                        | `features/workspace/utils/`                                                                                | 7 importer gồm `settings` → qua `workspace/index.ts`                                |
| move         | `shared/hooks/useGitFileStatus.ts`                                                                                             | `features/git/hooks/`                                                                                      | importer 2 file `workspace` → qua `git/index.ts`                                    |
| move         | `shared/utils/{detect-stack,ai-agent-detector}.util.ts`                                                                        | `features/projects/utils/`, `features/workspace/utils/`                                                    | mỗi file 1 importer                                                                 |
| split        | `features/projects/components/ProjectPanel/ProjectPanel.tsx`                                                                   | xem 2.5                                                                                                    | ≈14 hook + ≈5 component                                                             |
| split        | `ProjectCard.tsx`, `SessionCard.tsx`, `modals/OpenProjectModal.tsx`, `modals/CreateProjectModal.tsx`                           | xem 2.5                                                                                                    | —                                                                                   |
| rename+split | `file-explorer/components/FileExplore.tsx`                                                                                     | `FileExplorer.tsx` + 12 file (2.5)                                                                         | sửa `file-explorer/index.ts` và importer                                            |
| split        | `git/components/GitView.tsx`, `modals/SyncBranchModal.tsx`, `modals/BranchScopeModal.tsx`(712), `modals/SyncFileDiffModal.tsx` | xem 2.5                                                                                                    | `SyncFileDiffModal` là file mồ côi → xóa                                            |
| split        | `workspace/components/{WorkspaceViews,WorkspacePanes,Terminal,Browser,Design}.tsx`                                             | theo loại panel                                                                                            | Bước 0 lập bản đồ                                                                   |
| split        | `tasks/components/modals/TaskModal.tsx`, `TaskManager.tsx`, `TaskTable.tsx`                                                    | xem 2.5                                                                                                    | —                                                                                   |
| split        | `app/layout/{FooterBar,Headerbar,ContentPanel,ActivityPanel}.tsx`                                                              | `app/layout/<vùng>/`                                                                                       | —                                                                                   |
| split        | `shared/stores/code.store.ts` (1.340)                                                                                          | `shared/stores/code/*.slice.ts` + `projects.persist.ts`                                                    | `useCodeStore` giữ nguyên export (55 importer)                                      |
| merge        | `design/templates/{mobile,website}/*` (12 file)                                                                                | `design/templates/*` (6 file)                                                                              | `template-files.util.ts` bỏ glob mobile, `platform` chỉ đổi graph                   |
| delete       | 9 file mồ côi (V22)                                                                                                            | —                                                                                                          | `CodeSkeleton.tsx` và `CodeModule.ts` cần xác nhận importer ngoài module            |
| edit         | `features/tasks/utils/task-drag.util.ts` (0 dòng)                                                                              | `shared/constants/dnd.constants.ts`                                                                        | khôi phục `TASK_DRAG_TYPE` từ nguồn gốc                                             |

## 4. Kế hoạch theo phase

**Quy ước chung cho mọi task** (không lặp lại ở từng task):

- **Lệnh kiểm tra chuẩn:** `L1` = `cd code && npx tsc --noEmit` (sạch); `L2` = `npx tsc --noEmit -p tsconfig.web.json` (không lỗi mới; bỏ qua lỗi có sẵn ở `RunCommandExecutor.ts`). Task chỉ chạm một phía chạy lệnh phía đó, task `cả hai` chạy cả hai.
- **Hoàn tác chung:** mỗi task = 1 commit; hoàn tác bằng `git revert <commit>`. Rủi ro đặc thù ghi riêng.
- **Mẫu di chuyển an toàn (shim):** file chuyển chỗ để lại shim `export * from '<đường dẫn mới>'` ở vị trí cũ → task lô sau sửa importer (≤5 file/lượt) → task cuối xóa shim. Importer đầy đủ lấy bằng `grep -rn "<tên module>"`.
- **Bước 0 cho mọi task tách file lớn:** chạy script lập bản đồ (mục 6) trên file nguồn, đối chiếu với bảng 2.5, rồi mới tách. Không đổi hành vi, không format lại phần code giữ nguyên.
- Ràng buộc ≤5 file ghi tính cả file tạo mới, file sửa import và file shim.

### Phase 1: Nền tảng & an toàn

- **Mục tiêu:** hạ tầng HTTP/process dùng chung, đóng V01–V03, V07, V12, tạo nền cho client `codeApi` và IPC. **Vấn đề:** V01, V02, V03, V07, V11, V12, V20 (nền). **Phụ thuộc:** không.

#### Task 1.1 — Siết mặc định server (E10)

- Phía: server. File: `index.ts`, `config/server.config.ts`, `http/auth.ts` (create). Hành động: `listen(port, host)` với `host` mặc định `127.0.0.1`; CORS theo `CODE_ALLOWED_ORIGINS` (mặc định: origin của renderer dev/prod, xác nhận ở mục 7); `requireToken` bật khi `CODE_TOKEN` có giá trị; `trusted=true` chỉ hiệu lực khi request qua auth (khi chưa có token thì giữ hành vi cũ + cảnh báo log).
- Endpoint: không đổi. Ảnh hưởng UI: `shared/api/code-base-url.ts` phải dùng cùng host (`127.0.0.1` vs `localhost` có thể phân giải `::1`).
- Tiêu chí: `L1`; `curl -s http://127.0.0.1:3055/health` OK; request từ origin lạ bị từ chối CORS. Rủi ro: UI không kết nối nếu host lệch → hoàn tác commit; có thể đặt `CODE_HOST=0.0.0.0` tạm.

#### Task 1.2 — `search` qua guard (V02)

- Phía: server. File: `routes/search.route.ts`. Hành động: `projectPath` → `safePath(..., {withinProject:true})`; thiếu tham số → 400 bằng `requireString`; `/search/cancel` dùng `json()`.
- Tiêu chí: `L1`; tìm kiếm trong project hợp lệ vẫn stream; `projectPath=/etc` → 403. Rủi ro: project chưa đăng ký worktree bị chặn (kiểm với luồng mở project mới).

#### Task 1.3 — Gói `http/` (envelope + params)

- Phía: server. File: `http/envelope.ts` (create), `http/params.ts` (create), `utils/http.ts` (thành shim). Hành động: chuyển `AppError/json/fail/handle/errorHandler/newId`; thêm `queryBool/queryInt/queryCsv/queryJson/bodyStringArray`.
- Tiêu chí: `L1`; không đổi route. Rủi ro: thấp.

#### Task 1.4 — Guard không phụ thuộc repository (V03)

- Phía: server. File: `http/guard.ts` (create), `utils/guard.ts` (shim), `index.ts` (đăng ký `registerRootProvider(() => worktreeRepository.listAll().map(w => w.path))`). Hành động: `safePath` nhận provider thay vì import repository.
- Tiêu chí: `L1`; `grep -rn "repositories" code/src/http code/src/utils` rỗng; hành vi `withinProject` giữ nguyên. Rủi ro: quên đăng ký provider → mọi route `withinProject` trả 403 (có test `curl` ở tiêu chí).

#### Task 1.5 — Runner tiến trình & SSE

- Phía: server. File: `infra/process-runner.ts` (create), `infra/git-runner.ts` (move + dùng process-runner, thêm `lines`/`failure` helper), `services/git-runner.ts` (shim), `http/sse.ts` (create). Tiêu chí: `L1`. Rủi ro: thay đổi `maxBuffer`/env — giữ đúng `10 MB` và `GIT_CEILING_DIRECTORIES` như `git-runner.ts:11-14`.

#### Task 1.6 — Type dùng chung server (V12)

- Phía: server. File: `domain/api-types.ts` (create), `services/fs.service.ts`, `services/fs-read.service.ts`, `services/git.service.ts`, `services/image.service.ts` (import type). Tiêu chí: `L1`. Rủi ro: thấp.

#### Task 1.7 — Client HTTP của UI

- Phía: UI. File: `shared/api/client.ts` (create: `request`, envelope, header `Authorization` nếu có token), `shared/api/code-base-url.ts`, `shared/api/code.api.ts` (dùng client). Ảnh hưởng: `src/main` cấp token (mục 5) — nếu chưa có thì không gửi header. Tiêu chí: `L2`; ứng dụng chạy bình thường.

#### Task 1.8 — Tách type của `code.api.ts` (1/2)

- Phía: UI. File: `shared/api/types/{project,session,task,workflow}.types.ts` (create), `code.api.ts` (import + re-export). Nguồn: `code.api.ts:3-148`. Tiêu chí: `L2`; tên export giữ nguyên. Rủi ro: thấp.

#### Task 1.9 — Tách type của `code.api.ts` (2/2)

- Phía: UI. File: `shared/api/types/{fs,git,search,outcome}.types.ts` (create), `code.api.ts`. Nguồn: `code.api.ts:149-218`. Hành động: khử `DirEntry`/`FileStat`/`TreeNode`/`SquareImage` trùng (V12), header `// Mirror of code/src/domain/api-types.ts`. Tiêu chí: `L2`.

#### Task 1.10 — Tách endpoint của `code.api.ts` (1/3: entity)

- Phía: UI. File: `shared/api/endpoints/{projects,sessions,worktrees,tasks,workflows}.api.ts` (create — 5 file; việc nối vào `code.api.ts` làm ở 1.12). Nguồn: `code.api.ts:229-278`.

#### Task 1.11 — Tách endpoint (2/3: fs, search, scopes)

- File: `endpoints/{fs,search,scopes}.api.ts`. Nguồn: `code.api.ts:279-345,540-637`; gộp `fs.readDir` vào `listDir` (V26) nếu không đổi kết quả (kiểm `code.api.ts:282-285`).

#### Task 1.12 — Tách endpoint (3/3: git, pr) và compose

- File: `endpoints/{git,pr}.api.ts` (create), `code.api.ts` (chỉ còn compose `codeApi = { health, projects, … }`). Nguồn: `code.api.ts:346-539`. Tiêu chí: `L2`; `grep -c "codeApi\." ` số phương thức vẫn 93. Rủi ro: thiếu phương thức → TS báo ngay.

### Phase 2: Di chuyển & đổi tên (chưa đổi hành vi)

- **Mục tiêu:** gom file theo domain/feature, cắt import chéo. **Vấn đề:** V03, V19, V24, V25, V26. **Phụ thuộc:** Phase 1.

#### Task 2.1 — `default-branch.ts` ra khỏi git-write (server)

- File: `services/git/default-branch.ts` (create), `services/git-write.service.ts`, `git-explorer.service.ts`, `git-remote.service.ts`, `scope.service.ts` (đổi import). Tiêu chí: `L1`. Chưa hợp nhất thuật toán (làm ở 3.x).

#### Task 2.2 — Gom nhóm git (1/2)

- File: move `git.service.ts`→`services/git/git-status.service.ts`, `git-read.service.ts`→`services/git/git-read.service.ts`, `git-remote.service.ts`→`services/git/`, `routes/git.route.ts` (import). Tiêu chí: `L1`.

#### Task 2.3 — Gom nhóm git (2/2) + fs + search + pr

- Chia thành 2.3a (`git-explorer`, `git-extra`, `git-write` → `services/git/`, `git.route.ts`, `scope.service.ts` import), 2.3b (fs ×3 → `services/fs/`, `fs.route.ts`), 2.3c (`search.service.ts`, `search.route.ts`), 2.3d (`pr.service.ts`/`pr.route.ts` → `pull-request/`, `routes.ts`). Mỗi mục là một task ≤5 file. Tiêu chí: `L1`.

#### Task 2.4 — Hạ `shared` ↔ `features` (UI, 1/3)

- File: move `DiffView.tsx`, `EmptyState.tsx`, `scopeBadges.ts` → `shared/…` (shim ở chỗ cũ), `ExplorerSearch.tsx`, `RemoteDiffModal.tsx` (đổi import). Tiêu chí: `L2`; `grep -rn "features/git/components" features/file-explorer` rỗng.

#### Task 2.5 — Hạ `shared` ↔ `features` (UI, 2/3)

- File: move `ProjectLogo.tsx`→`shared/components/`, `task-drag.util.ts`→`shared/constants/dnd.constants.ts` (**khôi phục nội dung** — file hiện 0 dòng, xem mục 7), `TreeUIPreview.tsx`, `SessionCard.tsx` (đổi import). Rủi ro: `TASK_DRAG_TYPE` mất → kéo-thả task hỏng; đối chiếu với nơi dùng ở `SessionCard.tsx` và `TaskTable.tsx`.

#### Task 2.6 — `index.ts` công khai cho feature (UI, 3/3)

- Lô a: `features/git/index.ts`, `projects/index.ts`, `tasks/index.ts` (+ importer `ProjectCard.tsx`, `ProjectPanel.tsx`). Lô b: `workspace/index.ts`, `debug/index.ts`, `design/index.ts` (+ importer `WorkspaceViews.tsx`, `Layout.tsx`, `Design.tsx`, `Zen.tsx`, `WorkspaceEmptyStates.tsx`, `PullRequestView.tsx`). Mỗi lô ≤5 file ghi → có thể thành 4 task. Tiêu chí: bảng "cạnh import chéo" ở 2.3 không còn dòng nào (script mục 6).

#### Task 2.7 — Tách `shared/services/task.service.ts` (V25)

- File: `features/tasks/services/task.service.ts`, `features/tasks/utils/schedule.util.ts`, `shared/services/dialog.service.ts` (create), `shared/services/task.service.ts` (shim). Importer (25 file) sửa sau theo lô ≤5. Tiêu chí: `L2`.

#### Task 2.8 — Chuyển util/hook đơn-feature

- File: `workspace-layout.util.ts`, `useGitFileStatus.ts`, `detect-stack.util.ts`, `ai-agent-detector.util.ts` về feature sở hữu (shim) — dùng bảng 3.2. Tiêu chí: `L2`.

### Phase 3: Tách trách nhiệm server

- **Mục tiêu:** route mỏng, git theo trách nhiệm, hợp nhất default-branch. **Vấn đề:** V04, V05, V07, V08. **Phụ thuộc:** Phase 1–2.

#### Task 3.1 — Route dùng `params` + guard thống nhất (fs, search)

- File: `routes/fs.route.ts`, `services/fs/fs-query.service.ts` (nhận `{start,end}` thay vì nhánh trong route), `routes/search.route.ts` (dùng `sse.ts`). Ghi chú: `fs.route.ts:72-84` đưa vào `fsQuery.read(filePath,{start,end})`. Tiêu chí: `L1`; response y hệt (so `curl` trước/sau).

#### Task 3.2 — Route git dùng `params`

- File: `routes/git.route.ts` (342 → ≈200 dòng): wrapper `projectRoot`, parse `scope`/`clones` qua `queryJson`. Hướng loại: tách 7 route file (mục 2.1). Tiêu chí: `L1`; 46 endpoint git trả cùng body với bản cũ.

#### Task 3.3 — `git-read` → 4 service

- File: `git-history.service.ts`, `git-diff.service.ts`, `git-repo.service.ts`, `language-stats.ts` (create), `git-read.service.ts` (còn `git-branch` trong 3.4). `localChanges` (`git-read.service.ts:271-377`, ≈107 dòng) tách hàm con. Tiêu chí: `L1`.

#### Task 3.4 — `git-branch.service.ts` + protect

- File: `git-branch.service.ts` (`listBranches` + `pruneOrphanBranches`), `git-protect.service.ts`, `git-write.service.ts`, `git.route.ts`, `git-read.service.ts` (xóa khi rỗng). Tiêu chí: `L1`.

#### Task 3.5 — Hợp nhất default-branch (V04)

- File: `services/git/default-branch.ts`, `routes/git.route.ts`, `services/git/git-extra.service.ts` (delete). Hành động: giữ thuật toán `resolveDefaultBranch` (`git-write.service.ts:7-21`), thêm nhánh fallback của bản extra khi không có remote (`git-extra.service.ts:9-13`: `main`/`master`/branch đầu). Tiêu chí: `L1`; so kết quả trên 3 repo: có `origin/HEAD`, có remote không có HEAD, không có remote. Rủi ro: UI hiển thị badge default sai → hoàn tác commit.

#### Task 3.6 — `pull-request` dùng `gh-runner`

- File: `infra/gh-runner.ts`, `services/pull-request/pull-request.service.ts`. Giữ `spawn` đăng nhập (`:110,:130`) qua `process-runner.spawnStream`. Tiêu chí: `L1`; `gh auth status` vẫn chạy.

#### Task 3.7 — `detectBranch` async, bỏ `execFileSync` (V07)

- File: `services/worktree.service.ts`, `services/project.service.ts`, `services/session.service.ts` (+ nơi gọi trong chúng). Rủi ro: hàm đồng bộ được gọi trong transaction đồng bộ (DB) — kiểm `project.service.ts:45-75` trước; nếu có, tính branch trước transaction.

#### Task 3.8 — `search.service` kiểu hóa

- File: `services/search/search.service.ts` (bỏ `process: any`, dùng `process-runner.spawnStream`). Tiêu chí: `L1`.

#### Task 3.9 — Chuyển `POST /projects/logo/download` (E8, phía server)

- File: `routes/project.route.ts`, `routes/fs.route.ts`. Path giữ nguyên; UI chưa đổi.

### Phase 4: Tách trách nhiệm UI

- **Mục tiêu:** component chỉ render; hook/service/store rõ ràng. **Vấn đề:** V13–V18, V20, V21, V23, V24. **Phụ thuộc:** Phase 1–2. Server không đổi trong phase này.

#### Lớp IPC (V20)

- **4.1** tạo `shared/ipc/{fs,shell,dialog,watch}.ipc.ts` + `runtime.ipc.ts`; sửa `code-base-url.ts`.
- **4.2** `shared/ipc/{git,design,debug}.ipc.ts`, `terminal.ipc.ts`, `browser.ipc.ts`.
- **4.3–4.8** migrate 29 file gọi `window.api` theo lô ≤5 (thứ tự: `shared/services/*`, `app/layout/*`, `features/projects/*`, `features/git/*`, `features/search|pull-request|debug|design`, `features/workspace/*`). Tiêu chí: `grep -rln "window.api\|(window as any).api" . | grep -v "shared/ipc\|\.handler\.ts"` rỗng. Rủi ro: đổi tên kênh nhầm → thao tác IPC im lặng thất bại; giữ nguyên chuỗi kênh, chỉ bọc.

#### ProjectPanel (V13, V17)

- **4.9** tách types/constants/utils/services: `ProjectPanel.tsx`, `types/project-panel.types.ts`, `utils/accent.util.ts`, `services/project-layout.service.ts`, `shared/constants/project-colors.ts` (khử trùng `ProjectCard.tsx:268`).
- **4.10** `hooks/useProjectDialogs.ts`, `hooks/useProjectGroups.ts` + `ProjectPanel.tsx`.
- **4.11** `hooks/useProjectMutations.ts` (bỏ state `projects` trùng `:475`), `hooks/useProjectListView.ts` + `ProjectPanel.tsx`.
- **4.12** `hooks/useProjectSelection.ts`, `hooks/useProjectActions.ts` + `ProjectPanel.tsx`.
- **4.13** `hooks/useBranchActions.ts`, `hooks/useProjectTaskActions.ts` + `ProjectPanel.tsx`.
- **4.14** `hooks/useProjectDnd.ts`, `utils/dnd.util.ts` + `ProjectPanel.tsx`.
- **4.15** `hooks/useProjectConflict.ts` + `ProjectPanel.tsx`.
- **4.16–4.18** render: `ProjectToolbar.tsx`; `ProjectList.tsx` + `ProjectGroupSection.tsx`; `ProjectDialogs.tsx` (mỗi task + `ProjectPanel.tsx`).
- Tiêu chí mỗi task: `L2`; không đổi markup/class; `ProjectPanel.tsx` cuối ≤250 dòng. Rủi ro: dependency array của `useCallback` bị lệch khi chuyển hook → re-render/closure cũ; giữ nguyên thứ tự và phụ thuộc, kiểm bằng ESLint `react-hooks/exhaustive-deps` nếu có.

#### ProjectCard / SessionCard / OpenProjectModal

- **4.19** `ProjectCard.tsx` → `ProjectCard/{BranchBlock,CollapsedTree}.tsx` + `ProjectCard.tsx`. **4.20** `BranchScopeButton.tsx`, `badges.tsx`, `ProjectIcon.tsx` (+ gộp `gitRepoCache` vào service chung, V17). **4.21–4.22** `SessionCard.tsx` (979). **4.23–4.24** `OpenProjectModal.tsx` → `OpenProject/{ProjectDetailPanel,NewRepositoryForm}.tsx` + `constants/tech-domain.constants.ts`. **4.25** `CreateProjectModal.tsx` (503) nếu vượt 300 dòng sau khi dùng chung `Field`.

#### File Explorer (V14)

- **4.26** `services/file-tree.service.ts`, `services/file-tree.cache.ts`, `hooks/useFileTree.ts` + `FileExplore.tsx` (rename sang `FileExplorer.tsx` ở task này, sửa `index.ts`). **4.27** `InlineNewInput.tsx`, `InlineRenameInput.tsx`, `FileExplorerContext.ts`; xóa bộ đếm debug `:458-475`. **4.28** `TreeNode.tsx` + `hooks/useTreeNodeActions.ts`. **4.29** `ScopeGutter.tsx`, `utils/scope-runs.util.ts`, `ScopeBlocks.tsx`, `hooks/useScopesBelow.ts`. **4.30** `useExplorerScope`, `useExplorerWatcher`, `useExplorerSelection`. **4.31** `useExplorerClipboard`, `explorer-ops.service.ts`, `useExplorerShortcuts`. **4.32** `useExplorerGitState`, `useRevealActiveFile`, `ExplorerToolbar.tsx`.
- Rủi ro: cache module-level (`gitStatusCache`, `remoteDiffCache`, …) chia sẻ giữa component — khi gom vào một cache phải giữ vòng đời (không reset khi unmount). Kiểm thủ công: mở/đóng project, đổi branch, thêm/xóa file.

#### Git, Tasks, Workspace, App, Store

- **4.33–4.35** `GitView.tsx` → `graph/*` + hooks; xóa 13 `console.log`. **4.36–4.38** `SyncBranchModal.tsx` → `SyncBranch/*` + `useSyncPreview`; xóa `SyncFileDiffModal.tsx` ở P6. **4.39** `BranchScopeModal.tsx` (712), `CreateBranchModal.tsx` (480), `ConfirmCreateBranchModal.tsx` (479): khử trùng lặp UI (Bước 0 xác định phần chung).
- **4.40–4.41** `TaskModal.tsx` → `TaskModal/*` + `useTaskForm`. **4.42** `TaskManager/TaskTable/FilterSection` nếu >300 dòng sau khi dùng hook chung.
- **4.43–4.48** `WorkspaceViews.tsx`, `WorkspacePanes.tsx`, `Terminal.tsx`, `Browser.tsx`, `Design.tsx` (mỗi file 1–2 task; Bước 0 bắt buộc vì chưa đọc thân file).
- **4.49–4.52** `FooterBar.tsx`, `Headerbar.tsx`, `ContentPanel.tsx`, `ActivityPanel.tsx`.
- **4.53–4.56** `code.store.ts` → slices: (a) `projects.slice` + `projects.persist.ts`, (b) `file-tabs/file-tree/save`, (c) `panels/content-view/zen/design`, (d) `agent-group/mcp`; giữ `useCodeStore` và các type export của `index.ts`. Rủi ro cao nhất phase: persist/partialize (`code.store.ts:1285-1330`) — kiểm tải/lưu project, reload ứng dụng.
- **4.57** hai `fetch` ngoài `codeApi` (V21): `detect-stack.util.ts:155,187` và `create-agent.renderer.tsx:123,136,172` → service riêng (`projects/services/stack-registry.service.ts`, `agent/services/provider.service.ts`); giữ nguyên URL.
- **4.58–4.60** giảm `any` ở 5 điểm nóng (V23), mỗi task ≤5 file, chỉ thay bằng type thật từ `shared/api/types`.

### Phase 5: Endpoint theo use-case, outcome, persistence (đổi hợp đồng — sửa hai phía cùng phase)

- **Mục tiêu:** chuyển logic dẫn xuất xuống server, thống nhất outcome, bỏ xóa ngầm. **Vấn đề:** V06, V09, V16, V26. **Phụ thuộc:** Phase 3–4.

#### Task 5.1 — `branch-overview` (server) · Task 5.2 — dùng ở UI

- 5.1 server: `services/git/git-branch.service.ts` (`overview`: fetch tùy chọn + phân loại local/remote-only với đúng heuristic `ProjectPanel.tsx:21-59`, `current`, `defaultBranch`, `worktreePaths`), `routes/git.route.ts`, `domain/api-types.ts`.
- 5.2 UI: `shared/api/endpoints/git.api.ts`, `types/git.types.ts`, `projects/services/project-branches.service.ts` (bỏ `fetchRealBranches` cũ; 3 request → 1). Giữ `visible` là state UI (`:64`, người dùng bật/tắt ở `ProjectPanel.tsx:1139`). Tiêu chí: `L1`,`L2`; danh sách branch giống hệt trên 3 repo mẫu. Rủi ro: heuristic tên remote khác (`origin`/`upstream` cứng ở `:18`) → giữ y nguyên.

#### Task 5.3 — default-branch vào `explorer-state` (E2) · 5.4 — bỏ effect riêng ở FileExplorer

- Server: `git-explorer.service.ts`, `api-types.ts`; UI: `useExplorerGitState.ts`, `ScopeBlocks.tsx` (bỏ `defaultBranch` effect `:1260-1280`).

#### Task 5.5 — remote-diff từ `explorer-state` (E3, có điều kiện)

- Chỉ làm nếu mục 7 xác nhận `ExplorerState.stats.diff` ≡ kết quả `remote-diff`. File: `ScopeBlocks.tsx`/hook liên quan, `git.api.ts`. Nếu không trùng → bỏ task, ghi chú.

#### Task 5.6 — `saveAll` upsert-only (E6)

- Server: `services/project.service.ts:121-139`, `routes/project.route.ts`. UI: `shared/stores/code/projects.persist.ts`, `useProjectActions.ts` (xóa project → `codeApi.projects.remove`), `endpoints/projects.api.ts`. Tiêu chí: xóa project trong UI vẫn biến mất sau reload; tắt một cửa sổ khi cửa sổ khác đang mở không xóa project. Rủi ro **cao** (mất dữ liệu) → làm sau khi sao lưu `~/.phantoma/code/code.sql` và có kịch bản thủ công: thêm, đổi thứ tự, xóa, reload.

#### Task 5.7 — `gitRoot` → `root` (E4, có điều kiện) · Task 5.8 — `pr` → `pull-requests` (E5)

- 5.7 server `routes/git.route.ts`, UI `git.api.ts` (chỉ nếu xác nhận server dùng `gitRoot`). 5.8 server `pull-request.route.ts`, UI `endpoints/pr.api.ts` → `pull-requests.api.ts`, 2 file gọi `codeApi.pr`.

#### Task 5.9–5.12 — Outcome (E7)

- 5.9 `api-types.ts` + `git-write.service.ts` + `git-protect.service.ts` + `routes/git.route.ts`. 5.10 `git-remote.service.ts`, `git-branch.service.ts`(prune), `git-read` còn lại. 5.11 `pull-request.service.ts` (21 chỗ `{error}`). 5.12 `shared/api/types/outcome.types.ts`, `endpoints/{git,pr}.api.ts`.
- **5.13–5.18** migrate nơi gọi UI theo lô ≤5 (≈26 file đọc `.error`; Executor lập danh sách bằng `grep -rn "\.error\b" features shared app agent`). Tiêu chí: `L2` không lỗi; `grep -rn "\.success\b"` các chỗ đọc outcome đã đổi sang `ok`. Rủi ro: nhánh `res?.error` bị bỏ sót → lỗi git không hiện cho người dùng; để TS bắt bằng union type.

#### Task 5.19 — `downloadLogo` về `codeApi.projects` (E8, phía UI)

- File: `endpoints/projects.api.ts`, `endpoints/fs.api.ts`, `LogoTab.tsx`/nơi gọi.

#### Task 5.20 — Bỏ parse `git status` ở UI (V16, có điều kiện)

- Điều kiện: kiểm `FooterBar.tsx`, `SyncBranchModal.tsx`, `git-status.parser.ts` — nếu chỉ cần map file→trạng thái thì dùng `GitStatusPayload.files` (`git.service.ts:34-41`) thay `parseGitStatusOutput`. Agent tool `git-status` đọc text do model đưa → có thể phải giữ parser.

### Phase 6: Dọn dẹp

- **Mục tiêu:** xóa mọi thứ thừa. **Vấn đề:** V10, V22, V23, V27. **Phụ thuộc:** Phase 5.

- **6.1** xóa 9 file mồ côi (lô ≤5 ×2) sau khi `grep` lại toàn repo ngoài `modules/Code` (mục 7). **6.2** gộp template: `design/templates/` một bộ, `template-files.util.ts` bỏ glob mobile (xóa 12 file → lô ≤5 ×3, kiểm `README.md`/`logos.ts`/`site.ts` giống nhau). **6.3** xóa `agent/prompts/code/agents-md.ts` hoặc đưa `agents-md.ts` chung vào `prompts/_shared/`; `reviewer/types.ts`/`tester/types.ts` tương tự (chỉ file trùng byte). **6.4** xóa 18 phương thức `codeApi` không dùng + endpoint chết (E9) **sau xác nhận**; trước đó `grep -n "codeApi\["` để chắc không truy cập động. **6.5** xóa `group.*` server nếu V10 xác nhận; nếu không, đưa `/groups` vào `codeApi.groups` và để `useProjectGroups` dùng. **6.6** xóa shim cũ (`utils/http.ts`, `utils/guard.ts`, `services/git-runner.ts`, `shared/services/task.service.ts`, …). **6.7** xóa `console.log`, comment `ASSUMED/TODO` đã xử lý, `CodeModule.ts` (nếu không importer ngoài). **6.8** giảm `any` còn lại theo `grep` (mục tiêu < 60, ngoài `debug.store.ts` nếu type từ IPC chưa có).
- Tiêu chí: `L1`,`L2`; số file mồ côi = 0 theo script mục 6.

### Phase 7: Rà soát cuối

- **7.1** import vòng: chạy script mục 6 trên cả hai phía (không thêm thư viện). **7.2** kiểm tra trôi lệch type: so danh sách export `domain/api-types.ts` với `shared/api/types/*.types.ts`. **7.3** kiểm tra quy tắc: không còn import chéo feature, không `window.api` ngoài `shared/ipc|*.handler.ts`, không `fetch(` ngoài `shared/api`+service được nêu, không file component > 300 dòng không có ghi chú. **7.4** cập nhật `AGENTS.md` (gốc repo + `agent/prompts/AGENTS.md` nếu liên quan): cây thư mục mới, quy tắc phụ thuộc, điều chỉnh về IPC, tên domain, `Outcome`, cách chạy `L1/L2`. **7.5** chạy lại bảng 1.3 sinh tự động, đối chiếu với `codeApi` mới: mọi endpoint ↔ 1 phương thức hoặc có lý do. **7.6** smoke thủ công: mở project, đổi branch, file explorer (tạo/đổi tên/xóa/dán), commit/push, PR, tìm kiếm, task/workflow, terminal/browser, lưu/mở lại ứng dụng.

## 5. Ảnh hưởng ngoài phạm vi (IPC, shared, module khác)

Planner không mở rộng phạm vi; các điểm sau cần người phụ trách xử lý ở `src/main`, `src/preload`, `src/renderer/src/...` ngoài `modules/Code`:

1. **Token cho server (Task 1.1/1.7):** `window.api.runtime.startCode()/getPorts()` (đọc ở `shared/api/code-base-url.ts:13-14`) phải trả thêm `token`, và tiến trình main phải truyền `CODE_TOKEN`, `CODE_HOST`, `CODE_ALLOWED_ORIGINS` khi khởi động server. Chưa có thì Task 1.1 chạy ở chế độ "không token + bind localhost".
2. **`@renderer/config/ports`** (`DEV_PORTS`, `DEFAULT_CODE_PORT`, `codeBaseUrl`): `codeBaseUrl(port)` phải dùng cùng host với `CODE_HOST` (`127.0.0.1` vs `localhost`). Comment `ASSUMED` ở `server.config.ts:24` cho thấy `DEFAULT_CODE_PORT` đã được thêm bên renderer; cần xác nhận giá trị 3055.
3. **IPC handler ở `src/main`** (giữ nguyên tên kênh): `fs:*` (`watch-dir`, `unwatch-dir`, `watch-file`, `unwatch-file`, `write-file`, `replace-all`, `validate-paths`, `get-homedir`, `dir-changed`), `git:*` (`branch-sync-preview/apply`, `create-branch-worktree`, `delete-branch`, `unpushed-files`, `worktree-preview(-cancel)`, `index-changed`), `terminal:*`, `browser:*`, `design:*`, `debug:create-launch`, `dialog:*`, `shell:*`, `pr:open-external`, `openFolder`. Khuyến nghị (ngoài kế hoạch này): chuyển nhóm `git:*` thao tác repo sang server để chung `git-runner`/guard.
4. **`code.module.ts` ↔ Zen widget:** `code.module.ts` import registry từ `@renderer/components/Widgets/Zen/screens/Chat/...`; mọi thay đổi trong `agent/tools/*` phải giữ nguyên tên export `executeX/parseX/XRenderer`.
5. **Importer ngoài module:** `index.ts` xuất `Code`, `useCodeStore`, `Project/Service/FileNode`; `CodeModule.ts` là shim cho import cũ `./Code/CodeModule`. Không quét được importer ngoài `modules/Code` → giữ cả hai cho tới khi xác nhận.
6. **`components/ui` (Button, modal), `tailwind.config.js`, `tsconfig.web.json`, `AGENTS.md` gốc** không có trong gói quét → các quy ước style ở mục 4 đề bài chưa kiểm được bằng grep (xem mục 6, mục 7).

## 6. Checklist cleancode cho Executor

**Cho mọi task**

- Giữ nguyên hành vi và giao diện; không format lại code giữ nguyên; mỗi task ≤5 file ghi, 1 commit, chạy `L1`/`L2` trước khi báo xong.
- Tên rõ nghĩa, hàm ngắn một mức trừu tượng; component gọn, ít prop; một file một component chính.
- Không code chết, không import thừa, không `any` không cần thiết (dùng type từ `shared/api/types`).
- Không comment trừ khi logic khó hiểu; xóa `console.log`/`[DEBUG]`/`ASSUMED` đã xử lý.
- Lỗi xử lý nhất quán (`AppError` / `Outcome`), không nuốt lỗi (`catch {}` rỗng chỉ khi có lý do ghi chú); `useEffect` có cleanup đầy đủ.
- Không hardcode cổng/đường dẫn: dùng `config/server.config.ts` (server) và `@renderer/config/ports` (UI).
- Khi di chuyển/đổi tên: liệt kê mọi import/alias/re-export bằng `grep -rn`, dùng shim → sửa importer → xóa shim.
- Khi đổi hợp đồng endpoint: sửa `codeApi`, type và mọi nơi gọi trong **cùng phase**.
- Không tạo test, không thêm thư viện.
- Cập nhật `AGENTS.md` khi đổi cấu trúc/quy ước (Task 7.4).

**Quy ước UI cần kiểm bằng grep (chưa được Planner xác minh)**

- `grep -rn "<Button[^>]*variant=" features app shared agent` phải rỗng (Button không có `variant`).
- Footer modal dùng kiểu soft (`bg-primary/10 ...`); chỉ class có trong `tailwind.config.js`.

**Script lập bản đồ vùng trách nhiệm (Bước 0)**

```python
import re,sys
L=open(sys.argv[1],encoding='utf-8').read().split('\n')
for i,l in enumerate(L,1):
    if re.match(r"^\s*//\s*[─═=\-]{2,}",l) or re.match(r"^(export )?(default )?(const|function|async function|interface|type) [A-Za-z_]+",l) \
       or re.match(r"^  const (\[?[\w, ]+\]?) = (useCallback|useMemo|useRef|useState|use[A-Z]\w*)",l) or re.match(r"^  useEffect\(",l):
        print(f"{i}: {l.strip()[:100]}")
```

**Script kiểm tra sau mỗi phase**

```bash
grep -rln "window.api\|(window as any).api" src/renderer/src/modules/Code | grep -v "shared/ipc\|\.handler\.ts"     # P4+: rỗng
grep -rn "execFileSync" code/src                                                                                      # P3+: rỗng
grep -rn "repositories" code/src/http code/src/utils                                                                  # P1+: rỗng
```

Import vòng và import chéo feature: dùng script Python phân giải import (alias `@renderer/modules/Code/` + đường dẫn tương đối) đã dùng khi quét; dựng đồ thị, báo chu trình và cạnh `features/A/… → features/B/<không phải index.ts>`.

## 7. Giả định / Cần xác nhận

1. **`/groups*` có chết thật không (V10):** UI không có `codeApi.groups` và không `fetch('/groups')`; nhưng chưa đọc `NewGroupModal.tsx`/`GroupPickerForm.tsx`/main process. Quyết định xóa (Task 6.5) chờ xác nhận.
2. **`trusted`/`allowSensitive`:** đã thấy `code.store.ts:483,892` gọi `trusted=true`; chưa liệt kê hết nơi gọi (agent handlers). Task 1.1 giữ ngữ nghĩa, chỉ gắn vào token.
3. **Server có đọc `gitRoot` hay `root` ở `/git/status` và `/git/ignored-paths`:** chỉ thấy UI gửi `gitRoot` (`code.api.ts:347,349`); chưa đọc `git.route.ts:16-27`. Task 5.7 có điều kiện.
4. **Origin của renderer (dev/prod)** để dựng allowlist CORS ở Task 1.1; và host `localhost` hay `127.0.0.1` (IPv6).
5. **`ExplorerState.stats.diff` có trùng `remote-diff` ở `FileExplore.tsx:1360-1372` không** (E3). Task 5.5 có điều kiện.
6. **Hai thuật toán default-branch** (`git-extra.service.ts:6-24` vs `git-write.service.ts:7-21`) có thể cho kết quả khác nhau, nhất là khi không có `origin`; hợp nhất (Task 3.5) cần xác nhận hành vi mong muốn.
7. **`features/tasks/utils/task-drag.util.ts` có 0 dòng trong gói zip** nhưng `SessionCard.tsx:32` import `TASK_DRAG_TYPE`; có thể file bị cắt khi nén. Cần bản gốc trước Task 2.5.
8. **9 file mồ côi** chỉ được kiểm trong `modules/Code`; `CodeSkeleton.tsx` và `CodeModule.ts` có thể được import từ ngoài module.
9. **Template mobile = website** (diff = 0 cả 6 file) có thể cố ý; comment `ASSUMED` ở `template-files.util.ts` nói layout khác nhưng chỉ phần graph khác. Xác nhận trước Task 6.2.
10. **Số liệu ước lượng:** số dòng dùng `wc -l`/đếm dòng logic (lệch ≤1 dòng/file); số chỗ đọc `.error` (67) và `any` (244) là regex, không phải kết quả TS.
11. **Chưa đọc toàn thân** các file: `WorkspaceViews`, `WorkspacePanes`, `Terminal`, `Browser`, `Design`, `FooterBar`, `Headerbar`, `ContentPanel`, `ActivityPanel`, `TaskModal` (thân), `SessionCard`, `CreateProjectModal`, thân `OpenProjectModal`/`ProjectCard`, nội dung `agent/tools/*`, `repositories/*`, `database/connection.ts`, `domain/mappers.ts`, `session/task/workflow/scope/project` service. Phase 3–4 cho các file này bắt đầu bằng Bước 0; ranh giới ở 2.5 cho chúng là ước lượng từ khai báo cấp cao nhất.
12. **Quy ước UI** (Button không `variant`, footer soft, class Tailwind) chưa kiểm vì thiếu `components/ui` và `tailwind.config.js`.
13. **Không có `package.json`/`tsconfig` của server và `tsconfig.web.json`**: lệnh `L1`/`L2` theo đề bài; chưa xác nhận chạy được trên gói này.
14. **Hệ cơ sở dữ liệu** (`code.sql`, bảng, `integrity.ts`) không đổi trong kế hoạch; Task 5.6 cần sao lưu trước.
15. **`search.stream` ở UI** (`code.api.ts:562-633`) chưa đọc: giả định dùng fetch-stream/SSE tương thích với `http/sse.ts`.
