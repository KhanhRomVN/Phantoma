import React from 'react';
import { cn } from '@renderer/shared/lib/utils';
import { getFileIconPath } from '@renderer/utils/fileIconMapper';
import { RotateCcw } from 'lucide-react';

interface ResponseRange {
  start: number;
  end: number;
  isCurrent: boolean;
  fileChanges: Map<
    string,
    {
      additions: number;
      deletions: number;
      toolType?: 'write_to_file' | 'replace_in_file';
      content?: string;
      oldContent?: string;
      newContent?: string;
    }
  >;
}

interface DiffSummaryBarProps {
  totalChanges: number;
  addedLines: number;
  removedLines: number;
  onClick?: () => void;
  onReviewClick?: () => void;
  responseRange?: { start: number; end: number } | null;
  responseRanges?: ResponseRange[];
}

const DiffSummaryBar: React.FC<DiffSummaryBarProps> = ({
  totalChanges,
  addedLines,
  removedLines,
  onClick,
  onReviewClick,
  responseRange,
  responseRanges = [],
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const rangeText = React.useMemo(() => {
    const currentRange = responseRanges.find((r) => r.isCurrent);
    if (currentRange) {
      return `(${currentRange.start}-${currentRange.end})`;
    }
    return responseRange ? `(${responseRange.start}-${responseRange.end})` : '';
  }, [responseRange, responseRanges]);

  const handleReviewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
    if (onReviewClick) {
      onReviewClick();
    }
  };

  const handleFileClick = (
    filePath: string,
    fileData?: {
      toolType?: 'write_to_file' | 'replace_in_file';
      content?: string;
      oldContent?: string;
      newContent?: string;
    },
  ) => {
    const vscodeApi = (window as any).vscodeApi;
    if (!vscodeApi) return;

    if (fileData?.toolType === 'write_to_file' && fileData.content) {
      vscodeApi.postMessage({
        command: 'openWriteToFile',
        filePath: filePath,
        content: fileData.content,
      });
    } else if (
      fileData?.toolType === 'replace_in_file' &&
      fileData.oldContent &&
      fileData.newContent
    ) {
      vscodeApi.postMessage({
        command: 'openReplaceInFileDiff',
        filePath: filePath,
        oldContent: fileData.oldContent,
        newContent: fileData.newContent,
      });
    } else {
      vscodeApi.postMessage({
        command: 'openFileDiff',
        path: filePath,
      });
    }
  };

  const getFileName = (path: string) => {
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1] || path;
  };

  const getSmartPath = (
    fullPath: string,
    availableWidth: number = 300,
  ): { display: string; isTruncated: boolean } => {
    const parts = fullPath.split(/[/\\]/);

    if (parts.length <= 2) {
      return { display: fullPath, isTruncated: false };
    }

    const fileName = parts[parts.length - 1];
    const folders = parts.slice(0, -1);

    const charWidth = 6;
    const maxChars = Math.floor(availableWidth / charWidth);

    for (let numFolders = 1; numFolders <= folders.length; numFolders++) {
      let pathCandidate: string;

      if (numFolders === folders.length) {
        pathCandidate = fullPath;
      } else {
        const visibleFolders = folders.slice(0, numFolders).join('/');
        pathCandidate = `${visibleFolders}/.../${fileName}`;
      }

      if (pathCandidate.length <= maxChars) {
        if (numFolders < folders.length) {
          const nextCandidate =
            numFolders + 1 === folders.length
              ? fullPath
              : `${folders.slice(0, numFolders + 1).join('/')}/.../${fileName}`;

          if (nextCandidate.length <= maxChars) {
            continue;
          }
        }
        return {
          display: pathCandidate,
          isTruncated: numFolders < folders.length,
        };
      }

      if (numFolders === 1) {
        return { display: fileName, isTruncated: true };
      }

      const prevFolders = folders.slice(0, numFolders - 1).join('/');
      return {
        display: `${prevFolders}/.../${fileName}`,
        isTruncated: true,
      };
    }

    return { display: fullPath, isTruncated: false };
  };

  const handleOpenOriginalFile = (e: React.MouseEvent, filePath: string) => {
    e.stopPropagation();
    const vscodeApi = (window as any).vscodeApi;
    if (vscodeApi) {
      vscodeApi.postMessage({
        command: 'openFile',
        path: filePath,
      });
    }
  };

  return (
    <div className="w-[98%] mx-auto overflow-hidden rounded-t-md border border-border bg-input-background">
      <div
        onClick={onClick}
        className={cn(
          'px-3 py-1.5 flex items-center gap-3',
          onClick ? 'cursor-pointer' : 'cursor-default',
        )}
      >
        <span className="text-[13px] text-text-primary">
          {totalChanges} {totalChanges === 1 ? 'file changed' : 'files changed'}
        </span>

        <span className="text-[13px] text-text-secondary">
          <span className="text-success">+{addedLines}</span>{' '}
          <span className="text-error">-{removedLines}</span>
        </span>

        {rangeText && <span className="text-[13px] text-text-secondary">{rangeText}</span>}

        <span
          onClick={handleReviewClick}
          className="text-[13px] ml-auto cursor-pointer text-primary hover:underline"
        >
          {isExpanded ? 'Close' : 'Review all'}
        </span>
      </div>

      {isExpanded && (
        <div className="border-t border-border p-3 max-h-[300px] overflow-y-auto">
          {responseRanges.length === 0 ? (
            <div className="text-[13px] text-center py-5 text-text-secondary">No file changes</div>
          ) : (
            <div className="flex flex-col gap-4">
              {responseRanges.map((range, rangeIdx) => {
                const fileChangesArray = Array.from(range.fileChanges.entries()).map(
                  ([path, stats]) => ({
                    path,
                    additions: stats.additions,
                    deletions: stats.deletions,
                    toolType: stats.toolType,
                    content: stats.content,
                    oldContent: stats.oldContent,
                    newContent: stats.newContent,
                  }),
                );

                return (
                  <div key={rangeIdx}>
                    <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-border">
                      <span className="text-[13px] font-medium text-text-primary">
                        Responses ({range.start}-{range.end})
                      </span>
                      {range.isCurrent && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-card-background text-text-primary">
                          CURRENT
                        </span>
                      )}
                      <button
                        className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded border border-border bg-transparent cursor-pointer transition-colors duration-200 text-text-primary hover:bg-dropdown-item-hover"
                        title={range.isCurrent ? 'Revert changes' : 'Revert to this range'}
                      >
                        <RotateCcw size={10} />
                        REVERT
                      </button>
                    </div>

                    {fileChangesArray.length === 0 ? (
                      <div className="text-[12px] px-2 py-3 italic text-text-secondary">
                        No file changes in this range
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {fileChangesArray.map((file, fileIdx) => {
                          const smartPath = getSmartPath(file.path, 280);
                          const toolLabel = file.toolType === 'write_to_file' ? 'WRITE' : 'REPLACE';

                          return (
                            <div
                              key={fileIdx}
                              className="flex items-center gap-1.5 px-1.5 py-1 rounded text-[11px] text-text-primary"
                            >
                              <span
                                onClick={() =>
                                  handleFileClick(file.path, {
                                    toolType: file.toolType,
                                    content: file.content,
                                    oldContent: file.oldContent,
                                    newContent: file.newContent,
                                  })
                                }
                                className={cn(
                                  'text-[9px] font-bold flex-shrink-0 cursor-pointer hover:underline',
                                  file.toolType === 'write_to_file' ? 'text-success' : 'text-warn',
                                )}
                              >
                                {toolLabel}
                              </span>

                              <img
                                src={getFileIconPath(file.path)}
                                alt=""
                                className="w-3.5 h-3.5 flex-shrink-0"
                              />

                              <span
                                onClick={() =>
                                  handleFileClick(file.path, {
                                    toolType: file.toolType,
                                    content: file.content,
                                    oldContent: file.oldContent,
                                    newContent: file.newContent,
                                  })
                                }
                                className="font-semibold flex-shrink-0 cursor-pointer hover:underline"
                              >
                                {getFileName(file.path)}
                              </span>

                              <span
                                onClick={(e) => handleOpenOriginalFile(e, file.path)}
                                title={file.path}
                                className="flex-grow overflow-hidden text-ellipsis whitespace-nowrap text-[10px] cursor-pointer hover:underline text-text-secondary"
                              >
                                {smartPath.display}
                              </span>

                              <span className="flex-shrink-0 text-[10px] text-success">
                                +{file.additions}
                              </span>
                              <span className="flex-shrink-0 text-[10px] text-error">
                                -{file.deletions}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DiffSummaryBar;
