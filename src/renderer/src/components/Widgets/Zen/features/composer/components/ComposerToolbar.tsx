import React from 'react';
import { Plus, Workflow as WorkflowIcon, X } from 'lucide-react';
import { $ } from '@renderer/utils/color';
import type { useSettings } from '@renderer/components/Widgets/Zen/context/SettingsContext';
import type { useMultiAgentControl } from '../../../context/MultiAgentContext';

import ActionDropdown from './ActionDropdown';
import EffortDropdown from './EffortDropdown';
import type { EffortLevel, getModelEffortInfo } from './EffortDropdown';
import PromptLengthDropdown, {
  PromptLengthTriggerIcon,
  PROMPT_LENGTH_MODE_META,
} from './PromptLengthDropdown';
import PromptSettingsDropdown from './PromptSettingsDropdown';
import type { PickedSkill } from './SkillPickerDrawer';
import { SimpleTooltip, TooltipRow, TooltipCard } from './SimpleTooltip';
import type { MessageInputProps, ToggleButtonProps } from '../types/composer.types';
import {
  resolvePromptLength,
  resolveStyleCode,
  resolveToolFormats,
} from '../../chat/services/module_prompt.service';
import { buildAcceptString } from '../../chat/utils/file_operations';

// ============================================================================
// ICONS
// ============================================================================

const BrainCogIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-brain-cog-icon lucide-brain-cog"
  >
    <path d="m10.852 14.772-.383.923" />
    <path d="m10.852 9.228-.383-.923" />
    <path d="m13.148 14.772.382.924" />
    <path d="m13.531 8.305-.383.923" />
    <path d="m14.772 10.852.923-.383" />
    <path d="m14.772 13.148.923.383" />
    <path d="M17.598 6.5A3 3 0 1 0 12 5a3 3 0 0 0-5.63-1.446 3 3 0 0 0-.368 1.571 4 4 0 0 0-2.525 5.771" />
    <path d="M17.998 5.125a4 4 0 0 1 2.525 5.771" />
    <path d="M19.505 10.294a4 4 0 0 1-1.5 7.706" />
    <path d="M4.032 17.483A4 4 0 0 0 11.464 20c.18-.311.892-.311 1.072 0a4 4 0 0 0 7.432-2.516" />
    <path d="M4.5 10.291A4 4 0 0 0 6 18" />
    <path d="M6.002 5.125a3 3 0 0 0 .4 1.375" />
    <path d="m9.228 10.852-.923-.383" />
    <path d="m9.228 13.148-.923.383" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const GlobeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-globe-icon lucide-globe"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </svg>
);

// ============================================================================
// TOGGLE BUTTONS
// ============================================================================

/** Render "Label ... [ON|OFF]" dạng pill với màu accent khi ON, mờ khi OFF */
const TooltipToggle = ({
  label,
  isOn,
  accentColor,
}: {
  label: string;
  isOn: boolean;
  accentColor: string;
}) => (
  <TooltipCard>
    <TooltipRow label={label} value={isOn ? 'ON' : 'OFF'} color={accentColor} active={isOn} />
  </TooltipCard>
);

/**
 * Icon-only toggle button dùng chung cho Thinking / Search.
 */
const IconToggleButton: React.FC<
  ToggleButtonProps & {
    accentColor: string;
    children: React.ReactNode;
    tooltipContent: React.ReactNode;
  }
> = ({ isOn, onClick, accentColor, children, tooltipContent }) => {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <SimpleTooltip content={tooltipContent}>
      <button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '24px',
          width: '24px',
          boxSizing: 'border-box',
          borderRadius: '5px',
          cursor: 'pointer',
          transition: 'all 0.15s ease-in-out',
          border: '1px solid transparent',
          background: isOn
            ? isHovered
              ? `color-mix(in srgb, ${accentColor} 22%, transparent)`
              : `color-mix(in srgb, ${accentColor} 14%, transparent)`
            : isHovered
              ? `color-mix(in srgb, ${$('--text-secondary')} 16%, transparent)`
              : 'transparent',
          color: isOn ? accentColor : $('--text-primary'),
          opacity: isOn ? 1 : isHovered ? 1 : 0.75,
          padding: 0,
        }}
      >
        {children}
      </button>
    </SimpleTooltip>
  );
};

const THINKING_COLOR = $('--purple');
const SEARCH_COLOR = $('--blue');

const ThinkingButton: React.FC<ToggleButtonProps> = ({ isOn, onClick, title }) => (
  <IconToggleButton
    isOn={isOn}
    onClick={onClick}
    title={title}
    accentColor={THINKING_COLOR}
    tooltipContent={<TooltipToggle label="Thinking" isOn={isOn} accentColor={THINKING_COLOR} />}
  >
    <BrainCogIcon />
  </IconToggleButton>
);

const SearchButton: React.FC<ToggleButtonProps> = ({ isOn, onClick, title }) => (
  <IconToggleButton
    isOn={isOn}
    onClick={onClick}
    title={title}
    accentColor={SEARCH_COLOR}
    tooltipContent={<TooltipToggle label="Search" isOn={isOn} accentColor={SEARCH_COLOR} />}
  >
    <GlobeIcon />
  </IconToggleButton>
);

// ============================================================================
// COMPOSER TOOLBAR
// ============================================================================

export interface ComposerToolbarProps extends Pick<
  MessageInputProps,
  | 'message'
  | 'uploadedFiles'
  | 'fileInputRef'
  | 'handleFileSelect'
  | 'isHistoryMode'
  | 'isStreaming'
  | 'isProcessing'
  | 'onStopGeneration'
  | 'isConversationStarted'
  | 'currentModel'
  | 'conversationUseSkillEnabled'
  | 'conversationMemoryEnabled'
  | 'conversationToolFormat'
  | 'onConversationUseSkillToggle'
  | 'onConversationMemoryToggle'
  | 'onConversationToolFormatToggle'
> {
  // Trạng thái kết nối / giới hạn
  isConnected: boolean;
  isLoadingCache: boolean;
  isTimeBlocked: boolean;
  timeBlockLabel: { current: string; all: string } | null;
  isTokenLimitExceeded: boolean;
  messageTokenCount: number;
  maxInputTokens: number | null;
  onSendMessage: () => void;

  // Model capabilities
  currentModelConfig: any;
  supportsUpload: boolean;
  supportsImageGenerator: boolean;
  supportsVideoGenerator: boolean;
  supportsDeepResearch: boolean;
  showThinkingButton: boolean;
  showSearchButton: boolean;
  isThinking: boolean;
  toggleThinking: () => void;
  isSearch: boolean;
  toggleSearch: () => void;

  // Effort
  effortInfo: ReturnType<typeof getModelEffortInfo>;
  handleEffortChange: (lvl: EffortLevel) => void;

  // Git / Skill
  setShowGitRepoPicker: React.Dispatch<React.SetStateAction<boolean>>;
  selectedSkills: PickedSkill[];
  setSelectedSkills: React.Dispatch<React.SetStateAction<PickedSkill[]>>;

  // Multi-agent
  supportsMultiAgent: boolean;
  multiAgent: ReturnType<typeof useMultiAgentControl>;

  // Prompt settings
  supportsSystemPromptMode: boolean;
  supportsSkill: boolean;
  supportsMemory: boolean;
  supportsToolFormat: boolean;
  supportsPromptLength: boolean;
  toolFormatOptions: ReturnType<typeof resolveToolFormats>;
  styleResolved: ReturnType<typeof resolveStyleCode>;
  promptLengthResolved: ReturnType<typeof resolvePromptLength>;
  setSystemPromptMode: ReturnType<typeof useSettings>['setSystemPromptMode'];
  setPromptLengthMode: ReturnType<typeof useSettings>['setPromptLengthMode'];
}

const ComposerToolbar: React.FC<ComposerToolbarProps> = ({
  message,
  uploadedFiles,
  fileInputRef,
  handleFileSelect,
  isHistoryMode,
  isStreaming,
  isProcessing,
  onStopGeneration,
  isConversationStarted,
  currentModel,
  conversationUseSkillEnabled,
  conversationMemoryEnabled,
  conversationToolFormat,
  onConversationUseSkillToggle,
  onConversationMemoryToggle,
  onConversationToolFormatToggle,
  isConnected,
  isLoadingCache,
  isTimeBlocked,
  timeBlockLabel,
  isTokenLimitExceeded,
  messageTokenCount,
  maxInputTokens,
  onSendMessage,
  currentModelConfig,
  supportsUpload,
  supportsImageGenerator,
  supportsVideoGenerator,
  supportsDeepResearch,
  showThinkingButton,
  showSearchButton,
  isThinking,
  toggleThinking,
  isSearch,
  toggleSearch,
  effortInfo,
  handleEffortChange,
  setShowGitRepoPicker,
  selectedSkills,
  setSelectedSkills,
  supportsMultiAgent,
  multiAgent,
  supportsSystemPromptMode,
  supportsSkill,
  supportsMemory,
  supportsToolFormat,
  supportsPromptLength,
  toolFormatOptions,
  styleResolved,
  promptLengthResolved,
  setSystemPromptMode,
  setPromptLengthMode,
}) => {
  const [isPromptLengthHovered, setIsPromptLengthHovered] = React.useState(false);
  const [isPlusHovered, setIsPlusHovered] = React.useState(false);

  return (
    <div
      style={{
        backgroundColor: $('--input-background'),
        borderBottomLeftRadius: '6px',
        borderBottomRightRadius: '6px',
        padding: '8px 12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        pointerEvents: !isConnected || isTimeBlocked ? 'none' : undefined,
      }}
    >
      {/* Left Icons */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          alignItems: 'center',
        }}
      >
        <ActionDropdown
          onSelectAttach={() => {
            const acceptStr = buildAcceptString(currentModelConfig ?? currentModel);
            if (fileInputRef?.current) {
              fileInputRef.current.accept = acceptStr;
              (fileInputRef.current as any).dataset.textOnly = String(!supportsUpload);
              fileInputRef.current.click();
            } else {
              // Call original handleFileSelect without args if signature differs
              handleFileSelect();
            }
          }}
          onSelectImageGenerator={() => {}}
          onSelectVideoGenerator={() => {}}
          onSelectDeepResearch={() => {}}
          onSelectPullRequest={() => setShowGitRepoPicker(true)}
          showImageGenerator={supportsImageGenerator}
          showVideoGenerator={supportsVideoGenerator}
          showDeepResearch={supportsDeepResearch}
          currentModel={currentModel}
          currentModelConfig={currentModelConfig}
          onSelectSkills={(items) => {
            setSelectedSkills(
              items.map((i: any) => ({ slug: i.id.replace('skill-', ''), name: i.path })),
            );
            // TODO: Sync with parent attachedItems when backend ready
          }}
          selectedSkillSlugs={selectedSkills.map((s) => s.slug)}
          triggerButton={
            <div
              onMouseEnter={() => setIsPlusHovered(true)}
              onMouseLeave={() => setIsPlusHovered(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '22px',
                width: '22px',
                boxSizing: 'border-box',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                border: `1px solid color-mix(in srgb, ${$('--text-secondary')} 20%, transparent)`,
                background: isPlusHovered
                  ? `color-mix(in srgb, ${$('--text-secondary')} 20%, transparent)`
                  : `color-mix(in srgb, ${$('--text-secondary')} 12%, transparent)`,
                color: $('--text-primary'),
                opacity: isPlusHovered ? 0.9 : 0.7,
              }}
              title={supportsUpload ? 'Attach files' : 'Attach text files only'}
            >
              <Plus size={14} />
            </div>
          }
        />

        {showThinkingButton && (
          <ThinkingButton
            isOn={isThinking}
            onClick={toggleThinking}
            title="Toggle AI Thinking Process"
          />
        )}

        {showSearchButton && (
          <SearchButton
            isOn={isSearch}
            onClick={toggleSearch}
            title="Toggle Web Search Grounding"
          />
        )}

        <div
          style={{
            width: '1px',
            height: '16px',
            background: $('--border'),
            margin: '0 2px',
            flexShrink: 0,
          }}
        />

        {!isConversationStarted && effortInfo && effortInfo.options.length > 1 && (
          <EffortDropdown
            effort={effortInfo.effort}
            options={effortInfo.options}
            onChange={handleEffortChange}
          />
        )}

        {!isConversationStarted && supportsMultiAgent && multiAgent && (
          <SimpleTooltip
            content={
              multiAgent.enabled
                ? 'Multi-agent: on (Orchestrator)'
                : multiAgent.blocked
                  ? 'This branch already has an Orchestrator'
                  : 'Enable multi-agent for this branch'
            }
          >
            <button
              type="button"
              disabled={multiAgent.blocked && !multiAgent.enabled}
              onClick={multiAgent.toggle}
              aria-pressed={multiAgent.enabled}
              style={{
                width: '26px',
                height: '26px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                border: 'none',
                background: multiAgent.enabled ? 'rgba(167,139,250,0.15)' : 'transparent',
                color: multiAgent.enabled ? '#A78BFA' : $('--text-secondary'),
                opacity: multiAgent.blocked && !multiAgent.enabled ? 0.4 : 1,
                cursor: multiAgent.blocked && !multiAgent.enabled ? 'not-allowed' : 'pointer',
                flexShrink: 0,
              }}
            >
              <WorkflowIcon size={14} />
            </button>
          </SimpleTooltip>
        )}

        {/* Prompt Settings (Style · Skill · Memory · Format) — Home only, ẩn khi promptLength=none */}
        {!isConversationStarted &&
          (supportsSystemPromptMode || supportsSkill || supportsMemory || supportsToolFormat) &&
          (!promptLengthResolved.enabled || promptLengthResolved.value !== 'none') && (
            <>
              <PromptSettingsDropdown
                systemPromptMode={styleResolved.value as any}
                systemPromptModes={styleResolved.options}
                onSelectSystemPromptMode={
                  supportsSystemPromptMode ? (mode) => setSystemPromptMode(mode as any) : undefined
                }
                skillEnabled={supportsSkill ? !!conversationUseSkillEnabled : undefined}
                onSkillToggle={supportsSkill ? onConversationUseSkillToggle : undefined}
                memoryEnabled={supportsMemory ? !!conversationMemoryEnabled : undefined}
                onMemoryToggle={supportsMemory ? onConversationMemoryToggle : undefined}
                toolFormat={supportsToolFormat ? (conversationToolFormat ?? 'xml') : undefined}
                toolFormats={toolFormatOptions}
                onToolFormatToggle={
                  supportsToolFormat
                    ? (format) => {
                        onConversationToolFormatToggle?.(format);
                      }
                    : undefined
                }
              />
            </>
          )}

        {/* Prompt Length Selector - Home only */}
        {!isConversationStarted && supportsPromptLength && (
          <PromptLengthDropdown
            currentMode={promptLengthResolved.value as any}
            availableModes={promptLengthResolved.options}
            onSelect={(mode: any) => setPromptLengthMode(mode)}
            triggerButton={(() => {
              const meta =
                PROMPT_LENGTH_MODE_META.find((m) => m.key === promptLengthResolved.value) ??
                PROMPT_LENGTH_MODE_META[3];
              return (
                <SimpleTooltip
                  content={
                    <>
                      <span>Prompt Length</span>
                      <span style={{ fontWeight: 700, color: meta.color }}>{meta.label}</span>
                    </>
                  }
                >
                  <button
                    onMouseEnter={() => setIsPromptLengthHovered(true)}
                    onMouseLeave={() => setIsPromptLengthHovered(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '24px',
                      width: '24px',
                      boxSizing: 'border-box',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease-in-out',
                      border: '1px solid transparent',
                      background: isPromptLengthHovered
                        ? `color-mix(in srgb, ${$('--text-secondary')} 16%, transparent)`
                        : 'transparent',
                      color: meta.color,
                      opacity: 1,
                      padding: 0,
                    }}
                  >
                    <PromptLengthTriggerIcon mode={promptLengthResolved.value as any} />
                  </button>
                </SimpleTooltip>
              );
            })()}
          />
        )}
      </div>

      {/* Right Icons */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          alignItems: 'center',
        }}
      >
        {/* Token Count Badge / Stop Button */}
        {isConnected && (
          <div
            style={{
              cursor:
                isHistoryMode || isLoadingCache
                  ? 'not-allowed'
                  : isStreaming || isProcessing
                    ? 'pointer'
                    : isTokenLimitExceeded || isTimeBlocked
                      ? 'not-allowed'
                      : message.trim() || uploadedFiles.length > 0
                        ? 'pointer'
                        : 'default',
              padding: isStreaming || isProcessing ? '4px' : '4px 8px',
              borderRadius: '6px',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color:
                isHistoryMode || isLoadingCache
                  ? $('--text-secondary')
                  : isStreaming || isProcessing
                    ? $('--error')
                    : isTokenLimitExceeded || isTimeBlocked
                      ? $('--error')
                      : $('--text-secondary'),
              pointerEvents:
                isHistoryMode ||
                isLoadingCache ||
                ((isTokenLimitExceeded || isTimeBlocked) && !isStreaming && !isProcessing)
                  ? 'none'
                  : 'auto',
              backgroundColor:
                isStreaming || isProcessing
                  ? 'transparent'
                  : isTokenLimitExceeded || isTimeBlocked
                    ? `color-mix(in srgb, ${$('--error')} 12%, transparent)`
                    : `color-mix(in srgb, ${$('--text-secondary')} 8%, transparent)`,
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.3px',
              whiteSpace: 'nowrap',
            }}
            onClick={() => {
              if ((isStreaming || isProcessing) && onStopGeneration) {
                onStopGeneration();
                return;
              }

              if (isTokenLimitExceeded || isTimeBlocked) {
                return;
              }

              if (!currentModel) {
                return;
              }
              onSendMessage();
            }}
            onMouseEnter={(e) => {
              if (isStreaming || isProcessing) {
                e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${$('--text-primary')} 5%, transparent)`;
              } else if (isTokenLimitExceeded || isTimeBlocked) {
                e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${$('--error')} 18%, transparent)`;
              } else if (message.trim() || uploadedFiles.length > 0) {
                e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${$('--text-primary')} 5%, transparent)`;
              }
            }}
            onMouseLeave={(e) => {
              if (isStreaming || isProcessing) {
                e.currentTarget.style.backgroundColor = 'transparent';
              } else if (isTokenLimitExceeded || isTimeBlocked) {
                e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${$('--error')} 12%, transparent)`;
              } else {
                e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${$('--text-secondary')} 8%, transparent)`;
              }
            }}
            title={
              isStreaming || isProcessing
                ? 'Stop Generation'
                : isTimeBlocked && timeBlockLabel
                  ? `DeepSeek is blocked during ${timeBlockLabel.all}`
                  : isTokenLimitExceeded
                    ? `Token limit exceeded (${messageTokenCount.toLocaleString()}/${maxInputTokens?.toLocaleString()})`
                    : maxInputTokens
                      ? `${messageTokenCount.toLocaleString()}/${maxInputTokens.toLocaleString()} tokens`
                      : `${messageTokenCount.toLocaleString()} tokens`
            }
          >
            {isStreaming || isProcessing ? (
              <X size={16} strokeWidth={2.5} />
            ) : (
              <span style={{ lineHeight: 1 }}>
                {(() => {
                  const formatTokenCount = (count: number): string => {
                    if (count < 1000) return count.toString();
                    else if (count < 1000000) {
                      const k = count / 1000;
                      return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`;
                    } else {
                      const m = count / 1000000;
                      return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`;
                    }
                  };
                  return maxInputTokens
                    ? `${formatTokenCount(messageTokenCount)}/${formatTokenCount(maxInputTokens)}`
                    : messageTokenCount > 0
                      ? `${formatTokenCount(messageTokenCount)}`
                      : '0';
                })()}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ComposerToolbar;
