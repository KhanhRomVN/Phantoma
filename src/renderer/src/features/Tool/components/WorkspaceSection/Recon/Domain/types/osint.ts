// OSINT Types for OSINT component

export interface Breach {
  name: string;
  date: string;
  accounts: number;
  data: string[];
}

export interface GoogleDork {
  query: string;
  resultCount: number;
}

export interface WaybackSnapshot {
  timestamp: string;
  url: string;
}

export interface SocialIntel {
  twitter?: string;
  github?: string;
  linkedin?: string;
}