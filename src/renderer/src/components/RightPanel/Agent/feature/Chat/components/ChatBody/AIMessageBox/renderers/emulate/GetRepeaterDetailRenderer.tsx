import React from 'react';
import { cn } from '@renderer/shared/utils/cn';
import { getToolLabel } from '../../../../../constants/constants';
import { TagHeader } from '../../TagHeader';
import { BaseRendererProps } from '../../../../../types/renderer-types';
import ErrorBlock from '../../blocks/other/ErrorBlock';
import { getFaviconUrl } from '@renderer/shared/utils/faviconUtils';

interface RepeaterDetail {
  params: Record<string, any>;
  headers: Record<string, string>;
  body: string;
  url?: string;
  method?: string;
}

interface GetRepeaterDetailBlockProps {
  content: string;
  maxHeight?: string;
}

/**
 * Parse repeater detail from output string
 * Format: "[get_repeater_detail] repeater_N { ... }"
 */
const parseRepeaterDetail = (content: string): { id: string; detail: RepeaterDetail; url?: string; method?: string } | null => {
  try {
    // Extract repeater ID and JSON
    const match = content.match(/\[get_repeater_detail\]\s*(repeater_\d+)\s*(\{[\s\S]*\})/);
    if (!match) return null;

    const id = match[1];
    const jsonStr = match[2];
    const detail = JSON.parse(jsonStr) as RepeaterDetail;

    // Try to extract URL from headers or construct from host
    let url = detail.url;
    if (!url && detail.headers) {
      const host = detail.headers['Host'] || detail.headers['host'];
      if (host) {
        url = `https://${host}`;
      }
    }

    return { id, detail, url, method: detail.method };
  } catch (err) {
    console.error('[parseRepeaterDetail] Failed to parse:', err);
    return null;
  }
};

/**
 * Block displaying repeater request details with structured UI.
 */
const GetRepeaterDetailBlock: React.FC<GetRepeaterDetailBlockProps> = ({
  content,
  maxHeight = '400px',
}) => {
  const parsed = parseRepeaterDetail(content);

  if (!parsed) {
    return (
      <div className="mt-1 bg-background border rounded-[4px] overflow-hidden">
        <pre
          className="p-3 text-[12px] font-mono text-text-primary whitespace-pre-wrap overflow-auto"
          style={{ maxHeight }}
        >
          {content}
        </pre>
      </div>
    );
  }

  const { detail } = parsed;
  const paramCount = Object.keys(detail.params || {}).length;
  const headerCount = Object.keys(detail.headers || {}).length;
  const hasBody = detail.body && detail.body.trim().length > 0;

  return (
    <div className="mt-1 bg-background border rounded-[4px] overflow-hidden">
      <div className="overflow-auto" style={{ maxHeight }}>
        {/* Params Section */}
        <div className="border-b border-border/50">
          <div className="px-3 py-2 bg-card-background text-[11px] font-semibold text-text-secondary">
            Params {paramCount > 0 && <span className="opacity-60">({paramCount})</span>}
          </div>
          {paramCount === 0 ? (
            <div className="px-3 py-2 text-[12px] text-text-secondary italic opacity-60">
              No parameters
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {Object.entries(detail.params).map(([key, value]) => (
                <div key={key} className="px-3 py-2 hover:bg-dropdown-item-hover transition-colors">
                  <div className="flex gap-2">
                    <span className="text-[12px] font-mono font-semibold text-primary min-w-[100px]">
                      {key}
                    </span>
                    <span className="text-[12px] font-mono text-text-primary break-all">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Headers Section */}
        <div className="border-b border-border/50">
          <div className="px-3 py-2 bg-card-background text-[11px] font-semibold text-text-secondary">
            Headers {headerCount > 0 && <span className="opacity-60">({headerCount})</span>}
          </div>
          {headerCount === 0 ? (
            <div className="px-3 py-2 text-[12px] text-text-secondary italic opacity-60">
              No headers
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {Object.entries(detail.headers).map(([key, value]) => (
                <div key={key} className="px-3 py-2 hover:bg-dropdown-item-hover transition-colors">
                  <div className="flex gap-2">
                    <span className="text-[12px] font-mono font-semibold text-primary min-w-[150px]">
                      {key}
                    </span>
                    <span className="text-[12px] font-mono text-text-primary break-all">
                      {value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Body Section */}
        <div>
          <div className="px-3 py-2 bg-card-background text-[11px] font-semibold text-text-secondary">
            Body
          </div>
          {!hasBody ? (
            <div className="px-3 py-2 text-[12px] text-text-secondary italic opacity-60">
              Empty body
            </div>
          ) : (
            <div className="px-3 py-2">
              <pre className="text-[12px] font-mono text-text-primary whitespace-pre-wrap break-all">
                {detail.body}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const GetRepeaterDetailRenderer: React.FC<BaseRendererProps> = ({
  actionIndex,
  messageId,
  isActionClicked,
  isActiveGroup,
  isLastItemInList,
  toolOutputs,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const actionId = `${messageId}-action-${actionIndex}`;
  const output = toolOutputs?.[actionId]?.output;
  const isError = !!toolOutputs?.[actionId]?.isError;
  const errorMessage = isError ? output || '' : '';

  const isCompleted = Boolean(isActionClicked || isError || (output && output.trim().length > 0));

  // Parse output to extract URL info for header
  const parsed = output && !isError ? parseRepeaterDetail(output) : null;
  let host = '';
  let path = '/';
  
  if (parsed?.url) {
    try {
      const urlObj = new URL(parsed.url);
      host = urlObj.host;
      path = urlObj.pathname + urlObj.search;
    } catch (err) {
      // Fallback to headers
      if (parsed.detail.headers) {
        host = parsed.detail.headers['Host'] || parsed.detail.headers['host'] || '';
        const referer = parsed.detail.headers['Referer'] || parsed.detail.headers['referer'];
        if (referer) {
          try {
            const refererUrl = new URL(referer);
            path = refererUrl.pathname + refererUrl.search;
          } catch {}
        }
      }
    }
  }

  return (
    <div className={cn('flex flex-col gap-1.5 pb-1', isLastItemInList ? 'mb-0' : 'mb-0.5')}>
      <TagHeader
        title={
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs text-text-primary">
              <span className="font-semibold opacity-80">{getToolLabel('get_repeater_detail')}</span>
              {parsed && (
                <span className="opacity-50 text-[10px] text-text-secondary">
                  {parsed.id}
                </span>
              )}
              {!isCompleted && (
                <span className="text-[10px] opacity-60 italic ml-1 flex items-center gap-1">
                  <span className="codicon codicon-loading codicon-modifier-spin text-[10px]" />
                </span>
              )}
            </div>
            {isCompleted && !isError && host && (
              <div className="flex items-center gap-2 text-[11px]">
                <img
                  src={getFaviconUrl(`https://${host}`, 16)}
                  alt=""
                  className="w-4 h-4 object-contain shrink-0"
                />
                <span className="text-text-primary font-medium">{host}</span>
                <span className="text-text-secondary opacity-60">{path}</span>
              </div>
            )}
          </div>
        }
        statusColor={
          isError ? 'rgb(255, 45, 85)' : isCompleted ? 'rgb(48, 209, 88)' : 'rgb(106, 122, 154)'
        }
        isError={isError}
        isWaitingApproval={!!isActiveGroup && !isCompleted}
        toolType="get_repeater_detail"
        isPartial={!isCompleted}
        onClick={() => setIsCollapsed((v) => !v)}
        path=""
      />

      {isError && errorMessage && (
        <ErrorBlock content={errorMessage} compact={true} maxHeight="300px" />
      )}

      {output && !isError && !isCollapsed && (
        <GetRepeaterDetailBlock content={output} maxHeight="400px" />
      )}
    </div>
  );
};