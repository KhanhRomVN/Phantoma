export interface PasswordLeak {
  source: string;
  date: string;
  email: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  hashType?: string | null;
  detail?: string;
}

export interface CredentialLeak {
  source: string;
  date: string;
  type: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  detail?: string;
}

export interface PastebinLeak {
  title: string;
  url: string;
  date: string;
  preview?: string;
}

export interface DarkwebMention {
  forum: string;
  date: string;
  context: string;
}

export interface LeakExposure {
  passwordLeaks?: PasswordLeak[];
  credentialLeaks?: CredentialLeak[];
  breachDatabase?: string[];
  pastebinLeaks?: PastebinLeak[];
  publicDocuments?: string[];
  darkwebMentions?: DarkwebMention[];
}