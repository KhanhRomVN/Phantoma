import { memo } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import {
  computeRects,
  DEFAULT_SIZES,
  PANE_IDS,
  type PaneId,
  type PaneRect,
  type PanelType,
} from '../../../utils/workspaceLayout';
import {
  LAYOUT_PRESETS,
  PANEL_TYPES,
  useWorkspaceSettings,
  type PaneRule,
  type PanelRules,
} from '../../../hooks/useWorkspaceSettings';
import { getPanelMeta } from '../Workspace/WorkspacePanes';

const PANES: { id: PaneId; label: string }[] = [
  { id: 'tl', label: 'Top left' },
  { id: 'tr', label: 'Top right' },
  { id: 'bl', label: 'Bottom left' },
  { id: 'br', label: 'Bottom right' },
];

const TYPE_STYLE: Record<PanelType, { label: string; hint: string; solid: string; soft: string }> = {
  agent: {
    label: 'Zen Agent',
    hint: 'AI chat & workflows',
    solid: 'bg-text-secondary',
    soft: 'bg-text-secondary/15 text-text-secondary border-text-secondary/30',
  },
  file: {
    label: 'Files',
    hint: 'Editor tabs',
    solid: 'bg-emerald-500',
    soft: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  website: {
    label: 'Browser',
    hint: 'Web preview',
    solid: 'bg-sky-500',
    soft: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  },
  terminal: {
    label: 'Terminal',
    hint: 'Shell & processes',
    solid: 'bg-orange-500',
    soft: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  },
  emulator: {
    label: 'Emulator',
    hint: 'Device preview',
    solid: 'bg-pink-500',
    soft: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
  },
  agenttools: {
    label: 'CLI Agents',
    hint: 'Claude Code, OpenCode, Codex',
    solid: 'bg-text-secondary',
    soft: 'bg-text-secondary/15 text-text-secondary border-text-secondary/30',
  },

};

function layoutOf(rules: PanelRules) {
  const used = PANE_IDS.filter((p) => PANEL_TYPES.some((t) => rules[t] === p));
  const autoTypes = PANEL_TYPES.filter((t) => rules[t] === 'auto');
  const fallback = used.length === 0;
  const panes: PaneId[] = fallback ? ['tl'] : used;
  const typesIn = (pane: PaneId) =>
    fallback ? autoTypes : PANEL_TYPES.filter((t) => rules[t] === pane);
  return { panes, rects: computeRects(panes, DEFAULT_SIZES), autoTypes, fallback, typesIn };
}

function paneName(rect: PaneRect): string {
  const fullW = rect.width >= 100;
  const fullH = rect.height >= 100;
  if (fullW && fullH) return 'Full area';
  if (fullW) return rect.top === 0 ? 'Top' : 'Bottom';
  if (fullH) return rect.left === 0 ? 'Left' : 'Right';
  return `${rect.top === 0 ? 'Top' : 'Bottom'} ${rect.left === 0 ? 'left' : 'right'}`;
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-9 h-5 rounded-md transition-colors cursor-pointer shrink-0',
        checked ? 'bg-primary' : 'bg-text-secondary/30',
      )}
    >
      <span
        className={cn(
          'absolute top-[3px] left-[3px] w-3.5 h-3.5 rounded-[4px] bg-white shadow transition-transform duration-200',
          checked && 'translate-x-4',
        )}
      />
    </button>
  );
}

function PanePicker({
  value,
  solid,
  onChange,
}: {
  value: PaneRule;
  solid: string;
  onChange: (rule: PaneRule) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="grid grid-cols-2 gap-[3px] p-1 rounded-md bg-card-hover border border-border">
        {PANES.map((p) => (
          <button
            key={p.id}
            type="button"
            title={p.label}
            onClick={() => onChange(p.id)}
            className={cn(
              'w-[18px] h-3.5 rounded-[3px] transition-all cursor-pointer',
              value === p.id
                ? cn(solid, 'shadow-sm scale-110')
                : 'bg-text-secondary/20 hover:bg-text-secondary/45',
            )}
          />
        ))}
      </div>
    </div>
  );
}

function MiniMap({ rules }: { rules: PanelRules }) {
  const { panes, rects, typesIn } = layoutOf(rules);
  return (
    <div className="relative w-full h-[38px]">
      {panes.map((pane) => {
        const r = rects[pane];
        if (!r) return null;
        return (
          <div
            key={pane}
            className="absolute p-[1.5px]"
            style={{
              left: `${r.left}%`,
              top: `${r.top}%`,
              width: `${r.width}%`,
              height: `${r.height}%`,
            }}
          >
            <div className="h-full rounded bg-card-hover flex flex-wrap content-center items-center justify-center gap-0.5 p-0.5">
              {typesIn(pane).map((t) => (
                <span key={t} className={cn('w-2 h-2 rounded-sm', TYPE_STYLE[t].solid)} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LiveMap({ rules, dimmed }: { rules: PanelRules; dimmed: boolean }) {
  const { panes, rects, autoTypes, fallback, typesIn } = layoutOf(rules);
  return (
    <div className={cn('flex flex-col gap-2 transition-opacity', dimmed && 'opacity-40')}>
      <div className="relative w-full aspect-video rounded-xl border border-border bg-gradient-to-br from-card-hover/60 to-transparent">
        <div className="absolute inset-1">
          {panes.map((pane) => {
            const r = rects[pane];
            if (!r) return null;
            return (
              <div
                key={pane}
                className="absolute p-[3px] transition-all duration-300"
                style={{
                  left: `${r.left}%`,
                  top: `${r.top}%`,
                  width: `${r.width}%`,
                  height: `${r.height}%`,
                }}
              >
                <div className="h-full rounded-lg border border-border bg-card-background p-2 flex flex-col gap-1.5 overflow-hidden">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-text-secondary/70">
                    {paneName(r)}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {typesIn(pane).map((t) => (
                      <span
                        key={t}
                        className={cn(
                          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium',
                          TYPE_STYLE[t].soft,
                        )}
                      >
                        {getPanelMeta(t, 'w-3 h-3').icon}
                        {TYPE_STYLE[t].label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-[10px] leading-relaxed text-text-secondary">
        {fallback
          ? 'Single pane. Every tab opens in the focused pane until you split the workspace.'
          : autoTypes.length > 0
            ? `Auto (${autoTypes.map((t) => TYPE_STYLE[t].label).join(', ')}) open in the focused pane.`
            : 'Empty areas collapse automatically, so the grid only shows panes that are in use.'}
      </p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-2.5">
      {children}
    </h3>
  );
}

export const SmartLayoutSection = memo(function SmartLayoutSection() {
  const smartLayout = useWorkspaceSettings((s) => s.smartLayout);
  const rules = useWorkspaceSettings((s) => s.rules);
  const reusePreviewTab = useWorkspaceSettings((s) => s.reusePreviewTab);
  const setSmartLayout = useWorkspaceSettings((s) => s.setSmartLayout);
  const setRule = useWorkspaceSettings((s) => s.setRule);
  const applyPreset = useWorkspaceSettings((s) => s.applyPreset);
  const setReusePreviewTab = useWorkspaceSettings((s) => s.setReusePreviewTab);


  const activePreset = LAYOUT_PRESETS.find((p) =>
    PANEL_TYPES.every((t) => p.rules[t] === rules[t]),
  )?.id;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-card-background">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-text-primary">Enable smart layout</p>
          <p className="text-[10px] text-text-secondary mt-0.5">
            New tabs open in the pane you choose for their type, so your workspace stays organized
            without dragging.
          </p>
        </div>
        <Switch checked={smartLayout} onChange={setSmartLayout} />
      </div>

      <div
        className={cn(
          'flex flex-col gap-6 transition-opacity',
          !smartLayout && 'opacity-50 pointer-events-none',
        )}
      >
        <section>
          <SectionTitle>Presets</SectionTitle>
          <div className="grid grid-cols-4 gap-2.5">
            {LAYOUT_PRESETS.map((preset) => {
              const active = activePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.rules)}
                  title={preset.description}
                  className={cn(
                    'relative flex flex-col gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer',
                    active
                      ? 'border-primary/50 bg-primary/10 shadow-md shadow-primary/10'
                      : 'border-border bg-card-background hover:bg-card-hover hover:-translate-y-0.5',
                  )}
                >
                  <MiniMap rules={preset.rules} />
                  <span className="text-xs font-semibold text-text-primary">{preset.label}</span>
                  {active && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary text-white grid place-items-center">
                      <Check className="w-2.5 h-2.5" strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <SectionTitle>Live map</SectionTitle>
          <div className="relative flex items-center justify-center min-h-[320px] p-6 rounded-xl border border-border bg-card-background overflow-hidden">
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none text-text-secondary/25"
              style={{
                backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                backgroundSize: '14px 14px',
              }}
            />
            <div className="relative w-full max-w-[480px]">
              <LiveMap rules={rules} dimmed={!smartLayout} />
            </div>
          </div>
        </section>

        <section>
          <div>
            <SectionTitle>Placement rules</SectionTitle>
            <div className="flex flex-col gap-1.5">
              {PANEL_TYPES.map((type) => {
                const style = TYPE_STYLE[type];
                return (
                  <div
                    key={type}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-card-background"
                  >
                    <span
                      className={cn(
                        'w-7 h-7 rounded-md border grid place-items-center shrink-0',
                        style.soft,
                      )}
                    >
                      {getPanelMeta(type, 'w-3.5 h-3.5').icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text-primary">{style.label}</p>
                      <p className="text-[10px] text-text-secondary truncate">{style.hint}</p>
                    </div>
                    <PanePicker
                      value={rules[type]}
                      solid={style.solid}
                      onChange={(rule) => setRule(type, rule)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      <section>
        <SectionTitle>Behavior</SectionTitle>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-card-background">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-text-primary">Reuse preview tab</p>
            <p className="text-[10px] text-text-secondary">
              Opening a file replaces the unmodified preview tab instead of adding a new one.
            </p>
          </div>
          <Switch checked={reusePreviewTab} onChange={setReusePreviewTab} />
        </div>
      </section>


    </div>
  );
});