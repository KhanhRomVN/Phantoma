/**
 * ------------------------------------------------------------------
 * PromptSettingsDropdown
 * ------------------------------------------------------------------
 * Dropdown gộp các cài đặt phụ thuộc vào prompt-length:
 *   1. Style Code   — chọn preset system prompt style
 *   2. Diagnostics  — toggle VSCode diagnostics vào context
 *   3. Skill        — toggle skill instructions
 *   4. Memory       — toggle memory injection
 *   5. Tool Format  — chọn XML hoặc JSON cho tool calls
 *
 * Trigger button: pill hiển thị các icon liên tiếp.
 * Khi promptLengthMode === "none": chỉ hiển thị icon Tool Format (formatOnly).
 * ------------------------------------------------------------------
 */

import React, { useState } from 'react';
import { $ } from '@renderer/utils/color';
import { Ban, Stethoscope, Sparkles, Brain, Code2, Check } from 'lucide-react';
import type { SystemPromptMode } from '../../feature/Chat/prompts/code';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
} from '@renderer/components/ui/Dropdown';
import {
  SimpleTooltip,
  TooltipHeader,
  TooltipRow,
  TooltipCard,
} from './SimpleTooltip';

// ─── Local Definitions for STYLE_CODE_MODE_META & StyleCodeTriggerIcon ──
interface StyleCodeModeMeta {
  key: SystemPromptMode;
  label: string;
  desc: string;
  color: string;
  icon: React.ReactNode;
}

export const STYLE_CODE_MODE_META: StyleCodeModeMeta[] = [
  {
    key: 'fast',
    label: 'Fast',
    desc: 'Minimal confirmations, quick edits',
    color: $('--error'),
    icon: <Ban size={14} />,
  },
  {
    key: 'balanced',
    label: 'Balanced',
    desc: 'Moderate confirmations, standard flow',
    color: $('--primary'),
    icon: <Stethoscope size={14} />,
  },
  {
    key: 'thorough',
    label: 'Thorough',
    desc: 'Extensive checks, detailed explanations',
    color: $('--purple'),
    icon: <Sparkles size={14} />,
  },
  {
    key: 'autopilot',
    label: 'Autopilot',
    desc: 'Almost no confirmations, autonomous execution',
    color: $('--success'),
    icon: <Brain size={14} />,
  },
];

const StyleCodeTriggerIcon: React.FC<{ mode: SystemPromptMode }> = ({ mode }) => {
  const meta = STYLE_CODE_MODE_META.find((m) => m.key === mode);
  return (
    <span className="inline-flex items-center">
      {meta?.icon || <Code2 size={14} />}
    </span>
  );
};

// ─── Aliases ────────────────────────────────────────────────────────────
const DiagnosticsIcon = Stethoscope;
const SkillIcon = Sparkles;
const MemoryIcon = Brain;
const FormatIcon = Code2;

const FORMAT_COLORS = { json: $('--primary'), xml: $('--warn') } as const;

const FormatText: React.FC<{ format: 'xml' | 'json' }> = ({ format }) => (
  <span
    className="text-[9px] font-bold tracking-wider leading-none uppercase"
    style={{ color: FORMAT_COLORS[format] }}
  >
    {format}
  </span>
);

// ─── Tick Box ───────────────────────────────────────────────────────────
const TickBox: React.FC<{
  isOn: boolean;
  onToggle: () => void;
}> = ({ isOn, onToggle }) => (
  <button
    role="checkbox"
    aria-checked={isOn}
    onClick={(e) => {
      e.stopPropagation();
      onToggle();
    }}
    className={`w-4 h-4 inline-flex items-center justify-center rounded-sm flex-shrink-0 cursor-pointer p-0 border transition-colors ${
      isOn
        ? 'bg-primary border-primary text-white'
        : 'bg-input-background border-border text-transparent hover:border-text-secondary'
    }`}
  >
    {isOn && <Check size={12} strokeWidth={3} />}
  </button>
);

// ─── Props ──────────────────────────────────────────────────────────────
interface PromptSettingsDropdownProps {
  // Style Code
  systemPromptMode: SystemPromptMode;
  onSelectSystemPromptMode: (mode: SystemPromptMode) => void;
  isAntiInjection?: boolean;

  // Diagnostic
  diagnosticEnabled?: boolean;
  onDiagnosticToggle?: () => void;

  // Skill
  skillEnabled?: boolean;
  onSkillToggle?: () => void;

  // Memory
  memoryEnabled?: boolean;
  onMemoryToggle?: () => void;

  // Tool Format (xml | json)
  toolFormat?: 'xml' | 'json';
  onToolFormatToggle?: () => void;
  formatOnly?: boolean;
}

// ─── Divider ────────────────────────────────────────────────────────────
const Divider: React.FC = () => (
  <div className="h-px bg-border/50 my-1 mx-3" />
);

// ─── Section Row (non-clickable) ────────────────────────────────────────
const SectionLabel: React.FC<{ label: string }> = ({ label }) => (
  <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-text-secondary uppercase tracking-wider">
    {label}
  </div>
);

// ─── Component ─────────────────────────────────────────────────────────
const PromptSettingsDropdown: React.FC<PromptSettingsDropdownProps> = ({
  systemPromptMode,
  onSelectSystemPromptMode,
  isAntiInjection = false,
  diagnosticEnabled = false,
  onDiagnosticToggle,
  skillEnabled = false,
  onSkillToggle,
  memoryEnabled = false,
  onMemoryToggle,
  toolFormat = 'xml',
  onToolFormatToggle,
  formatOnly = false,
}) => {
  const [hovered, setHovered] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const styleCodeMeta =
    STYLE_CODE_MODE_META.find((m) => m.key === systemPromptMode) ??
    STYLE_CODE_MODE_META.find((m) => m.key === 'balanced')!;

  if (formatOnly) {
    const isJson = toolFormat === 'json';
    
    return (
      <SimpleTooltip
        content={
          <div className="flex items-center gap-1.5">
            <span className={`${isJson ? 'text-blue-500' : 'opacity-60'}`}>
              <FormatIcon size={11} />
            </span>
            <span className={`font-semibold ${isJson ? 'text-blue-500' : 'text-text-secondary'}`}>
              Format {isJson ? 'JSON' : 'XML'}
            </span>
          </div>
        }
      >
        <button
          onClick={() => onToolFormatToggle?.()}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={`inline-flex items-center justify-center h-6 px-1.5 rounded-md border border-transparent transition-all cursor-pointer ${
            hovered ? 'bg-gray-500/16' : 'bg-gray-500/6'
          }`}
        >
          <FormatText format={toolFormat} />
        </button>
      </SimpleTooltip>
    );
  }

  // ── Trigger pill: 5 icons liên tiếp ──────────────────────────────────
  const pill = (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`inline-flex items-center h-6 px-1.5 gap-1 rounded-md border border-transparent transition-all cursor-pointer ${
        hovered ? 'bg-gray-500/16' : 'bg-gray-500/6'
      }`}
    >
      {/* Icon 1: Style Code */}
      <span
        className={`inline-flex items-center ${
          isAntiInjection ? 'text-text-secondary opacity-40' : ''
        }`}
        style={!isAntiInjection ? { color: styleCodeMeta.color } : undefined}
      >
        <StyleCodeTriggerIcon mode={systemPromptMode} />
      </span>

      {/* Micro-divider */}
      <span className="w-px h-3 bg-border/40 flex-shrink-0" />

      {/* Icon 2: Diagnostics */}
      <span
        className={`inline-flex items-center ${
          diagnosticEnabled ? 'text-success' : 'text-text-secondary opacity-60'
        }`}
      >
        <DiagnosticsIcon size={13} />
      </span>

      {/* Micro-divider */}
      <span className="w-px h-3 bg-border/40 flex-shrink-0" />

      {/* Icon 3: Skill */}
      <span
        className={`inline-flex items-center ${
          skillEnabled ? 'text-indigo-500' : 'text-text-secondary opacity-60'
        }`}
      >
        <SkillIcon size={13} />
      </span>

      {/* Micro-divider */}
      <span className="w-px h-3 bg-border/40 flex-shrink-0" />

      {/* Icon 4: Memory */}
      <span
        className={`inline-flex items-center ${
          memoryEnabled ? 'text-purple-500' : 'text-text-secondary opacity-60'
        }`}
      >
        <MemoryIcon size={13} />
      </span>

      {/* Micro-divider */}
      <span className="w-px h-3 bg-border/40 flex-shrink-0" />

      {/* Icon 5: Tool Format */}
      <span className="inline-flex items-center">
        <FormatText format={toolFormat} />
      </span>
    </button>
  );

  const tooltipContent = (
    <TooltipCard>
      <TooltipHeader
        icon={<StyleCodeTriggerIcon mode={systemPromptMode} />}
        title={styleCodeMeta.label}
        color={isAntiInjection ? 'text-text-secondary' : styleCodeMeta.color}
      />
      <div className="h-px bg-border/30" />
      <TooltipRow
        icon={<DiagnosticsIcon size={13} />}
        label="Diagnostics"
        value={diagnosticEnabled ? 'ON' : 'OFF'}
        color={$('--success')}
        active={diagnosticEnabled}
      />
      <TooltipRow
        icon={<SkillIcon size={13} />}
        label="Skill"
        value={skillEnabled ? 'ON' : 'OFF'}
        color={$('--violet')}
        active={skillEnabled}
      />
      <TooltipRow
        icon={<MemoryIcon size={13} />}
        label="Memory"
        value={memoryEnabled ? 'ON' : 'OFF'}
        color={$('--purple')}
        active={memoryEnabled}
      />
      <TooltipRow
        icon={<FormatIcon size={13} />}
        label="Format"
        value={toolFormat === 'json' ? 'JSON' : 'XML'}
        color={$('--primary')}
      />
    </TooltipCard>
  );

  return (
    <SimpleTooltip content={tooltipContent} disabled={dropdownOpen}>
      <span className="inline-flex">
        <Dropdown
          side="top"
          align="start"
          sideOffset={4}
          onOpenChange={setDropdownOpen}
          width={340}
        >
          <DropdownTrigger asChild>{pill}</DropdownTrigger>
          <DropdownContent size="lg">
            {/* ── Section 1: Style Code ── */}
            <SectionLabel label="Style Code" />

            {isAntiInjection && (
              <div className="mx-3 mb-2 p-2 rounded-md bg-warn/10 border border-warn/20 flex items-start gap-2 text-[10.5px] text-warn">
                <Ban size={11} className="mt-0.5 flex-shrink-0" />
                <span>Provider injects its own system prompt — presets unavailable.</span>
              </div>
            )}

            {STYLE_CODE_MODE_META.map((meta) => {
              const isSelected = systemPromptMode === meta.key;
              const isDisabled = isAntiInjection;
              return (
                <button
                  key={meta.key}
                  onClick={() => !isDisabled && onSelectSystemPromptMode(meta.key)}
                  disabled={isDisabled}
                  className={`w-full px-3 py-2 flex items-center gap-2.5 text-left transition-colors ${
                    isDisabled 
                      ? 'cursor-not-allowed opacity-35' 
                      : 'cursor-pointer hover:bg-sidebar-item-hover'
                  } ${isSelected && !isDisabled ? 'bg-primary/10 border-l-2 border-l-primary' : 'border-l-2 border-l-transparent'}`}
                >
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 ${
                      isDisabled ? 'bg-gray-500/10 text-text-secondary' : ''
                    }`}
                    style={!isDisabled ? { backgroundColor: `color-mix(in srgb, ${meta.color} 15%, transparent)`, color: meta.color } : undefined}
                  >
                    {meta.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold text-text-primary flex items-center gap-1.5">
                      {meta.label}
                      {isSelected && !isDisabled && (
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
                      )}
                    </div>
                    <div className="text-[10.5px] text-text-secondary truncate">
                      {meta.desc}
                    </div>
                  </div>
                </button>
              );
            })}

            <Divider />

            {/* ── Section 2: Features ── */}
            
            {/* Diagnostics */}
            {onDiagnosticToggle && (
              <>
                <SectionLabel label="Diagnostics" />
                <button
                  onClick={onDiagnosticToggle}
                  className="w-full px-3 py-2 flex items-center gap-2.5 text-left hover:bg-sidebar-item-hover transition-colors"
                >
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 ${diagnosticEnabled ? 'bg-success/15 text-success' : 'bg-success/7 text-success/50'}`}>
                    <DiagnosticsIcon size={14} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold text-text-primary">Attach diagnostics</div>
                    <div className="text-[10.5px] text-text-secondary">Include VSCode errors & warnings in context</div>
                  </div>
                  <TickBox isOn={diagnosticEnabled} onToggle={onDiagnosticToggle} />
                </button>
                <Divider />
              </>
            )}

            {/* Skill */}
            {onSkillToggle && (
              <>
                <SectionLabel label="Skill" />
                <button
                  onClick={onSkillToggle}
                  className="w-full px-3 py-2 flex items-center gap-2.5 text-left hover:bg-sidebar-item-hover transition-colors"
                >
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 ${skillEnabled ? 'bg-indigo-500/15 text-indigo-500' : 'bg-indigo-500/7 text-indigo-500/50'}`}>
                    <SkillIcon size={14} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold text-text-primary">Skill instructions</div>
                    <div className="text-[10.5px] text-text-secondary">Inject skill instructions into system prompt</div>
                  </div>
                  <TickBox isOn={skillEnabled} onToggle={onSkillToggle} />
                </button>
                <Divider />
              </>
            )}

            {/* Memory */}
            {onMemoryToggle && (
              <>
                <SectionLabel label="Memory" />
                <button
                  onClick={onMemoryToggle}
                  className="w-full px-3 py-2 flex items-center gap-2.5 text-left hover:bg-sidebar-item-hover transition-colors"
                >
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 ${memoryEnabled ? 'bg-purple-500/15 text-purple-500' : 'bg-purple-500/7 text-purple-500/50'}`}>
                    <MemoryIcon size={14} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold text-text-primary">Global memory</div>
                    <div className="text-[10.5px] text-text-secondary">Persist durable facts across conversations</div>
                  </div>
                  <TickBox isOn={memoryEnabled} onToggle={onMemoryToggle} />
                </button>
                <Divider />
              </>
            )}

            {/* ── Section 3: Tool Format ── */}
            <SectionLabel label="Tool Format" />

            {(
              [
                {
                  key: 'xml' as const,
                  label: 'XML tool calls',
                  desc: 'AI uses XML tags for tool calls (default)',
                },
                {
                  key: 'json' as const,
                  label: 'JSON tool calls',
                  desc: 'AI uses fenced JSON objects for tool calls',
                },
              ]
            ).map((opt) => {
              const isSelected = toolFormat === opt.key;
              const color = FORMAT_COLORS[opt.key];
              return (
                <button
                  key={opt.key}
                  onClick={() => {
                    if (!isSelected) onToolFormatToggle?.();
                  }}
                  className={`w-full px-3 py-2 flex items-center gap-2.5 text-left transition-colors ${
                    isSelected 
                      ? 'bg-primary/10 border-l-2 border-l-primary' 
                      : 'border-l-2 border-l-transparent hover:bg-sidebar-item-hover'
                  }`}
                >
                  <span
                    className="inline-flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)` }}
                  >
                    <FormatText format={opt.key} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold text-text-primary flex items-center gap-1.5">
                      {opt.label}
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                      )}
                    </div>
                    <div className="text-[10.5px] text-text-secondary truncate">
                      {opt.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </DropdownContent>
        </Dropdown>
      </span>
    </SimpleTooltip>
  );
};

export default PromptSettingsDropdown;