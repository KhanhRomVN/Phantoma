import { cn } from '@renderer/shared/lib/utils';
import React, { useState, useEffect, useRef } from 'react';
import { $ } from '@renderer/utils/color';

export const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
];

interface LanguageSelectorProps {
  value: string | null;
  onChange: (value: string) => void;
  className?: string;
}

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

const ChevronUpIcon = () => (
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
    <path d="m18 15-6-6-6 6" />
  </svg>
);

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  value,
  onChange,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLanguage = LANGUAGES.find((l) => l.code === value) || LANGUAGES[0];

  return (
    <div className={cn('relative w-full', className)} ref={dropdownRef}>
      <button
        type="button"
        className="w-full h-9 px-3 rounded text-sm flex items-center justify-between cursor-pointer"
        style={{
          backgroundColor: $('--input-bg') || 'transparent',
          border: `1px solid ${$('--border-color') || 'rgba(128,128,128,0.2)'}`,
          color: $('--text-primary'),
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">{selectedLanguage.flag}</span>
          <span className="font-medium text-foreground">{selectedLanguage.name}</span>
        </div>
        <div style={{ color: $('--secondary-text') || 'currentColor' }}>
          {isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </div>
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 z-[1000] w-full mt-1 rounded overflow-hidden"
          style={{
            backgroundColor: $('--input-bg') || 'transparent',
            border: `1px solid ${$('--border-color') || 'rgba(128,128,128,0.2)'}`,
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          }}
        >
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {LANGUAGES.map((lang) => (
              <div
                key={lang.code}
                className="flex items-center justify-between px-3 py-2 text-sm cursor-pointer"
                style={{
                  color: $('--text-primary'),
                  backgroundColor: value === lang.code ? ($('--hover-bg') || 'rgba(128,128,128,0.1)') : 'transparent',
                }}
                onClick={() => {
                  onChange(lang.code);
                  setIsOpen(false);
                }}
                onMouseEnter={(e) => {
                  if (value !== lang.code) {
                    e.currentTarget.style.backgroundColor = $('--hover-bg') || 'rgba(128,128,128,0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (value !== lang.code) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  <span>{lang.flag}</span>
                  <span>{lang.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
