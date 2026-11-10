import { useState } from 'react';
import { SmartLayoutSection } from './Layout';
import { KeybindingsSection } from './Keybindings';

const OPTIONS = [
  'General',
  'Appearance',
  'Editor',
  'Terminal',
  'Keybindings',
  'Git',
  'Debug',
  'Extensions',
];

type SettingSection = 'smart-layout' | 'keybindings' | string;

const optionClass =
  'px-2.5 py-2 rounded-lg text-left text-xs font-medium cursor-pointer transition-colors';

export function SettingsView() {
  const [activeSection, setActiveSection] = useState<SettingSection>('smart-layout');

  return (
    <div className="flex-1 flex min-h-0 bg-background">
      <aside className="w-[260px] shrink-0 border-r border-border p-3 flex flex-col gap-1 overflow-y-auto">
        <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-secondary/70">
          Workspace
        </p>
        <button
          type="button"
          onClick={() => setActiveSection('smart-layout')}
          className={`${optionClass} ${
            activeSection === 'smart-layout'
              ? 'text-text-primary bg-primary/12 border border-primary/25'
              : 'text-text-secondary hover:bg-card-hover hover:text-text-primary'
          }`}
        >
          Layout
        </button>

        <p className="px-2 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-secondary/70">
          More
        </p>
        {OPTIONS.map((name) => {
          const sectionId = name.toLowerCase();
          return (
            <button
              key={name}
              type="button"
              onClick={() => setActiveSection(sectionId)}
              className={`${optionClass} ${
                activeSection === sectionId
                  ? 'text-text-primary bg-primary/12 border border-primary/25'
                  : 'text-text-secondary hover:bg-card-hover hover:text-text-primary'
              }`}
            >
              {name}
            </button>
          );
        })}
      </aside>

      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-[880px] mx-auto px-8 py-7 flex flex-col gap-6">
          {activeSection === 'smart-layout' && (
            <>
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Layout</h2>
                <p className="text-xs text-text-secondary mt-1">
                  Decide which area of the workspace each kind of tab belongs to.
                </p>
              </div>
              <SmartLayoutSection />
            </>
          )}

          {activeSection === 'keybindings' && (
            <>
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Keyboard Shortcuts</h2>
                <p className="text-xs text-text-secondary mt-1">
                  View all available keyboard shortcuts for quick navigation and actions.
                </p>
              </div>
              <KeybindingsSection />
            </>
          )}

          {!['smart-layout', 'keybindings'].includes(activeSection) && (
            <div className="flex items-center justify-center h-full text-text-secondary text-sm">
              This section is coming soon.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsView;