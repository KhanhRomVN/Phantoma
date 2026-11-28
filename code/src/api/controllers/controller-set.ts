import type { ProjectController } from './project.controller';
import type { GroupController } from './group.controller';
import type { ScopeController } from './scope.controller';
import type { SessionController } from './session.controller';
import type { TaskController } from './task.controller';
import type { FsController } from './fs.controller';
import type { GitController } from './git.controller';
import type { PullRequestController } from './pull-request.controller';
import type { SearchController } from './search.controller';

export interface ApiControllers {
  project: ProjectController;
  group: GroupController;
  scope: ScopeController;
  session: SessionController;
  task: TaskController;
  fs: FsController;
  git: GitController;
  pullRequest: PullRequestController;
  search: SearchController;
}