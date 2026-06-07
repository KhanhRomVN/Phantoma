export interface ClientSideAnalysis {
  jsFiles: string[];
  sourceMap?: string[];
  apiCalls: string[];
  localStorage: string[];
  sessionStorage: string[];
  websocket?: string;
  csp: string;
}