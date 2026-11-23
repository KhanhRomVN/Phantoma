.
├── app
│ ├── layout
│ │ ├── ActivityPanel.tsx
│ │ ├── ContentPanel.tsx
│ │ ├── FooterBar.tsx
│ │ ├── Headerbar.tsx
│ │ └── NoSessionEmpty.tsx
│ └── stores
│ └── activity-panel.store.ts
├── code.module.ts
├── CodeSkeleton.tsx
├── Code.tsx
├── features
│ ├── account
│ │ ├── components
│ │ │ └── Account.tsx
│ │ └── index.ts
│ ├── debug
│ │ ├── components
│ │ │ └── Debug.tsx
│ │ ├── index.ts
│ │ └── stores
│ │ └── debug.store.ts
│ ├── design
│ │ ├── components
│ │ │ ├── DesignCard.tsx
│ │ │ ├── Design.tsx
│ │ │ └── modals
│ │ │ └── DesignModal.tsx
│ │ ├── index.ts
│ │ ├── stores
│ │ │ └── design.store.ts
│ │ ├── templates
│ │ │ ├── mobile
│ │ │ │ ├── Agent.tsx
│ │ │ │ ├── Download.tsx
│ │ │ │ ├── Emulate.tsx
│ │ │ │ ├── Faq.tsx
│ │ │ │ ├── Home.tsx
│ │ │ │ ├── Layout.tsx
│ │ │ │ ├── logos.ts
│ │ │ │ ├── phantoma-dark-logo.png
│ │ │ │ ├── phantoma-light-logo.png
│ │ │ │ ├── README.md
│ │ │ │ ├── site.ts
│ │ │ │ └── theme.tsx
│ │ │ └── website
│ │ │ ├── Agent.tsx
│ │ │ ├── Download.tsx
│ │ │ ├── Emulate.tsx
│ │ │ ├── Faq.tsx
│ │ │ ├── Home.tsx
│ │ │ ├── Layout.tsx
│ │ │ ├── logos.ts
│ │ │ ├── phantoma-dark-logo.png
│ │ │ ├── phantoma-light-logo.png
│ │ │ ├── README.md
│ │ │ ├── site.ts
│ │ │ └── theme.tsx
│ │ └── utils
│ │ └── template-files.util.ts
│ ├── file-explorer
│ │ ├── components
│ │ │ ├── ExplorerSearch.tsx
│ │ │ ├── FileExplorerContext.ts
│ │ │ ├── FileExplorer.tsx
│ │ │ ├── FolderBadges.tsx
│ │ │ ├── InlineNewInput.tsx
│ │ │ ├── InlineRenameInput.tsx
│ │ │ ├── modals
│ │ │ │ ├── CommitSyncedFilesModal.tsx
│ │ │ │ ├── ConfirmDeleteFileModal.tsx
│ │ │ │ ├── RemoteDiffModal.tsx
│ │ │ │ ├── ScopeHelpModal.tsx
│ │ │ │ └── ScopeTransferModal.tsx
│ │ │ ├── ScopeBlocks.tsx
│ │ │ ├── ScopeGutter.tsx
│ │ │ ├── ScopeWarnBell.tsx
│ │ │ └── TreeNode.tsx
│ │ ├── hooks
│ │ │ ├── useScopesBelow.ts
│ │ │ └── useTreeScanning.ts
│ │ ├── index.ts
│ │ ├── services
│ │ │ ├── file-tree.cache.ts
│ │ │ └── file-tree.service.ts
│ │ ├── types
│ │ │ └── file-explorer.types.ts
│ │ └── utils
│ │ ├── scope-runs.util.ts
│ │ └── tree-ghost.util.ts
│ ├── git
│ │ ├── components
│ │ │ ├── Avatar.tsx
│ │ │ ├── BranchSidebar.tsx
│ │ │ ├── ChangedFiles.tsx
│ │ │ ├── CommitContextMenu.tsx
│ │ │ ├── CommitDetail.tsx
│ │ │ ├── DiffView.tsx
│ │ │ ├── EmptyState.tsx
│ │ │ ├── GitView.tsx
│ │ │ ├── graph
│ │ │ │ ├── CommitRow.tsx
│ │ │ │ └── VirtualRow.tsx
│ │ │ ├── GraphCell.tsx
│ │ │ ├── LocalCommitBar.tsx
│ │ │ ├── modals
│ │ │ │ ├── BranchScopeModal.tsx
│ │ │ │ ├── ConfirmCreateBranchModal.tsx
│ │ │ │ ├── ConfirmDeleteBranchModal.tsx
│ │ │ │ ├── ConfirmFileChangeModal.tsx
│ │ │ │ ├── ConfirmUnlinkBranchModal.tsx
│ │ │ │ ├── CreateBranchModal.tsx
│ │ │ │ ├── SyncBranch
│ │ │ │ │ ├── SyncBranchBadges.tsx
│ │ │ │ │ ├── SyncBranchControls.tsx
│ │ │ │ │ └── SyncDiffPanel.tsx
│ │ │ │ ├── SyncBranchModal.tsx
│ │ │ │ ├── SyncFileDiffModal.tsx
│ │ │ │ └── TreeUIPreview.tsx
│ │ │ ├── scope
│ │ │ │ ├── scopeBadges.ts
│ │ │ │ └── scopeTree.tsx
│ │ │ └── ScopeFilterTabs.tsx
│ │ ├── constants
│ │ │ ├── git-view.constants.ts
│ │ │ └── sync-branch.constants.ts
│ │ ├── index.ts
│ │ ├── types
│ │ │ ├── git-view.types.ts
│ │ │ └── sync-branch.types.ts
│ │ └── utils
│ │ ├── graph.util.ts
│ │ └── sync-branch.util.ts
│ ├── projects
│ │ ├── components
│ │ │ ├── modals
│ │ │ │ ├── ConfirmDeleteProjectModal.tsx
│ │ │ │ ├── ConfirmLinkProjectModal.tsx
│ │ │ │ ├── CreateProjectModal.tsx
│ │ │ │ ├── DuplicateRepoModal.tsx
│ │ │ │ ├── OpenProject
│ │ │ │ │ ├── LanguageBadgeIcon.tsx
│ │ │ │ │ ├── NewRepositoryForm.tsx
│ │ │ │ │ ├── OpenProjectModal.tsx
│ │ │ │ │ └── ProjectDetailPanel.tsx
│ │ │ │ └── ProjectSettingsModal
│ │ │ │ ├── index.tsx
│ │ │ │ ├── shared.tsx
│ │ │ │ └── tabs
│ │ │ │ ├── GeneralTab.tsx
│ │ │ │ ├── LogoTab.tsx
│ │ │ │ └── OverviewTab.tsx
│ │ │ ├── ProjectCard
│ │ │ │ ├── badges.tsx
│ │ │ │ ├── BranchBlock.tsx
│ │ │ │ ├── BranchScopeButton.tsx
│ │ │ │ ├── CollapsedTree.tsx
│ │ │ │ ├── KebabButton.tsx
│ │ │ │ ├── ProjectCard.tsx
│ │ │ │ └── ProjectIcon.tsx
│ │ │ ├── ProjectLogo.tsx
│ │ │ ├── ProjectPanel
│ │ │ │ ├── GroupPickerForm.tsx
│ │ │ │ ├── menu-helpers.tsx
│ │ │ │ ├── modals
│ │ │ │ │ ├── AssignTaskModal.tsx
│ │ │ │ │ ├── ConfirmUnassignTaskModal.tsx
│ │ │ │ │ ├── ConfirmUnlinkTaskModal.tsx
│ │ │ │ │ ├── NewGroupModal.tsx
│ │ │ │ │ └── ProjectConflictModal.tsx
│ │ │ │ ├── ProjectDialogs.tsx
│ │ │ │ ├── ProjectGroupSection.tsx
│ │ │ │ ├── ProjectList.tsx
│ │ │ │ ├── ProjectPanel.tsx
│ │ │ │ ├── ProjectToolbar.tsx
│ │ │ │ └── ScrollToSessionButton.tsx
│ │ │ └── SessionCard
│ │ │ ├── SessionBadges.tsx
│ │ │ ├── SessionCard.tsx
│ │ │ ├── SessionGitStats.tsx
│ │ │ └── SessionHoverTooltip.tsx
│ │ ├── constants
│ │ │ ├── open-project.constants.ts
│ │ │ └── session.constants.ts
│ │ ├── hooks
│ │ │ ├── useBranchActions.ts
│ │ │ ├── useProjectActions.ts
│ │ │ ├── useProjectConflict.ts
│ │ │ ├── useProjectDialogs.ts
│ │ │ ├── useProjectDnd.ts
│ │ │ ├── useProjectGroups.ts
│ │ │ ├── useProjectListView.ts
│ │ │ ├── useProjectMutations.ts
│ │ │ ├── useProjectSelection.ts
│ │ │ ├── useProjectTaskActions.ts
│ │ │ ├── useSessionTasks.ts
│ │ │ └── useWorkflowSubTasks.ts
│ │ ├── index.ts
│ │ ├── services
│ │ │ └── project-layout.service.ts
│ │ ├── types
│ │ │ ├── open-project.types.ts
│ │ │ ├── project-card.types.ts
│ │ │ ├── project-panel.types.ts
│ │ │ └── session.types.ts
│ │ └── utils
│ │ ├── accent.util.ts
│ │ ├── detect-stack.util.ts
│ │ ├── dnd.util.ts
│ │ ├── open-project.util.ts
│ │ ├── project-card.util.ts
│ │ ├── session-summary.util.ts
│ │ └── session.util.ts
│ ├── pull-request
│ │ ├── components
│ │ │ ├── PrAvatar.tsx
│ │ │ ├── PrBlocker.tsx
│ │ │ ├── PrCard.tsx
│ │ │ ├── PrCommits.tsx
│ │ │ ├── PrConversation.tsx
│ │ │ ├── PrCreateForm.tsx
│ │ │ ├── PrDetail.tsx
│ │ │ ├── PrEmptyState.tsx
│ │ │ ├── PrFiles.tsx
│ │ │ ├── PrFilterBar.tsx
│ │ │ ├── PrSkeleton.tsx
│ │ │ ├── PullRequestPanel.tsx
│ │ │ └── PullRequestView.tsx
│ │ ├── index.ts
│ │ ├── types
│ │ │ └── pull-request.types.ts
│ │ └── utils
│ │ └── pull-request.util.ts
│ ├── search
│ │ ├── components
│ │ │ ├── SearchEmptyState.tsx
│ │ │ ├── SearchResults.tsx
│ │ │ └── Search.tsx
│ │ ├── hooks
│ │ │ └── useSearch.ts
│ │ └── index.ts
│ ├── settings
│ │ ├── components
│ │ │ ├── Keybindings.tsx
│ │ │ ├── Layout.tsx
│ │ │ └── SettingsView.tsx
│ │ └── index.ts
│ ├── skills
│ │ ├── components
│ │ │ └── Skill.tsx
│ │ └── index.ts
│ ├── tasks
│ │ ├── components
│ │ │ ├── ArchivedTaskCard.tsx
│ │ │ ├── FilterSection.tsx
│ │ │ ├── modals
│ │ │ │ ├── ArchivedTasksModal.tsx
│ │ │ │ ├── ConfirmArchiveTaskModal.tsx
│ │ │ │ ├── ConfirmDeleteTaskModal.tsx
│ │ │ │ ├── ConfirmDiscardTaskModal.tsx
│ │ │ │ ├── ConfirmForceStartTaskModal.tsx
│ │ │ │ └── TaskModal.tsx
│ │ │ ├── TaskEmptyState.tsx
│ │ │ ├── TaskManager.tsx
│ │ │ └── TaskTable.tsx
│ │ ├── constants
│ │ │ └── status-meta.constants.ts
│ │ ├── index.ts
│ │ ├── services
│ │ │ └── task.service.ts
│ │ └── utils
│ │ ├── schedule.util.ts
│ │ └── task-drag.util.ts
│ ├── workflow
│ │ ├── components
│ │ │ ├── AgentWorkflow
│ │ │ │ └── AgentWorkflow.tsx
│ │ │ └── Workflow
│ │ │ ├── DetailHeader.tsx
│ │ │ ├── HeaderSection.tsx
│ │ │ ├── TabContent.tsx
│ │ │ ├── TimelineTask.tsx
│ │ │ ├── WorkflowShared.tsx
│ │ │ └── Workflow.tsx
│ │ ├── constants
│ │ │ ├── workflow.constants.ts
│ │ │ └── workflow-mock.constants.ts
│ │ ├── index.ts
│ │ ├── types
│ │ │ └── workflow.types.ts
│ │ └── utils
│ │ └── workflow.util.ts
│ └── workspace
│ ├── components
│ │ ├── AgentTools.tsx
│ │ ├── Browser.tsx
│ │ ├── Design.tsx
│ │ ├── FileBreadcrumb.tsx
│ │ ├── File.tsx
│ │ ├── modals
│ │ │ ├── ConfirmDefaultBranchModal.tsx
│ │ │ ├── ConfirmDeleteOrchestratorModal.tsx
│ │ │ ├── ConfirmReloadModal.tsx
│ │ │ ├── ConfirmSaveFileModal.tsx
│ │ │ ├── ConfirmSmartPlaceModal.tsx
│ │ │ └── QuickOpenModal.tsx
│ │ ├── Terminal.tsx
│ │ ├── WorkspaceEmptyStates.tsx
│ │ ├── WorkspacePanes.tsx
│ │ ├── WorkspaceViews.tsx
│ │ └── Zen.tsx
│ ├── hooks
│ │ ├── useGitFileStatus.ts
│ │ ├── useWorkspaceInteractions.ts
│ │ └── useWorkspaceSettings.ts
│ ├── index.ts
│ └── utils
│ ├── ai-agent-detector.util.ts
│ └── send-to-zen.util.ts
├── index.ts
└── shared
├── api
│ ├── client.ts
│ ├── code.api.ts
│ ├── code-base-url.ts
│ ├── endpoints
│ │ ├── fs.api.ts
│ │ ├── git.api.ts
│ │ ├── pr.api.ts
│ │ ├── projects.api.ts
│ │ ├── scopes.api.ts
│ │ ├── search.api.ts
│ │ ├── sessions.api.ts
│ │ ├── tasks.api.ts
│ │ ├── workflows.api.ts
│ │ └── worktrees.api.ts
│ └── types
│ ├── fs.types.ts
│ ├── git.types.ts
│ ├── outcome.types.ts
│ ├── project.types.ts
│ ├── session.types.ts
│ ├── task.types.ts
│ └── workflow.types.ts
├── components
│ ├── EmptyState.tsx
│ ├── ProjectLogo.tsx
│ ├── ScopeFilterTabs.tsx
│ ├── ToastContainer.tsx
│ └── Toast.tsx
├── constants
│ ├── dnd.constants.ts
│ ├── file-mutating-tools.constants.ts
│ ├── index.ts
│ ├── motion.constants.ts
│ ├── project-colors.ts
│ └── workspace-agents.constants.ts
├── hooks
├── ipc
│ ├── browser.ipc.ts
│ ├── debug.ipc.ts
│ ├── design.ipc.ts
│ ├── dialog.ipc.ts
│ ├── fs.ipc.ts
│ ├── git.ipc.ts
│ ├── runtime.ipc.ts
│ ├── shell.ipc.ts
│ ├── terminal.ipc.ts
│ └── watch.ipc.ts
├── services
│ ├── dialog.service.ts
│ ├── diff-provider.service.ts
│ ├── document-manager.service.ts
│ ├── file-watcher.service.ts
│ ├── task.service.ts
│ ├── toast.service.ts
│ └── unsaved.service.ts
├── stores
│ ├── branch-scope.store.ts
│ ├── code.store.ts
│ └── scope-stats.store.ts
├── types
│ ├── agent-group.types.ts
│ ├── agents.types.ts
│ ├── design.types.ts
│ ├── mcp.types.ts
│ └── task.types.ts
└── utils
├── diff.util.ts
├── fuzzy-matcher.util.ts
├── git-status-parser.util.ts
├── path-resolver.util.ts
├── scope-badges.util.ts
├── security.util.ts
├── tree-builder.util.ts
└── workspace-layout.util.ts
