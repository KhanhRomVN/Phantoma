// Website Attack Aggregate Types

// ============================================================================
// Session Types
// ============================================================================

export type WebsiteAttackStatus = 'idle' | 'queued' | 'scanning' | 'exploiting' | 'success' | 'failed' | 'error';

export interface WebsiteSession {
  id: string;
  url: string;
  status: WebsiteAttackStatus;
  progress: number;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  stats?: {
    exploitsAttempted: number;
    exploitsSuccessful: number;
    vulnsFound: number;
    dataExtracted: boolean;
  };
}

// ============================================================================
// SQL Injection Types
// ============================================================================

export type SQLiTechnique = 'error' | 'blind' | 'time' | 'union' | 'stacked';
export type SQLiDBMS = 'mysql' | 'mssql' | 'oracle' | 'postgresql' | 'sqlite';

export interface SQLiConfig {
  url: string;
  data?: string;
  cookie?: string;
  technique: SQLiTechnique;
  dbms?: SQLiDBMS;
  level: number;
  risk: number;
}

export interface SQLiDatabase {
  name: string;
  tables: { name: string; columns: string[] }[];
}

export interface SQLiCredential {
  database: string;
  table: string;
  username: string;
  password: string;
  hash?: string;
}

export interface SQLiResult {
  id: string;
  name: string;
  type: 'sqli';
  config: SQLiConfig;
  target: string;
  status: 'success' | 'failed' | 'pending' | 'running';
  timestamp: string;
  duration?: number;
  vulnerable: boolean;
  databaseNames?: string[];
  databases?: SQLiDatabase[];
  credentials?: SQLiCredential[];
  output?: string;
  error?: string;
  parameter?: string;
}

// ============================================================================
// XSS Types
// ============================================================================

export type XSSType = 'reflected' | 'stored' | 'dom';

export interface XSSConfig {
  url: string;
  parameter?: string;
  payload?: string;
  type: XSSType;
}

export interface XSSResult {
  id: string;
  name: string;
  type: 'xss';
  config: XSSConfig;
  target: string;
  status: 'success' | 'failed' | 'pending' | 'running';
  timestamp: string;
  duration?: number;
  vulnerable: boolean;
  proofOfConcept?: string;
  payload?: string;
  parameter?: string;
  output?: string;
  error?: string;
}

// ============================================================================
// LFI/RFI Types
// ============================================================================

export type LFI_RFI_Type = 'lfi' | 'rfi' | 'lfi_to_rce';

export interface LFI_RFI_Config {
  url: string;
  parameter: string;
  type: LFI_RFI_Type;
  filePath?: string;
  remoteUrl?: string;
}

export interface LFI_RFI_Result {
  id: string;
  name: string;
  type: 'lfi_rfi';
  config: LFI_RFI_Config;
  target: string;
  status: 'success' | 'failed' | 'pending' | 'running';
  timestamp: string;
  duration?: number;
  vulnerable: boolean;
  fileContents?: string;
  rceAchieved?: boolean;
  output?: string;
  error?: string;
}

// ============================================================================
// SSRF Types
// ============================================================================

export interface SSRFConfig {
  url: string;
  parameter: string;
  targetUrl: string;
  bypassMethod?: string;
}

export interface SSRFResult {
  id: string;
  name: string;
  type: 'ssrf';
  config: SSRFConfig;
  target: string;
  status: 'success' | 'failed' | 'pending' | 'running';
  timestamp: string;
  duration?: number;
  vulnerable: boolean;
  responseBody?: string;
  accessedInternal?: boolean;
  cloudMetadata?: string;
  output?: string;
  error?: string;
}

// ============================================================================
// XXE Types
// ============================================================================

export interface XXEConfig {
  url: string;
  payloadXml: string;
  dtdHost?: string;
  fileToRead?: string;
}

export interface XXEResult {
  id: string;
  name: string;
  type: 'xxe';
  config: XXEConfig;
  target: string;
  status: 'success' | 'failed' | 'pending' | 'running';
  timestamp: string;
  duration?: number;
  vulnerable: boolean;
  fileContents?: string;
  ssrfAchieved?: boolean;
  dosAchieved?: boolean;
  output?: string;
  error?: string;
}

// ============================================================================
// Insecure Deserialization Types
// ============================================================================

export type DeserializationLanguage = 'java' | 'php' | 'dotnet' | 'python' | 'ruby';

export interface DeserializationConfig {
  url: string;
  language: DeserializationLanguage;
  gadgetChain?: string;
  payload?: string;
  command?: string;
}

export interface DeserializationResult {
  id: string;
  name: string;
  type: 'deserialization';
  config: DeserializationConfig;
  target: string;
  status: 'success' | 'failed' | 'pending' | 'running';
  timestamp: string;
  duration?: number;
  vulnerable: boolean;
  rceAchieved?: boolean;
  commandOutput?: string;
  output?: string;
  error?: string;
}

// ============================================================================
// Command Injection Types
// ============================================================================

export interface CommandInjectionConfig {
  url: string;
  parameter: string;
  command: string;
  method?: 'GET' | 'POST';
}

export interface CommandInjectionResult {
  id: string;
  name: string;
  type: 'command_injection';
  config: CommandInjectionConfig;
  target: string;
  status: 'success' | 'failed' | 'pending' | 'running';
  timestamp: string;
  duration?: number;
  vulnerable: boolean;
  commandOutput?: string;
  output?: string;
  error?: string;
}

// ============================================================================
// Web Shell Types
// ============================================================================

export interface WebShell {
  id: string;
  url: string;
  type: 'php' | 'asp' | 'jsp' | 'cfm' | 'other';
  password?: string;
  established: string;
  lastActivity: string;
  active: boolean;
}

// ============================================================================
// Main Website Attack Data Type
// ============================================================================

export type WebsiteExploitResult = SQLiResult | XSSResult | LFI_RFI_Result | SSRFResult | XXEResult | DeserializationResult | CommandInjectionResult;

export interface WebsiteAttackData {
  target: string;
  targetUrl: string;
  scanTime: string;
  sqliResults: SQLiResult[];
  xssResults: XSSResult[];
  lfiRfiResults: LFI_RFI_Result[];
  ssrfResults: SSRFResult[];
  xxeResults: XXEResult[];
  deserializationResults: DeserializationResult[];
  commandInjectionResults: CommandInjectionResult[];
  activeShells: WebShell[];
  credentialsFound: { type: string; username: string; password: string; source: string }[];
  riskScore: {
    total: number;
    breakdown: {
      sqli: number;
      xss: number;
      lfi_rfi: number;
      ssrf: number;
      xxe: number;
      deserialization: number;
      command_injection: number;
    };
  };
  attackLog: string[];
}