// Network Attack Aggregate Types

// ============================================================================
// Session Types
// ============================================================================

export type NetworkAttackStatus = 'idle' | 'queued' | 'scanning' | 'exploiting' | 'shell_obtained' | 'failed' | 'error';

export interface NetworkSession {
  id: string;
  target: string;
  port?: number;
  service?: string;
  status: NetworkAttackStatus;
  progress: number;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  stats?: {
    exploitsAttempted: number;
    exploitsSuccessful: number;
    credentialsFound: number;
    shellsObtained: number;
  };
}

// ============================================================================
// Exploit Result Types
// ============================================================================

export interface ExploitResult {
  id: string;
  name: string;
  type: 'eternalblue' | 'bruteforce' | 'service_rce';
  target: string;
  port: number;
  status: 'success' | 'failed' | 'pending' | 'running';
  timestamp: string;
  duration?: number;
  output?: string;
  error?: string;
}

// ============================================================================
// EternalBlue (MS17-010) Types
// ============================================================================

export interface EternalBlueConfig {
  target: string;
  payload: string;
  lhost: string;
  lport: number;
  smbPort?: number;
  pipeName?: string;
  groomCount?: number;
}

export interface EternalBlueResult extends ExploitResult {
  type: 'eternalblue';
  config: EternalBlueConfig;
  shellType?: 'meterpreter' | 'cmd' | 'powershell';
  sessionId?: string;
  systemInfo?: {
    os: string;
    architecture: string;
    domain?: string;
    loggedUsers?: string[];
  };
}

// ============================================================================
// Brute-force Types
// ============================================================================

export type BruteForceService = 'ssh' | 'rdp' | 'ftp' | 'telnet' | 'smb' | 'mysql' | 'postgresql' | 'http-post-form';

export interface BruteForceConfig {
  service: BruteForceService;
  target: string;
  port: number;
  usernameList: string;
  passwordList: string;
  threads?: number;
  timeout?: number;
  stopOnSuccess?: boolean;
}

export interface BruteForceCredential {
  username: string;
  password: string;
  service: BruteForceService;
  target: string;
}

export interface BruteForceResult extends ExploitResult {
  type: 'bruteforce';
  config: BruteForceConfig;
  attemptsMade: number;
  attemptsTotal: number;
  credentialsFound: BruteForceCredential[];
  speed: number; // attempts per second
}

// ============================================================================
// Service RCE Types
// ============================================================================

export type ServiceRCEVulnerability = 
  | 'log4shell'
  | 'heartbleed'
  | 'shellshock'
  | 'smb_eternal_romance'
  | 'rdp_bluekeep'
  | 'cve_custom';

export interface ServiceRCEConfig {
  vulnerability: ServiceRCEVulnerability;
  target: string;
  port: number;
  command?: string;
  callbackHost?: string;
  callbackPort?: number;
  customPayload?: string;
}

export interface ServiceRCEResult extends ExploitResult {
  type: 'service_rce';
  config: ServiceRCEConfig;
  cveId?: string;
  shellObtained: boolean;
  commandOutput?: string;
  reverseShell?: {
    host: string;
    port: number;
    type: 'bash' | 'python' | 'nc' | 'powershell';
  };
}

// ============================================================================
// Shell Session Types
// ============================================================================

export interface ShellSession {
  id: string;
  target: string;
  type: 'meterpreter' | 'cmd' | 'powershell' | 'bash' | 'python';
  established: string;
  lastActivity: string;
  active: boolean;
  user?: string;
  privileges?: string;
}

// ============================================================================
// Main Network Attack Data Type
// ============================================================================

export interface NetworkAttackData {
  target: string;
  targetIp: string;
  scanTime: string;
  openPorts: number[];
  eternalBlueResults: EternalBlueResult[];
  bruteForceResults: BruteForceResult[];
  serviceRCEResults: ServiceRCEResult[];
  activeShells: ShellSession[];
  credentialsFound: BruteForceCredential[];
  riskScore: {
    total: number;
    breakdown: {
      smb: number;
      rdp: number;
      ssh: number;
      other: number;
    };
  };
  attackLog: string[];
}