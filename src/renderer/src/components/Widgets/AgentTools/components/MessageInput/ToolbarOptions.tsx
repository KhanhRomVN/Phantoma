import { memo, useRef } from 'react';
import { Bot, Gauge } from 'lucide-react';
import { $ } from '@renderer/utils/color';
import { Dropdown, DropdownTrigger, DropdownContent } from '@renderer/components/ui/Dropdown';
import type { RunOptions } from './types';

interface ToolbarOptionsProps {
  variants: string[];
  agents: string[];
  showReasoning: boolean;
  showAgent: boolean;
  showContextSize: boolean;
  options: RunOptions;
  onChange: (options: RunOptions) => void;
  disabled?: boolean;
}

const DEFAULT_STOP = 'default';
const FALLBACK_COLOR_VARS = ['--text-secondary', '--blue', '--green', '--yellow', '--red'];
const KNOWN_COLOR_VARS: Record<string, string> = {
  default: '--text-secondary',
  none: '--text-secondary',
  minimal: '--text-secondary',
  low: '--text-secondary',
  medium: '--blue',
  high: '--green',
  xhigh: '--yellow',
  max: '--red',
};

const CONTEXT_SIZES = [
  { value: '200k', label: '200K' },
  { value: '1m', label: '1M' },
];

const levelColor = (level: string, index: number): string =>
  $(KNOWN_COLOR_VARS[level] ?? FALLBACK_COLOR_VARS[index % FALLBACK_COLOR_VARS.length]);

const levelLabel = (level: string): string =>
  level === DEFAULT_STOP ? 'Default' : level.charAt(0).toUpperCase() + level.slice(1);

const PILL_CLASS =
  'inline-flex items-center gap-1 h-6 px-1.5 rounded-md border border-transparent transition-all cursor-pointer bg-gray-500/6 hover:bg-gray-500/16';

const SectionLabel = ({ label }: { label: string }) => (
  <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-text-secondary uppercase tracking-wider">
    {label}
  </div>
);

const ReasoningDropdown = memo<{
  level: string;
  stops: string[];
  onChange: (level: string) => void;
}>(({ level, stops, onChange }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const index = Math.max(stops.indexOf(level), 0);
  const lastIndex = Math.max(stops.length - 1, 1);
  const percent = (index / lastIndex) * 100;
  const color = levelColor(level, index);
  const gradient = `linear-gradient(to right, ${stops.map((s, i) => levelColor(s, i)).join(', ')})`;

  const selectFromClientX = (clientX: number): void => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const next = stops[Math.round(ratio * (stops.length - 1))];
    if (next && next !== level) onChange(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    let next = index;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = index - 1;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = index + 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = stops.length - 1;
    else return;
    e.preventDefault();
    const target = stops[Math.min(stops.length - 1, Math.max(0, next))];
    if (target && target !== level) onChange(target);
  };

  const trackLayer: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: '6px',
    transform: 'translateY(-50%)',
    borderRadius: '999px',
    background: gradient,
  };

  return (
    <Dropdown side="top" align="start" sideOffset={4} width={300}>
      <DropdownTrigger asChild>
        <button title={`Effort: ${levelLabel(level)}`} className={PILL_CLASS}>
          <Gauge size={12} style={{ color }} />
          <span className="text-[9px] font-medium tracking-wider leading-none uppercase text-text-secondary opacity-70">
            Effort
          </span>
          <span
            className="text-[9px] font-bold tracking-wider leading-none uppercase"
            style={{ color }}
          >
            {levelLabel(level)}
          </span>
        </button>
      </DropdownTrigger>
      <DropdownContent size="lg">
        <div style={{ padding: '10px 14px 12px' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary opacity-70">
              Reasoning
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold" style={{ color }}>
              <Gauge size={12} />
              {levelLabel(level)}
            </span>
          </div>

          <div
            ref={trackRef}
            role="slider"
            tabIndex={0}
            aria-valuemin={0}
            aria-valuemax={stops.length - 1}
            aria-valuenow={index}
            aria-valuetext={levelLabel(level)}
            onKeyDown={handleKeyDown}
            onPointerDown={(e) => {
              e.currentTarget.focus();
              e.currentTarget.setPointerCapture(e.pointerId);
              selectFromClientX(e.clientX);
            }}
            onPointerMove={(e) => {
              if (e.currentTarget.hasPointerCapture(e.pointerId)) selectFromClientX(e.clientX);
            }}
            onPointerUp={(e) => e.currentTarget.releasePointerCapture(e.pointerId)}
            style={{
              position: 'relative',
              height: '24px',
              margin: '0 10px',
              cursor: 'pointer',
              touchAction: 'none',
              outline: 'none',
            }}
          >
            <div style={{ ...trackLayer, opacity: 0.25 }} />
            <div style={{ ...trackLayer, clipPath: `inset(0 ${100 - percent}% 0 0)` }} />
            {stops.map((stop, i) => (
              <span
                key={stop}
                className="absolute w-1 h-1 rounded-full bg-card-background opacity-60 pointer-events-none"
                style={{
                  top: '50%',
                  left: `${(i / lastIndex) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            ))}
            <span
              className="absolute w-4 h-4 rounded-full border-2 border-card-background shadow-[0_0_0_1px_currentColor] pointer-events-none"
              style={{
                top: '50%',
                left: `${percent}%`,
                transform: 'translate(-50%, -50%)',
                background: color,
                color,
                transition: 'left 0.12s ease, background 0.12s ease',
              }}
            />
          </div>

          <div className="relative h-[14px] mx-[10px] mt-1">
            {stops.map((stop, i) => {
              const isActive = stop === level;
              return (
                <span
                  key={stop}
                  onClick={() => onChange(stop)}
                  className={`absolute -translate-x-1/2 text-[9.5px] whitespace-nowrap select-none cursor-pointer transition-colors ${
                    isActive
                      ? 'font-bold'
                      : 'font-medium text-text-secondary opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    left: `${(i / lastIndex) * 100}%`,
                    color: isActive ? levelColor(stop, i) : undefined,
                  }}
                >
                  {levelLabel(stop)}
                </span>
              );
            })}
          </div>
        </div>
      </DropdownContent>
    </Dropdown>
  );
});
ReasoningDropdown.displayName = 'ReasoningDropdown';

const ContextSizeToggle = memo<{ value: string; onChange: (value: string) => void }>(
  ({ value, onChange }) => (
    <div
      title="Context window"
      className="inline-flex items-center h-6 p-0.5 gap-0.5 rounded-md bg-gray-500/6"
    >
      {CONTEXT_SIZES.map((size) => {
        const active = size.value === value;
        return (
          <button
            key={size.value}
            onClick={() => onChange(size.value)}
            className={`h-5 px-1.5 rounded text-[9px] font-bold tracking-wider uppercase cursor-pointer transition-colors ${
              active
                ? 'bg-primary/15 text-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {size.label}
          </button>
        );
      })}
    </div>
  )
);
ContextSizeToggle.displayName = 'ContextSizeToggle';

const AgentDropdown = memo<{
  agent?: string;
  agents: string[];
  onChange: (agent?: string) => void;
}>(({ agent, agents, onChange }) => {
  const color = agent ? $('--violet') : $('--text-secondary');
  const rows: Array<{ key: string; label: string; desc: string; value?: string }> = [
    { key: DEFAULT_STOP, label: 'Server default', desc: 'Let OpenCode pick the agent' },
    ...agents.map((a) => ({ key: a, label: a, desc: 'Run with this agent', value: a })),
  ];

  return (
    <Dropdown side="top" align="start" sideOffset={4} width={300}>
      <DropdownTrigger asChild>
        <button
          title={`Agent: ${agent ?? 'Server default'}`}
          className={PILL_CLASS}
          style={{ backgroundColor: `color-mix(in srgb, ${$('--text-secondary')} 12%, transparent)` }}
        >
          <span
            className="max-w-[90px] truncate text-[9px] font-bold tracking-wider leading-none uppercase"
            style={{ color }}
          >
            {agent ?? 'Default'}
          </span>
        </button>
      </DropdownTrigger>
      <DropdownContent size="lg">
        <SectionLabel label="Agent" />
        {rows.map((row) => {
          const isSelected = row.value === agent;
          return (
            <button
              key={row.key}
              onClick={() => onChange(row.value)}
              className={`w-full px-3 py-2 flex items-center gap-2.5 text-left transition-colors cursor-pointer hover:bg-sidebar-item-hover ${
                isSelected
                  ? 'bg-primary/10 border-l-2 border-l-primary'
                  : 'border-l-2 border-l-transparent'
              }`}
            >
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 bg-gray-500/10 text-text-secondary">
                <Bot size={14} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-semibold text-text-primary flex items-center gap-1.5">
                  {row.label}
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                </div>
                <div className="text-[10.5px] text-text-secondary truncate">{row.desc}</div>
              </div>
            </button>
          );
        })}
      </DropdownContent>
    </Dropdown>
  );
});
AgentDropdown.displayName = 'AgentDropdown';

const UnavailablePill = ({
  icon,
  label,
  title,
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
}) => (
  <span
    title={title}
    className="inline-flex items-center gap-1 h-6 px-1.5 rounded-md bg-gray-500/6 opacity-50 cursor-not-allowed text-text-secondary"
  >
    {icon}
    <span className="text-[9px] font-medium tracking-wider leading-none uppercase">{label}</span>
    <span className="text-[9px] font-bold tracking-wider leading-none uppercase">N/A</span>
  </span>
);

const ToolbarOptions = memo<ToolbarOptionsProps>(
  ({ variants, agents, showReasoning, showAgent, showContextSize, options, onChange, disabled }) => {
    if (!showReasoning && !showAgent && !showContextSize) return null;

    return (
      <div
        className="flex items-center gap-1.5 flex-wrap min-w-0"
        style={disabled ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
      >
        {showReasoning && variants.length > 0 && (
          <ReasoningDropdown
            level={options.variant ?? DEFAULT_STOP}
            stops={[DEFAULT_STOP, ...variants]}
            onChange={(level) =>
              onChange({ ...options, variant: level === DEFAULT_STOP ? undefined : level })
            }
          />
        )}
        {showContextSize && (
          <ContextSizeToggle
            value={options.contextSize ?? '200k'}
            onChange={(contextSize) => onChange({ ...options, contextSize })}
          />
        )}
        {showAgent &&
          (agents.length > 0 ? (
            <AgentDropdown
              agent={options.agent}
              agents={agents}
              onChange={(agent) => onChange({ ...options, agent })}
            />
          ) : (
            <UnavailablePill icon={<Bot size={12} />} label="Agent" title="No agents found" />
          ))}
      </div>
    );
  }
);

ToolbarOptions.displayName = 'ToolbarOptions';

export default ToolbarOptions;
