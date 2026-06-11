import React, { useRef, useEffect } from 'react';
import { Search, ArrowLeft, Eye, Trash2, Copy, Activity, MapPin, Bug, Radio, FileText } from 'lucide-react';
import { ScanResult, ContextMenuState, TooltipState } from '../types';
import { groupHistoryByDate, getReputationColor, getReputationIcon } from '../utils';
import { REPUTATION_LABELS } from '../constants';
import IndicatorCard from '../components/IndicatorCard';


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
  onTooltipShow,
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
    const result = scan.result;
    const reputationColor = result ? getReputationColor(result.reputation) : '#64748b';
    const reputationIcon = result ? getReputationIcon(result.reputation) : '?';
    const reputationLabel = result ? REPUTATION_LABELS[result.reputation] : 'UNKNOWN';

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
              <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)' }}>{scan.indicator}</h3>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-secondary)' }}>
                {scan.indicatorType.toUpperCase()} • {scan.duration}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span
                style={{
                  padding: '4px 12px',
                  borderRadius: 4,
                  background: 'var(--border)',
                  color: 'var(--text-secondary)',
                  fontSize: 11,
                }}
              >
                {new Date(scan.timestamp).toLocaleString()}
              </span>
              <span
                style={{
                  padding: '4px 12px',
                  borderRadius: 4,
                  background: `${reputationColor}20`,
                  border: `1px solid ${reputationColor}50`,
                  color: reputationColor,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {reputationIcon} {reputationLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Reputation & Basic Info */}
        {result && (
          <>
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
                <Activity size={14} style={{ color: 'var(--text-secondary)' }} /> REPUTATION & ACTIVITY
              </h4>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: 12,
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Reputation:</span>{' '}
                  <span style={{ color: reputationColor, fontWeight: 700 }}>{reputationLabel}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Activity Count:</span>{' '}
                  <span style={{ color: 'var(--text-primary)' }}>{result.activityCount}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>First Seen:</span>{' '}
                  <span style={{ color: 'var(--text-primary)' }}>{result.firstSeen || 'N/A'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Last Seen:</span>{' '}
                  <span style={{ color: 'var(--text-primary)' }}>{result.lastSeen || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Geo Location */}
            {result.geoData && (
              <div
                style={{
                  padding: '16px',
                  background: 'var(--card-background)',
                  border: `1px solid ${accentColor}30`,
                  borderRadius: 6,
                }}
              >
                <h4 style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MapPin size={14} style={{ color: 'var(--text-secondary)' }} /> GEO LOCATION
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Country:</span>{' '}
                    <span style={{ color: 'var(--text-primary)' }}>{result.geoData.country} ({result.geoData.countryCode})</span>
                  </div>
                  {result.geoData.city && (
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>City:</span>{' '}
                      <span style={{ color: 'var(--text-primary)' }}>{result.geoData.city}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Malware Families */}
            {result.malwareFamilies && result.malwareFamilies.length > 0 && (
              <div
                style={{
                  padding: '16px',
                  background: 'var(--card-background)',
                  border: `1px solid ${accentColor}30`,
                  borderRadius: 6,
                }}
              >
                <h4 style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Bug size={14} style={{ color: 'var(--text-secondary)' }} /> MALWARE FAMILIES
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {result.malwareFamilies.map((family, i) => (
                    <span
                      key={i}
                      style={{
                        padding: '4px 12px',
                        background: '#ef444420',
                        border: '1px solid #ef444450',
                        borderRadius: 4,
                        color: '#ef4444',
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {family}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Pulses */}
            {result.pulses && result.pulses.length > 0 && (
              <div
                style={{
                  padding: '16px',
                  background: 'var(--card-background)',
                  border: `1px solid ${accentColor}30`,
                  borderRadius: 6,
                }}
              >
                <h4 style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Radio size={14} style={{ color: 'var(--text-secondary)' }} /> RELATED PULSES
                </h4>
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  {result.pulses.map((pulse, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '12px',
                        background: 'var(--input-background)',
                        border: `1px solid ${accentColor}20`,
                        borderRadius: 4,
                        marginBottom: 8,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ color: accentColor, fontWeight: 700 }}>{pulse.name}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                          {new Date(pulse.modified).toLocaleDateString()}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-primary)', marginBottom: 8 }}>
                        {pulse.description}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {pulse.tags.map((tag, j) => (
                          <span
                            key={j}
                            style={{
                              fontSize: 9,
                              padding: '2px 6px',
                              background: 'var(--border)',
                              borderRadius: 3,
                              color: 'var(--text-secondary)',
                            }}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

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
            <h4 style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={14} style={{ color: 'var(--text-secondary)' }} /> RAW OUTPUT
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
              background: 'var(--input-background)',
              padding: 12,
              borderRadius: 4,
              maxHeight: 300,
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {scan.rawOutput.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
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
          placeholder="Search by indicator, type, malware family, or pulse name..."
          style={{
            width: '100%',
            padding: '8px 12px 8px 32px',
            background: 'var(--input-background)',
            border: `1px solid ${historySearchQuery ? `${accentColor}50` : 'var(--input-border-default)'}`,
            borderRadius: 4,
            color: 'var(--text-primary)',
            fontSize: 11,
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />
      </div>

      {filteredHistory.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)', fontSize: 12 }}>
          {history.length === 0
            ? 'No lookup history yet. Run a lookup to see results here.'
            : 'No matching lookups found.'}
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
            {scans.map((scan, idx) => {
              const globalIdx = history.findIndex((h) => h.timestamp === scan.timestamp);
              const isExpanded = expandedCardIndex === globalIdx;
              return (
                <IndicatorCard
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
              onContextMenuChange(null);
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