// Web Surface Types for WebSurface component

export interface WebSurfaceData {
  websites: string[];
  loginPages: string[];
  adminPanels: string[];
  apiEndpoints: string[];
  graphql?: string;
  swagger?: string;
  webSockets?: string[];
  robotsTxt?: string;
  sitemapXml?: string;
  jsFiles?: string[];
}