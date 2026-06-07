// Web Surface Types for WebSurface component

export interface WebSurfaceData {
  website?: string;
  loginPage?: string;
  adminPanel?: string;
  apiEndpoints?: string[];
  graphQLEndpoint?: string;
  swaggerOpenAPI?: string;
  websocket?: string;
  uploadEndpoint?: string;
  hiddenDirectories?: string[];
  robotsTxt?: string;
  sitemapXml?: string;
  jsFiles?: string[];
  sourceMap?: string;
  fileListing?: string[];
  redirect?: string;
  errorPage?: string;
}