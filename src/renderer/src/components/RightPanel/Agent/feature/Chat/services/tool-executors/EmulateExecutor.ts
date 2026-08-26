/**
 * ------------------------------------------------------------------
 * Emulate Executor
 * ------------------------------------------------------------------
 * Thực thi các emulate tools bằng cách gọi EmulateController.
 * Mỗi executor function gọi EmulateController.executeTool() và
 * trả về output hoặc error message.
 *
 * Main functions:
 * - executeApplyFilter()        : Thực thi apply_filter tool
 * - executeGetHttpsDetail()     : Thực thi get_https_detail tool
 * - executeGetResourceContent() : Thực thi get_resource_content tool
 * - executeGetSourceDetail()    : Thực thi get_source_detail tool
 * - executeListHttps()          : Thực thi list_https tool
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Controller ──
import { EmulateController } from '@renderer/controller/EmulateController';

// ── Types ──
import type { ApplyFilterParams } from '../parsers/EmulateParser';
import type {
  DeleteRepeaterParams,
  GetRepeaterDetailParams,
  SendToRepeaterParams,
  UpdateRepeaterContentParams,
} from '../../types/tool-types';

// ─── Functions ──────────────────────────────────────────────────────────
// ===== ApplyFilterExecutor =====

/** Execute apply_filter tool — gọi EmulateController.executeTool() */
export async function executeApplyFilter(params: ApplyFilterParams): Promise<string | null> {
  const result = await EmulateController.executeTool('apply_filter', params as any);

  if (!result.success) {
    return '[apply_filter] Result: Error - ' + (result.error || '');
  }
  return (result.data as any)?.output || null;
}

// ===== GetHttpsDetailExecutor =====

export interface GetHttpsDetailParams {
  index: number;
}

/** Execute get_https_detail tool — gọi EmulateController.executeTool() */
export async function executeGetHttpsDetail(params: GetHttpsDetailParams): Promise<string | null> {
  const result = await EmulateController.executeTool('get_https_detail', { index: params.index });

  if (!result.success) {
    return '[get_https_detail] Result: Error - ' + (result.error || '');
  }
  return (result.data as any)?.output || null;
}

// ===== GetResourceContentExecutor =====

export interface GetResourceContentParams {
  filename: string;
  start_line?: number;
  end_line?: number;
}

/** Execute get_resource_content tool — gọi EmulateController.executeTool() */
export async function executeGetResourceContent(
  params: GetResourceContentParams,
): Promise<string | null> {
  const result = await EmulateController.executeTool('get_resource_content', {
    filename: params.filename,
    start_line: params.start_line,
    end_line: params.end_line,
  });

  if (!result.success) {
    return '[get_resource_content] Result: Error - ' + (result.error || '');
  }
  return (result.data as any)?.output || null;
}

// ===== GetSourceDetailExecutor =====

export interface GetSourceDetailParams {
  filepath: string;
}

/** Execute get_source_detail tool — gọi EmulateController.executeTool() */
export async function executeGetSourceDetail(params: GetSourceDetailParams): Promise<string | null> {
  const result = await EmulateController.executeTool('get_source_detail', { filepath: params.filepath });

  if (!result.success) {
    return '[get_source_detail] Result: Error - ' + (result.error || '');
  }
  return (result.data as any)?.output || null;
}

// ===== ListHostsExecutor =====

/** Execute list_hosts tool — gọi EmulateController.executeTool() */
export async function executeListHosts(): Promise<string | null> {
  const result = await EmulateController.executeTool('list_hosts');

  if (!result.success) {
    return '[list_hosts] Result: Error - ' + (result.error || '');
  }
  return (result.data as any)?.output || null;
}

// ===== ListHttpsExecutor =====

export interface ListHttpsParams {
  filter?: { method?: string; host?: string; path?: string; status?: number };
  limit?: number;
}

/** Execute list_https tool — gọi EmulateController.executeTool() */
export async function executeListHttps(params: ListHttpsParams): Promise<string | null> {
  const result = await EmulateController.executeTool('list_https', {
    filter: params.filter || {},
    limit: params.limit || 50,
  });

  if (!result.success) {
    return '[list_https] Result: Error - ' + (result.error || '');
  }
  return (result.data as any)?.output || null;
}

// ===== ListResourcesExecutor =====

export interface ListResourcesParams {
  filter?: { type?: string };
}

/** Execute list_resources tool — gọi EmulateController.executeTool() */
export async function executeListResources(params: ListResourcesParams): Promise<string | null> {
  const result = await EmulateController.executeTool('list_resources', {
    filter: params.filter || {},
  });

  if (!result.success) {
    return '[list_resources] Result: Error - ' + (result.error || '');
  }
  return (result.data as any)?.output || null;
}

// ===== ListSourcesExecutor =====

export interface ListSourcesParams {
  filter?: { host?: string; type?: string };
}

/** Execute list_sources tool — gọi EmulateController.executeTool() */
export async function executeListSources(params: ListSourcesParams): Promise<string | null> {
  const result = await EmulateController.executeTool('list_sources', {
    filter: params.filter || {},
  });

  if (!result.success) {
    return '[list_sources] Result: Error - ' + (result.error || '');
  }
  return (result.data as any)?.output || null;
}

// ===== SendToRepeaterExecutor =====

/** Execute send_to_repeater tool — gọi EmulateController.executeTool() */
export async function executeSendToRepeater(params: SendToRepeaterParams, contextTargetId?: string | null): Promise<string | null> {
  const result = await EmulateController.executeTool('send_to_repeater', {
    index: params.index,
  }, contextTargetId);

  if (!result.success) {
    return '[send_to_repeater] Result: Error - ' + (result.error || '');
  }
  return (result.data as any)?.output || null;
}

// ===== ListRepeatersExecutor =====

/** Execute list_repeaters tool — gọi EmulateController.executeTool() */
export async function executeListRepeaters(contextTargetId?: string | null): Promise<string | null> {
  const result = await EmulateController.executeTool('list_repeaters', {}, contextTargetId);

  if (!result.success) {
    return '[list_repeaters] Result: Error - ' + (result.error || '');
  }
  return (result.data as any)?.output || null;
}

// ===== DeleteRepeaterExecutor =====

/** Execute delete_repeater tool — gọi EmulateController.executeTool() */
export async function executeDeleteRepeater(params: DeleteRepeaterParams, contextTargetId?: string | null): Promise<string | null> {
  const result = await EmulateController.executeTool('delete_repeater', {
    repeater_id: params.repeater_id,
  }, contextTargetId);

  if (!result.success) {
    return '[delete_repeater] Result: Error - ' + (result.error || '');
  }
  return (result.data as any)?.output || null;
}

// ===== GetRepeaterDetailExecutor =====

/** Execute get_repeater_detail tool — gọi EmulateController.executeTool() */
export async function executeGetRepeaterDetail(params: GetRepeaterDetailParams, contextTargetId?: string | null): Promise<string | null> {
  const result = await EmulateController.executeTool('get_repeater_detail', {
    repeater_id: params.repeater_id,
  }, contextTargetId);

  if (!result.success) {
    return '[get_repeater_detail] Result: Error - ' + (result.error || '');
  }
  return (result.data as any)?.output || null;
}

// ===== UpdateRepeaterContentExecutor =====

/** Execute update_repeater_content tool — gọi EmulateController.executeTool() */
export async function executeUpdateRepeaterContent(params: UpdateRepeaterContentParams, contextTargetId?: string | null): Promise<string | null> {
  const result = await EmulateController.executeTool('update_repeater_content', {
    repeater_id: params.repeater_id,
    target: params.target,
    old_content: params.old_content,
    new_content: params.new_content,
  }, contextTargetId);

  if (!result.success) {
    return '[update_repeater_content] Result: Error - ' + (result.error || '');
  }
  return (result.data as any)?.output || null;
}