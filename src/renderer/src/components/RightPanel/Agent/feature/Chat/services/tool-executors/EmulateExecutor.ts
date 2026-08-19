import { EmulateController } from '@renderer/controller/EmulateController';
import type { ApplyFilterParams } from '../parsers/EmulateParser';

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
  index: number;
  start_line?: number;
  end_line?: number;
}

/** Execute get_resource_content tool — gọi EmulateController.executeTool() */
export async function executeGetResourceContent(
  params: GetResourceContentParams,
): Promise<string | null> {
  const result = await EmulateController.executeTool('get_resource_content', {
    index: params.index,
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
  index: number;
}

/** Execute get_source_detail tool — gọi EmulateController.executeTool() */
export async function executeGetSourceDetail(params: GetSourceDetailParams): Promise<string | null> {
  const result = await EmulateController.executeTool('get_source_detail', { index: params.index });

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