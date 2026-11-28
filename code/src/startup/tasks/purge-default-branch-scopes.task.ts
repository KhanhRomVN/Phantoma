import type { StartupTask } from '../startup.runner';

export interface DefaultBranchScopePurger {
  purgeAllDefaultBranches(): Promise<number>;
}

export function createPurgeDefaultBranchScopesTask(scopes: DefaultBranchScopePurger): StartupTask {
  return {
    failureMessage: '[Code] scope startup sweep failed',
    run: () => scopes.purgeAllDefaultBranches(),
  };
}