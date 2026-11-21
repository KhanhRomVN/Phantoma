/**
 * Proxy / breakpoint types.
 */

export interface BreakpointRule {
  id: string;
  urlPattern: string;
  methods: string[];
  phase: 'request' | 'response' | 'both';
  enabled: boolean;
}

export interface PendingBreakpoint {
  id: string;
  phase: 'request' | 'response';
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  statusCode?: number;
}
