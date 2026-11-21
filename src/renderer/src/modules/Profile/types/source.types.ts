export type SourceType = 'local' | 'cloud' | 'file';

export type BrowserEngine = 'chrome' | 'chromium';

export interface ProfileSource {
  id: string;
  name: string;
  type: SourceType;
  browsers: BrowserEngine[];
  description: string;
  location?: string;
  count: number;
  lastSync: string;
  online: boolean;
}

export interface SourceStats {
  active: number;
  avgSecurity: number;
  lowSecurity: number;
  unsynced: number;
  bannedServices: number;
}