// ReconData Aggregate Type — Person/Email INTEL

export type PersonStatus = 'idle' | 'queued' | 'scanning' | 'done' | 'error';

export interface PersonSession {
  id: string;
  email: string;
  name?: string;
  status: PersonStatus;
  progress: number;
  riskScore?: number;
}

// Identity
export interface IdentityInfo {
  fullName?: string;
  alias?: string[];
  username?: string[];
  nickname?: string;
  avatar?: string;
  possibleRealNames?: string[];
  estimatedAge?: number;
  gender?: string;
  nationality?: string;
  language?: string[];
  location?: string;
  timezone?: string;
  bio?: string;
  notes?: string;
}

// Contact
export interface MessengerAccount {
  platform: string;
  username: string;
  id?: number;
}

export interface ContactInfo {
  email?: string[];
  phoneNumber?: string[];
  address?: string[];
  messengerAccounts?: MessengerAccount[];
}

// Social Media
export interface SocialProfile {
  url?: string;
  username?: string;
  displayName?: string;
  bio?: string;
  followers?: number;
  following?: number;
  [key: string]: unknown;
}

export interface SocialMediaData {
  twitter?: SocialProfile | null;
  linkedin?: SocialProfile | null;
  github?: SocialProfile | null;
  facebook?: SocialProfile | null;
  instagram?: SocialProfile | null;
  reddit?: SocialProfile | null;
  hackerone?: SocialProfile | null;
  bugcrowd?: SocialProfile | null;
  stackoverflow?: SocialProfile | null;
  medium?: SocialProfile | null;
  youtube?: SocialProfile | null;
  patreon?: SocialProfile | null;
  devto?: SocialProfile | null;
  keybase?: SocialProfile | null;
  mastodon?: SocialProfile | null;
  flickr?: SocialProfile | null;
  tiktok?: SocialProfile | null;
  pinterest?: SocialProfile | null;
  goodreads?: SocialProfile | null;
  letterboxd?: SocialProfile | null;
  myanimelist?: SocialProfile | null;
  anilist?: SocialProfile | null;
  trakt?: SocialProfile | null;
  vimeo?: SocialProfile | null;
  dribbble?: SocialProfile | null;
  behance?: SocialProfile | null;
  steam?: SocialProfile | null;
  twitch?: SocialProfile | null;
  couchsurfing?: SocialProfile | null;
  meetup?: SocialProfile | null;
  other?: SocialProfile[];
  [key: string]: unknown;
}

// Technical
export interface PublicKey {
  type: string;
  keyId?: string;
  fingerprint?: string;
  created?: string;
  source?: string;
}

export interface DomainOwnership {
  domain: string;
  registrar?: string;
  registered?: string;
  expires?: string;
}

export interface IpAddress {
  ip: string;
  type?: string;
  isp?: string;
  city?: string;
  associatedDomains?: string[];
  note?: string;
}

export interface RepoContribution {
  repo: string;
  contributions: number;
  language?: string;
  stars?: number;
}

export interface ToolPublished {
  name: string;
  url: string;
  description: string;
  language?: string;
  stars?: number;
}

export interface Conference {
  name: string;
  role: string;
  topic?: string;
}

export interface CtfResult {
  ctf: string;
  rank: number;
  team: string;
}

export interface TechnicalFootprint {
  github?: string;
  gitlab?: string;
  bitbucket?: string | null;
  sourceforge?: string;
  dockerhub?: string;
  npm?: string;
  pypi?: string;
  stackoverflow?: string;
  publicKeys?: PublicKey[];
  domainOwnership?: DomainOwnership[];
  ipAddresses?: IpAddress[];
  hostingProviders?: string[];
  technologies?: string[];
  repositoryContributions?: RepoContribution[];
  toolsPublished?: ToolPublished[];
  conferences?: Conference[];
  ctfResults?: CtfResult[];
}

// Leaks
export interface PasswordLeak {
  source: string;
  date: string;
  email: string;
  severity: string;
  hashType?: string;
  hashValue?: string;
  passwordSample?: string;
  detail: string;
}

export interface CredentialLeak {
  source: string;
  date: string;
  url: string;
  content: string;
  validated: boolean;
  note?: string;
}

export interface DarkwebMention {
  marketplace: string;
  date: string;
  threadTitle: string;
  detail: string;
}

export interface PublicDocument {
  source: string;
  url: string;
  email: string;
  date: string;
}

export interface LeakExposure {
  passwordLeaks?: PasswordLeak[];
  credentialLeaks?: CredentialLeak[];
  breachDatabase?: string[];
  pastebinLeaks?: { url: string; date: string; title: string; content: string }[];
  publicDocuments?: PublicDocument[];
  darkwebMentions?: DarkwebMention[];
}

// Registered Service
export interface RegisteredService {
  service: string;
  confirmed: boolean;
  url?: string | null;
  note?: string;
}

// Noise Result
export interface NoiseResult {
  type: string;
  platform: string;
  username?: string;
  url?: string;
  snippet?: string;
  source?: string;
  email?: string;
  profile?: string;
  ip?: string;
  note: string;
}

// Main INTEL Data Type
export interface ReconData {
  target: string;
  queryType: 'email';
  scanTime: string;
  scanDuration: number;
  confidence: number;
  totalHits: number;
  identityInfo?: IdentityInfo;
  contactInfo?: ContactInfo;
  socialMedia?: SocialMediaData;
  technicalFootprint?: TechnicalFootprint;
  leakExposure?: LeakExposure;
  registeredServices?: RegisteredService[];
  noiseResults?: NoiseResult[];
  warnings?: string[];
}