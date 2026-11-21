import React, { useMemo, useState } from 'react';
import { cn } from '@renderer/utils/cn';
import { GROUPS, TABS, TAB_TONE, getTab } from './nav';
import type { SettingTabId } from './types';
import { Badge, TONE, TabToneContext } from './components/shared';
import type { Tone } from './components/shared';
import General from './components/General';
import Interface from './components/Interface';
import Notifications from './components/Notifications';
import Shortcuts from './components/Shortcuts';
import Backup from './components/Backup';
import Storage from './components/Storage';
import SqlViewer from './components/SqlViewer';
import Account from './components/Account';
import Security from './components/Security';
import About from './components/About';

const VIEWS: Record<SettingTabId, React.FC> = {
  general: General,
  interface: Interface,
  notifications: Notifications,
  shortcuts: Shortcuts,
  backup: Backup,
  storage: Storage,
  sql: SqlViewer,
  account: Account,
  security: Security,
  about: About,
};

const ACTIVE_ITEM: Record<Tone, string> = {
  primary: 'border-primary from-primary/20',
  success: 'border-success from-success/20',
  warn: 'border-warn from-warn/20',
  error: 'border-error from-error/20',
  info: 'border-info from-info/20',
  muted: 'border-text-secondary from-text-secondary/20',
  blue: 'border-blue from-blue/20',
  purple: 'border-purple from-purple/20',
  pink: 'border-pink from-pink/20',
  teal: 'border-teal from-teal/20',
  violet: 'border-violet from-violet/20',
  yellow: 'border-yellow from-yellow/20',
};

const ACTIVE_OUTLINE: Record<Tone, string> = {
  primary: 'outline-primary/70',
  success: 'outline-success/70',
  warn: 'outline-warn/70',
  error: 'outline-error/70',
  info: 'outline-info/70',
  muted: 'outline-text-secondary/70',
  blue: 'outline-blue/70',
  purple: 'outline-purple/70',
  pink: 'outline-pink/70',
  teal: 'outline-teal/70',
  violet: 'outline-violet/70',
  yellow: 'outline-yellow/70',
};

const Setting: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingTabId>('general');
  const imagesUri = ((window as any).__zenImagesUri as string | undefined) || '/images';

  const tab = getTab(activeTab);
  const View = VIEWS[activeTab];
  const ctx = useMemo(() => ({ tone: TAB_TONE[activeTab], icon: tab.icon }), [activeTab, tab.icon]);

  return (
    <div className="flex h-full w-full flex-1 overflow-hidden">
      <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-panel-background">
        <div className="flex items-center gap-3 px-4 pt-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-text-secondary/10">
            <img
              src={`${imagesUri}/phantoma-logo.png`}
              alt="Phantoma"
              draggable={false}
              className="h-7 w-7 object-contain"
            />
          </span>
          <div className="min-w-0">
            <h1 className="m-0 text-[14px] font-semibold leading-5 text-text-primary">Setting</h1>
            <p className="m-0 truncate text-[11px] leading-4 text-text-secondary">Phantoma preferences</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-3 pt-2">
          {GROUPS.map((g) => (
            <div key={g.id} className="mt-3">
              <div className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-secondary/70">
                {g.label}
              </div>
              {TABS.filter((t) => t.group === g.id).map((t) => {
                const Icon = t.icon;
                const tone = TAB_TONE[t.id];
                const active = t.id === activeTab;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    className={cn(
                      'relative mb-0.5 flex h-9 w-full items-center gap-2.5 rounded-r-lg border-l-2 px-2 text-[12.5px] outline-none transition-colors',
                      active
                        ? cn('bg-gradient-to-r to-transparent font-medium text-text-primary', ACTIVE_ITEM[tone])
                        : 'border-transparent text-text-secondary hover:bg-card-hover hover:text-text-primary',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
                        TONE[tone],
                        active && cn('outline outline-1 outline-dashed outline-offset-1', ACTIVE_OUTLINE[tone]),
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="truncate">{t.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 overflow-hidden">
        <TabToneContext.Provider value={ctx}>
          {tab.fullBleed ? (
            <div className="h-full">
              <View />
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-6">
              {tab.mock && (
                <div className="mx-auto mb-4 max-w-3xl">
                  <Badge tone="warn">Preview · mock data</Badge>
                </div>
              )}
              <View />
            </div>
          )}
        </TabToneContext.Provider>
      </main>
    </div>
  );
};

export default Setting;