export interface ExternalExposure {
  dataBreach?: {
    name: string;
    date: string;
    recordsLeaked: number;
    exposedData: string[];
  }[];
  credentialLeak?: {
    email: string;
    source: string;
    date: string;
  }[];
  publicDocuments?: string[];
  pressReleases?: string[];
  conferenceTalks?: string[];
}