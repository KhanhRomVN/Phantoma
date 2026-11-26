import { useNetworkStore } from '../stores/networkStore';
import { buildResourceItems } from '../utils/resource-items.util';
import { runTool } from '../utils/tool-result.util';

export interface GetResourceContentParams {
  filename: string;
  start_line?: number;
  end_line?: number;
}

const MAX_DEFAULT_LINES = 1000;

/** Execute get_resource_content tool — đọc trực tiếp network store */
export async function executeGetResourceContent(
  params: GetResourceContentParams,
): Promise<string | null> {
  return runTool('get_resource_content', () => {
    if (!params.filename) throw new Error('filename is required');

    const requests = useNetworkStore.getState().requests;
    const items = buildResourceItems(requests);
    const item = items.find((it) => it.filename === params.filename);

    if (!item) {
      return `[get_resource_content] Error: resource file "${params.filename}" not found. Available files: ${items.map((it) => it.filename).join(', ')}`;
    }

    const header = [
      `[get_resource_content] Resource: ${params.filename}`,
      `Type: ${item.type}`,
      `Filename: ${item.filename}`,
      `Content-Type: ${item.contentType}`,
      `Size: ${item.size}`,
      `URL: ${item.url}`,
    ];

    const isTextResource =
      item.type === 'font' ||
      item.type === 'document' ||
      item.contentType.includes('svg') ||
      item.contentType.includes('text') ||
      item.contentType.includes('xml') ||
      item.contentType.includes('json');

    if (!isTextResource) {
      return [
        ...header,
        ``,
        `Note: This is a binary resource (${item.type}). Content viewing is not supported.`,
        `Use the UI to preview this resource.`,
      ].join('\n');
    }

    let content = item.responseBody || requests.find((r) => r.id === item.id)?.responseBody;
    if (!content) {
      return [...header, ``, `Content not available (no response body captured).`].join('\n');
    }
    if (typeof content !== 'string') content = JSON.stringify(content);

    const lines = content.split('\n');
    const totalLines = lines.length;

    let displayContent: string;
    let rangeInfo: string;

    if (params.start_line !== undefined || params.end_line !== undefined) {
      const start = params.start_line ? Math.max(1, params.start_line) - 1 : 0;
      const end = params.end_line ? Math.min(totalLines, params.end_line) : totalLines;
      displayContent = lines.slice(start, end).join('\n');
      rangeInfo = `Lines: ${start + 1}-${end} of ${totalLines}`;
    } else if (totalLines > MAX_DEFAULT_LINES) {
      displayContent = lines.slice(0, MAX_DEFAULT_LINES).join('\n');
      rangeInfo = `Lines: 1-${MAX_DEFAULT_LINES} of ${totalLines} (truncated)`;
    } else {
      displayContent = content;
      rangeInfo = `Lines: 1-${totalLines}`;
    }

    return [...header, rangeInfo, ``, displayContent].join('\n');
  });
}