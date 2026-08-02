import { extractParamValue } from '../../../utils/ToolParser';

export interface ApplyFilterParams {
  methods?: { action: 'hide' | 'show'; value: string }[];
  statuses?: { action: 'hide' | 'show'; value: number }[];
  types?: { action: 'hide' | 'show'; value: string }[];
  hosts?: { action: 'add' | 'remove'; value: string }[];
  paths?: { action: 'add' | 'remove'; value: string }[];
  size?: { min: string; max: string } | null;
  time?: { min: string; max: string } | null;
}

/**
 * Parse apply_filter tag from AI response.
 * Format:
 *   <apply_filter>
 *     <method action="hide">OPTIONS</method>
 *     <type action="show">xhr</type>
 *     <host action="add">api.example.com</host>
 *     <status action="hide">404</status>
 *     <size min="100" max="5000" />
 *   </apply_filter>
 */
export function parseApplyFilter(innerContent: string): ApplyFilterParams {
  const params: ApplyFilterParams = {};

  // Parse <method> tags
  const methodRegex = /<method\s+action=["'](hide|show)["']\s*>(.+?)<\/method>/gi;
  let match: RegExpExecArray | null;
  while ((match = methodRegex.exec(innerContent)) !== null) {
    if (!params.methods) params.methods = [];
    params.methods.push({ action: match[1] as 'hide' | 'show', value: match[2].trim().toUpperCase() });
  }

  // Parse <status> tags
  const statusRegex = /<status\s+action=["'](hide|show)["']\s*>(.+?)<\/status>/gi;
  while ((match = statusRegex.exec(innerContent)) !== null) {
    if (!params.statuses) params.statuses = [];
    const val = parseInt(match[2].trim(), 10);
    if (!isNaN(val)) {
      params.statuses.push({ action: match[1] as 'hide' | 'show', value: val });
    }
  }

  // Parse <type> tags
  const typeRegex = /<type\s+action=["'](hide|show)["']\s*>(.+?)<\/type>/gi;
  while ((match = typeRegex.exec(innerContent)) !== null) {
    if (!params.types) params.types = [];
    params.types.push({ action: match[1] as 'hide' | 'show', value: match[2].trim().toLowerCase() });
  }

  // Parse <host> tags
  const hostRegex = /<host\s+action=["'](add|remove)["']\s*>(.+?)<\/host>/gi;
  while ((match = hostRegex.exec(innerContent)) !== null) {
    if (!params.hosts) params.hosts = [];
    params.hosts.push({ action: match[1] as 'add' | 'remove', value: match[2].trim() });
  }

  // Parse <path> tags
  const pathRegex = /<path\s+action=["'](add|remove)["']\s*>(.+?)<\/path>/gi;
  while ((match = pathRegex.exec(innerContent)) !== null) {
    if (!params.paths) params.paths = [];
    params.paths.push({ action: match[1] as 'add' | 'remove', value: match[2].trim() });
  }

  // Parse <size> tag
  const sizeMin = extractParamValue(innerContent, 'size.min');
  const sizeMax = extractParamValue(innerContent, 'size.max');
  if (sizeMin || sizeMax) {
    params.size = { min: sizeMin || '', max: sizeMax || '' };
  }

  // Parse <time> tag
  const timeMin = extractParamValue(innerContent, 'time.min');
  const timeMax = extractParamValue(innerContent, 'time.max');
  if (timeMin || timeMax) {
    params.time = { min: timeMin || '', max: timeMax || '' };
  }

  return params;
}