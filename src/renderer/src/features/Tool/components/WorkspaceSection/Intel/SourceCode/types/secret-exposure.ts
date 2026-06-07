export interface SecretExposure {
  apiKeys?: string[];
  secretTokens?: string[];
  sshKeys?: string[];
  databaseCredentials?: string[];
  cloudCredentials?: string[];
  hardcodedPasswords?: string[];
}