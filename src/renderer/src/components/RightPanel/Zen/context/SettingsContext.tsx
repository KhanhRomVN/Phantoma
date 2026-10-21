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

import React, { createContext, useContext, useState, useEffect } from 'react';

// Services
import { extensionService } from '../services/ExtensionService';

export type SystemPromptMode = 'fast' | 'balanced' | 'thorough';
export type PromptLengthMode = 'none' | 'short' | 'medium' | 'long';

interface SettingsContextType {
  apiUrl: string;
  setApiUrl: (url: string) => void;
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
  promptLengthMode: PromptLengthMode;
  setPromptLengthMode: (mode: PromptLengthMode) => void;
  chromiumProfileDir: string;
  setChromiumProfileDir: (dir: string) => void;
  chromiumProfileSubpath: string;
  setChromiumProfileSubpath: (subpath: string) => void;
  showMetadataBar: boolean;
  setShowMetadataBar: (value: boolean) => void;
  useSkillEnabled: boolean;
  setUseSkillEnabled: (value: boolean) => void;
  memoryEnabled: boolean;
  setMemoryEnabled: (value: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [apiUrl, setApiUrlState] = useState('http://localhost:8888');
  const [isSimpleMode, setIsSimpleModeState] = useState<boolean>(true);
  const [liveWritePreview, setLiveWritePreviewState] = useState<boolean>(true);
  const [commitMessageLanguage, setCommitMessageLanguageState] = useState<'en' | 'vi'>('en');
  const [language, setLanguageState] = useState<string>('');
  const [aiLanguage, setAiLanguageState] = useState<string>('');
  const [systemPromptMode, setSystemPromptModeState] = useState<SystemPromptMode>('balanced');
  const [promptLengthMode, setPromptLengthModeState] = useState<PromptLengthMode>('long');
  const [chromiumProfileDir, setChromiumProfileDirState] = useState<string>('');
  const [chromiumProfileSubpath, setChromiumProfileSubpathState] = useState<string>('');
  const [showMetadataBar, setShowMetadataBarState] = useState<boolean>(true);
  const [useSkillEnabled, setUseSkillEnabledState] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('zen-use-skill-enabled');
      return v === null ? true : v === 'true';
    } catch {
      return true;
    }
  });
  const [memoryEnabled, setMemoryEnabledState] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('zen-memory-enabled');
      return v === null ? true : v === 'true';
    } catch {
      return true;
    }
  });

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
        savedSystemPromptMode === 'thorough'
      ) {
        setSystemPromptModeState(savedSystemPromptMode);
      } else if (savedSystemPromptMode === 'autopilot') {
        // Legacy: "autopilot" removed as a mode; fall back to "balanced".
        setSystemPromptModeState('balanced');
      }
      const savedPromptLengthMode = localStorage.getItem('zen-prompt-length-mode');
      if (
        savedPromptLengthMode === 'none' ||
        savedPromptLengthMode === 'short' ||
        savedPromptLengthMode === 'medium' ||
        savedPromptLengthMode === 'long'
      ) {
        setPromptLengthModeState(savedPromptLengthMode);
      }
      const savedChromiumProfileDir = localStorage.getItem('zen-chromium-profile-dir');
      if (savedChromiumProfileDir) {
        setChromiumProfileDirState(savedChromiumProfileDir);
      }
      const savedChromiumProfileSubpath = localStorage.getItem('zen-chromium-profile-subpath');
      if (savedChromiumProfileSubpath !== null) {
        setChromiumProfileSubpathState(savedChromiumProfileSubpath);
      }
      const savedShowMetadataBar = localStorage.getItem('zen-show-metadata-bar');
      if (savedShowMetadataBar !== null) {
        setShowMetadataBarState(savedShowMetadataBar !== 'false');
      }
      const savedMemoryEnabled = localStorage.getItem('zen-memory-enabled');
      if (savedMemoryEnabled !== null) {
        setMemoryEnabledState(savedMemoryEnabled === 'true');
      }
    } catch (e) {
      console.warn('[SettingsContext] Failed to load settings from localStorage:', e);
    }
    const storage = extensionService.getStorage();

    storage.get('backend-api-url').then((res: any) => {
      if (res?.value) {
        setApiUrlState(res.value);
      }
    });

  }, []);

  const setApiUrl = (url: string) => {
    setApiUrlState(url);
    const storage = extensionService.getStorage();
    storage.set('backend-api-url', url);
  };

  const setIsSimpleMode = (value: boolean) => {
    setIsSimpleModeState(value);
    try {
      localStorage.setItem('zen-simple-mode', String(value));
    } catch (e) {
      console.warn('[SettingsContext] Failed to save simple mode:', e);
    }
  };

  const setLiveWritePreview = (value: boolean) => {
    setLiveWritePreviewState(value);
    try {
      localStorage.setItem('zen-live-write-preview', String(value));
    } catch (e) {
      console.warn('[SettingsContext] Failed to save live write preview:', e);
    }
  };

  const setCommitMessageLanguage = (value: 'en' | 'vi') => {
    setCommitMessageLanguageState(value);
    try {
      localStorage.setItem('zen-commit-message-language', value);
    } catch (e) {
      console.warn('[SettingsContext] Failed to save commit message language:', e);
    }
  };

  const setLanguage = (value: string) => {
    setLanguageState(value);
    try {
      localStorage.setItem('zen-language', value);
    } catch (e) {
      console.warn('[SettingsContext] Failed to save language:', e);
    }
  };

  const setAiLanguage = (value: string) => {
    setAiLanguageState(value);
    try {
      localStorage.setItem('zen-ai-language', value);
    } catch (e) {
      console.warn('[SettingsContext] Failed to save AI language:', e);
    }
  };

  const setSystemPromptMode = (mode: SystemPromptMode) => {
    setSystemPromptModeState(mode);
    try {
      localStorage.setItem('zen-system-prompt-mode', mode);
    } catch (e) {
      console.warn('[SettingsContext] Failed to save system prompt mode:', e);
    }
  };

  const setChromiumProfileDir = (dir: string) => {
    setChromiumProfileDirState(dir);
    try {
      localStorage.setItem('zen-chromium-profile-dir', dir);
    } catch (e) {
      console.warn('[SettingsContext] Failed to save chromium profile dir:', e);
    }
  };

  const setPromptLengthMode = (mode: PromptLengthMode) => {
    setPromptLengthModeState(mode);
    try {
      localStorage.setItem('zen-prompt-length-mode', mode);
    } catch (e) {
      console.warn('[SettingsContext] Failed to save prompt length mode:', e);
    }
  };

  const setChromiumProfileSubpath = (subpath: string) => {
    setChromiumProfileSubpathState(subpath);
    try {
      localStorage.setItem('zen-chromium-profile-subpath', subpath);
    } catch (e) {
      console.warn('[SettingsContext] Failed to save chromium profile subpath:', e);
    }
  };

  const setShowMetadataBar = (value: boolean) => {
    setShowMetadataBarState(value);
    try {
      localStorage.setItem('zen-show-metadata-bar', String(value));
    } catch (e) {
      console.warn('[SettingsContext] Failed to save show metadata bar:', e);
    }
  };

  const setUseSkillEnabled = (value: boolean) => {
    setUseSkillEnabledState(value);

    try {
      localStorage.setItem('zen-use-skill-enabled', String(value));
    } catch (e) {
      console.warn('[SettingsContext] Failed to save use skill enabled:', e);
    }
  };

  const setMemoryEnabled = (value: boolean) => {
    setMemoryEnabledState(value);

    try {
      localStorage.setItem('zen-memory-enabled', String(value));
    } catch (e) {
      console.warn('[SettingsContext] Failed to save memory enabled:', e);
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        apiUrl,
        setApiUrl,
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
        promptLengthMode,
        setPromptLengthMode,
        chromiumProfileDir,
        setChromiumProfileDir,
        chromiumProfileSubpath,
        setChromiumProfileSubpath,
        showMetadataBar,
        setShowMetadataBar,
        useSkillEnabled,
        setUseSkillEnabled,
        memoryEnabled,
        setMemoryEnabled,
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
