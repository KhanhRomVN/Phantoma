export interface DigitalAsset {
  type: 'domain' | 'subdomain' | 'mobileApp' | 'cloudAsset' | 'githubOrg' | 'publicRepo';
  name: string;
  url?: string;
  visibility?: string;
  risk?: string;
}