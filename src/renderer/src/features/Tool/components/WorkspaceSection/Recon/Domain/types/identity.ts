// WHOIS Types for Identity component

export interface WhoisData {
  domain: string;
  registrar: string;
  creationDate: string;
  expirationDate: string;
  nameServers: string[];
  registrant?: string;
  dnssec: string;
}