// Request Service - Build and parse HTTP requests
import { NetworkRequest } from '../types/inspector';

export interface BuildRequestOptions {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  params?: Record<string, string>;
}

export interface ParsedRequest {
  method: string;
  url: string;
  protocol: string;
  host: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body?: string;
}

export class RequestService {
  /**
   * Build a full URL with query parameters
   */
  buildUrl(baseUrl: string, params?: Record<string, string>): string {
    if (!params || Object.keys(params).length === 0) return baseUrl;

    const url = new URL(baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.append(key, value);
    });
    return url.toString();
  }

  /**
   * Parse a request from NetworkRequest
   */
  parseRequest(req: NetworkRequest): ParsedRequest {
    let host = req.host || '';
    let path = req.path || '/';
    let protocol = req.protocol || 'http';
    let query: Record<string, string> = {};

    try {
      if (req.url) {
        const url = new URL(req.url);
        host = url.host;
        path = url.pathname;
        protocol = url.protocol.replace(':', '');
        url.searchParams.forEach((value, key) => {
          query[key] = value;
        });
      }
    } catch {
      // Ignore invalid URL
    }

    return {
      method: req.method || 'GET',
      url: req.url || '',
      protocol,
      host,
      path,
      query,
      headers: req.requestHeaders || {},
      body: typeof req.requestBody === 'string' ? req.requestBody : undefined,
    };
  }

  /**
   * Build a request config for sending
   */
  buildRequestConfig(options: BuildRequestOptions): {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
  } {
    const { method, url, headers, body, params } = options;
    const finalUrl = this.buildUrl(url, params);

    const finalHeaders: Record<string, string> = { ...headers };

    // Add Content-Type if not present and body exists
    if (body && !Object.keys(finalHeaders).some((k) => k.toLowerCase() === 'content-type')) {
      try {
        JSON.parse(body);
        finalHeaders['Content-Type'] = 'application/json';
      } catch {
        finalHeaders['Content-Type'] = 'text/plain';
      }
    }

    return {
      url: finalUrl,
      method,
      headers: finalHeaders,
      body: method !== 'GET' && method !== 'HEAD' ? body : undefined,
    };
  }

  /**
   * Substitute placeholders in a template
   * Supports: ${name} and §name§ formats
   */
  substituteTemplate(template: string, values: Record<string, string>): string {
    let result = template;

    // ${name} format
    Object.entries(values).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
    });

    // §name§ format (for fuzzer)
    Object.entries(values).forEach(([key, value]) => {
      result = result.replace(new RegExp(`§${key}§`, 'g'), value);
    });

    return result;
  }

  /**
   * Extract payload variables from a template
   */
  extractPayloadVariables(template: string): string[] {
    const variables: string[] = [];

    // ${name} format
    const matches1 = template.match(/\$\{([^}]+)\}/g);
    if (matches1) {
      matches1.forEach((match) => {
        const name = match.replace(/\$\{([^}]+)\}/, '$1');
        if (!variables.includes(name)) variables.push(name);
      });
    }

    // §name§ format
    const matches2 = template.match(/§([^§]+)§/g);
    if (matches2) {
      matches2.forEach((match) => {
        const name = match.replace(/§([^§]+)§/, '$1');
        if (!variables.includes(name)) variables.push(name);
      });
    }

    return variables;
  }

  /**
   * Parse query string to object
   */
  parseQueryString(queryString: string): Record<string, string> {
    const result: Record<string, string> = {};
    try {
      const params = new URLSearchParams(queryString);
      params.forEach((value, key) => {
        result[key] = value;
      });
    } catch {
      // Ignore
    }
    return result;
  }

  /**
   * Stringify query object to string
   */
  stringifyQuery(params: Record<string, string>): string {
    try {
      const urlParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value) urlParams.append(key, value);
      });
      const str = urlParams.toString();
      return str ? `?${str}` : '';
    } catch {
      return '';
    }
  }
}

export const requestService = new RequestService();
export default requestService;
