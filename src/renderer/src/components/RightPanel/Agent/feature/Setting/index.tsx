import React, { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { Drawer, DrawerHeader, DrawerBody } from '@renderer/components/ui/Drawer';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@renderer/components/ui/Dropdown';
import { $ } from '@renderer/utils/color';

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
];

const ChevronDownIcon = () => (
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
);

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const {
    apiUrl,
    setApiUrl,
    aiLanguage,
    setAiLanguage,
    commitMessageLanguage,
    setCommitMessageLanguage,
  } = useSettings();

  const [openAiLang, setOpenAiLang] = useState(false);
  const [openCommitLang, setOpenCommitLang] = useState(false);

  const selectedAiLang = LANGUAGES.find((l) => l.code === aiLanguage) || LANGUAGES[0];
  const selectedCommitLang =
    LANGUAGES.find((l) => l.code === commitMessageLanguage) || LANGUAGES[0];

  return (
    <Drawer isOpen={isOpen} onClose={onClose} height="100%" strategy="absolute">
      <DrawerHeader
        title="Settings"
        description="Configure your agent preferences"
        onClose={onClose}
      />

      {/* Content */}
      <DrawerBody className="p-5 flex flex-col gap-6">
        {/* API URL */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-text-primary">
            Backend API URL
          </label>
          <input
            type="text"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="http://localhost:8888"
            className="w-full px-3 py-2.5 rounded-md text-sm outline-none box-border bg-input-background border border-border text-text-primary"
          />
        </div>

        {/* AI Response Language */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-text-primary">
            AI Response Language
          </label>
          <Dropdown
            open={openAiLang}
            onOpenChange={setOpenAiLang}
            side="bottom"
            align="start"
            strategy="fixed"
            className="w-full"
          >
            <DropdownTrigger asChild>
              <button
                type="button"
                className="w-full h-9 px-3 rounded text-sm flex items-center justify-between cursor-pointer"
                style={{
                  backgroundColor: $('--input-background') || 'transparent',
                  border: `1px solid ${$('--border') || 'rgba(128,128,128,0.2)'}`,
                  color: $('--text-primary'),
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">{selectedAiLang.flag}</span>
                  <span className="font-medium">{selectedAiLang.name}</span>
                </div>
                <div style={{ color: $('--text-secondary') || 'currentColor' }}>
                  <ChevronDownIcon />
                </div>
              </button>
            </DropdownTrigger>
            <DropdownContent className="w-full min-w-[200px] rounded overflow-hidden bg-dropdown-background border border-border shadow-lg">
              {LANGUAGES.map((lang) => (
                <DropdownItem
                  key={lang.code}
                  onClick={() => {
                    setAiLanguage(lang.code);
                    setOpenAiLang(false);
                  }}
                  className="px-3 py-2 text-sm cursor-pointer flex items-center gap-2 w-full"
                  style={{
                    color: $('--text-primary'),
                    backgroundColor:
                      aiLanguage === lang.code ? $('--dropdown-item-hover') || 'rgba(128,128,128,0.1)' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (aiLanguage !== lang.code) {
                      e.currentTarget.style.backgroundColor = $('--dropdown-item-hover') || 'rgba(128,128,128,0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (aiLanguage !== lang.code) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.name}</span>
                </DropdownItem>
              ))}
            </DropdownContent>
          </Dropdown>
          <div className="text-[11px] opacity-70 text-text-secondary">
            Language used for AI responses and explanations
          </div>
        </div>

        {/* Commit Message Language */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-text-primary">
            Commit Message Language
          </label>
          <Dropdown
            open={openCommitLang}
            onOpenChange={setOpenCommitLang}
            side="bottom"
            align="start"
            strategy="fixed"
            className="w-full"
          >
            <DropdownTrigger asChild>
              <button
                type="button"
                className="w-full h-9 px-3 rounded text-sm flex items-center justify-between cursor-pointer"
                style={{
                  backgroundColor: $('--input-background') || 'transparent',
                  border: `1px solid ${$('--border') || 'rgba(128,128,128,0.2)'}`,
                  color: $('--text-primary'),
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">{selectedCommitLang.flag}</span>
                  <span className="font-medium">{selectedCommitLang.name}</span>
                </div>
                <div style={{ color: $('--text-secondary') || 'currentColor' }}>
                  <ChevronDownIcon />
                </div>
              </button>
            </DropdownTrigger>
            <DropdownContent className="w-full min-w-[200px] rounded overflow-hidden bg-dropdown-background border border-border shadow-lg">
              {LANGUAGES.map((lang) => (
                <DropdownItem
                  key={lang.code}
                  onClick={() => {
                    setCommitMessageLanguage(lang.code as 'en' | 'vi');
                    setOpenCommitLang(false);
                  }}
                  className="px-3 py-2 text-sm cursor-pointer flex items-center gap-2 w-full"
                  style={{
                    color: $('--text-primary'),
                    backgroundColor:
                      commitMessageLanguage === lang.code
                        ? $('--dropdown-item-hover') || 'rgba(128,128,128,0.1)'
                        : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (commitMessageLanguage !== lang.code) {
                      e.currentTarget.style.backgroundColor = $('--dropdown-item-hover') || 'rgba(128,128,128,0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (commitMessageLanguage !== lang.code) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.name}</span>
                </DropdownItem>
              ))}
            </DropdownContent>
          </Dropdown>
          <div className="text-[11px] opacity-70 text-text-secondary">
            Language used for generated commit messages
          </div>
        </div>
      </DrawerBody>
    </Drawer>
  );
};

export default SettingsPanel;