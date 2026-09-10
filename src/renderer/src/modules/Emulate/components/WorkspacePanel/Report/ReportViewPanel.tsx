/**
 * ------------------------------------------------------------------
 * ReportViewPanel
 * ------------------------------------------------------------------
 * Panel phải hiển thị nội dung markdown của report đã chọn bằng
 * MarkdownBlock component có sẵn.
 * Khi có file code được chọn, hiển thị CodeBlock thay cho markdown.
 * File report.md hỗ trợ toggle giữa chế độ view (MarkdownBlock)
 * và edit (CodeBlock). File html hỗ trợ view (iframe render)
 * và edit (CodeBlock). Khi edit, thay đổi được lưu xuống backend.
 * File html view có chọn layout mobile/tablet/pc và zoom Ctrl+scroll.
 *
 * Props:
 * - report : Report đang chọn (null nếu chưa chọn)
 * - fileContent : Nội dung file code đang chọn (null nếu không chọn file)
 * - fileName : Tên file code đang chọn
 * - targetId : ID target hiện tại
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import React, { useState, useEffect, useRef } from 'react';

// ── UI ──
import { FileText, Eye, Pencil } from 'lucide-react';

// ── Components ──
import MarkdownBlock from '@renderer/components/common/MarkdownBlock';
import CodeBlock from '@renderer/components/common/CodeBlock';

// ── Types ──
import type { Report } from '../../../stores/reportStore';

// ── Stores ──
import { useReportStore } from '../../../stores/reportStore';

// ── Services ──
import { emulateApi } from '../../../services/emulate-api.service';
import { reportFileService } from '../../../services/report-file.service';

// ── Utils ──
import { getFileIconPath } from '@renderer/shared/utils/fileIconMapper';

// ── Bottom Panel ──
import ReportBottomPanel from './ReportBottomPanel';

// ─── Types ──────────────────────────────────────────────────────────────
interface ReportViewPanelProps {
  report: Report | null;
  fileContent?: string | null;
  fileName?: string | null;
  targetId?: string | null;
}

type PreviewDevice = 'mobile' | 'tablet' | 'pc';

// ─── Helpers ────────────────────────────────────────────────────────────
function getLanguageFromFileName(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (ext === 'html' || ext === 'htm') return 'html';
  if (ext === 'css') return 'css';
  if (ext === 'js') return 'javascript';
  if (ext === 'ts') return 'typescript';
  return 'plaintext';
}

function isHtmlFile(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return ext === 'html' || ext === 'htm';
}

function getPreviewWidth(device: PreviewDevice): string {
  switch (device) {
    case 'mobile':
      return '375px';
    case 'tablet':
      return '768px';
    case 'pc':
    default:
      return '100%';
  }
}

// ─── Component ──────────────────────────────────────────────────────────
export const ReportViewPanel: React.FC<ReportViewPanelProps> = ({
  report,
  fileContent = null,
  fileName = null,
  targetId = null,
}) => {
  const [reportMode, setReportMode] = useState<'view' | 'edit'>('view');
  const [fileMode, setFileMode] = useState<'view' | 'edit'>('view');
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('pc');
  const updateReport = useReportStore((s) => s.updateReport);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeWrapperRef = useRef<HTMLDivElement>(null);
  const [iframeSize, setIframeSize] = useState({ width: 0, height: 0 });
  const [zoomLevel, setZoomLevel] = useState(1);

  const isHtmlView = fileContent !== null && isHtmlFile(fileName || '') && fileMode === 'view';

  useEffect(() => {
    if (fileName && isHtmlFile(fileName)) {
      setFileMode('view');
      setPreviewDevice('pc');
      setZoomLevel(1);
    }
  }, [fileName]);

  useEffect(() => {
    if (isHtmlView && previewDevice === 'pc') {
      const calculateSize = () => {
        if (containerRef.current) {
          const container = containerRef.current.getBoundingClientRect();
          const aspectRatio = 16 / 9;

          // Calculate display size based on container, maintaining 16:9 aspect ratio
          let displayWidth = container.width;
          let displayHeight = displayWidth / aspectRatio;

          // If height exceeds container, fit by height instead
          if (displayHeight > container.height) {
            displayHeight = container.height;
            displayWidth = displayHeight * aspectRatio;
          }

          setIframeSize({
            width: displayWidth,
            height: displayHeight,
          });
        }
      };

      calculateSize();
      const resizeObserver = new ResizeObserver(calculateSize);
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }

      return () => resizeObserver.disconnect();
    }
  }, [isHtmlView, previewDevice]);

  const handleWheelZoom = (e: React.WheelEvent) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoomLevel((prev) => Math.min(3, Math.max(0.25, prev + delta)));
  };

  if (!report) {
    return (
      <div className="h-full flex items-center justify-center text-text-secondary">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" strokeWidth={1.5} />
          <p className="text-sm">Select a report to view content</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* Header bar */}
      <div className="h-10 px-3 border-b border-divider flex items-center justify-between shrink-0 bg-muted/10">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <img src={getFileIconPath(fileName || 'report.md')} alt="" className="w-4 h-4 shrink-0" />
          <span className="text-xs font-medium text-text-primary truncate">
            {fileName || report.title}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {isHtmlView && (
            <div className="flex items-center gap-0.5">
              {(['mobile', 'tablet', 'pc'] as PreviewDevice[]).map((device) => (
                <button
                  key={device}
                  onClick={() => setPreviewDevice(device)}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                    previewDevice === device
                      ? 'bg-primary/10 text-primary'
                      : 'text-text-secondary hover:text-text-primary hover:bg-card-hover'
                  }`}
                >
                  {device === 'mobile' ? 'Mobile' : device === 'tablet' ? 'Tablet' : 'PC'}
                </button>
              ))}
            </div>
          )}

          {fileContent === null ? (
            <button
              onClick={() => setReportMode(reportMode === 'view' ? 'edit' : 'view')}
              className="p-1 rounded hover:bg-card-hover text-text-secondary hover:text-text-primary transition-colors"
              title={reportMode === 'view' ? 'Edit markdown' : 'View markdown'}
            >
              {reportMode === 'view' ? (
                <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
              ) : (
                <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />
              )}
            </button>
          ) : isHtmlFile(fileName || '') ? (
            <button
              onClick={() => setFileMode(fileMode === 'view' ? 'edit' : 'view')}
              className="p-1 rounded hover:bg-card-hover text-text-secondary hover:text-text-primary transition-colors"
              title={fileMode === 'view' ? 'Edit html' : 'View html'}
            >
              {fileMode === 'view' ? (
                <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
              ) : (
                <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />
              )}
            </button>
          ) : null}
        </div>
      </div>

      {/* Content */}
      <div ref={containerRef} className="flex-1 overflow-hidden">
        {fileContent !== null ? (
          isHtmlView ? (
            <div
              className="w-full h-full flex items-center justify-center bg-black/5"
              onWheel={handleWheelZoom}
            >
              {previewDevice === 'pc' ? (
                <div
                  ref={iframeWrapperRef}
                  className="relative overflow-hidden"
                  style={{
                    width: `${iframeSize.width * zoomLevel}px`,
                    height: `${iframeSize.height * zoomLevel}px`,
                    transition: 'width 0.1s, height 0.1s',
                  }}
                >
                  <iframe
                    title={fileName || 'html-preview'}
                    srcDoc={fileContent}
                    className="bg-white origin-top-left"
                    style={{
                      width: '1920px',
                      height: '1080px',
                      transform: `scale(${(iframeSize.width / 1920) * zoomLevel})`,
                      border: 'none',
                    }}
                    sandbox="allow-scripts"
                  />
                </div>
              ) : (
                <div
                  className="relative transition-[width] duration-300"
                  style={{
                    width: getPreviewWidth(previewDevice),
                    height: '100%',
                    maxHeight: '100%',
                  }}
                >
                  <iframe
                    title={fileName || 'html-preview'}
                    srcDoc={fileContent}
                    className="w-full h-full bg-white"
                    style={{ pointerEvents: 'none' }}
                    sandbox="allow-scripts"
                  />
                </div>
              )}
            </div>
          ) : (
            <CodeBlock
              code={fileContent}
              language={getLanguageFromFileName(fileName || '')}
              showLineNumbers={true}
              onChange={(value) => {
                if (targetId && fileName) {
                  reportFileService
                    .writeFile(targetId, report.id, fileName, value)
                    .then(() => {})
                    .catch((err) => {
                      console.error('[DEBUG][ReportViewPanel] writeFile failed:', err);
                    });
                } else {
                  console.warn('[DEBUG][ReportViewPanel] Missing targetId/fileName:', {
                    targetId,
                    fileName,
                  });
                }
              }}
            />
          )
        ) : reportMode === 'edit' ? (
          <CodeBlock
            code={report.content}
            language="markdown"
            showLineNumbers={true}
            onChange={(value) => {
              updateReport(report.id, value);
              if (targetId) {
                emulateApi.updateReport(targetId, report.id, { content: value }).catch((err) => {
                  console.error('[ReportViewPanel] Failed to update report:', err);
                });
              }
            }}
          />
        ) : (
          <MarkdownBlock content={report.content} />
        )}
      </div>

      {/* Bottom Panel — Problems + Terminal */}
      <ReportBottomPanel targetId={targetId} reportId={report.id} />
    </div>
  );
};

export default ReportViewPanel;
