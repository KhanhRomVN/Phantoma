// ─── Agent Panel (Main Export) ────────────────────────────────────────────

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MessageSquare, Cpu, Users, Settings, Plus, Sparkles, RefreshCw } from 'lucide-react';

import { useAgentStore } from './components/store';
import { Chat } from './components/Chat';
import { Models } from './components/Model';
import { Accounts } from './components/Account';
import { Settings as SettingsTab } from './components/Setting';
import { loadSessions, saveSessions, createSession, updateSessionMessages } from './utils/storage';
import { ChatSession } from './types';
import { cn } from '@renderer/shared/lib/utils';

// ─── Tabs Configuration ────────────────────────────────────────────────────

const TABS = [
  { id: 'chat' as const, icon: MessageSquare, label: 'Chat' },
  { id: 'models' as const, icon: Cpu, label: 'Models' },
  { id: 'accounts' as const, icon: Users, label: 'Accounts' },
  { id: 'settings' as const, icon: Settings, label: 'Settings' },
];

// ─── AgentPanel ────────────────────────────────────────────────────────────

export function AgentPanel() {
  const { activeTab, setActiveTab, serverStatus, activeModelId, activeAccountId } = useAgentStore();

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showSessionList, setShowSessionList] = useState(false);

  // ─── Load sessions ─────────────────────────────────────────────────────

  useEffect(() => {
    const loaded = loadSessions();
    setSessions(loaded);

    // If no sessions, create one
    if (loaded.length === 0) {
      const newSession = createSession('New Chat');
      setSessions([newSession]);
      saveSessions([newSession]);
      setActiveSessionId(newSession.id);
    } else {
      setActiveSessionId(loaded[0].id);
    }
  }, []);

  // ─── Handle session update ────────────────────────────────────────────

  const handleSessionUpdate = useCallback((sessionId: string) => {
    setSessions((prev) => {
      const updated = prev.map((s) => (s.id === sessionId ? { ...s, updatedAt: Date.now() } : s));
      saveSessions(updated);
      return updated;
    });
  }, []);

  // ─── Create new session ───────────────────────────────────────────────

  const handleNewSession = useCallback(() => {
    const newSession = createSession(`Chat ${sessions.length + 1}`);
    setSessions((prev) => [...prev, newSession]);
    saveSessions([...sessions, newSession]);
    setActiveSessionId(newSession.id);
    setShowSessionList(false);
  }, [sessions]);

  // ─── Switch session ───────────────────────────────────────────────────

  const handleSwitchSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
    setShowSessionList(false);
  }, []);

  // ─── Delete session ───────────────────────────────────────────────────

  const handleDeleteSession = useCallback(
    (sessionId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!confirm('Delete this conversation?')) return;

      const filtered = sessions.filter((s) => s.id !== sessionId);
      setSessions(filtered);
      saveSessions(filtered);

      if (activeSessionId === sessionId) {
        if (filtered.length > 0) {
          setActiveSessionId(filtered[0].id);
        } else {
          const newSession = createSession('New Chat');
          setSessions([newSession]);
          saveSessions([newSession]);
          setActiveSessionId(newSession.id);
        }
      }
    },
    [sessions, activeSessionId],
  );

  // ─── Footer data ──────────────────────────────────────────────────────

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const messageCount = activeSession?.messages?.filter((m) => !m.isHidden)?.length || 0;

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col bg-background rounded-xl overflow-hidden shadow-2xl h-full font-sans text-text-primary">
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col shrink-0">
        {/* Tab Navigation */}
        <div className="flex items-center px-3 h-[32px] gap-1 bg-background">
          {TABS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-medium transition-all',
                activeTab === id
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  : 'text-text-secondary hover:text-text-primary hover:bg-card-background border border-transparent',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}

          <div className="flex-1" />

          <span className="text-[9px] text-text-secondary font-mono">
            {activeModelId ? `Model: ${activeModelId}` : 'No model'}
            {activeAccountId && ' · Account: ✓'}
          </span>
        </div>
      </div>

      {/* ─── Session List Dropdown ──────────────────────────────────── */}
      {showSessionList && (
        <div className="absolute z-20 mt-[72px] ml-4 w-64 max-h-60 overflow-y-auto bg-card-background border border-border rounded-lg shadow-2xl p-1.5">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => handleSwitchSession(session.id)}
              className={cn(
                'flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs cursor-pointer transition-all',
                activeSessionId === session.id
                  ? 'bg-cyan-500/10 text-cyan-400'
                  : 'hover:bg-card-background text-text-secondary',
              )}
            >
              <span className="truncate flex-1">{session.title}</span>
              <span className="text-[9px] text-text-muted mr-2">
                {session.messages?.filter((m) => !m.isHidden).length || 0} msgs
              </span>
              <button
                onClick={(e) => handleDeleteSession(session.id, e)}
                className="text-text-muted hover:text-red-400 transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={handleNewSession}
            className="w-full mt-1 px-2.5 py-1.5 text-xs text-cyan-400 border-t border-divider hover:bg-cyan-500/5 transition-colors flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            New Chat
          </button>
        </div>
      )}

      {/* ─── Content ──────────────────────────────────────────────────── */}
      <div
        className={cn(
          'flex-1 overflow-hidden bg-background',
          activeTab === 'chat' ? 'flex flex-col' : 'p-4 overflow-y-auto',
        )}
      >
        {activeTab === 'chat' && (
          <Chat
            key={activeSessionId || 'new'}
            conversationId={activeSessionId || ''}
            onConversationUpdate={handleSessionUpdate}
          />
        )}
        {activeTab === 'models' && <Models />}
        {activeTab === 'accounts' && <Accounts />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}
