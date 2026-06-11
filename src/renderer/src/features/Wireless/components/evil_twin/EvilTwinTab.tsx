// ============================================================================
// EvilTwinTab — Evil Twin AP session management
// ============================================================================

import type { EvilTwinSession } from '../../types';
import { fmtTime } from '../../utils';
import { Btn } from '../shared/Btn';
import { Stat } from '../shared/Stat';

interface EvilTwinTabProps {
  sessions: EvilTwinSession[];
  onStop: (id: string) => void;
}

export function EvilTwinTab({ sessions, onStop }: EvilTwinTabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        style={{
          padding: '8px 12px',
          background: '#ef444410',
          border: '1px solid #ef444430',
          borderRadius: 5,
          fontSize: 9,
          color: 'var(--error)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 12 }}>⚠</span>
        Evil Twin AP requires authorization. Unauthorized use is illegal. All sessions are logged.
      </div>
      {sessions.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, fontSize: 10, color: 'var(--text-secondary)' }}>
          No Evil Twin sessions. Click "EVIL" on a network in the Scan tab.
        </div>
      )}
      {sessions.map((session) => (
        <div
          key={session.id}
          style={{
            background: 'var(--card-background)',
            border: `1px solid ${session.status === 'active' ? '#ef444430' : 'var(--border)'}`,
            borderRadius: 6,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              background: 'var(--input-background)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            {session.status === 'active' && (
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--error)',
                  boxShadow: '0 0 8px #ef4444',
                  flexShrink: 0,
                }}
              />
            )}
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: session.status === 'active' ? 'var(--error)' : 'var(--text-secondary)',
              }}
            >
              {session.status === 'active' ? '● EVIL TWIN LIVE' : '■ STOPPED'}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-primary)', fontWeight: 700 }}>"{session.ssid}"</span>
            <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>BSSID {session.fakeBSSID}</span>
            <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>→ CH {session.channel}</span>
            <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--text-secondary)' }}>
              Uptime: {fmtTime(session.uptimeSeconds)}
            </span>
            {session.status === 'active' && (
              <Btn label="■ STOP AP" color="var(--error)" onClick={() => onStop(session.id)} size="xs" />
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 2,
              padding: 12,
              marginBottom: 4,
            }}
          >
            <Stat label="Clients" value={session.clientsConnected} accent="var(--primary)" />
            <Stat label="Deauths Sent" value={session.deauthSent} accent="var(--error)" />
            <Stat label="Handshakes" value={session.handshakesCollected} accent="var(--success)" />
            <Stat label="Credentials" value={session.credentials.length} accent="var(--accent-purple)" />
          </div>

          {session.credentials.length > 0 && (
            <div style={{ padding: '0 12px 12px' }}>
              <div
                style={{
                  fontSize: 8,
                  color: 'var(--text-secondary)',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  marginBottom: 6,
                }}
              >
                HARVESTED CREDENTIALS
              </div>
              <div style={{ background: 'var(--input-background)', borderRadius: 4, overflow: 'hidden' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '160px 160px 120px 120px 80px',
                    gap: 6,
                    padding: '5px 10px',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  {['USERNAME', 'PASSWORD', 'CLIENT MAC', 'IP ADDRESS', 'TIME'].map((h) => (
                    <span
                      key={h}
                      style={{
                        fontSize: 8,
                        color: 'var(--text-secondary)',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                      }}
                    >
                      {h}
                    </span>
                  ))}
                </div>
                {session.credentials.map((cred, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '160px 160px 120px 120px 80px',
                      gap: 6,
                      padding: '6px 10px',
                      borderBottom: '1px solid var(--divider)',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 700 }}>
                      {cred.username}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--warning)', fontWeight: 700 }}>
                      {cred.password}
                    </span>
                    <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>
                      {cred.clientMac}{' '}
                      <span style={{ color: 'var(--text-secondary)' }}>({cred.clientVendor})</span>
                    </span>
                    <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>{cred.ipAddress}</span>
                    <span style={{ fontSize: 8, color: 'var(--text-secondary)' }}>{cred.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}