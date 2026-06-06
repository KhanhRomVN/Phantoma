// Subdomain Types for Subdomain component

export type SubdomainCategory = 
  | 'api' 
  | 'admin' 
  | 'dev' 
  | 'staging' 
  | 'vpn' 
  | 'mail' 
  | 'cdn' 
  | 'internal' 
  | 'wildcard' 
  | 'orphan'
  | 'other';

export type SubdomainRisk = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface Subdomain {
  name: string;
  category: SubdomainCategory;
  risk: SubdomainRisk;
  resolvedIP?: string;
  status?: 'active' | 'inactive' | 'resolved';
  httpStatus?: number;
  banner?: string;
  tech?: string[];
}