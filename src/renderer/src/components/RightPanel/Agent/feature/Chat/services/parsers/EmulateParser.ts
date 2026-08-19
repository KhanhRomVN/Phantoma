import { extractParamValue } from '../../utils/ToolParser';
import {
  GetHttpsDetailParams,
  GetResourceContentParams,
  GetSourceDetailParams,
  ListHostsParams,
  ListHttpsParams,
  ListResourcesParams,
  ListSourcesParams,
} from '../../types/tool-types';

// ===== ApplyFilterParser =====

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

// ===== GetHttpsDetailParser =====

/**
 * Parse get_https_detail tag from AI response.
 * Format: <get_https_detail><index>3</index></get_https_detail>
 */
export function parseGetHttpsDetail(innerContent: string): GetHttpsDetailParams {
  const params: GetHttpsDetailParams = { index: -1 };

  const indexParam = extractParamValue(innerContent, 'index');
  if (indexParam) {
    const parsed = parseInt(indexParam, 10);
    if (!isNaN(parsed)) params.index = parsed;
  }

  return params;
}

// ===== GetResourceContentParser =====

/**
 * Parse get_resource_content tag from AI response.
 * Format:
 *   <get_resource_content>
 *     <index>3</index>
 *     <start_line>1</start_line>
 *     <end_line>100</end_line>
 *   </get_resource_content>
 */
export function parseGetResourceContent(innerContent: string): GetResourceContentParams {
  const params: GetResourceContentParams = { index: -1 };

  const indexParam = extractParamValue(innerContent, 'index');
  if (indexParam) {
    const parsed = parseInt(indexParam, 10);
    if (!isNaN(parsed)) params.index = parsed;
  }

  const startLineParam = extractParamValue(innerContent, 'start_line');
  if (startLineParam) {
    const parsed = parseInt(startLineParam, 10);
    if (!isNaN(parsed)) params.start_line = parsed;
  }

  const endLineParam = extractParamValue(innerContent, 'end_line');
  if (endLineParam) {
    const parsed = parseInt(endLineParam, 10);
    if (!isNaN(parsed)) params.end_line = parsed;
  }

  return params;
}

// ===== GetSourceDetailParser =====

/**
 * Parse get_source_detail tag from AI response.
 * Format: <get_source_detail><index>5</index></get_source_detail>
 */
export function parseGetSourceDetail(innerContent: string): GetSourceDetailParams {
  const params: GetSourceDetailParams = { index: -1 };

  const indexParam = extractParamValue(innerContent, 'index');
  if (indexParam) {
    const parsed = parseInt(indexParam, 10);
    if (!isNaN(parsed)) params.index = parsed;
  }

  return params;
}

// ===== ListHostsParser =====

/**
 * Parse list_hosts tag from AI response.
 * Format: <list_hosts /> (no params)
 */
export function parseListHosts(_innerContent: string): ListHostsParams {
  return {};
}

// ===== ListHttpsParser =====

/**
 * Parse list_https tag from AI response.
 * Format:
 *   <list_https>
 *     <limit>50</limit>
 *     <method>GET</method>
 *     <host>api.example.com</host>
 *     <path>/users</path>
 *     <status>200</status>
 *     <type>xhr</type>
 *   </list_https>
 */
export function parseListHttps(innerContent: string): ListHttpsParams {
  const params: ListHttpsParams = {};

  // Extract limit
  const limitParam = extractParamValue(innerContent, 'limit');
  if (limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (!isNaN(parsed)) params.limit = parsed;
  }

  const filter: ListHttpsParams['filter'] = {};

  const method = extractParamValue(innerContent, 'method');
  if (method) filter.method = method;

  const host = extractParamValue(innerContent, 'host');
  if (host) filter.host = host;

  const path = extractParamValue(innerContent, 'path');
  if (path) filter.path = path;

  const status = extractParamValue(innerContent, 'status');
  if (status) {
    const parsed = parseInt(status, 10);
    if (!isNaN(parsed)) filter.status = parsed;
  }

  const type = extractParamValue(innerContent, 'type');
  if (type) filter.type = type;

  if (Object.keys(filter).length > 0) {
    params.filter = filter;
  }

  return params;
}

// ===== ListResourcesParser =====

/**
 * Parse list_resources tag from AI response.
 * Format:
 *   <list_resources>
 *     <filter>
 *       <type>image</type>
 *     </filter>
 *   </list_resources>
 */
export function parseListResources(innerContent: string): ListResourcesParams {
  const params: ListResourcesParams = {};

  // Extract filter block
  const filterMatch = /<filter>([\s\S]*?)<\/filter>/i.exec(innerContent);
  if (filterMatch) {
    const filterContent = filterMatch[1];
    const filter: ListResourcesParams['filter'] = {};

    const type = extractParamValue(filterContent, 'type');
    if (type) filter.type = type;

    if (Object.keys(filter).length > 0) {
      params.filter = filter;
    }
  }

  return params;
}

// ===== ListSourcesParser =====

/**
 * Parse list_sources tag from AI response.
 * Format:
 *   <list_sources>
 *     <host>cdn.example.com</host>
 *     <type>js</type>
 *   </list_sources>
 */
export function parseListSources(innerContent: string): ListSourcesParams {
  const params: ListSourcesParams = {};

  const filter: ListSourcesParams['filter'] = {};

  const host = extractParamValue(innerContent, 'host');
  if (host) filter.host = host;

  const type = extractParamValue(innerContent, 'type');
  if (type) filter.type = type;

  if (Object.keys(filter).length > 0) {
    params.filter = filter;
  }

  return params;
}