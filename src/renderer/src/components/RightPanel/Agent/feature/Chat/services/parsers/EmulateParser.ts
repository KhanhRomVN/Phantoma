/**
 * ------------------------------------------------------------------
 * Emulate Parser
 * ------------------------------------------------------------------
 * Parse XML tags từ AI response cho các emulate tools.
 * Mỗi tool có một parse function riêng để extract params.
 *
 * Main functions:
 * - parseApplyFilter()        : Parse apply_filter tag
 * - parseGetHttpsDetail()     : Parse get_https_detail tag
 * - parseGetResourceContent() : Parse get_resource_content tag
 * - parseGetSourceDetail()    : Parse get_source_detail tag
 * - parseListHttps()          : Parse list_https tag
 * - parseListResources()      : Parse list_resources tag
 * - parseListSources()        : Parse list_sources tag
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Utils ──
import { extractParamValue } from '../../utils/ToolParser';

// ── Types ──
import {
  DeleteRepeaterParams,
  GetRepeaterDetailParams,
  UpdateRepeaterContentParams,
  GetHttpsDetailParams,
  GetResourceContentParams,
  GetSourceDetailParams,
  ListHostsParams,
  ListHttpsParams,
  ListRepeatersParams,
  ListResourcesParams,
  ListSourcesParams,
  SendToRepeaterParams,
} from '../../types/tool-types';

// ─── Functions ──────────────────────────────────────────────────────────
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
    const match = /^request_(\d+)$/i.exec(indexParam.trim());
    const parsed = match ? parseInt(match[1], 10) : parseInt(indexParam, 10);
    if (!isNaN(parsed)) params.index = parsed;
  }

  return params;
}

// ===== GetResourceContentParser =====

/**
 * Parse get_resource_content tag from AI response.
 * Format:
 *   <get_resource_content>
 *     <filename>manifest.json</filename>
 *     <start_line>1</start_line>
 *     <end_line>100</end_line>
 *   </get_resource_content>
 */
export function parseGetResourceContent(innerContent: string): GetResourceContentParams {
  const params: GetResourceContentParams = { filename: '' };

  const filenameParam = extractParamValue(innerContent, 'filename');
  if (filenameParam) {
    params.filename = filenameParam.trim();
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
 * Format: <get_source_detail><filepath>example.com/assets/main.js</filepath></get_source_detail>
 */
export function parseGetSourceDetail(innerContent: string): GetSourceDetailParams {
  const params: GetSourceDetailParams = { filepath: '' };

  const filepathParam = extractParamValue(innerContent, 'filepath');
  if (filepathParam) {
    params.filepath = filepathParam.trim();
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

// ===== SendToRepeaterParser =====

/**
 * Parse send_to_repeater tag from AI response.
 * Format: <send_to_repeater><index>1</index></send_to_repeater>
 */
export function parseSendToRepeater(innerContent: string): SendToRepeaterParams {
  const params: SendToRepeaterParams = { index: -1 };

  const indexParam = extractParamValue(innerContent, 'index');
  if (indexParam) {
    const match = /^request_(\d+)$/i.exec(indexParam.trim());
    const parsed = match ? parseInt(match[1], 10) : parseInt(indexParam, 10);
    if (!isNaN(parsed)) params.index = parsed;
  }

  return params;
}

// ===== ListRepeatersParser =====

/**
 * Parse list_repeaters tag from AI response.
 * Format: <list_repeaters /> (no params)
 */
export function parseListRepeaters(_innerContent: string): ListRepeatersParams {
  return {};
}

// ===== DeleteRepeaterParser =====

/**
 * Parse delete_repeater tag from AI response.
 * Format: <delete_repeater><repeater_id>repeater_1</repeater_id></delete_repeater>
 */
export function parseDeleteRepeater(innerContent: string): DeleteRepeaterParams {
  const params: DeleteRepeaterParams = { repeater_id: '' };

  const idParam = extractParamValue(innerContent, 'repeater_id');
  if (idParam) params.repeater_id = idParam.trim();

  return params;
}

// ===== GetRepeaterDetailParser =====

/**
 * Parse get_repeater_detail tag from AI response.
 * Format: <get_repeater_detail><repeater_id>repeater_1</repeater_id></get_repeater_detail>
 */
export function parseGetRepeaterDetail(innerContent: string): GetRepeaterDetailParams {
  const params: GetRepeaterDetailParams = { repeater_id: '' };

  const idParam = extractParamValue(innerContent, 'repeater_id');
  if (idParam) params.repeater_id = idParam.trim();

  return params;
}

// ===== UpdateRepeaterContentParser =====

/**
 * Parse update_repeater_content tag from AI response.
 * Format:
 *   <update_repeater_content>
 *     <repeater_id>repeater_1</repeater_id>
 *     <target>headers</target>
 *     <old_content>...</old_content>
 *     <new_content>...</new_content>
 *   </update_repeater_content>
 */
export function parseUpdateRepeaterContent(innerContent: string): UpdateRepeaterContentParams {
  const params: UpdateRepeaterContentParams = {
    repeater_id: '',
    target: 'body',
    old_content: '',
    new_content: '',
  };

  const idParam = extractParamValue(innerContent, 'repeater_id');
  if (idParam) params.repeater_id = idParam.trim();

  const targetParam = extractParamValue(innerContent, 'target');
  if (targetParam) {
    const target = targetParam.trim().toLowerCase();
    if (target === 'params' || target === 'headers' || target === 'body') {
      params.target = target;
    }
  }

  const oldParam = extractParamValue(innerContent, 'old_content');
  if (oldParam) params.old_content = oldParam;

  const newParam = extractParamValue(innerContent, 'new_content');
  if (newParam) params.new_content = newParam;

  return params;
}