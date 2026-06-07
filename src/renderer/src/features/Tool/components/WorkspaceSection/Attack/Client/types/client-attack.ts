// Client-Side Attack Aggregate Types

// ============================================================================
// Session Types
// ============================================================================

export type ClientAttackStatus = 'idle' | 'queued' | 'building' | 'deploying' | 'success' | 'failed' | 'error';

export interface ClientSession {
  id: string;
  target: string;
  campaign: string;
  status: ClientAttackStatus;
  progress: number;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  stats?: {
    payloadsCreated: number;
    emailsSent: number;
    credentialsCaptured: number;
    sessionsEstablished: number;
  };
}

// ============================================================================
// Phishing Types
// ============================================================================

export type PhishingPlatform = 'office365' | 'gmail' | 'vpn' | 'custom';

export interface PhishingConfig {
  platform: PhishingPlatform;
  targetDomain: string;
  cloneUrl?: string;
  customUrl?: string;
  mfaCapture: boolean;
  redirectUrl?: string;
  sslCert?: 'letsencrypt' | 'self-signed' | 'custom';
}

export interface PhishingCredential {
  email: string;
  password: string;
  mfaToken?: string;
  userAgent?: string;
  ipAddress?: string;
  timestamp: string;
}

export interface PhishingResult {
  id: string;
  name: string;
  type: 'phishing';
  config: PhishingConfig;
  target: string;
  status: 'success' | 'failed' | 'pending' | 'running';
  timestamp: string;
  duration?: number;
  landingPageUrl: string;
  credentialsCaptured: PhishingCredential[];
  sessionsEstablished: number;
  emailsSent: number;
  emailsOpened: number;
  emailsClicked: number;
  output?: string;
  error?: string;
}

// ============================================================================
// Malware Dropper Types
// ============================================================================

export type PayloadType = 'exe' | 'dll' | 'macro' | 'hta' | 'powershell' | 'python' | 'lnk';
export type PayloadFormat = 'raw' | 'base64' | 'hex';
export type PayloadArch = 'x86' | 'x64';

export interface MalwareDropperConfig {
  payloadType: PayloadType;
  format: PayloadFormat;
  arch: PayloadArch;
  lhost: string;
  lport: number;
  encoder?: string;
  iterations?: number;
  template?: string;
  embedInDoc?: boolean;
  docType?: 'docx' | 'xlsx' | 'pdf';
  obfuscation: 'none' | 'low' | 'medium' | 'high';
}

export interface MalwareDropperResult {
  id: string;
  name: string;
  type: 'malware_dropper';
  config: MalwareDropperConfig;
  target: string;
  status: 'success' | 'failed' | 'pending' | 'running';
  timestamp: string;
  duration?: number;
  payloadPath?: string;
  payloadSize?: number;
  payloadHash?: { md5: string; sha1: string; sha256: string };
  detectionRate?: number; // VirusTotal detection count
  sessionsEstablished: number;
  commandOutput?: string;
  output?: string;
  error?: string;
}

// ============================================================================
// Social Engineering Types
// ============================================================================

export interface SETConfig {
  vector: 'email' | 'sms' | 'usb' | 'qr';
  template: string;
  targetList: string[];
  subject?: string;
  attachment?: string;
}

export interface SETResult {
  id: string;
  name: string;
  type: 'social_engineering';
  config: SETConfig;
  target: string;
  status: 'success' | 'failed' | 'pending' | 'running';
  timestamp: string;
  duration?: number;
  targetsReached: number;
  targetsResponded: number;
  credentialsCaptured: number;
  output?: string;
}

// ============================================================================
// Main Client Attack Data Type
// ============================================================================

export interface ClientAttackData {
  target: string;
  campaignName: string;
  scanTime: string;
  phishingResults: PhishingResult[];
  malwareDropperResults: MalwareDropperResult[];
  setResults: SETResult[];
  allCredentials: PhishingCredential[];
  activeSessions: {
    id: string;
    target: string;
    type: 'meterpreter' | 'powershell' | 'cmd' | 'bash';
    established: string;
    lastActivity: string;
    active: boolean;
    user?: string;
  }[];
  riskScore: {
    total: number;
    breakdown: {
      phishing: number;
      malware: number;
      social: number;
    };
  };
  attackLog: string[];
}