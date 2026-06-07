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
  facebook?: string;
  instagram?: string;
  reddit?: string;
  discord?: string;
}

export interface EmployeeData {
  name?: string;
  email?: string;
  position?: string;
  linkedin?: string;
  phone?: string;
}

export interface PublicDocument {
  title: string;
  url: string;
  type?: string;
}

export interface FileMetadata {
  file: string;
  exifData?: Record<string, string>;
}

export interface MobileApp {
  name: string;
  platform: 'ios' | 'android' | 'both';
  storeUrl?: string;
  bundleId?: string;
}

export interface InternetMention {
  source: string;
  url: string;
  snippet: string;
  date?: string;
}