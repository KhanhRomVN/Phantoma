import { gitHistoryService } from './git-history.service';
import { gitDiffService } from './git-diff.service';
import { gitRepoService } from './git-repo.service';

export const gitReadService = {
  ...gitHistoryService,
  ...gitDiffService,
  ...gitRepoService,
};