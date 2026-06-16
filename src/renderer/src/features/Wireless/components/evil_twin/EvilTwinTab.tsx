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
    <div className="flex flex-col gap-2">
      <div className="py-2 px-3 bg-error/10 border border-error/30 rounded text-[9px] text-error flex items-center gap-2">
        <span className="font-bold text-xs">⚠</span>
        Evil Twin AP requires authorization. Unauthorized use is illegal. All sessions are logged.
      </div>
      {sessions.length === 0 && (
        <div className="text-center py-10 text-[10px] text-text-secondary">
          No Evil Twin sessions. Click "EVIL" on a network in the Scan tab.
        </div>
      )}
      {sessions.map((session) => (
        <div
          key={session.id}
          className={`bg-card-background rounded-md overflow-hidden border ${session.status === 'active' ? 'border-error/30' : 'border-border'}`}
        >
          <div className="flex items-center gap-2.5 py-2.5 px-3.5 bg-input-background border-b border-border">
            {session.status === 'active' && (
              <div className="w-2 h-2 rounded-full bg-error shadow-[0_0_8px_#ef4444] flex-shrink-0" />
            )}
            <span
              className={`text-xs font-extrabold ${session.status === 'active' ? 'text-error' : 'text-text-secondary'}`}
            >
              {session.status === 'active' ? '● EVIL TWIN LIVE' : '■ STOPPED'}
            </span>
            <span className="text-[10px] text-text-primary font-bold">"{session.ssid}"</span>
            <span className="text-[9px] text-text-secondary">BSSID {session.fakeBSSID}</span>
            <span className="text-[9px] text-text-secondary">→ CH {session.channel}</span>
            <span className="ml-auto text-[9px] text-text-secondary">
              Uptime: {fmtTime(session.uptimeSeconds)}
            </span>
            {session.status === 'active' && (
              <Btn label="■ STOP AP" color="var(--error)" onClick={() => onStop(session.id)} size="xs" />
            )}
          </div>

          <div className="grid grid-cols-4 gap-0.5 p-3 mb-1">
            <Stat label="Clients" value={session.clientsConnected} accent="var(--primary)" />
            <Stat label="Deauths Sent" value={session.deauthSent} accent="var(--error)" />
            <Stat label="Handshakes" value={session.handshakesCollected} accent="var(--success)" />
            <Stat label="Credentials" value={session.credentials.length} accent="var(--accent-purple)" />
          </div>

          {session.credentials.length > 0 && (
            <div className="px-3 pb-3">
              <div className="text-[8px] text-text-secondary font-bold tracking-[0.1em] mb-1.5">
                HARVESTED CREDENTIALS
              </div>
              <div className="bg-input-background rounded overflow-hidden">
                <div className="grid grid-cols-[160px_160px_120px_120px_80px] gap-1.5 py-1.5 px-2.5 border-b border-border">
                  {['USERNAME', 'PASSWORD', 'CLIENT MAC', 'IP ADDRESS', 'TIME'].map((h) => (
                    <span
                      key={h}
                      className="text-[8px] text-text-secondary font-bold tracking-[0.1em]"
                    >
                      {h}
                    </span>
                  ))}
                </div>
                {session.credentials.map((cred, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[160px_160px_120px_120px_80px] gap-1.5 py-1.5 px-2.5 border-b border-divider items-center"
                  >
                    <span className="text-[10px] text-primary font-bold">
                      {cred.username}
                    </span>
                    <span className="text-[10px] text-warning font-bold">
                      {cred.password}
                    </span>
                    <span className="text-[9px] text-text-secondary">
                      {cred.clientMac}{' '}
                      <span className="text-text-secondary">({cred.clientVendor})</span>
                    </span>
                    <span className="text-[9px] text-text-secondary">{cred.ipAddress}</span>
                    <span className="text-[8px] text-text-secondary">{cred.timestamp}</span>
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