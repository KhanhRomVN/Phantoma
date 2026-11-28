/**
 * ------------------------------------------------------------------
 * GeneralSettings
 * ------------------------------------------------------------------
 * Tab General trong Settings Panel:
 * - Backend Connection : URL backend
 * - Chromium Profile   : ChromiumProfileSection
 * - Language           : ngôn ngữ AI + ngôn ngữ commit message
 * ------------------------------------------------------------------
 */

import React from 'react';
import { Server, Languages } from 'lucide-react';
import { useSettings } from '../../../context/SettingsContext';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@renderer/components/ui/Dropdown';
import { $ } from '@renderer/utils/color';
import SettingsSection, { inputStyle, ChevronDownIcon } from './SettingsSection';
import ChromiumProfileSection from './ChromiumProfileSection';

// Popular languages with emoji flags
const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', flag: '🇧🇩' },
  { code: 'id', name: 'Indonesian', flag: '🇮🇩' },
  { code: 'th', name: 'Thai', flag: '🇹🇭' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'no', name: 'Norwegian', flag: '🇳🇴' },
  { code: 'da', name: 'Danish', flag: '🇩🇰' },
  { code: 'fi', name: 'Finnish', flag: '🇫🇮' },
  { code: 'el', name: 'Greek', flag: '🇬🇷' },
  { code: 'he', name: 'Hebrew', flag: '🇮🇱' },
  { code: 'uk', name: 'Ukrainian', flag: '🇺🇦' },
  { code: 'cs', name: 'Czech', flag: '🇨🇿' },
  { code: 'ro', name: 'Romanian', flag: '🇷🇴' },
];

const GeneralSettings: React.FC = () => {
  const {
    apiUrl,
    setApiUrl,
    aiLanguage,
    setAiLanguage,
    commitMessageLanguage,
    setCommitMessageLanguage,
  } = useSettings();

  const selectedAiLanguage = LANGUAGES.find((l) => l.name === aiLanguage);
  const selectedCommitLanguage = LANGUAGES.find((l) => l.code === commitMessageLanguage);

  return (
    <div className="flex flex-col gap-7">
      {/* Backend Connection */}
      <SettingsSection
        icon={<Server size={16} />}
        color={$('--blue')}
        title="Backend Connection"
        description="Backend API address."
      >
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-text-primary">Backend API URL</label>
          <input
            type="text"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="http://localhost:8888"
            style={inputStyle}
          />
        </div>
      </SettingsSection>

      {/* Chromium Profile */}
      <ChromiumProfileSection />

      {/* Language */}
      <SettingsSection
        icon={<Languages size={16} />}
        color={$('--purple')}
        title="Language"
        description="AI response language and commit message language."
      >
        {/* AI Language Selection */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-text-primary">AI Language</label>
          <Dropdown align="start" side="bottom" sideOffset={4} searchable>
            <DropdownTrigger asChild>
              <button
                type="button"
                className="w-full h-9 px-3 rounded text-sm flex items-center justify-between cursor-pointer"
                style={inputStyle}
              >
                <span className="flex items-center gap-2">
                  <span>{selectedAiLanguage?.flag || '🌐'}</span>
                  <span>{aiLanguage}</span>
                </span>
                <ChevronDownIcon />
              </button>
            </DropdownTrigger>
            <DropdownContent className="max-h-[220px] overflow-y-auto bg-dropdown-background rounded-lg">
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
                  <span>{selectedCommitLanguage?.flag || '🌐'}</span>
                  <span>{selectedCommitLanguage?.name || commitMessageLanguage}</span>
                </span>
                <ChevronDownIcon />
              </button>
            </DropdownTrigger>
            <DropdownContent className="max-h-[220px] overflow-y-auto bg-dropdown-background rounded-lg">
              {LANGUAGES.map((lang) => (
                <DropdownItem
                  key={lang.code}
                  icon={<span>{lang.flag}</span>}
                  onClick={() =>
                    setCommitMessageLanguage(
                      lang.code as Parameters<typeof setCommitMessageLanguage>[0]
                    )
                  }
                >
                  {lang.name}
                </DropdownItem>
              ))}
            </DropdownContent>
          </Dropdown>
        </div>
      </SettingsSection>

      <style>{`
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
