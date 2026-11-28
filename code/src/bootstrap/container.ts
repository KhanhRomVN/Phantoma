import { rgPath } from '@vscode/ripgrep';
import { ApiControllers } from '../api/controllers/controller-set';
import { ProjectController } from '../api/controllers/project.controller';
import { GroupController } from '../api/controllers/group.controller';
import { ScopeController } from '../api/controllers/scope.controller';
import { SessionController } from '../api/controllers/session.controller';
import { TaskController } from '../api/controllers/task.controller';
import { FsController } from '../api/controllers/fs.controller';
import { GitController } from '../api/controllers/git.controller';
import { PullRequestController } from '../api/controllers/pull-request.controller';
import { SearchController } from '../api/controllers/search.controller';
import { PathAccessPort } from '../application/ports/path-access.port';
import { ProjectPathAccessAdapter } from '../infrastructure/filesystem/project-path-access.adapter';
import { ProjectStorageAdapter } from '../infrastructure/filesystem/project-storage.adapter';
import { GitBranchAdapter } from '../infrastructure/git/git-branch.adapter';
import { UuidIdGeneratorAdapter } from '../infrastructure/id/uuid-id-generator.adapter';
import { groupRepository } from '../infrastructure/persistence/repositories/group.repository';
import { projectRepository } from '../infrastructure/persistence/repositories/project.repository';
import { scopeRepository } from '../infrastructure/persistence/repositories/scope.repository';
import { sessionRepository } from '../infrastructure/persistence/repositories/session.repository';
import { taskAttachmentRepository } from '../infrastructure/persistence/repositories/task-attachment.repository';
import { taskChecklistRepository } from '../infrastructure/persistence/repositories/task-checklist.repository';
import { taskDependencyRepository } from '../infrastructure/persistence/repositories/task-dependency.repository';
import { taskTagRepository } from '../infrastructure/persistence/repositories/task-tag.repository';
import { taskRepository } from '../infrastructure/persistence/repositories/task.repository';
import { workflowRepository } from '../infrastructure/persistence/repositories/workflow.repository';
import { workspacePanelRepository } from '../infrastructure/persistence/repositories/workspace-panel.repository';
import { worktreeRepository } from '../infrastructure/persistence/repositories/worktree.repository';
import { ProcessRunnerAdapter } from '../infrastructure/process/process-runner';
import { SearchService } from '../application/services/search/search.service';
import { fsWriteAdapter } from '../infrastructure/filesystem/fs-write.adapter';
import { FsQueryAdapter } from '../infrastructure/filesystem/fs-query.adapter';
import { ImageAdapter } from '../infrastructure/filesystem/image.adapter';
import { FsQueryService } from '../application/services/fs/fs-query.service';
import { FsWriteService } from '../application/services/fs/fs-write.service';
import { ImageService } from '../application/services/fs/image.service';
import { PullRequestService } from '../application/services/pull-request/pull-request.service';
import { GitCommandAdapter } from '../infrastructure/git/git-command.adapter';
import { createGitServices } from '../application/services/git/git-services';
import { NodeFileAdapter } from '../infrastructure/filesystem/node-file.adapter';
import { GitHubCommandAdapter } from '../infrastructure/github/github-command.adapter';
import { GroupService } from '../application/services/groups/group.service';
import { ProjectService } from '../application/services/projects/project.service';
import { ScopeService } from '../application/services/scopes/scope.service';
import { SessionService } from '../application/services/sessions/session.service';
import { TaskService } from '../application/services/tasks/task.service';
import { WorkflowService } from '../application/services/tasks/workflow.service';
import { WorktreeService } from '../application/services/projects/worktree.service';
import type { StartupTask } from '../startup/startup.runner';
import { createPurgeDefaultBranchScopesTask } from '../startup/tasks/purge-default-branch-scopes.task';

export interface Container {
  apiControllers: ApiControllers;
  startupTasks: StartupTask[];
}

export function createContainer(dataDir: string): Container {
  const processRunner = new ProcessRunnerAdapter();
  const prService = new PullRequestService(new GitHubCommandAdapter(), new GitCommandAdapter(), processRunner);
  const ids = new UuidIdGeneratorAdapter();
  const git = new GitBranchAdapter();
  const storage = new ProjectStorageAdapter(dataDir);
  const pathAccess = new ProjectPathAccessAdapter(() => worktreeRepository.listAll().map((w) => w.path));

  const projectService = new ProjectService(
    projectRepository,
    sessionRepository,
    workspacePanelRepository,
    worktreeRepository,
    git,
    ids,
    storage,
  );
  const worktreeService = new WorktreeService(projectRepository, worktreeRepository, git, ids);
  const sessionService = new SessionService(
    projectRepository,
    sessionRepository,
    workspacePanelRepository,
    worktreeRepository,
    git,
    ids,
  );
  const scopeService = new ScopeService(scopeRepository, worktreeRepository, git, ids);
  const taskService = new TaskService(
    taskRepository,
    taskTagRepository,
    taskChecklistRepository,
    taskAttachmentRepository,
    taskDependencyRepository,
    projectRepository,
    ids,
  );
  const workflowService = new WorkflowService(workflowRepository, taskRepository);
  const groupService = new GroupService(groupRepository, ids);

  const gitCommandAdapter = new GitCommandAdapter();
  const fsReadAdapter = new FsQueryAdapter(gitCommandAdapter);
  const imageAdapter = new ImageAdapter(dataDir);
  const fsQueryService = new FsQueryService(fsReadAdapter, pathAccess);
  const fsWriteService = new FsWriteService(fsWriteAdapter, pathAccess);
  const imageService = new ImageService(imageAdapter, pathAccess);

  const apiControllers: ApiControllers = {
    project: new ProjectController(projectService, worktreeService, imageService),
    group: new GroupController(groupService),
    scope: new ScopeController(scopeService),
    session: new SessionController(sessionService),
    task: new TaskController(taskService, workflowService),
    fs: new FsController(fsQueryService, fsWriteService, imageService),
    git: new GitController(pathAccess, createGitServices({
      git: new GitCommandAdapter(),
      branches: git,
      fileSystem: new NodeFileAdapter(),
      processes: processRunner,
    })),
    pullRequest: new PullRequestController(pathAccess, prService),
    search: new SearchController(pathAccess, new SearchService(processRunner, rgPath)),
  };

  return {
    apiControllers,
    startupTasks: [createPurgeDefaultBranchScopesTask(scopeService)],
  };
}