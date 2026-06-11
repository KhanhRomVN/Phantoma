import React from 'react';
import { AmassScanResult } from '../types';

interface ScanCardProps {
  scan: AmassScanResult;
  globalIdx: number;
  isExpanded: boolean;
  onToggle: () => void;
  onContextMenu: (e: React.MouseEvent, scan: AmassScanResult) => void;
  accentColor: string;
  glow: string;
}

const formatDate = (timestamp: number): string => {
  const d = new Date(timestamp);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} - ${hours}:${minutes}`;
};

const ScanCard: React.FC<ScanCardProps> = ({
  scan,
  globalIdx,
  isExpanded,
  onToggle,
  onContextMenu,
  accentColor,
  glow,
}) => {
  const uniqueSubdomains = scan.subdomains.length;
  
  return (
    <div
      style={{
        background: '#0d1117',
        border: `1px solid ${isExpanded ? accentColor : '#1a2236'}`,
        borderRadius: 6,
        transition: 'all 0.15s',
        marginBottom: 8,
      }}
      onContextMenu={(e) => onContextMenu(e, scan)}
    >
      <div
        style={{
          padding: '12px 16px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
        onClick={onToggle}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: scan.status === 'completed' ? '#34d399' : '#ef4444',
                boxShadow: scan.status === 'completed' ? '0 0 6px #34d399' : 'none',
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>
              {scan.target}
            </span>
            <span
              style={{
                fontSize: 11,
                color: '#64748b',
                background: '#1a2236',
                padding: '2px 8px',
                borderRadius: 4,
              }}
            >
              {scan.mode.toUpperCase()}
            </span>
          </div>
          <div style={{ fontSize: 10, color: '#64748b', paddingLeft: 20 }}>
            {formatDate(scan.timestamp)}
          </div>
        </div>
        
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, auto)',
            gap: 20,
            alignItems: 'center',
          }}
        >
          <div>
            <span style={{ fontSize: 10, color: '#64748b', display: 'block' }}>Duration</span>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>{scan.duration}</span>
          </div>
          <div>
            <span style={{ fontSize: 10, color: '#64748b', display: 'block' }}>Subdomains</span>
            <span style={{ fontSize: 11, color: '#34d399' }}>{uniqueSubdomains}</span>
          </div>
          {scan.stats && (
            <div>
              <span style={{ fontSize: 10, color: '#64748b', display: 'block' }}>Unique</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{scan.stats.unique}</span>
            </div>
          )}
        </div>
      </div>
      
      {isExpanded && (
        <div
          style={{
            borderTop: `1px solid ${accentColor}30`,
            padding: '12px 16px',
            background: '#080b10',
          }}
        >
          {/* Subdomains list */}
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#e2e8f0',
                marginBottom: 8,
                letterSpacing: '0.1em',
              }}
            >
              SUBDOMAINS FOUND ({uniqueSubdomains})
            </div>
            <div
              style={{
                maxHeight: 200,
                overflowY: 'auto',
                fontSize: 11,
                fontFamily: 'monospace',
                background: '#0d1117',
                padding: 8,
                borderRadius: 4,
              }}
            >
              {scan.subdomains.slice(0, 50).map((sub, i) => (
                <div key={i} style={{ marginBottom: 4, color: accentColor }}>
                  {sub.name}
                  {sub.source && <span style={{ color: '#64748b', fontSize: 10 }}> ({sub.source})</span>}
                </div>
              ))}
              {scan.subdomains.length > 50 && (
                <div style={{ color: '#64748b', marginTop: 4 }}>
                  ... and {scan.subdomains.length - 50} more
                </div>
              )}
            </div>
          </div>
          
          {/* Stats */}
          {scan.stats && (
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#e2e8f0',
                  marginBottom: 8,
                  letterSpacing: '0.1em',
                }}
              >
                STATISTICS
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: 8,
                }}
              >
                <div><span style={{ color: '#64748b' }}>Total:</span> <span style={{ color: '#94a3b8' }}>{scan.stats.total}</span></div>
                <div><span style={{ color: '#64748b' }}>Unique:</span> <span style={{ color: '#94a3b8' }}>{scan.stats.unique}</span></div>
                {scan.stats.fromPassive !== undefined && (
                  <div><span style={{ color: '#64748b' }}>Passive:</span> <span style={{ color: '#94a3b8' }}>{scan.stats.fromPassive}</span></div>
                )}
                {scan.stats.fromActive !== undefined && (
                  <div><span style={{ color: '#64748b' }}>Active:</span> <span style={{ color: '#94a3b8' }}>{scan.stats.fromActive}</span></div>
                )}
              </div>
            </div>
          )}
          
          {/* Sources used */}
          {scan.sourcesUsed && scan.sourcesUsed.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#e2e8f0',
                  marginBottom: 8,
                  letterSpacing: '0.1em',
                }}
              >
                DATA SOURCES ({scan.sourcesUsed.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {scan.sourcesUsed.slice(0, 15).map((src, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      background: '#1a2236',
                      borderRadius: 3,
                      color: '#64748b',
                    }}
                  >
                    {src}
                  </span>
                ))}
                {scan.sourcesUsed.length > 15 && (
                  <span style={{ fontSize: 10, color: '#64748b' }}>
                    +{scan.sourcesUsed.length - 15} more
                  </span>
                )}
              </div>
            </div>
          )}
          
          {/* Raw output (first 10 lines) */}
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#e2e8f0',
                marginBottom: 8,
                letterSpacing: '0.1em',
              }}
            >
              RAW OUTPUT (first 10 lines)
            </div>
            <div
              style={{
                fontSize: 10,
                color: '#64748b',
                fontFamily: 'monospace',
                background: '#0d1117',
                padding: 8,
                borderRadius: 4,
                maxHeight: 150,
                overflowY: 'auto',
              }}
            >
              {scan.rawOutput.slice(0, 10).map((line, i) => (
                <div key={i}>{line}</div>
              ))}
              {scan.rawOutput.length > 10 && (
                <div>... and {scan.rawOutput.length - 10} more lines</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScanCard;