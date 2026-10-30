import { LayoutDashboard } from 'lucide-react';
import { SmartLayoutSection } from './SmartLayoutSection';

export function SettingsView() {
  return (
    <div className="flex-1 flex min-h-0 bg-background">
      <aside className="w-[220px] shrink-0 border-r border-border p-3 flex flex-col gap-1">
        <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-secondary/70">
          Workspace
        </p>
        <button
          type="button"
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-text-primary bg-primary/12 border border-primary/25 cursor-pointer"
        >
          <span className="w-6 h-6 rounded-md grid place-items-center text-white bg-gradient-to-br from-sky-500 to-primary">
            <LayoutDashboard className="w-3.5 h-3.5" />
          </span>
          Smart layout
        </button>
      </aside>

      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-[880px] mx-auto px-8 py-7 flex flex-col gap-6">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Smart layout</h2>
            <p className="text-xs text-text-secondary mt-1">
              Decide which area of the workspace each kind of tab belongs to.
            </p>
          </div>
          <SmartLayoutSection />
        </div>
      </div>
    </div>
  );
}

export default SettingsView;