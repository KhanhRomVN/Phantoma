export interface AppStructure {
  urlStructure: string[];
  endpointMapping: { path: string; method: string; description?: string }[];
  routeDiscovery: string[];
  apiDiscovery: string[];
  hiddenPaths: string[];
  uploadPaths: string[];
  queryStringParams?: { url: string; params: string[] }[];
  formDiscovery?: { url: string; action?: string; method?: string; fields?: string[] }[];
}