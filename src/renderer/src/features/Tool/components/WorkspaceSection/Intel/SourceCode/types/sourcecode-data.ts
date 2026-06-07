import type { RepoInfo } from './repo-info';
import type { DeveloperInfo } from './developer-info';
import type { SecretExposure } from './secret-exposure';
import type { InfrastructureInfo } from './infrastructure-info';
import type { AppIntelligence } from './app-intelligence';
import type { DependencyAnalysis } from './dependency-analysis';

export type { RepoInfo, DeveloperInfo, CommitMetadata, SecretExposure, InfrastructureInfo, AppIntelligence, DependencyAnalysis, Dependency };

export interface SourceCodeData {
  target: string;
  scanTime: string;
  repoInfo: RepoInfo;
  developerInfo: DeveloperInfo;
  secretExposure: SecretExposure;
  infrastructureInfo: InfrastructureInfo;
  appIntelligence: AppIntelligence;
  dependencyAnalysis: DependencyAnalysis;
}