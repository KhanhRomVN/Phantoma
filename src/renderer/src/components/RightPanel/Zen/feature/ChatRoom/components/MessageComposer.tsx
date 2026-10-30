/**
 * ------------------------------------------------------------------
 * MessageComposer
 * ------------------------------------------------------------------
 * Ô nhập tin nhắn: tự giãn chiều cao, Enter gửi, Shift+Enter xuống dòng.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import { getCountryFlagEmoji } from '../utils/countryFlags';
import type { ChatProfile } from '../types';

// ─── Constants ──────────────────────────────────────────────────────────
const MAX_HEIGHT = 240;

// ─── Interfaces ─────────────────────────────────────────────────────────
interface MessageComposerProps {
  roomName: string;
  profile: ChatProfile;
  onSend: (content: string) => void;
  onEditProfile: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────
const MessageComposer: React.FC<MessageComposerProps> = ({
  roomName,
  profile,
  onSend,
  onEditProfile,
}) => {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSend = value.trim().length > 0;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT ? 'auto' : 'hidden';
  }, [value]);

  const submit = () => {
    if (!canSend) return;
    onSend(value);
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div style={{ padding: '0 16px 14px', flexShrink: 0 }}>
      <div
        style={{
          position: 'relative',
          backgroundColor: 'var(--input-background)',
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          padding: '12px',
        }}
      >
        <div
          onClick={onEditProfile}
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '8px',
            backgroundColor: 'var(--input-background)',
            color: 'var(--text-primary)',
            padding: '5px 10px',
            fontSize: '11px',
            fontWeight: 600,
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            boxShadow: '0 -2px 6px rgba(0,0,0,0.1)',
            borderRadius: '6px 6px 0 0',
          }}
          title="Click to edit your name and country"
        >
          <span>{getCountryFlagEmoji(profile.country)}</span>
          <span>{profile.name}</span>
        </div>
        <textarea
          ref={textareaRef}
          className="cr-input"
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message #${roomName}`}
          style={{
            display: 'block',
            width: '100%',
            minHeight: '24px',
            maxHeight: `${MAX_HEIGHT}px`,
            border: 'none',
            outline: 'none',
            resize: 'none',
            padding: 0,
            fontFamily: 'inherit',
            fontSize: '13px',
            backgroundColor: 'transparent',
            color: 'var(--text-primary)',
            overflowX: 'hidden',
            overflowY: 'hidden',
            wordBreak: 'break-word',
            boxSizing: 'border-box',
          }}
        />
      </div>
      <div
        style={{
          backgroundColor: 'var(--input-background)',
          borderBottomLeftRadius: 8,
          borderBottomRightRadius: 8,
          padding: '8px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 11, opacity: 0.6 }}>
          Enter to send · Shift+Enter for new line
        </span>
      </div>
      <style>{`
        .cr-input::placeholder { color: var(--text-secondary); opacity: 0.6; }
      `}</style>
    </div>
  );
};

export default MessageComposer;