/**
 * ------------------------------------------------------------------
 * ChromiumProfileSection
 * ------------------------------------------------------------------
 * Nhập Profile Folder, hiển thị trạng thái scan và chọn subpath.
 * Vòng đời scan nằm trong useChromiumProfileScan.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { FolderOpen, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useSettings } from '../../../context/SettingsContext';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@renderer/components/ui/Dropdown';
import { $ } from '@renderer/utils/color';
import SettingsSection, { inputStyle, ChevronDownIcon } from './SettingsSection';
import { useChromiumProfileScan } from '../hooks/useChromiumProfileScan';

const ChromiumProfileSection: React.FC = () => {
  const {
    apiUrl,
    chromiumProfileDir,
    setChromiumProfileDir,
    chromiumProfileSubpath,
    setChromiumProfileSubpath,
  } = useSettings();

  const { scanState, retry } = useChromiumProfileScan({
    apiUrl,
    profileDir: chromiumProfileDir,
    subpath: chromiumProfileSubpath,
    onSubpathChange: setChromiumProfileSubpath,
  });

  const renderSubpathSelector = () => {
    if (!chromiumProfileDir) return null;

    if (scanState.status === 'scanning') {
      return (
        <div className="flex items-center gap-1.5 text-xs text-text-secondary mt-1">
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
          <button
            type="button"
            onClick={retry}
            className="ml-1 bg-transparent border-none cursor-pointer text-xs underline"
            style={{ color: 'inherit' }}
          >
            Retry
          </button>
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
            <code className="bg-input-background px-1 rounded text-[11px]">{subpaths[0]}</code>
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
                <span
                  className="text-sm"
                  style={{
                    color: chromiumProfileSubpath
                      ? $('--text-primary')
                      : $('--placeholder-text') || $('--text-secondary'),
                  }}
                >
                  {chromiumProfileSubpath || 'Select subpath...'}
                </span>
                <ChevronDownIcon />
              </button>
            </DropdownTrigger>
            <DropdownContent>
              {subpaths.map((sp) => (
                <DropdownItem
                  key={sp || '__default__'}
                  onClick={() => setChromiumProfileSubpath(sp)}
                >
                  {sp || (
                    <span className="text-text-secondary italic">(default — no subpath)</span>
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
    <SettingsSection
      icon={<FolderOpen size={16} />}
      color={$('--green')}
      title="Chromium Profile"
      description="Path to the folder containing browser profiles."
    >
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-text-primary">Profile Folder</label>
        <input
          type="text"
          value={chromiumProfileDir}
          onChange={(e) => setChromiumProfileDir(e.target.value)}
          placeholder="/home/user/.elara/profiles"
          style={inputStyle}
        />
        {renderSubpathSelector()}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </SettingsSection>
  );
};

export default ChromiumProfileSection;
