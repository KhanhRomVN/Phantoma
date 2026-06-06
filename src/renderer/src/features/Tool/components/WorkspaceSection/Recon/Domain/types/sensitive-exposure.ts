// Sensitive Exposure Types for SensitiveExposure component

export interface SensitiveExposure {
  envFile?: boolean;
  gitExposure?: boolean;
  backupFiles?: string[];
  configFiles?: string[];
  apiKeys?: string[];
  secretTokens?: string[];
  firebaseConfig?: string;
  publicS3Buckets?: string[];
}