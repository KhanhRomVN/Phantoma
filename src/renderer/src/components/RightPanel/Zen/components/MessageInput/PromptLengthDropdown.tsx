import React from 'react';
import { Ban } from 'lucide-react';
import { $ } from '@renderer/utils/color';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
} from '@renderer/components/ui/Dropdown';

export type PromptLengthMode = 'none' | 'short' | 'medium' | 'long';

interface PromptLengthDropdownProps {
  currentMode: PromptLengthMode;
  onSelect: (mode: PromptLengthMode) => void;
  triggerButton: React.ReactNode;
  /**
   * Khi true, chỉ "None" được phép chọn — short/medium/long bị disabled.
   * Dùng khi provider có anti-system-prompt-injection.
   */
  isNoneOnly?: boolean;
}

/**
 * Metadata cho 4 mức Prompt Length — dùng chung cho cả trigger icon (step-bar)
 * lẫn panel step-bar bên trong dropdown.
 */
export const PROMPT_LENGTH_MODE_META: {
  key: PromptLengthMode;
  label: string;
  shortLabel: string;
  barHeight: number;
  color: string;
  desc: string;
  /** Nếu true, option này không gắn system prompt. */
  isNoPrompt?: boolean;
}[] = [
  {
    key: 'none',
    label: 'No Prompt',
    shortLabel: 'None',
    barHeight: 4,
    get color() {
      return $('--text-secondary');
    },
    desc: 'No system prompt — only your message is sent',
    isNoPrompt: true,
  },
  {
    key: 'short',
    label: 'Short',
    shortLabel: 'Short',
    barHeight: 12,
    get color() {
      return $('--teal');
    },
    desc: 'Ultra-compact prompt — fastest generation, minimal context',
  },
  {
    key: 'medium',
    label: 'Medium',
    shortLabel: 'Medium',
    barHeight: 20,
    get color() {
      return $('--warn');
    },
    desc: 'Balanced length — removes examples, keeps core instructions',
  },
  {
    key: 'long',
    label: 'Long',
    shortLabel: 'Long',
    barHeight: 28,
    get color() {
      return $('--purple');
    },
    desc: 'Full prompt — includes all examples and details',
  },
];

/**
 * Icon step-bar cho trigger: 3 cột tăng dần, tô màu theo mode hiện tại.
 * level 0 = tất cả mờ, 1/2/3 = fill lên tới cột tương ứng.
 */
export const PromptLengthTriggerIcon: React.FC<{ mode: PromptLengthMode }> = ({ mode }) => {
  const meta =
    PROMPT_LENGTH_MODE_META.find((m) => m.key === mode) ?? PROMPT_LENGTH_MODE_META[3];
  const level = mode === 'none' ? 0 : mode === 'short' ? 1 : mode === 'medium' ? 2 : 3;
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <rect
        x="1"
        y="11"
        width="3"
        height="3"
        rx="0.75"
        fill={meta.color}
        opacity={level >= 1 ? 1 : 0.28}
      />
      <rect
        x="6"
        y="8"
        width="3"
        height="6"
        rx="0.75"
        fill={meta.color}
        opacity={level >= 2 ? 1 : 0.28}
      />
      <rect
        x="11"
        y="5"
        width="3"
        height="9"
        rx="0.75"
        fill={meta.color}
        opacity={level >= 3 ? 1 : 0.28}
      />
    </svg>
  );
};

const PromptLengthDropdown: React.FC<PromptLengthDropdownProps> = ({
  currentMode,
  onSelect,
  triggerButton,
  isNoneOnly = false,
}) => {
  const current =
    PROMPT_LENGTH_MODE_META.find((m) => m.key === currentMode) ?? PROMPT_LENGTH_MODE_META[3];

  return (
    <Dropdown side="top" align="start" sideOffset={6}>
      <DropdownTrigger asChild>{triggerButton}</DropdownTrigger>
      <DropdownContent>
        <style>{`
          .zen-pl-step .zen-pl-bar {
            transition: background 0.15s ease, box-shadow 0.15s ease;
          }
          .zen-pl-step:not(.zen-pl-disabled):hover .zen-pl-bar {
            background: rgba(128, 128, 128, 0.4);
          }
        `}</style>
        <div className="p-[10px_12px_8px]">
          
          {/* Banner khi isNoneOnly */}
          {isNoneOnly && (
            <div className="flex items-center gap-1.5 text-[10.5px] text-warn leading-snug mb-2.5 pb-2 border-b border-border/50">
              <Ban size={11} className="shrink-0" />
              <span>This provider injects its own prompt — only None is available.</span>
            </div>
          )}

          {/* Header: label + value pill */}
          <div className="flex items-center justify-between gap-2">
            <div className="text-[12.5px] font-semibold text-text-primary">
              Prompt Length
            </div>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 whitespace-nowrap"
              style={{
                background: `color-mix(in srgb, ${current.color} 18%, transparent)`,
                color: current.color,
              }}
            >
              {current.label}
            </span>
          </div>

          {/* Step-bar */}
          <div className="flex items-end gap-2 h-[34px] mt-3 px-0.5">
            {PROMPT_LENGTH_MODE_META.map((meta) => {
              const isSelected = currentMode === meta.key;
              const isDisabled = isNoneOnly && !meta.isNoPrompt;

              return (
                <div
                  key={meta.key}
                  className={`zen-pl-step flex-1 flex flex-col items-center gap-1.5 cursor-pointer transition-opacity ${isSelected ? 'zen-pl-selected' : ''} ${isDisabled ? 'zen-pl-disabled opacity-30 cursor-not-allowed' : ''}`}
                  onClick={() => {

                    if (!isDisabled) onSelect(meta.key);
                  }}
                  title={
                    isDisabled
                      ? "Unavailable — provider uses its own system prompt"
                      : meta.desc
                  }
                >
                  <div
                    className="zen-pl-bar w-full rounded-t-[3px] rounded-b-[1px] bg-gray-500/20"
                    style={{
                      height: `${meta.barHeight}px`,
                      background: isSelected && !isDisabled ? meta.color : undefined,
                      boxShadow: isSelected && !isDisabled
                        ? `0 0 0 1px color-mix(in srgb, ${meta.color} 50%, transparent)`
                        : undefined,
                    }}
                  />
                  <span
                    className="text-[9.5px] font-semibold leading-none text-text-secondary"
                    style={{
                      color: isSelected && !isDisabled ? meta.color : undefined,
                    }}
                  >
                    {meta.shortLabel}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Description */}
          <div className="mt-2 text-[10.5px] text-text-secondary leading-normal">
            {current.desc}
          </div>
        </div>
      </DropdownContent>
    </Dropdown>
  );
};

export default PromptLengthDropdown;