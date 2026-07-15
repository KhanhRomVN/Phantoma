import { extractParamValue } from "../../utils/ToolParser";

export interface ListHttpsParams {
  limit?: number;
  filter?: {
    method?: string;
    host?: string;
    path?: string;
    status?: number;
  };
}

export const parseListHttps = (innerContent: string): ListHttpsParams => {
  const limitStr = extractParamValue(innerContent, "limit");
  const method = extractParamValue(innerContent, "method");
  const host = extractParamValue(innerContent, "host");
  const path = extractParamValue(innerContent, "path");
  const statusStr = extractParamValue(innerContent, "status");

  const limit = limitStr ? parseInt(limitStr, 10) : undefined;
  const status = statusStr ? parseInt(statusStr, 10) : undefined;

  const hasFilter = method || host || path || status !== undefined;
  const filter = hasFilter
    ? {
        method: method || undefined,
        host: host || undefined,
        path: path || undefined,
        status: !isNaN(status as number) ? status : undefined,
      }
    : undefined;

  return {
    limit: limit && !isNaN(limit) ? limit : undefined,
    filter,
  };
};