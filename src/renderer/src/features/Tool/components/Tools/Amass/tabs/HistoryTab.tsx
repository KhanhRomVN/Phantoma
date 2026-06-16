import React, { useRef, useEffect } from 'react';
import { Search, ArrowLeft, Eye, Trash2, Copy, Clock, Activity, Database, Globe, FileText } from 'lucide-react';
import { AmassScanResult, ContextMenuState, TooltipState } from '../types';
import { groupHistoryByDate } from '../utils';
import ScanCard from '../components/ScanCard';
import ResultsTable from '../components/ResultsTable';
import ExportButtons from '../../../../../../components/common/ExportButtons';

interface HistoryTabProps {
  history: AmassScanResult[];
  filteredHistory: AmassScanResult[];
  expandedCardIndex: number | null;
  setExpandedCardIndex: React.Dispatch<React.SetStateAction<number | null>>;
  historySearchQuery: string;
  setHistorySearchQuery: React.Dispatch<React.SetStateAction<string>>;
  showDetailView: boolean;
  setShowDetailView: React.Dispatch<React.SetStateAction<boolean>>;
  selectedScanForDetail: AmassScanResult | null;
  setSelectedScanForDetail: React.Dispatch<React.SetStateAction<AmassScanResult | null>>;
  onDeleteScan: (scan: AmassScanResult) => void;
  onContextMenuChange: (contextMenu: ContextMenuState | null) => void;
  contextMenu: ContextMenuState | null;
  accentColor: string;
  glow: string;
  onTooltipShow: (tooltip: TooltipState | null) => void;
}

const HistoryTab: React.FC<HistoryTabProps> = ({
  history,
  filteredHistory,
  expandedCardIndex,
  setExpandedCardIndex,
  historySearchQuery,
  setHistorySearchQuery,
  showDetailView,
  setShowDetailView,
  selectedScanForDetail,
  setSelectedScanForDetail,
  onDeleteScan,
  onContextMenuChange,
  contextMenu,
  accentColor,
  glow,
  onTooltipShow,
}) => {
  const historyContainerRef = useRef<HTMLDivElement>(null);
  const groupedHistory = groupHistoryByDate(filteredHistory);

  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu?.visible) {
        onContextMenuChange(null);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [contextMenu, onContextMenuChange]);

  const handleContextMenu = (e: React.MouseEvent, scan: AmassScanResult) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenuChange({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      scan: scan,
    });
  };

  const handleViewDetails = (scan: AmassScanResult) => {
    setSelectedScanForDetail(scan);
    setShowDetailView(true);
    onContextMenuChange(null);
  };

  const renderFullDetail = () => {
    if (!selectedScanForDetail) return null;
    const scan = selectedScanForDetail;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header with Back button */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => { setShowDetailView(false); setSelectedScanForDetail(null); }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'var(--card-background)', border: `1px solid ${accentColor}30`, borderRadius: 4, color: accentColor, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <ArrowLeft size={14} />
            BACK TO HISTORY
          </button>
          <ExportButtons scan={scan} accentColor={accentColor} />
        </div>

        {/* Scan Header */}
        <div className="p-4 rounded-md bg-card-background" style={{ border: `1px solid ${accentColor}30` }}>
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="m-0 text-base text-text-primary">{scan.target}</h3>
              <p className="m-0 mt-1 text-[11px] text-text-secondary">{scan.mode} • {scan.duration}</p>
            </div>
            <span className="px-3 py-1 rounded text-[11px] font-bold bg-border" style={{ color: '#34d399' }}>
              {new Date(scan.timestamp).toLocaleString()}
            </span>
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3 mt-3 pt-3" style={{ borderTop: `1px solid ${accentColor}20` }}>
            <div className="flex items-center gap-2"><Clock size={14} color={accentColor} /><div><div className="text-[10px] text-text-secondary">Duration</div><div className="text-[12px] text-text-primary">{scan.duration}</div></div></div>
            <div className="flex items-center gap-2"><Database size={14} color={accentColor} /><div><div className="text-[10px] text-text-secondary">Subdomains</div><div className="text-[12px] text-text-primary">{scan.subdomains.length}</div></div></div>
            {scan.stats && <div className="flex items-center gap-2"><Activity size={14} color={accentColor} /><div><div className="text-[10px] text-text-secondary">Unique</div><div className="text-[12px] text-text-primary">{scan.stats.unique}</div></div></div>}
          </div>
        </div>

        {/* Subdomains Table */}
        <div className="p-4 rounded-md bg-card-background" style={{ border: `1px solid ${accentColor}30` }}>
          <h4 className="m-0 mb-3 text-[13px] flex items-center gap-2 text-text-primary">
            <Globe size={14} className="text-text-secondary" /> SUBDOMAINS FOUND ({scan.subdomains.length})
          </h4>
          <ResultsTable subdomains={scan.subdomains} accentColor={accentColor} />
        </div>

        {/* Raw Output */}
        <div className="p-4 rounded-md bg-card-background" style={{ border: `1px solid ${accentColor}30` }}>
          <div className="flex justify-between items-center mb-3">
            <h4 className="m-0 text-[13px] flex items-center gap-2 text-text-primary"><FileText size={14} className="text-text-secondary" /> RAW OUTPUT</h4>
            <button onClick={() => navigator.clipboard.writeText(scan.rawOutput.join('\n'))} className="p-1.5 rounded flex items-center justify-center cursor-pointer bg-border" style={{ border: `1px solid ${accentColor}30`, color: accentColor }} title="Copy to clipboard"><Copy size={14} /></button>
          </div>
          <div className="text-[10px] font-mono bg-input-background p-3 rounded max-h-[400px] overflow-y-auto whitespace-pre-wrap break-words">
            {scan.rawOutput.map((line, i) => {
              let color = 'var(--text-secondary)';
              if (line.includes('[INF]')) color = '#34d399';
              else if (line.includes('[ERR]')) color = '#ef4444';
              else if (line.includes('[WRN]')) color = '#fbbf24';
              return <div key={i} style={{ color, whiteSpace: 'pre-wrap' }}>{line}</div>;
            })}
          </div>
        </div>
      </div>
    );
  };

  if (showDetailView && selectedScanForDetail) {
    return renderFullDetail();
  }

  return (
    <div ref={historyContainerRef} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
      {/* Search Bar */}
      <div style={{ position: 'relative', marginBottom: 8 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
        <input type="text" value={historySearchQuery} onChange={(e) => setHistorySearchQuery(e.target.value)} placeholder="Search by target, mode, or subdomain..." style={{ width: '100%', padding: '8px 12px 8px 32px', background: 'var(--input-background)', border: `1px solid ${historySearchQuery ? accentColor + '50' : 'var(--input-border-default)'}`, borderRadius: 4, color: 'var(--text-primary)', fontSize: 11, outline: 'none', fontFamily: 'inherit' }} />
      </div>

      {filteredHistory.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)', fontSize: 12 }}>
          {history.length === 0 ? 'No scan history yet. Run a scan to see results here.' : 'No matching scans found.'}
        </div>
      ) : (
        Object.entries(groupedHistory).map(([dateLabel, scans]) => (
          <div key={dateLabel}>
            <div style={{ fontSize: 11, fontWeight: 700, color: accentColor, letterSpacing: '0.1em', padding: '8px 0 4px 0', borderBottom: `1px solid ${accentColor}30`, marginBottom: 8 }}>{dateLabel}</div>
            {scans.map((scan, idx) => {
              const globalIdx = history.findIndex((h) => h.timestamp === scan.timestamp);
              const isExpanded = expandedCardIndex === globalIdx;
              return (
                <ScanCard key={globalIdx} scan={scan} globalIdx={globalIdx} isExpanded={isExpanded} onToggle={() => setExpandedCardIndex(isExpanded ? null : globalIdx)} onContextMenu={handleContextMenu} accentColor={accentColor} glow={glow} />
              );
            })}
          </div>
        ))
      )}

      {/* Context Menu */}
      {contextMenu?.visible && contextMenu.scan && (
        <div style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, background: 'var(--dropdown-background)', border: `1px solid ${accentColor}50`, borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.5)', zIndex: 1000, minWidth: 160, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
          <button onClick={() => handleViewDetails(contextMenu.scan!)} style={{ width: '100%', padding: '10px 16px', background: 'transparent', border: 'none', color: accentColor, fontSize: 12, fontWeight: 700, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s', display: 'flex', alignItems: 'center', gap: 8 }} onMouseEnter={(e) => { e.currentTarget.style.background = `${accentColor}10`; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}><Eye size={14} /> View Details</button>
          <button onClick={() => { onDeleteScan(contextMenu.scan!); }} style={{ width: '100%', padding: '10px 16px', background: 'transparent', border: 'none', borderTop: `1px solid ${accentColor}20`, color: '#ef4444', fontSize: 12, fontWeight: 700, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s', display: 'flex', alignItems: 'center', gap: 8 }} onMouseEnter={(e) => { e.currentTarget.style.background = '#ef444410'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}><Trash2 size={14} /> Delete</button>
        </div>
      )}
    </div>
  );
};

export default HistoryTab;