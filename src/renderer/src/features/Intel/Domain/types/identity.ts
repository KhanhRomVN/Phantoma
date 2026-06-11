// WHOIS Types for Identity component

export interface WhoisContact {
  name?: string;
  organization?: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  country?: string;
  postalCode?: string;
}

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
  registrant?: WhoisContact;
  adminContact?: WhoisContact;
  techContact?: WhoisContact;
  registrarAbuseContact: {
    email: string;
    phone: string;
  };
  registrarIanaId?: string;
  whoisServer?: string;
}