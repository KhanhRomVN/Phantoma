import type { IdentityInfo } from './identity-info';
import type { ContactInfo } from './contact-info';
import type { SocialMedia } from './social-media';
import type { TechnicalFootprint } from './technical-footprint';
import type { LeakExposure } from './leak-exposure';

export type { IdentityInfo, ContactInfo, SocialMedia, TechnicalFootprint, LeakExposure };

export interface NoiseResult {
  source: string;
  url: string;
  type: string;
  confidence: number;
  note: string;
}

export interface RegisteredService {
  service: string;
  confirmed: boolean;
  url: string | null;
}

export interface PersonData {
  target: string;
  queryType?: 'name' | 'email' | 'username';
  scanTime: string;
  scanDuration?: number;
  confidence?: number;
  totalHits?: number;
  identityInfo: IdentityInfo;
  contactInfo: ContactInfo;
  socialMedia: SocialMedia;
  technicalFootprint: TechnicalFootprint;
  leakExposure: LeakExposure;
  registeredServices?: RegisteredService[];
  noiseResults?: NoiseResult[];
}