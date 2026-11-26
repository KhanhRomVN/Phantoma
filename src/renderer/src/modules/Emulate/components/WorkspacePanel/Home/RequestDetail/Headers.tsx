import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';

/**
 * ------------------------------------------------------------------
 * Header Details
 * ------------------------------------------------------------------
 * Hiển thị request/response headers với highlight tìm kiếm.
 *
 * Các chức năng chính:
 * - Hiển thị headers dạng key-value
 * - Highlight text match theo search term
 * - Click vào tên/giá trị header để copy vào clipboard
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Types ──
import { NetworkRequest } from '../../../../types/inspector';

// ── Utils ──

import { cn } from '@renderer/utils/cn';

// ─── Types ──────────────────────────────────────────────────────────────
interface HeadersDetailsProps {
  request: NetworkRequest;
  searchTerm: string;
}

interface HighlightTextProps {
  text: string;
  searchTerm: string;
  className?: string;
  highlightClassName?: string;
}

interface CopyTextProps {
  value: string;
  className?: string;
  children: ReactNode;
}

interface HeaderSectionsProps {
  sections: Record<string, any[]> | undefined;
  searchTerm: string;
  emptyText: string;
}

// ─── Components ─────────────────────────────────────────────────────────
function HighlightText({ text, searchTerm, className, highlightClassName }: HighlightTextProps) {
  const parts = useMemo(() => {
    if (!searchTerm || !text) return [{ text, highlight: false }];

    try {
      let regex: RegExp;
      try {
        regex = new RegExp(`(${searchTerm})`, 'i');
      } catch {
        const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        regex = new RegExp(`(${escaped})`, 'i');
      }

      return text.split(regex).map((part, _i) => {
        const isMatch = regex.test(part);
        return { text: part, highlight: isMatch };
      });
    } catch (e) {
      console.warn('HighlightText error:', e);
      return [{ text, highlight: false }];
    }
  }, [text, searchTerm]);

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.highlight ? (
          <mark
            key={i}
            className={cn(
              'bg-warn/30 text-text-primary rounded-sm px-0.5 mx-[-2px]',
              highlightClassName,
            )}
          >
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </span>
  );
}

function CopyText({ value, className, children }: CopyTextProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    void navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopied(true);
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), 1200);
      })
      .catch(() => undefined);
  };

  return (
    <span
      onClick={handleClick}
      title={copied ? 'Copied!' : 'Click to copy'}
      className={cn(
        'cursor-pointer rounded-sm transition-colors hover:bg-text-secondary/15',
        copied && 'bg-primary/15 text-primary',
        className,
      )}
    >
      {children}
    </span>
  );
}

function HeaderSections({ sections, searchTerm, emptyText }: HeaderSectionsProps) {
  if (!sections || Object.keys(sections).length === 0) {
    return <div className="text-text-secondary italic text-xs">{emptyText}</div>;
  }

  return (
    <div className="space-y-4">
      {Object.entries(sections).map(([section, headers]) => (
        <div key={section}>
          {section !== 'Headers' && (
            <h4 className="text-[10px] font-bold text-primary/80 uppercase tracking-wider mb-1.5">
              {section}
            </h4>
          )}
          <div className="border border-border/40 rounded-md overflow-hidden text-xs">
            {(headers as any[]).map((h, i) => (
              <div
                key={i}
                className="flex flex-col sm:flex-row border-b border-border/40 last:border-0 hover:bg-secondary/30 transition-colors"
              >
                <div className="w-full sm:w-[140px] flex-shrink-0 p-1.5 sm:border-r border-border/40">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="font-bold font-mono text-xs break-all text-text-primary/90">
                      <CopyText value={String(h.name)}>
                        <HighlightText text={h.name} searchTerm={searchTerm} />
                      </CopyText>
                    </span>
                  </div>
                  {h.description && (
                    <div
                      className="text-[9px] text-text-secondary leading-tight line-clamp-2"
                      title={h.description}
                    >
                      {h.description}
                    </div>
                  )}
                </div>

                <div className="flex-1 p-1.5 min-w-0">
                  <div className="font-mono text-xs text-text-primary/80 break-all whitespace-pre-wrap">
                    <CopyText value={String(h.value)}>
                      <HighlightText text={h.value} searchTerm={searchTerm} />
                    </CopyText>
                  </div>
                  {h.parsed && Object.keys(h.parsed).length > 0 && (
                    <div className="mt-1.5 text-[10px] bg-secondary/30 p-1.5 rounded border border-border/20">
                      <div className="font-semibold text-text-secondary/70 mb-1 pointer-events-none select-none">
                        Parsed Values
                      </div>
                      <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
                        {Object.entries(h.parsed).map(([k, v]) => (
                          <div key={k} className="contents">
                            <span className="text-text-secondary text-right">{k}:</span>
                            <CopyText value={String(v)} className="font-mono text-text-primary">
                              {String(v)}
                            </CopyText>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function HeadersDetails({ request, searchTerm }: HeadersDetailsProps) {
  const analysis = request.analysis;

  // Fallback: Convert raw headers to the format expected by the UI
  const getHeadersSections = (
    headers: Record<string, string> | undefined,
  ): Record<string, any[]> => {
    if (!headers || Object.keys(headers).length === 0) return {};

    // Group headers into sections (e.g., "Request Headers")
    const sections: Record<string, any[]> = {
      Headers: Object.entries(headers).map(([name, value]) => ({
        name,
        value: String(value),
        status: 'good',
      })),
    };
    return sections;
  };

  const requestHeadersSections =
    analysis?.headers?.request || getHeadersSections(request.requestHeaders);
  const responseHeadersSections =
    analysis?.headers?.response || getHeadersSections(request.responseHeaders);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Request Headers */}
        <div className="space-y-3">
          <HeaderSections
            sections={requestHeadersSections}
            searchTerm={searchTerm}
            emptyText="No request headers"
          />
        </div>

        {/* Response Headers */}
        <div className="space-y-3">
          <HeaderSections
            sections={responseHeadersSections}
            searchTerm={searchTerm}
            emptyText="No response headers"
          />
        </div>
      </div>

      {analysis?.headers?.missing &&
        Array.isArray(analysis.headers.missing) &&
        analysis.headers.missing.length > 0 && (
          <div>
            <h3 className="text-[10px] font-bold text-text-secondary uppercase mb-2 border-b border-border/50 pb-1.5">
              Missing Headers
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {analysis.headers.missing.map(
                (
                  h: {
                    name: string;
                    severity: string;
                    description: string;
                    recommendation: string;
                  },
                  i: number,
                ) => (
                  <div
                    key={i}
                    className="flex flex-col bg-warn/5 hover:bg-warn/10 transition-colors border border-warn/20 p-2 rounded text-xs relative group"
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="font-bold font-mono text-xs">{h.name}</span>
                      <span className="text-[9px] bg-warn/10 text-warn px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                        {h.severity}
                      </span>
                    </div>
                    <div className="text-text-secondary text-[10px] leading-relaxed mb-1.5 flex-grow">
                      {h.description}
                    </div>
                    <div className="mt-auto pt-1.5 border-t border-warn/10 text-[10px] font-medium text-warn/90 flex gap-1">
                      <span className="shrink-0 font-bold uppercase text-[9px] opacity-70 mt-px">
                        Fix:
                      </span>
                      <span>{h.recommendation}</span>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        )}
    </div>
  );
}