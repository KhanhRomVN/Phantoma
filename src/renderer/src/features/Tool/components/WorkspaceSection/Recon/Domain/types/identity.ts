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

// Extended Identity Records (full schema from RECON.md)
export interface IdentityRecords {
  domainName: string;
  registrar: string;
  registry: string;
  creationDate: string;
  expirationDate: string;
  updatedDate: string;
  domainStatus: string[];
  whoisRaw: string;
  nameservers: string[];
  dnssec: string;
  tld: string;
  registrarAbuseContact: {
    email: string;
    phone: string;
  };
}