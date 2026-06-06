import type { AppStructure } from './app-structure';
import type { AuthSurface } from './auth-surface';
import type { ClientSideAnalysis } from './client-side';
import type { WebVulnerability } from './web-vulnerability';
import type { TechnologyDetection } from './technology-detection';

export type { AppStructure, AuthSurface, ClientSideAnalysis, WebVulnerability, TechnologyDetection };

export interface WebsiteData {
  target: string;
  scanTime: string;
  appStructure: AppStructure;
  authSurface: AuthSurface;
  clientSideAnalysis: ClientSideAnalysis;
  webVulnerabilities: WebVulnerability[];
  technologyDetection: TechnologyDetection;
}