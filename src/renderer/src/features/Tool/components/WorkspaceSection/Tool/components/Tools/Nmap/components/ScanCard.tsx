import React from 'react';
import { ScanResult } from '../types';
import { stateColor } from '../utils';
import PortsTable from './PortsTable';

interface ScanCardProps {
  scan: ScanResult;
  globalIdx: number;
  isExpanded: boolean;
  onToggle: () => void;
  onContextMenu: (e: React.MouseEvent, scan: ScanResult) => void;
  accentColor: string;
  glow: string;
}

const ScanCard: React.FC<ScanCardProps> = ({
  scan,
  globalIdx,
  isExpanded,
  onToggle,
  onContextMenu,
  accentColor,
  glow,
}) => {
  const openPorts = scan.ports.filter((p) => p.state === 'open');

  return (
    <div      style={{
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 2 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#34d399',
              boxShadow: '0 0 6px #34d399',
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 700, color: accentColor }}>
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
            {scan.scanType}
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, auto)',
            gap: 20,
            alignItems: 'center',
          }}
        >
          <div>
            <span style={{ fontSize: 10, color: '#64748b', display: 'block' }}>Duration</span>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>{scan.duration}</span>
          </div>
          <div>
            <span style={{ fontSize: 10, color: '#64748b', display: 'block' }}>Open Ports</span>
            <span style={{ fontSize: 11, color: '#34d399' }}>{openPorts.length}</span>
          </div>
          <div>
            <span style={{ fontSize: 10, color: '#64748b', display: 'block' }}>Total Ports</span>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>{scan.ports.length}</span>
          </div>
          {scan.host?.os && (
            <div>
              <span style={{ fontSize: 10, color: '#64748b', display: 'block' }}>OS</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{scan.host.os.substring(0, 20)}</span>
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
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: accentColor,
                marginBottom: 8,
                letterSpacing: '0.1em',
              }}
            >
              OPEN PORTS
            </div>
            <PortsTable ports={scan.ports} accentColor={accentColor} />
          </div>

          {scan.host && (
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: accentColor,
                  marginBottom: 8,
                  letterSpacing: '0.1em',
                }}
              >
                HOST INFORMATION
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: 8,
                }}
              >
                {scan.host.ip && (
                  <div>
                    <span style={{ color: '#64748b' }}>IP:</span>{' '}
                    <span style={{ color: '#94a3b8' }}>{scan.host.ip}</span>
                  </div>
                )}
                {scan.host.hostname && (
                  <div>
                    <span style={{ color: '#64748b' }}>Hostname:</span>{' '}
                    <span style={{ color: '#94a3b8' }}>{scan.host.hostname}</span>
                  </div>
                )}
                {scan.host.os && (
                  <div>
                    <span style={{ color: '#64748b' }}>OS:</span>{' '}
                    <span style={{ color: '#94a3b8' }}>{scan.host.os}</span>
                  </div>
                )}
                {scan.host.uptime && (
                  <div>
                    <span style={{ color: '#64748b' }}>Uptime:</span>{' '}
                    <span style={{ color: '#94a3b8' }}>{scan.host.uptime}</span>
                  </div>
                )}
                {scan.host.mac && (
                  <div>
                    <span style={{ color: '#64748b' }}>MAC:</span>{' '}
                    <span style={{ color: '#94a3b8' }}>{scan.host.mac}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {scan.scripts && scan.scripts.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: accentColor,
                  marginBottom: 8,
                  letterSpacing: '0.1em',
                }}
              >
                NSE SCRIPTS ({scan.scripts.length})
              </div>
              <div
                style={{
                  maxHeight: 150,
                  overflowY: 'auto',
                  fontSize: 10,
                  color: '#64748b',
                  fontFamily: 'monospace',
                }}
              >
                {scan.scripts.map((s, i) => (
                  <div key={i} style={{ marginBottom: 4 }}>
                    <span style={{ color: accentColor }}>{s.name}:</span>{' '}
                    {s.output.substring(0, 100)}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: accentColor,
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