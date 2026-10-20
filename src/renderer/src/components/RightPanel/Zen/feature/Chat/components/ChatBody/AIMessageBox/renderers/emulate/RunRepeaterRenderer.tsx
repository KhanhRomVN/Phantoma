import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';
import { getToolLabel } from '../../../../../constants/constants';
import { TagHeader } from '../../TagHeader';
import { BaseRendererProps } from '../../../../../types/renderer-types';
import ErrorBlock from '../../blocks/other/ErrorBlock';

interface RunRepeaterBlockProps {
  content: string;
  maxHeight?: string;
}

interface ParsedResponse {
  method: string;
  url: string;
  status: string;
  duration: string;
  responseHeaders: string;
  responseBody: string;
  payload?: string; // For single run with payload
  // For multiple runs
  isMultiple?: boolean;
  totalRuns?: string;
  successCount?: string;
  avgDuration?: string;
  results?: Array<{ 
    index: number; 
    status: string; 
    duration: string; 
    success: boolean;
    payload?: string; // For each run in multiple runs
  }>;
}

function parseContent(content: string): ParsedResponse {
  const result: ParsedResponse = {
    method: '',
    url: '',
    status: '',
    duration: '',
    responseHeaders: '',
    responseBody: '',
    isMultiple: false,
  };

  const lines = content.split('\n');

  // Check if this is a multiple runs output
  if (content.includes('Total Runs:')) {
    result.isMultiple = true;
    result.results = [];

    // Extract method and URL from first line
    const firstLineMatch = content.match(/\[run_repeater\]\s+(\w+)\s+(https?:\/\/[^\s]+)/);
    if (firstLineMatch) {
      result.method = firstLineMatch[1];
      result.url = firstLineMatch[2];
    }

    // Parse summary
    for (const line of lines) {
      if (line.startsWith('Total Runs:')) {
        result.totalRuns = line.replace('Total Runs:', '').trim();
      } else if (line.startsWith('Success:')) {
        result.successCount = line.replace('Success:', '').trim();
      } else if (line.startsWith('Avg Duration:')) {
        result.avgDuration = line.replace('Avg Duration:', '').trim();
      }
    }

    // Parse individual results
    let inResultsSection = false;
    for (const line of lines) {
      if (line.startsWith('--- Results ---')) {
        inResultsSection = true;
        continue;
      }
      if (inResultsSection && line.match(/^\d+\./)) {
        // Updated regex to capture payload info
        const match = line.match(/^(\d+)\.\s+(✓|✗)\s+Status:\s+(\d+)\s+\|\s+Duration:\s+(\d+)ms(?:\s+\|\s+Payload:\s+(.+))?/);
        if (match) {
          result.results!.push({
            index: parseInt(match[1]),
            success: match[2] === '✓',
            status: match[3],
            duration: match[4] + 'ms',
            payload: match[5] || undefined,
          });
        }
      }
    }

    return result;
  }

  // Single run parsing
  const firstLineMatch = content.match(/\[run_repeater\]\s+(\w+)\s+(https?:\/\/[^\s]+)(?:\nPayload:\s+(.+))?/);
  if (firstLineMatch) {
    result.method = firstLineMatch[1];
    result.url = firstLineMatch[2];
    result.payload = firstLineMatch[3] || undefined;
  }

  let section: 'headers' | 'body' | 'none' = 'none';

  for (const line of lines) {
    if (line.startsWith('Status:')) {
      result.status = line.replace('Status:', '').trim();
      continue;
    }
    if (line.startsWith('Duration:')) {
      result.duration = line.replace('Duration:', '').trim();
      continue;
    }
    if (line.startsWith('--- Response Headers ---')) {
      section = 'headers';
      continue;
    }
    if (line.startsWith('--- Response Body ---')) {
      section = 'body';
      continue;
    }

    if (section === 'headers') {
      result.responseHeaders += line + '\n';
    } else if (section === 'body') {
      result.responseBody += line + '\n';
    }
  }

  return result;
}

function tryFormatJson(text: string): string {
  try {
    const parsed = JSON.parse(text.trim());
    return JSON.stringify(parsed, null, 2);
  } catch {
    return text.trim();
  }
}

function CollapsibleSection({
  title,
  content,
  defaultOpen = false,
  maxHeight = '300px',
}: {
  title: string;
  content: string;
  defaultOpen?: boolean;
  maxHeight?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);

  if (!content.trim()) return null;

  const formatted = tryFormatJson(content);

  const handleCopy = () => {
    navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-medium text-text-secondary hover:bg-card-background/50 transition-colors"
      >
        <span className="flex items-center gap-1">
          {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          {title}
        </span>
        {open && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] hover:bg-sidebar-item-hover transition-colors"
            title="Copy"
          >
            {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
          </button>
        )}
      </button>
      {open && (
        <div className="overflow-auto border-t border-border" style={{ maxHeight }}>
          <pre className="p-3 text-[12px] font-mono text-text-primary whitespace-pre-wrap break-all m-0">
            {formatted}
          </pre>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const code = parseInt(status) || 0;
  let color = 'text-text-secondary';
  if (code >= 200 && code < 300) color = 'text-success';
  else if (code >= 300 && code < 400) color = 'text-warn';
  else if (code >= 400) color = 'text-error';

  return <span className={cn('text-[11px] font-bold font-mono', color)}>{status || 'N/A'}</span>;
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'text-success',
    POST: 'text-warn',
    PUT: 'text-primary',
    PATCH: 'text-primary',
    DELETE: 'text-error',
    OPTIONS: 'text-text-secondary',
    HEAD: 'text-text-secondary',
  };
  return (
    <span
      className={cn(
        'text-[11px] font-bold font-mono',
        colors[method.toUpperCase()] || 'text-text-primary',
      )}
    >
      {method.toUpperCase()}
    </span>
  );
}

const RunRepeaterBlock: React.FC<RunRepeaterBlockProps> = ({ content }) => {
  const parsed = parseContent(content);

  if (!parsed.method && !parsed.url) {
    return (
      <div className="mt-1 bg-background border rounded-[4px] overflow-hidden p-3">
        <pre className="text-[12px] font-mono text-text-secondary whitespace-pre-wrap break-all">
          {content || 'No data available.'}
        </pre>
      </div>
    );
  }

  // Multiple runs display
  if (parsed.isMultiple && parsed.results) {
    return (
      <div className="mt-1 bg-background border rounded-[4px] overflow-hidden">
        {/* Header */}
        <div className="px-3 py-2 bg-card-background border-b border-border flex items-center gap-2 flex-wrap">
          <MethodBadge method={parsed.method} />
          <span
            className="text-[11px] text-text-primary font-mono truncate max-w-[400px]"
            title={parsed.url}
          >
            {parsed.url}
          </span>
        </div>

        {/* Summary */}
        <div className="px-3 py-2 bg-card-background/30 border-b border-border">
          <div className="grid grid-cols-3 gap-4 text-[11px]">
            <div>
              <span className="text-text-secondary">Total Runs:</span>
              <span className="ml-2 font-semibold text-text-primary">{parsed.totalRuns}</span>
            </div>
            <div>
              <span className="text-text-secondary">Success:</span>
              <span className="ml-2 font-semibold text-success">{parsed.successCount}</span>
            </div>
            <div>
              <span className="text-text-secondary">Avg Duration:</span>
              <span className="ml-2 font-semibold text-text-primary">{parsed.avgDuration}</span>
            </div>
          </div>
        </div>

        {/* Results List */}
        <div className="divide-y divide-border">
          {parsed.results.map((r) => (
            <div
              key={r.index}
              className="px-3 py-1.5 flex items-center gap-3 hover:bg-card-background/30 transition-colors"
            >
              <span className="text-[10px] text-text-secondary font-mono w-8">{r.index}.</span>
              <span className={cn('text-[11px] font-bold', r.success ? 'text-success' : 'text-error')}>
                {r.success ? '✓' : '✗'}
              </span>
              <StatusBadge status={r.status} />
              <span className="text-[11px] text-text-secondary font-mono ml-auto">{r.duration}</span>
              {r.payload && (
                <span className="text-[10px] text-text-secondary font-mono ml-2 px-2 py-0.5 bg-card-background rounded" title={r.payload}>
                  {r.payload.length > 30 ? r.payload.substring(0, 30) + '...' : r.payload}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Single run display
  return (
    <div className="mt-1 bg-background border rounded-[4px] overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 bg-card-background border-b border-border flex items-center gap-2 flex-wrap">
        <MethodBadge method={parsed.method} />
        <span
          className="text-[11px] text-text-primary font-mono truncate max-w-[400px]"
          title={parsed.url}
        >
          {parsed.url}
        </span>
        {parsed.status && (
          <>
            <span className="text-text-secondary opacity-40">→</span>
            <StatusBadge status={parsed.status} />
          </>
        )}
        {parsed.duration && (
          <span className="text-[10px] text-text-secondary font-mono ml-auto">
            {parsed.duration}
          </span>
        )}
      </div>

      {/* Payload Info (if present) */}
      {parsed.payload && (
        <div className="px-3 py-1.5 bg-card-background/30 border-b border-border">
          <span className="text-[10px] text-text-secondary">Payload: </span>
          <span className="text-[11px] text-text-primary font-mono">{parsed.payload}</span>
        </div>
      )}

      {/* Response */}
      <div>
        <div className="px-3 py-1 text-[10px] font-semibold text-text-secondary uppercase tracking-wide bg-card-background/50">
          Response
        </div>
        <CollapsibleSection title="Headers" content={parsed.responseHeaders} />
        <CollapsibleSection title="Body" content={parsed.responseBody} defaultOpen={true} />
      </div>
    </div>
  );
};

export const RunRepeaterRenderer: React.FC<BaseRendererProps> = ({
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

  // Extract status from output
  let statusInfo = '';
  if (output && !isError) {
    const statusMatch = output.match(/Status:\s*(\d+)/);
    if (statusMatch) {
      const code = parseInt(statusMatch[1]);
      statusInfo = code >= 200 && code < 300 ? `✓ ${code}` : `✗ ${code}`;
    }
  }

  return (
    <div className={cn('flex flex-col gap-1.5 pb-1', isLastItemInList ? 'mb-0' : 'mb-0.5')}>
      <TagHeader
        title={
          <div className="flex items-center gap-2 text-xs text-text-primary">
            <span className="font-semibold opacity-80">{getToolLabel('run_repeater')}</span>
            {isCompleted && !isError && statusInfo && (
              <span className="opacity-50 text-[10px] text-text-secondary">{statusInfo}</span>
            )}
            {!isCompleted && (
              <span className="text-[10px] opacity-60 italic ml-1 flex items-center gap-1">
                <span className="codicon codicon-loading codicon-modifier-spin text-[10px]" />
              </span>
            )}
          </div>
        }
        statusColor={
          isError ? 'rgb(255, 45, 85)' : isCompleted ? 'rgb(48, 209, 88)' : 'rgb(106, 122, 154)'
        }
        isError={isError}
        isWaitingApproval={!!isActiveGroup && !isCompleted}
        toolType="run_repeater"
        isPartial={!isCompleted}
        onClick={() => setIsCollapsed((v) => !v)}
        path=""
      />

      {isError && errorMessage && (
        <ErrorBlock content={errorMessage} compact={true} maxHeight="300px" />
      )}

      {output && !isError && !isCollapsed && (
        <RunRepeaterBlock content={output} maxHeight="500px" />
      )}
    </div>
  );
};
