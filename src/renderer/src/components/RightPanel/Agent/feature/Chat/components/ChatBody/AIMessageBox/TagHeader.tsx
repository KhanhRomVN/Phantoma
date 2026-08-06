import React, { useMemo, useRef, useState, useEffect } from 'react';
import { cn } from '@renderer/shared/utils/cn';
import { $ } from '@renderer/utils/color';

interface TagHeaderProps {
  title: React.ReactNode;
  subTitle?: React.ReactNode;
  subTitleClassName?: string;
  statusColor?: string;
  diffStats?: {
    added: number;
    removed: number;
  };
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onClick?: () => void;
  icon?: React.ReactNode;
  headerActions?: React.ReactNode;
  isPartial?: boolean;
  /** File or folder path to display in the header */
  path?: string;
  /** Callback when path is clicked (separate from header click) */
  onPathClick?: (path: string) => void;
  /** Optional custom tooltip text for the status dot */
  statusTooltip?: string;
  /** Whether this action is waiting for approval */
  isWaitingApproval?: boolean;
  /** Whether this action has an error */
  isError?: boolean;
  /** Tool type for context-specific tooltips */
  toolType?: string;
  /** Additional metadata for tooltip (e.g., line count, match count) */
  tooltipMeta?: {
    lineCount?: number;
    lineRange?: string;
    matchCount?: number;
    fileCount?: number;
  };
  /** Diagnostics for the file (errors and warnings) */
  diagnostics?: Array<{
    severity: string;
    message: string;
    line: number;
    column: number;
    source?: string;
    code?: string | number;
  }>;
  /** Callback when dot is clicked (for raw view toggle, etc.) */
  onDotClick?: () => void;
}

// Smart path truncation: dynamically truncate middle folders based on available width
const truncatePath = (fullPath: string, maxLength: number = 35): string => {
  if (!fullPath) return '';

  if (fullPath.length <= maxLength) {
    return fullPath;
  }

  const parts = fullPath.split('/');

  if (parts.length <= 2) {
    return fullPath;
  }

  const fileName = parts[parts.length - 1];
  const rootFolder = parts[0];

  let result = `${rootFolder}/.../${fileName}`;
  let currentLength = result.length;

  if (currentLength >= maxLength) {
    return result;
  }

  let rightIndex = parts.length - 2;
  const foldersToAdd = [];

  while (rightIndex > 0) {
    const folderToTest = parts[rightIndex];
    const testResult = `${rootFolder}/.../${[...foldersToAdd, folderToTest].reverse().join('/')}/${fileName}`;

    if (testResult.length <= maxLength) {
      foldersToAdd.push(folderToTest);
      result = testResult;
      currentLength = testResult.length;
      rightIndex--;
    } else {
      break;
    }
  }

  return result;
};

export const TagHeader: React.FC<TagHeaderProps> = ({
  title,
  subTitle,
  subTitleClassName,
  statusColor,
  diffStats,
  isCollapsed,
  onToggleCollapse,
  onClick,
  icon,
  headerActions,
  isPartial,
  path,
  onPathClick,
  statusTooltip,
  isWaitingApproval,
  isError,
  toolType,
  tooltipMeta,
  diagnostics,
  onDotClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathContainerRef = useRef<HTMLDivElement>(null);
  const pathSpanRef = useRef<HTMLSpanElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [pathContainerWidth, setPathContainerWidth] = useState<number>(0);
  const [pathSpanWidth, setPathSpanWidth] = useState<number>(0);

  useEffect(() => {
    const styleId = 'circle-ring-spin-animation';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes circle-ring-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width;
        setContainerWidth(newWidth);
      }
    });
    observer.observe(containerRef.current);
    const initialWidth = containerRef.current.offsetWidth || 0;
    setContainerWidth(initialWidth);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!pathContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width;
        setPathContainerWidth(newWidth);
      }
    });
    observer.observe(pathContainerRef.current);
    const initialWidth = pathContainerRef.current.offsetWidth || 0;
    setPathContainerWidth(initialWidth);
    return () => observer.disconnect();
  }, []);

  const maxLength = useMemo(() => {
    if (containerWidth === 0) {
      return 999;
    }

    const availableWidth =
      pathContainerWidth > 0 ? pathContainerWidth - 24 : Math.max(containerWidth - 80, 100);

    const chars = Math.floor(availableWidth / 6.5);
    const result = Math.max(chars, 30);

    return result;
  }, [containerWidth, pathContainerWidth]);

  const displayPath = useMemo(() => {
    if (!path) return '';
    const truncated = truncatePath(path, maxLength);
    return truncated;
  }, [path, maxLength]);

  useEffect(() => {
    if (!pathSpanRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width;
        setPathSpanWidth(newWidth);
      }
    });
    observer.observe(pathSpanRef.current);
    const initialWidth = pathSpanRef.current.offsetWidth || 0;
    setPathSpanWidth(initialWidth);
    return () => observer.disconnect();
  }, [displayPath]);

  const prevDiagnosticCountsRef = useRef<{
    total: number;
    errors: number;
    warnings: number;
  }>({
    total: 0,
    errors: 0,
    warnings: 0,
  });

  const diagnosticCounts = useMemo(() => {
    if (!diagnostics || diagnostics.length === 0) {
      return { errors: 0, warnings: 0 };
    }

    const errors = diagnostics.filter((d) => d.severity === 'Error').length;
    const warnings = diagnostics.filter((d) => d.severity === 'Warning').length;

    const countsChanged =
      prevDiagnosticCountsRef.current.total !== diagnostics.length ||
      prevDiagnosticCountsRef.current.errors !== errors ||
      prevDiagnosticCountsRef.current.warnings !== warnings;

    if (countsChanged && diagnostics.length > 0) {
      prevDiagnosticCountsRef.current = {
        total: diagnostics.length,
        errors,
        warnings,
      };
    }

    return { errors, warnings };
  }, [diagnostics, toolType, path]);

  const pathColor = useMemo(() => {
    if (diagnosticCounts.errors > 0) {
      return $('--error');
    }
    if (diagnosticCounts.warnings > 0) {
      return $('--warn');
    }
    return $('--text-secondary');
  }, [diagnosticCounts]);

  const getStatusTooltip = useMemo(() => {
    if (statusTooltip) return statusTooltip;

    if (isError) return 'Error - Action failed';
    if (isPartial) return 'In progress...';
    if (isWaitingApproval) return 'Waiting for approval';

    const isCompleted =
      statusColor?.includes('gitDecoration-addedResourceForeground') ||
      statusColor?.includes('#3fb950');

    if (isCompleted && toolType) {
      switch (toolType) {
        case 'write_to_file':
          if (tooltipMeta?.lineCount) {
            return `✓ File created (+${tooltipMeta.lineCount} lines)`;
          }
          return '✓ File created successfully';

        case 'replace_in_file':
          if (diffStats) {
            return `✓ File updated (+${diffStats.added} -${diffStats.removed} lines)`;
          }
          return '✓ File updated successfully';

        case 'read_file':
          if (tooltipMeta?.lineRange) {
            return `✓ Read lines ${tooltipMeta.lineRange}`;
          }
          return '✓ File read successfully';

        case 'list_files':
          if (tooltipMeta?.fileCount) {
            return `✓ Listed ${tooltipMeta.fileCount} ${tooltipMeta.fileCount === 1 ? 'item' : 'items'}`;
          }
          return '✓ Directory listed successfully';

        case 'grep':
          if (tooltipMeta?.matchCount !== undefined && tooltipMeta?.fileCount !== undefined) {
            return `✓ Found ${tooltipMeta.matchCount} ${tooltipMeta.matchCount === 1 ? 'match' : 'matches'} in ${tooltipMeta.fileCount} ${tooltipMeta.fileCount === 1 ? 'file' : 'files'}`;
          }
          return '✓ Search completed';

        case 'delete_file':
          return '✓ File deleted successfully';

        case 'move_file':
          return '✓ File moved successfully';

        case 'view_replace_history':
          if (tooltipMeta?.fileCount) {
            return `✓ Found ${tooltipMeta.fileCount} ${tooltipMeta.fileCount === 1 ? 'version' : 'versions'}`;
          }
          return '✓ History loaded successfully';

        case 'run_command':
          return '✓ Command executed successfully';

        case 'git_status':
          return '✓ Git status retrieved';

        case 'commit_message':
          return '✓ Commit created successfully';

        default:
          return '✓ Completed successfully';
      }
    }

    if (isCompleted) {
      return '✓ Completed successfully';
    }

    if (statusColor?.includes('descriptionForeground')) {
      return isWaitingApproval ? 'Waiting for approval' : 'Not started yet';
    }

    return 'Status';
  }, [
    statusTooltip,
    isError,
    isPartial,
    isWaitingApproval,
    statusColor,
    toolType,
    diffStats,
    tooltipMeta,
  ]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'pt-1 flex items-start justify-between w-full',
        onClick || onToggleCollapse ? 'cursor-pointer' : 'cursor-default',
      )}
      onClick={onClick || onToggleCollapse}
    >
      <div className="flex-1 min-w-0">
        <div>
          <div className="mt-px flex flex-col gap-0.5 flex-1 min-w-0 w-full max-w-full overflow-hidden">
            <div className="flex items-start gap-2 flex-nowrap">
              {/* Left column: CircleDot + CircleRing */}
              {statusColor && (
                <div
                  className={cn(
                    'relative w-4 h-4 shrink-0 flex items-center justify-center mt-0.5',
                    onDotClick ? 'cursor-pointer' : 'cursor-default',
                  )}
                  title={getStatusTooltip}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onDotClick) {
                      onDotClick();
                    }
                  }}
                >
                  {/* CircleRing */}
                  <div
                    style={{
                      position: 'absolute',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      ...(!isPartial && {
                        border: `2px solid ${statusColor}`,
                        opacity: 0.4,
                      }),
                      ...(isPartial && {
                        borderWidth: '2px',
                        borderStyle: 'solid',
                        borderRightColor: statusColor,
                        borderBottomColor: statusColor,
                        borderLeftColor: statusColor,
                        borderTopColor: 'transparent',
                        animation: 'circle-ring-spin 1s linear infinite',
                        opacity: 0.8,
                      }),
                    }}
                  />
                  {/* CircleDot */}
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
                </div>
              )}

              {/* Right column: All other content */}
              <div className="flex-1 min-w-0 flex flex-col gap-0.5 mt-0.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {onToggleCollapse && (
                    <span
                      className={`collapse-icon codicon codicon-chevron-${isCollapsed ? 'right' : 'down'} text-xs mr-1`}
                    />
                  )}
                  {icon && <span className="flex items-center">{icon}</span>}
                  {typeof title === 'string' ? (
                    <span>{title}</span>
                  ) : (
                    <div className="contents">{title}</div>
                  )}
                </div>

                {displayPath && path && (
                  <div
                    ref={pathContainerRef}
                    className="flex justify-start items-center pl-5 pr-1 pt-1 mt-0.5 relative w-full max-w-full overflow-hidden"
                  >
                    {/* Corner line: vertical + horizontal L-shape */}
                    <div className="absolute left-0 top-0 w-4 h-3 border-l border-b border-text-secondary/20" />
                    <span
                      ref={pathSpanRef}
                      className="text-[10px] opacity-60 font-mono whitespace-nowrap overflow-hidden text-ellipsis rounded-sm transition-[text-decoration] duration-150 cursor-default no-underline flex items-center gap-1 shrink min-w-0"
                      style={{ color: pathColor }}
                      title={path}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onPathClick && path) {
                          onPathClick(path);
                        }
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.textDecoration = 'underline';
                        e.currentTarget.style.textDecorationColor = $('--primary');
                        e.currentTarget.style.textUnderlineOffset = '2px';
                        e.currentTarget.style.cursor = 'pointer';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.textDecoration = 'none';
                        e.currentTarget.style.cursor = 'default';
                      }}
                    >
                      {displayPath}
                    </span>
                    {(diagnosticCounts.warnings > 0 || diagnosticCounts.errors > 0) && (
                      <span className="flex items-center gap-1 shrink-0 text-[10px] font-semibold text-text-secondary opacity-60">
                        [
                        {diagnosticCounts.warnings > 0 && (
                          <span className="flex items-center gap-0.5">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke={$('--warn')}
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="opacity-[1.67]"
                            >
                              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
                              <path d="M12 9v4" />
                              <path d="M12 17h.01" />
                            </svg>
                            {diagnosticCounts.warnings}
                          </span>
                        )}
                        {diagnosticCounts.warnings > 0 && diagnosticCounts.errors > 0 && ' '}
                        {diagnosticCounts.errors > 0 && (
                          <span className="flex items-center gap-0.5">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke={$('--error')}
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="opacity-[1.67]"
                            >
                              <path d="M12 20v-9" />
                              <path d="M14 7a4 4 0 0 1 4 4v3a6 6 0 0 1-12 0v-3a4 4 0 0 1 4-4z" />
                              <path d="M14.12 3.88 16 2" />
                              <path d="M21 21a4 4 0 0 0-3.81-4" />
                              <path d="M21 5a4 4 0 0 1-3.55 3.97" />
                              <path d="M22 13h-4" />
                              <path d="M3 21a4 4 0 0 1 3.81-4" />
                              <path d="M3 5a4 4 0 0 0 3.55 3.97" />
                              <path d="M6 13H2" />
                              <path d="m8 2 1.88 1.88" />
                              <path d="M9 7.13V6a3 3 0 1 1 6 0v1.13" />
                            </svg>
                            {diagnosticCounts.errors}
                          </span>
                        )}
                        ]
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {(subTitle || diffStats) && (
          <div className={subTitleClassName || ''}>
            {diffStats ? (
              <>
                <span className="flex gap-1.5 items-center">
                  <span className="text-success">+{diffStats.added}</span>
                  <span className="text-error">-{diffStats.removed}</span>
                  <span>lines</span>
                </span>
              </>
            ) : (
              subTitle
            )}
          </div>
        )}
      </div>
      <div className="shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
        {headerActions}
      </div>
    </div>
  );
};
