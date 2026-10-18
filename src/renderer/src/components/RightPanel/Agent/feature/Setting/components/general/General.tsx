/**
 * ------------------------------------------------------------------
 * GeneralSettings
 * ------------------------------------------------------------------
 * Tab General trong Settings Panel. Được chia thành các GroupSection:
 * - Backend Connection : URL backend
 * - Chromium Profile   : Profile folder path + auto-detect subpath
 * - Language           : ngôn ngữ AI + ngôn ngữ commit message
 * Database Managers đã được tách sang tab riêng (xem Database.tsx).
 * ------------------------------------------------------------------
 */

import React, { useEffect, useRef, useState } from 'react';
import { Server, Languages, FolderOpen, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useSettings } from '../../../../context/SettingsContext';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@renderer/components/ui/Dropdown';
import { LANGUAGES } from './LanguageSelector';
import GroupSection from '../shared/GroupSection';
import { $ } from '@renderer/utils/color';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: '13px',
  backgroundColor: $('--input-background') || 'transparent',
  border: `1px solid ${$('--border') || 'rgba(128,128,128,0.2)'}`,
  borderRadius: '8px',
  color: $('--text-primary'),
  outline: 'none',
  boxSizing: 'border-box',
  height: '34px',
};

type ScanState =
  | { status: 'idle' }
  | { status: 'scanning' }
  | { status: 'done'; subpaths: string[] }
  | { status: 'error'; message: string };

const GeneralSettings: React.FC = () => {
  const {
    apiUrl,
    setApiUrl,
    aiLanguage,
    setAiLanguage,
    commitMessageLanguage,
    setCommitMessageLanguage,
    chromiumProfileDir,
    setChromiumProfileDir,
    chromiumProfileSubpath,
    setChromiumProfileSubpath,
  } = useSettings();

  const [scanState, setScanState] = useState<ScanState>({ status: 'idle' });
  // Debounce timer để tự động quét sau khi user dừng gõ path
  const scanDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track path đã được quét để tránh quét lặp
  const lastScannedDirRef = useRef<string>('');

  /**
   * Quét folder profile và tự động chọn subpath nếu chỉ có 1 kết quả.
   * Nếu mảng subpaths rỗng → cấu trúc mặc định → tự động đặt subpath = "".
   */
  const scanProfileDir = async (dir: string) => {
    if (!dir || !apiUrl) {
      setScanState({ status: 'idle' });
      return;
    }
    if (lastScannedDirRef.current === dir) return;

    setScanState({ status: 'scanning' });
    try {
      const res = await fetch(`${apiUrl}/v1/config/scan-profile-dir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_dir: dir }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setScanState({
          status: 'error',
          message: json.message || 'Failed to scan folder',
        });
        return;
      }

      lastScannedDirRef.current = dir;
      const subpaths: string[] = json.data?.subpaths ?? [];
      setScanState({ status: 'done', subpaths });

      // Tự động áp dụng: cấu trúc mặc định hoặc chỉ có 1 subpath duy nhất
      if (subpaths.length === 0) {
        setChromiumProfileSubpath('');
      } else if (subpaths.length === 1) {
        setChromiumProfileSubpath(subpaths[0]);
      }
      // Nếu có nhiều subpath → giữ nguyên để user chọn
    } catch {
      setScanState({
        status: 'error',
        message: 'Cannot connect to backend',
      });
    }
  };

  // Khi chromiumProfileDir thay đổi → debounce quét 800ms
  useEffect(() => {
    if (scanDebounceRef.current) clearTimeout(scanDebounceRef.current);
    if (!chromiumProfileDir) {
      setScanState({ status: 'idle' });
      lastScannedDirRef.current = '';
      return;
    }
    // Reset nếu path thay đổi
    if (lastScannedDirRef.current !== chromiumProfileDir) {
      setScanState({ status: 'idle' });
    }
    scanDebounceRef.current = setTimeout(() => {
      scanProfileDir(chromiumProfileDir);
    }, 800);
    return () => {
      if (scanDebounceRef.current) clearTimeout(scanDebounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chromiumProfileDir, apiUrl]);

  // Khi apiUrl thay đổi → reset để quét lại với URL mới
  useEffect(() => {
    lastScannedDirRef.current = '';
    if (chromiumProfileDir) {
      setScanState({ status: 'idle' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl]);

  const renderSubpathSelector = () => {
    if (!chromiumProfileDir) return null;

    if (scanState.status === 'scanning') {
      return (
        <div
          className="flex items-center gap-1.5 text-xs text-text-secondary mt-1"
        >
          <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
          Scanning folder structure...
        </div>
      );
    }

    if (scanState.status === 'error') {
      return (
        <div
          className="flex items-center gap-1.5 text-xs mt-1"
          style={{ color: $('--error-color') || '#e57373' }}
        >
          <AlertCircle size={12} />
          {scanState.message}
        </div>
      );
    }

    if (scanState.status === 'done') {
      const { subpaths } = scanState;

      // Cấu trúc mặc định (rỗng) → hiển thị badge xác nhận, không cần chọn
      if (subpaths.length === 0) {
        return (
          <div
            className="flex items-center gap-1.5 text-xs mt-1"
            style={{ color: $('--success-color') || '#81c784' }}
          >
            <CheckCircle2 size={12} />
            Standard structure detected — no subpath needed
          </div>
        );
      }

      // 1 subpath → đã tự chọn, chỉ hiển thị xác nhận
      if (subpaths.length === 1) {
        return (
          <div
            className="flex items-center gap-1.5 text-xs mt-1"
            style={{ color: $('--success-color') || '#81c784' }}
          >
            <CheckCircle2 size={12} />
            Subpath auto-detected:{' '}
            <code
              className="bg-input-background px-1 rounded text-[11px]"
            >
              {subpaths[0]}
            </code>
          </div>
        );
      }

      // Nhiều subpath → hiển thị dropdown chọn
      return (
        <div className="flex flex-col gap-1.5 mt-2">
          <label className="text-xs text-text-secondary">
            Multiple structures found — select the correct subpath:
          </label>
          <Dropdown align="start" side="bottom" sideOffset={4}>
            <DropdownTrigger asChild>
              <button
                type="button"
                className="w-full h-9 px-3 rounded text-sm flex items-center justify-between cursor-pointer"
                style={inputStyle}
              >
                <span className="text-sm" style={{ color: chromiumProfileSubpath ? $('--text-primary') : ($('--placeholder-text') || $('--text-secondary')) }}>
                  {chromiumProfileSubpath || 'Select subpath...'}
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </DropdownTrigger>
            <DropdownContent>
              {subpaths.map((sp) => (
                <DropdownItem
                  key={sp || '__default__'}
                  onClick={() => setChromiumProfileSubpath(sp)}
                >
                  {sp || (
                    <span className="text-text-secondary italic">
                      (default — no subpath)
                    </span>
                  )}
                </DropdownItem>
              ))}
            </DropdownContent>
          </Dropdown>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col gap-7">
      {/* Backend Connection */}
      <GroupSection
        icon={<Server size={16} />}
        color={$('--blue')}
        title="Backend Connection"
        description="Backend API address."
      >
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-text-primary">
            Backend API URL
          </label>
          <input
            type="text"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="http://localhost:8888"
            style={inputStyle}
          />
        </div>
      </GroupSection>

      {/* Chromium Profile */}
      <GroupSection
        icon={<FolderOpen size={16} />}
        color={$('--green')}
        title="Chromium Profile"
        description="Path to the folder containing browser profiles."
      >
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-text-primary">
            Profile Folder
          </label>
          <input
            type="text"
            value={chromiumProfileDir}
            onChange={(e) => {
              // Reset scan nếu path thay đổi
              lastScannedDirRef.current = '';
              setChromiumProfileDir(e.target.value);
            }}
            placeholder="/home/user/.elara/profiles"
            style={inputStyle}
          />
          {renderSubpathSelector()}
        </div>
      </GroupSection>

      {/* Language */}
      <GroupSection
        icon={<Languages size={16} />}
        color={$('--purple')}
        title="Language"
        description="AI response language and commit message language."
      >
        {/* AI Language Selection */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-text-primary">
            AI Language
          </label>
          <Dropdown align="start" side="bottom" sideOffset={4} searchable>
            <DropdownTrigger asChild>
              <button
                type="button"
                className="w-full h-9 px-3 rounded text-sm flex items-center justify-between cursor-pointer"
                style={inputStyle}
              >
                <span className="flex items-center gap-2">
                  <span>
                    {LANGUAGES.find((l) => l.name === aiLanguage)?.flag || '🌐'}
                  </span>
                  <span>{aiLanguage}</span>
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </DropdownTrigger>
            <DropdownContent className="language-dropdown-content">
              {LANGUAGES.map((lang) => (
                <DropdownItem
                  key={lang.code}
                  icon={<span>{lang.flag}</span>}
                  onClick={() => setAiLanguage(lang.name)}
                >
                  {lang.name}
                </DropdownItem>
              ))}
            </DropdownContent>
          </Dropdown>
        </div>

        {/* Commit Message Language Selection */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-text-primary">
            Commit Message Language
          </label>
          <Dropdown align="start" side="bottom" sideOffset={4} searchable>
            <DropdownTrigger asChild>
              <button
                type="button"
                className="w-full h-9 px-3 rounded text-sm flex items-center justify-between cursor-pointer"
                style={inputStyle}
              >
                <span className="flex items-center gap-2">
                  <span>
                    {LANGUAGES.find((l) => l.code === commitMessageLanguage)
                      ?.flag || '🌐'}
                  </span>
                  <span>
                    {LANGUAGES.find((l) => l.code === commitMessageLanguage)
                      ?.name || commitMessageLanguage}
                  </span>
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </DropdownTrigger>
            <DropdownContent className="language-dropdown-content">
              {LANGUAGES.map((lang) => (
                <DropdownItem
                  key={lang.code}
                  icon={<span>{lang.flag}</span>}
                  onClick={() => setCommitMessageLanguage(lang.code as 'en' | 'vi')}
                >
                  {lang.name}
                </DropdownItem>
              ))}
            </DropdownContent>
          </Dropdown>
        </div>
      </GroupSection>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .language-dropdown-content > div {
          max-height: 180px !important;
        }
        .dropdown-searchbar {
          width: 100%;
          box-sizing: border-box;
          background-color: var(--input-background);
          border-bottom: 1px solid var(--border);
        }
      `}</style>
    </div>
  );
};

export default GeneralSettings;