// ─── Settings Tab ───────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { Save, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAgentStore } from '../store';
import { getAgentAPI } from '../../services/api';
import { cn } from '@renderer/shared/lib/utils';

export function Settings() {
  const {
    apiUrl,
    language,
    aiLanguage,
    setApiUrl,
    setLanguage,
    setAiLanguage,
    serverStatus,
    setServerStatus,
  } = useAgentStore();

  const [localApiUrl, setLocalApiUrl] = useState(apiUrl);
  const [localLanguage, setLocalLanguage] = useState(language);
  const [localAiLanguage, setLocalAiLanguage] = useState(aiLanguage);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ─── Sync local state with store ────────────────────────────────────

  useEffect(() => {
    setLocalApiUrl(apiUrl);
  }, [apiUrl]);

  useEffect(() => {
    setLocalLanguage(language);
  }, [language]);

  useEffect(() => {
    setLocalAiLanguage(aiLanguage);
  }, [aiLanguage]);

  // ─── Check server status ────────────────────────────────────────────

  const checkStatus = useCallback(async () => {
    try {
      const api = getAgentAPI(localApiUrl);
      const status = await api.checkStatus();
      setServerStatus(status ? 'online' : 'offline');
    } catch {
      setServerStatus('offline');
    }
  }, [localApiUrl, setServerStatus]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // ─── Save settings ──────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      // Update store
      setApiUrl(localApiUrl);
      setLanguage(localLanguage);
      setAiLanguage(localAiLanguage);

      // Test connection
      const api = getAgentAPI(localApiUrl);
      const status = await api.checkStatus();
      setServerStatus(status ? 'online' : 'offline');

      if (!status) {
        setSaveError('Server is not reachable at this URL');
      } else {
        setSaveMessage('Settings saved successfully');
        setTimeout(() => setSaveMessage(null), 3000);
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }, [
    localApiUrl,
    localLanguage,
    localAiLanguage,
    setApiUrl,
    setLanguage,
    setAiLanguage,
    setServerStatus,
  ]);

  // ─── Keyboard shortcut ──────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-divider">
        <div>
          <h3 className="text-sm font-bold text-text-primary">Settings</h3>
          <p className="text-[11px] text-text-secondary">
            Configure the AI Agent connection and preferences.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 text-xs font-semibold rounded-lg transition-all disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Connection Status */}
      <div className="mt-4 flex items-center gap-3 px-4 py-2 bg-card-background border border-border rounded-lg">
        <div
          className={cn(
            'w-2.5 h-2.5 rounded-full',
            serverStatus === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500',
          )}
        />
        <span className="text-xs font-medium text-text-primary">
          {serverStatus === 'online' ? 'Connected to AIWeb2API' : 'Disconnected'}
        </span>
        <span className="text-[10px] text-text-secondary font-mono">{localApiUrl}</span>
        <button onClick={checkStatus} className="text-[10px] text-cyan-400 hover:underline ml-auto">
          Test Connection
        </button>
      </div>

      {/* Settings Cards */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-sm space-y-4 pb-4 mt-4">
        {/* Connection Card */}
        <div className="bg-card-background border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-divider flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <span className="text-[10px]">🔗</span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-text-primary">Connection</h4>
              <p className="text-[9px] text-text-secondary">Backend API endpoint configuration</p>
            </div>
          </div>
          <div className="p-4 space-y-2.5">
            <div className="space-y-1">
              <label className="text-[10px] text-text-secondary block font-semibold uppercase tracking-wider">
                API URL
              </label>
              <input
                type="text"
                value={localApiUrl}
                onChange={(e) => setLocalApiUrl(e.target.value)}
                placeholder="http://localhost:8888"
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-text-primary outline-none focus:border-cyan-500/40 font-mono"
              />
              <p className="text-[9px] text-text-muted">
                Target endpoint of your Elara / AIWeb2API proxy backend.
              </p>
            </div>
          </div>
        </div>

        {/* Language Card */}
        <div className="bg-card-background border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-divider flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <span className="text-[10px]">🌐</span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-text-primary">Language</h4>
              <p className="text-[9px] text-text-secondary">
                UI and AI output language preferences
              </p>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] text-text-secondary block font-semibold uppercase tracking-wider">
                UI Language
              </label>
              <select
                value={localLanguage}
                onChange={(e) => setLocalLanguage(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-text-primary outline-none focus:border-cyan-500/40"
              >
                <option value="en">🇺🇸 English</option>
                <option value="vi">🇻🇳 Tiếng Việt</option>
                <option value="ja">🇯🇵 日本語</option>
                <option value="zh">🇨🇳 中文</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-text-secondary block font-semibold uppercase tracking-wider">
                AI Output Language
              </label>
              <select
                value={localAiLanguage}
                onChange={(e) => setLocalAiLanguage(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-text-primary outline-none focus:border-cyan-500/40"
              >
                <option value="English">English</option>
                <option value="Vietnamese">Vietnamese (Tiếng Việt)</option>
                <option value="Japanese">Japanese (日本語)</option>
                <option value="Chinese">Chinese (中文)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Shortcuts Card */}
        <div className="bg-card-background border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-divider flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <span className="text-[10px]">⌨</span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-text-primary">Keyboard Shortcuts</h4>
              <p className="text-[9px] text-text-secondary">Quick actions for power users</p>
            </div>
          </div>
          <div className="p-4 space-y-2">
            {[
              { keys: 'Ctrl + Enter', action: 'New Chat' },
              { keys: 'Enter', action: 'Send Message' },
              { keys: 'Shift + Enter', action: 'New Line' },
              { keys: 'Ctrl + S', action: 'Save Settings' },
            ].map(({ keys, action }) => (
              <div key={keys} className="flex items-center justify-between py-1">
                <span className="text-xs text-text-primary">{action}</span>
                <kbd className="text-[10px] font-mono bg-background text-text-secondary px-2 py-0.5 rounded border border-border">
                  {keys}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        {/* Status Messages */}
        {saveMessage && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{saveMessage}</span>
          </div>
        )}

        {saveError && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}
      </div>
    </div>
  );
}
