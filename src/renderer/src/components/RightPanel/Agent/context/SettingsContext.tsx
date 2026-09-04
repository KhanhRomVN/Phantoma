/**
 * ------------------------------------------------------------------
 * SettingsContext
 * ------------------------------------------------------------------
 * Quản lý toàn bộ settings của Agent (API URL, permission mode,
 * tool permissions, ngôn ngữ...). Persist qua extensionService storage.
 *
 * Main features:
 * - SettingsProvider : Provider persist settings qua extensionService
 * - useSettings()    : Hook trả về toàn bộ settings + setters
 * ------------------------------------------------------------------
 */

import { logger } from '@renderer/utils/logger';
import React, { createContext, useContext, useState, useEffect } from 'react';

// Services
import { extensionService } from '../services/ExtensionService';

export type PermissionMode = 'fullAccess' | 'approval';
export type SystemPromptMode = 'fast' | 'balanced' | 'thorough' | 'autopilot';

interface SettingsContextType {
  apiUrl: string;
  setApiUrl: (url: string) => void;
  permissionMode: PermissionMode;
  setPermissionMode: (mode: PermissionMode) => void;
  isSimpleMode: boolean;
  setIsSimpleMode: (value: boolean) => void;
  liveWritePreview: boolean;
  setLiveWritePreview: (value: boolean) => void;
  commitMessageLanguage: 'en' | 'vi';
  setCommitMessageLanguage: (value: 'en' | 'vi') => void;
  language: string;
  setLanguage: (value: string) => void;
  aiLanguage: string;
  setAiLanguage: (value: string) => void;
  systemPromptMode: SystemPromptMode;
  setSystemPromptMode: (mode: SystemPromptMode) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [apiUrl, setApiUrlState] = useState('http://localhost:8888');
  const [permissionModeState, setPermissionModeState] = useState<PermissionMode>('fullAccess');
  const [isSimpleMode, setIsSimpleModeState] = useState<boolean>(true);
  const [liveWritePreview, setLiveWritePreviewState] = useState<boolean>(true);
  const [commitMessageLanguage, setCommitMessageLanguageState] = useState<'en' | 'vi'>('en');
  const [language, setLanguageState] = useState<string>('');
  const [aiLanguage, setAiLanguageState] = useState<string>('');
  const [systemPromptMode, setSystemPromptModeState] = useState<SystemPromptMode>('balanced');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('zen-simple-mode');
      if (saved !== null) {
        setIsSimpleModeState(saved !== 'false');
      }
      const savedLang = localStorage.getItem('zen-commit-message-language');
      if (savedLang === 'en' || savedLang === 'vi') {
        setCommitMessageLanguageState(savedLang);
      }
      const savedLanguage = localStorage.getItem('zen-language');
      if (savedLanguage) {
        setLanguageState(savedLanguage);
      }
      const savedAiLanguage = localStorage.getItem('zen-ai-language');
      if (savedAiLanguage) {
        setAiLanguageState(savedAiLanguage);
      }
      const savedSystemPromptMode = localStorage.getItem('zen-system-prompt-mode');
      if (
        savedSystemPromptMode === 'fast' ||
        savedSystemPromptMode === 'balanced' ||
        savedSystemPromptMode === 'thorough' ||
        savedSystemPromptMode === 'autopilot'
      ) {
        setSystemPromptModeState(savedSystemPromptMode);
      }
    } catch (e) {
      logger.warn('[SettingsContext] Failed to load settings from localStorage:', e);
    }
    const storage = extensionService.getStorage();

    storage.get('backend-api-url').then((res: any) => {
      if (res?.value) {
        setApiUrlState(res.value);
      }
    });

    storage.get('zen_permission_mode').then((res: any) => {
      if (res?.value) {
        const val = res.value;
        // Migrate old 4-mode values to new 3-mode system
        const migrationMap: Record<string, PermissionMode> = {
          bypassPermissions: 'fullAccess',
          acceptEdits: 'approval',
          auto: 'approval',
          plan: 'approval',
          fullAccess: 'fullAccess',
          approval: 'approval',
          readOnly: 'approval',
        };
        setPermissionModeState(migrationMap[val] ?? 'fullAccess');
      }
    });
  }, []);

  const setApiUrl = (url: string) => {
    setApiUrlState(url);
    const storage = extensionService.getStorage();
    storage.set('backend-api-url', url);
  };

  const setPermissionMode = (mode: PermissionMode) => {
    setPermissionModeState(mode);
    const storage = extensionService.getStorage();
    storage.set('zen_permission_mode', mode);
  };

  const setIsSimpleMode = (value: boolean) => {
    setIsSimpleModeState(value);
    try {
      localStorage.setItem('zen-simple-mode', String(value));
    } catch (e) {
      logger.warn('[SettingsContext] Failed to save simple mode:', e);
    }
  };

  const setLiveWritePreview = (value: boolean) => {
    setLiveWritePreviewState(value);
    try {
      localStorage.setItem('zen-live-write-preview', String(value));
    } catch (e) {
      logger.warn('[SettingsContext] Failed to save live write preview:', e);
    }
  };

  const setCommitMessageLanguage = (value: 'en' | 'vi') => {
    setCommitMessageLanguageState(value);
    try {
      localStorage.setItem('zen-commit-message-language', value);
    } catch (e) {
      logger.warn('[SettingsContext] Failed to save commit message language:', e);
    }
  };

  const setLanguage = (value: string) => {
    setLanguageState(value);
    try {
      localStorage.setItem('zen-language', value);
    } catch (e) {
      logger.warn('[SettingsContext] Failed to save language:', e);
    }
  };

  const setAiLanguage = (value: string) => {
    setAiLanguageState(value);
    try {
      localStorage.setItem('zen-ai-language', value);
    } catch (e) {
      logger.warn('[SettingsContext] Failed to save AI language:', e);
    }
  };

  const setSystemPromptMode = (mode: SystemPromptMode) => {
    setSystemPromptModeState(mode);
    try {
      localStorage.setItem('zen-system-prompt-mode', mode);
    } catch (e) {
      logger.warn('[SettingsContext] Failed to save system prompt mode:', e);
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        apiUrl,
        setApiUrl,
        permissionMode: permissionModeState,
        setPermissionMode,
        isSimpleMode,
        setIsSimpleMode,
        liveWritePreview,
        setLiveWritePreview,
        commitMessageLanguage,
        setCommitMessageLanguage,
        language,
        setLanguage,
        aiLanguage,
        setAiLanguage,
        systemPromptMode,
        setSystemPromptMode,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};