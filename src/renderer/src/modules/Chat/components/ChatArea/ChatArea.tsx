import { useEffect, useRef, useState } from 'react';
import {
  BellOff,
  Bot,
  Eye,
  EyeOff,
  Hourglass,
  Languages,
  Lock,
  LockOpen,
  PanelRightClose,
  PanelRightOpen,
  Paperclip,
  Phone,
  Send,
  ShieldAlert,
  Smile,
  Sparkles,
  Video,
} from 'lucide-react';
import { AI_META, BURN_OPTIONS, PLATFORMS, STATUS_META } from '../../constants';
import type { Account, AISuggestion, Chat, Message } from '../../types';
import { fmtCd } from '../../utils';
import { Avatar, IconBtn, Logo, Pill, Tip, Toggle } from '../ui/Primitives';
import { MessageBubble } from './MessageBubble';

interface ChatAreaProps {
  chat: Chat | null;
  account: Account | null;
  messages: Message[];
  suggestions: AISuggestion[];
  stealth: boolean;
  setStealth: (v: boolean) => void;
  autoReply: boolean;
  setAutoReply: (v: boolean) => void;
  onSend: (chatId: string, content: string, enc: boolean, burn: number) => void;
  showInspector: boolean;
  setShowInspector: (v: boolean) => void;
}

export function ChatArea({
  chat,
  account,
  messages,
  suggestions,
  stealth,
  setStealth,
  autoReply,
  setAutoReply,
  onSend,
  showInspector,
  setShowInspector,
}: ChatAreaProps) {
  const [text, setText] = useState('');
  const [e2ee, setE2ee] = useState(true);
  const [burn, setBurn] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, chat?.id]);
  useEffect(() => {
    setText('');
  }, [chat?.id]);
  if (!chat)
    return (
      <div className="flex-1 flex items-center justify-center text-[13px] bg-background text-text-secondary">
        Select a conversation to get started
      </div>
    );
  const ai = chat.aiStatus && AI_META[chat.aiStatus];
  const send = () => {
    if (!text.trim()) return;
    onSend(chat.id, text.trim(), e2ee, burn);
    setText('');
  };
  return (
    <div className={`flex-1 min-w-0 flex flex-col bg-background ${stealth ? 'ch-stealth' : ''}`}>
      <div className="h-[52px] shrink-0 flex items-center gap-2.5 px-4 bg-panel-background border-b border-border">
        <Avatar name={chat.name} size={32} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[13.5px] font-semibold truncate text-text-primary">{chat.name}</span>
            {ai && (
              <Pill tone={ai.color} icon={ai.icon}>
                {ai.label}
              </Pill>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[10.5px] text-text-secondary">
            {account && (
              <>
                <Logo platform={account.platform} size={11} />
                {PLATFORMS[account.platform].label} · {account.name}
              </>
            )}
            <span className="text-success">● {STATUS_META[account?.status || 'online'].label}</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setAutoReply(!autoReply)}
            className={`ch-hv flex items-center gap-1.5 px-2 h-7 rounded-md text-[11px] border ${
              autoReply
                ? 'bg-info/15 border-info/40 text-info'
                : 'bg-transparent border-border text-text-secondary'
            }`}
          >
            <Bot size={13} /> Auto-Reply{' '}
            <Toggle on={autoReply} onChange={setAutoReply} tone="info" />
          </button>
          <button
            onClick={() => setStealth(!stealth)}
            className={`ch-hv flex items-center gap-1.5 px-2 h-7 rounded-md text-[11px] font-medium border ${
              stealth
                ? 'bg-error/15 border-error text-error'
                : 'bg-transparent border-border text-text-secondary'
            }`}
          >
            {stealth ? <EyeOff size={13} /> : <Eye size={13} />} Stealth
          </button>
          <IconBtn icon={Phone} tip="Encrypted voice call" />
          <IconBtn icon={Video} tip="Video call" />
          <IconBtn icon={BellOff} tip="Mute notifications" />
          <IconBtn
            icon={showInspector ? PanelRightClose : PanelRightOpen}
            tip={showInspector ? 'Hide Inspector' : 'Show Inspector'}
            onClick={() => setShowInspector(!showInspector)}
            active={showInspector}
          />
        </div>
      </div>

      {stealth && (
        <div className="flex items-center gap-2 px-4 h-7 text-[11px] bg-error/10 border-b border-error/40 text-error">
          <ShieldAlert size={13} /> Stealth Mode is on: content is blurred to prevent screenshots and
          shoulder surfing. Hover a message to reveal it temporarily.
        </div>
      )}

      <div className="ch-scroll flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2.5">
        <div className="self-center flex items-center gap-1.5 px-2.5 h-6 rounded-full text-[10.5px] bg-success/10 border border-success/30 text-success">
          <Lock size={11} />{' '}
          {chat.isEncrypted
            ? 'End-to-end encryption is on. Only you and the recipient can read this.'
            : 'This conversation is not encrypted. Turn on E2EE in the composer.'}
        </div>
        {messages.length === 0 && (
          <div className="self-center text-[12px] mt-8 text-text-secondary">
            No messages loaded. Send the first message to get started.
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} m={m} />
        ))}
        <div ref={endRef} />
      </div>

      <div className="px-4 pt-2 pb-3 shrink-0 bg-panel-background border-t border-border">
        <div className="flex items-center gap-1.5 mb-2">
          <Pill tone="primary" icon={Sparkles}>
            Smart Compose
          </Pill>
          {suggestions.map((s) => (
            <Tip key={s.id} text="Click to insert into the composer" side="top">
              <button
                onClick={() => setText(s.text)}
                className="ch-hv2 flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[11.5px] max-w-[260px] bg-card-background border border-border text-text-primary"
              >
                <span className="text-[10px] text-primary">{s.tone}</span>
                <span className="truncate">{s.text}</span>
              </button>
            </Tip>
          ))}
        </div>
        <div
          className={`flex items-end gap-2 rounded-xl p-2 bg-input-background border ${
            e2ee ? 'border-success/30' : 'border-border'
          }`}
        >
          <div className="flex items-center gap-0.5 pb-0.5">
            <IconBtn icon={Paperclip} tip="Attach (encrypted before sending)" side="top" />
            <IconBtn
              icon={e2ee ? Lock : LockOpen}
              tip={e2ee ? 'E2EE: on' : 'E2EE: off'}
              active={e2ee}
              tone="success"
              onClick={() => setE2ee(!e2ee)}
              side="top"
            />
            <IconBtn
              icon={Hourglass}
              tip={burn ? `Self-destruct after ${fmtCd(burn)}` : 'Self-destructing messages: off'}
              active={burn > 0}
              tone="warn"
              onClick={() =>
                setBurn(BURN_OPTIONS[(BURN_OPTIONS.indexOf(burn) + 1) % BURN_OPTIONS.length])
              }
              side="top"
              badge={burn > 0}
            />
            <IconBtn icon={Languages} tip="Translate with AI" side="top" />
            <IconBtn icon={Smile} tip="Emoji" side="top" />
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder={`Message ${chat.name}… (Enter to send)`}
            className="flex-1 resize-none bg-transparent outline-none text-[13px] py-1.5 max-h-28 text-text-primary"
          />
          <Tip text="Send (Enter)" side="top">
            <button
              onClick={send}
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                text.trim() ? 'bg-primary text-text-foreground' : 'bg-border text-text-secondary'
              }`}
            >
              <Send size={14} />
            </button>
          </Tip>
        </div>
        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-text-secondary">
          <span className={`flex items-center gap-1 ${e2ee ? 'text-success' : 'text-warn'}`}>
            {e2ee ? <Lock size={10} /> : <LockOpen size={10} />}
            {e2ee ? 'E2EE · AES-256-GCM' : 'Sending unencrypted'}
          </span>
          {burn > 0 && (
            <span className="flex items-center gap-1 text-warn">
              <Hourglass size={10} />
              Self-destruct {fmtCd(burn)}
            </span>
          )}
          <span className="ml-auto">Shift+Enter for new line</span>
        </div>
      </div>
    </div>
  );
}