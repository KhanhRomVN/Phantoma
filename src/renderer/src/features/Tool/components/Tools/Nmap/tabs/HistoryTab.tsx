import React, { useRef, useEffect } from 'react';
import {
  Search,
  ArrowLeft,
  Eye,
  Trash2,
  Copy,
  Clock,
  Activity,
  Network,
  Shield,
  Server,
  FileText,
} from 'lucide-react';
import { ScanResult, ContextMenuState, TooltipState } from '../types';
import { groupHistoryByDate } from '../utils';
import ScanCard from '../components/ScanCard';
import PortsTable from '../components/PortsTable';

import { parseNmapXML, formatDuration } from '../nmapParser';

interface HistoryTabProps {
  history: ScanResult[];
  filteredHistory: ScanResult[];
  expandedCardIndex: number | null;
  setExpandedCardIndex: React.Dispatch<React.SetStateAction<number | null>>;
  historySearchQuery: string;
  setHistorySearchQuery: React.Dispatch<React.SetStateAction<string>>;
  showDetailView: boolean;
  setShowDetailView: React.Dispatch<React.SetStateAction<boolean>>;
  selectedScanForDetail: ScanResult | null;
  setSelectedScanForDetail: React.Dispatch<React.SetStateAction<ScanResult | null>>;
  onDeleteScan: (scan: ScanResult) => void;
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
}) => {
  const historyContainerRef = useRef<HTMLDivElement>(null);
  const groupedHistory = groupHistoryByDate(filteredHistory);

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu?.visible) {
        onContextMenuChange(null);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [contextMenu, onContextMenuChange]);

  const handleContextMenu = (e: React.MouseEvent, scan: ScanResult) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenuChange({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      scan: scan,
    });
  };

  const handleViewDetails = (scan: ScanResult) => {
    setSelectedScanForDetail(scan);
    setShowDetailView(true);
    onContextMenuChange(null);
  };

  const renderFullDetail = () => {
    if (!selectedScanForDetail) return null;
    const scan = selectedScanForDetail;

    const rawXml = scan.rawOutput.join('\n');
    const parsedData = parseNmapXML(rawXml);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header with Back button */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <button
            onClick={() => {
              setShowDetailView(false);
              setSelectedScanForDetail(null);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              background: 'var(--card-background)',
              border: `1px solid ${accentColor}30`,
              borderRadius: 4,
              color: accentColor,
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <ArrowLeft size={14} />
            BACK TO HISTORY
          </button>
        </div>

        {/* Scan Header */}
        <div
          style={{
            padding: '16px',
            background: 'var(--card-background)',
            border: `1px solid ${accentColor}30`,
            borderRadius: 6,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)' }}>
                {scan.target}
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-secondary)' }}>
                {scan.scanType} • {scan.duration}
              </p>
            </div>
            <span
              style={{
                padding: '4px 12px',
                borderRadius: 4,
                background: 'var(--border)',
                color: '#34d399',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {new Date(scan.timestamp).toLocaleString()}
            </span>
          </div>

          {parsedData && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
                marginTop: 12,
                paddingTop: 12,
                borderTop: `1px solid ${accentColor}20`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={14} color={accentColor} />
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Duration</div>
                  <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                    {formatDuration(parsedData.duration)}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={14} color={accentColor} />
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Ports</div>
                  <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                    {parsedData.stats.openPorts} open / {parsedData.stats.filteredPorts} filtered
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Network size={14} color={accentColor} />
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Command</div>
                  <div
                    style={{ fontSize: 10, color: 'var(--text-primary)', fontFamily: 'monospace' }}
                  >
                    {parsedData.args.substring(0, 60)}...
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Host Information */}
        <div
          style={{
            padding: '16px',
            background: 'var(--card-background)',
            border: `1px solid ${accentColor}30`,
            borderRadius: 6,
          }}
        >
          <h4
            style={{
              margin: '0 0 12px',
              fontSize: 13,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Server size={14} style={{ color: 'var(--text-secondary)' }} /> HOST INFORMATION
          </h4>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: 12,
            }}
          >
            {parsedData ? (
              <>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>IP:</span>{' '}
                  <span style={{ color: 'var(--text-primary)' }}>{parsedData.host.ip}</span>
                </div>
                {parsedData.host.hostname && (
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Hostname:</span>{' '}
                    <span style={{ color: 'var(--text-primary)' }}>{parsedData.host.hostname}</span>
                  </div>
                )}
                {parsedData.host.os && (
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>OS:</span>{' '}
                    <span style={{ color: 'var(--text-primary)' }}>{parsedData.host.os}</span>
                  </div>
                )}
                {parsedData.host.uptime && (
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Uptime:</span>{' '}
                    <span style={{ color: 'var(--text-primary)' }}>
                      {formatDuration(parsedData.host.uptime)}
                    </span>
                  </div>
                )}
                {parsedData.host.mac && (
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>MAC:</span>{' '}
                    <span style={{ color: 'var(--text-primary)' }}>{parsedData.host.mac}</span>
                  </div>
                )}
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Status:</span>{' '}
                  <span style={{ color: parsedData.host.status === 'up' ? '#34d399' : '#ef4444' }}>
                    {parsedData.host.status.toUpperCase()}
                  </span>
                </div>
              </>
            ) : (
              <>
                {scan.host?.ip && (
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>IP:</span>{' '}
                    <span style={{ color: 'var(--text-primary)' }}>{scan.host.ip}</span>
                  </div>
                )}
                {scan.host?.hostname && (
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Hostname:</span>{' '}
                    <span style={{ color: 'var(--text-primary)' }}>{scan.host.hostname}</span>
                  </div>
                )}
                {scan.host?.os && (
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>OS:</span>{' '}
                    <span style={{ color: 'var(--text-primary)' }}>{scan.host.os}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Ports Table with Risk */}
        <div
          style={{
            padding: '16px',
            background: 'var(--card-background)',
            border: `1px solid ${accentColor}30`,
            borderRadius: 6,
          }}
        >
          <h4
            style={{
              margin: '0 0 12px',
              fontSize: 13,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Shield size={14} style={{ color: 'var(--text-secondary)' }} /> PORTS SCANNED (
            {scan.ports.length} total, {scan.ports.filter((p) => p.state === 'open').length} open)
          </h4>
          <PortsTable ports={scan.ports} accentColor={accentColor} showRisk={true} />
        </div>

        {/* Raw Output */}
        <div
          style={{
            padding: '16px',
            background: 'var(--card-background)',
            border: `1px solid ${accentColor}30`,
            borderRadius: 6,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <h4
              style={{
                margin: 0,
                fontSize: 13,
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <FileText size={14} style={{ color: 'var(--text-secondary)' }} /> RAW OUTPUT (XML)
            </h4>
            <button
              onClick={() => navigator.clipboard.writeText(scan.rawOutput.join('\n'))}
              style={{
                padding: '6px',
                background: 'var(--border)',
                border: `1px solid ${accentColor}30`,
                borderRadius: 4,
                color: accentColor,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Copy to clipboard"
            >
              <Copy size={14} />
            </button>
          </div>
          <div
            style={{
              fontSize: 10,
              color: 'var(--text-primary)',
              fontFamily: 'monospace',
              background: 'var(--background)',
              padding: 12,
              borderRadius: 4,
              maxHeight: 400,
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {scan.rawOutput.map((line, i) => {
              let color = 'var(--text-secondary)';
              if (line.startsWith('<?xml') || line.startsWith('<!DOCTYPE')) color = '#fbbf24';
              else if (line.includes('<nmaprun') || line.includes('</nmaprun>')) color = '#34d399';
              else if (line.includes('<host') || line.includes('</host>')) color = '#60a5fa';
              else if (line.includes('<port') || line.includes('</port>')) color = '#c084fc';
              else if (line.includes('<service')) color = '#f472b6';
              else if (line.includes('state="open"')) color = '#34d399';
              else if (line.includes('state="filtered"')) color = '#fbbf24';
              else if (line.includes('state="closed"')) color = '#ef4444';
              else if (line.startsWith('<!--')) color = 'var(--text-secondary)';
              return (
                <div key={i} style={{ color, whiteSpace: 'pre-wrap' }}>
                  {line}
                </div>
              );
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
    <div
      ref={historyContainerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        maxHeight: 'calc(100vh - 300px)',
        overflowY: 'auto',
      }}
    >
      {/* Search Bar */}
      <div style={{ position: 'relative', marginBottom: 8 }}>
        <Search
          size={14}
          style={{
            position: 'absolute',
            left: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-secondary)',
            pointerEvents: 'none',
          }}
        />
        <input
          type="text"
          value={historySearchQuery}
          onChange={(e) => setHistorySearchQuery(e.target.value)}
          placeholder="Search by target, scan type, port, or service..."
          style={{
            width: '100%',
            padding: '8px 12px 8px 32px',
            background: 'var(--input-background)',
            border: `1px solid ${historySearchQuery ? accentColor + '50' : 'var(--input-border-default)'}`,
            borderRadius: 4,
            color: 'var(--text-primary)',
            fontSize: 11,
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />
      </div>

      {filteredHistory.length === 0 ? (
        <div
          style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)', fontSize: 12 }}
        >
          {history.length === 0
            ? 'No scan history yet. Run a scan to see results here.'
            : 'No matching scans found.'}
        </div>
      ) : (
        Object.entries(groupedHistory).map(([dateLabel, scans]) => (
          <div key={dateLabel}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: accentColor,
                letterSpacing: '0.1em',
                padding: '8px 0 4px 0',
                borderBottom: `1px solid ${accentColor}30`,
                marginBottom: 8,
              }}
            >
              {dateLabel}
            </div>
            {scans.map((scan) => {
              const globalIdx = history.findIndex((h) => h.timestamp === scan.timestamp);
              const isExpanded = expandedCardIndex === globalIdx;
              return (
                <ScanCard
                  key={globalIdx}
                  scan={scan}
                  globalIdx={globalIdx}
                  isExpanded={isExpanded}
                  onToggle={() => setExpandedCardIndex(isExpanded ? null : globalIdx)}
                  onContextMenu={handleContextMenu}
                  accentColor={accentColor}
                  glow={glow}
                />
              );
            })}
          </div>
        ))
      )}

      {/* Context Menu */}
      {contextMenu?.visible && contextMenu.scan && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            background: 'var(--dropdown-background)',
            border: `1px solid ${accentColor}50`,
            borderRadius: 6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            zIndex: 1000,
            minWidth: 160,
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleViewDetails(contextMenu.scan!)}
            style={{
              width: '100%',
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              color: accentColor,
              fontSize: 12,
              fontWeight: 700,
              textAlign: 'left',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${accentColor}10`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Eye size={14} />
            View Details
          </button>
          <button
            onClick={() => {
              onDeleteScan(contextMenu.scan!);
            }}
            style={{
              width: '100%',
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              borderTop: `1px solid ${accentColor}20`,
              color: '#ef4444',
              fontSize: 12,
              fontWeight: 700,
              textAlign: 'left',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ef444410';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default HistoryTab;
