// Sensitive Exposure Types for SensitiveExposure component

export interface SensitiveExposure {
  envExposure?: string[];
  gitExposure?: string[];
  backupFiles?: string[];
  configFiles?: string[];
  apiKeys?: string[];
  secretTokens?: string[];
  firebaseConfig?: string;
  publicS3Bucket?: string;
  jenkinsExposure?: string;
  kibanaExposure?: string;
  databaseDump?: string;
  logFiles?: string[];
  sourceCodeExposure?: string;
}