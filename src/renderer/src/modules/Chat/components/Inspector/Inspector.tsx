import {
  Activity,
  AlertTriangle,
  Check,
  Clock,
  Fingerprint,
  KeyRound,
  Pin,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AI_META, PLATFORMS } from '../../constants';
import type { Account, Chat, Tone } from '../../types';
import { Avatar, IconBtn, Logo, Pill, Thin, Toggle } from '../ui/Primitives';
import { Section } from './Section';

interface InspectorProps {
  chat: Chat | null;
  account: Account | null;
  autoReply: boolean;
  setAutoReply: (v: boolean) => void;
  stealth: boolean;
  setStealth: (v: boolean) => void;
  onClose: () => void;
}

export function Inspector({
  chat,
  account,
  autoReply,
  setAutoReply,
  stealth,
  setStealth,
  onClose,
}: InspectorProps) {
  if (!chat) return null;
  const score = chat.isEncrypted ? 92 : 58;
  const scoreTone: Tone = score >= 80 ? 'success' : score >= 60 ? 'warn' : 'error';
  const ai = chat.aiStatus && AI_META[chat.aiStatus];
  const stats: [string, number, Tone][] = [
    ['Messages classified', 248, 'info'],
    ['Spam blocked', chat.aiStatus === 'spam' ? 94 : 7, 'warn'],
    ['Auto-replies sent', autoReply ? 19 : 0, 'primary'],
  ];
  const encryptionRows: [string, string, boolean][] = [
    [
      'Protocol',
      chat.isEncrypted ? 'Signal Protocol · X3DH' : 'TLS 1.3 (no E2EE)',
      chat.isEncrypted,
    ],
    [
      'Identity verification',
      chat.isEncrypted ? 'Verified' : 'Unverified',
      chat.isEncrypted,
    ],
    ['Forward secrecy', chat.isEncrypted ? 'On' : 'Not supported', chat.isEncrypted],
    ['Local storage', 'AES-256 · key in enclave', true],
  ];
  const aiCells: [string, string, LucideIcon][] = [
    ['Avg. response', '4m 12s', Clock],
    ['Sentiment', chat.aiStatus === 'spam' ? 'Suspicious' : 'Neutral', Activity],
  ];
  const privacyRows: [string, boolean, (v: boolean) => void, Tone][] = [
    ['Auto-Reply AI', autoReply, setAutoReply, 'info'],
    ['Stealth Mode', stealth, setStealth, 'error'],
  ];
  return (
    <div
      className="ch-scroll shrink-0 overflow-y-auto flex flex-col gap-2.5 p-3 bg-panel-background border-l border-border"
      style={{ width: 300 }}
    >
      <div className="flex items-center">
        <span className="text-[11px] text-text-secondary">Conversation / Info</span>
        <span className="ml-auto">
          <IconBtn icon={X} tip="Close" onClick={onClose} />
        </span>
      </div>
      <div className="flex flex-col items-center text-center gap-1.5 py-1">
        <Avatar name={chat.name} size={56} ring={scoreTone} />
        <div className="text-[14px] font-semibold text-text-primary">{chat.name}</div>
        <div className="text-[11px] text-text-secondary">{chat.role}</div>
        <div className="flex gap-1.5 flex-wrap justify-center">
          {account && (
            <Pill tone="muted">
              <Logo platform={account.platform} size={10} />
              {PLATFORMS[account.platform].label}
            </Pill>
          )}
          {ai && (
            <Pill tone={ai.color} icon={ai.icon}>
              AI: {ai.label}
            </Pill>
          )}
          {chat.isPinned && (
            <Pill tone="primary" icon={Pin}>
              Pinned
            </Pill>
          )}
        </div>
      </div>

      <Section
        title="Encryption status"
        icon={ShieldCheck}
        right={<Pill tone={scoreTone}>{score}/100</Pill>}
      >
        <Thin value={score} tone={scoreTone} />
        <div className="mt-2.5 flex flex-col gap-1.5 text-[11px]">
          {encryptionRows.map(([k, v, ok]) => (
            <div key={k} className="flex items-center justify-between gap-2">
              <span className="text-text-secondary">{k}</span>
              <span className={`flex items-center gap-1 ${ok ? 'text-success' : 'text-warn'}`}>
                {ok ? <Check size={11} /> : <AlertTriangle size={11} />}
                {v}
              </span>
            </div>
          ))}
        </div>
        <div
          className="mt-2.5 rounded-md px-2 py-1.5 text-[10px] flex items-center gap-1.5 bg-background border border-border text-text-secondary"
          style={{ fontFamily: 'ui-monospace, monospace' }}
        >
          <Fingerprint size={12} className="text-primary" /> 3A:F1:9C:07:BE:52:D8:41
        </div>
      </Section>

      <Section title="AI stats" icon={Sparkles}>
        <div className="flex flex-col gap-2">
          {stats.map(([k, v, tone]) => (
            <div key={k}>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-text-secondary">{k}</span>
                <span className="text-text-primary">{v}</span>
              </div>
              <Thin value={Math.min(100, (v / 250) * 100 + 4)} tone={tone} />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          {aiCells.map(([k, v, Ic]) => (
            <div key={k} className="rounded-md p-2 bg-background border border-border">
              <div className="flex items-center gap-1 text-[10px] text-text-secondary">
                <Ic size={10} />
                {k}
              </div>
              <div className="text-[12px] font-semibold mt-0.5 text-text-primary">{v}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Privacy" icon={KeyRound}>
        <div className="flex flex-col gap-2.5 text-[11.5px]">
          {privacyRows.map(([k, v, fn, tone]) => (
            <div key={k} className="flex items-center justify-between text-text-primary">
              {k}
              <Toggle on={v} onChange={fn} tone={tone} />
            </div>
          ))}
          <div className="flex items-center justify-between text-text-primary">
            Read receipts
            <Toggle on={false} onChange={() => {}} />
          </div>
        </div>
      </Section>
    </div>
  );
}