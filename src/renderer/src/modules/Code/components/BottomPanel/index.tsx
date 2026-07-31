import { Terminal, AlertCircle, FileText, Bug } from "lucide-react";
import { useCodeStore } from "../../hooks/useCodeStore";
import { cn } from "../../../../shared/lib/utils";

const TABS = [
  { id: "terminal", icon: Terminal, label: "Terminal" },
  { id: "problems", icon: AlertCircle, label: "Problems" },
  { id: "output", icon: FileText, label: "Output" },
  { id: "debug", icon: Bug, label: "Debug Console" },
];

export function BottomPanel() {
  const { bottomPanelTab, setBottomPanelTab, isBottomPanelOpen } = useCodeStore();

  if (!isBottomPanelOpen) return null;

  return (
    <div className="flex flex-col h-52 bg-sidebar-background border-t border-divider flex-shrink-0">
      <div className="flex items-center px-2 border-b border-divider flex-shrink-0">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === bottomPanelTab;
          return (
            <button
              key={tab.id}
              onClick={() => setBottomPanelTab(tab.id as any)}
              className={cn(
                "flex items-center gap-1.5 px-3 h-8 text-xs font-medium whitespace-nowrap border-b-2 transition-colors",
                isActive
                  ? "text-text-primary border-primary"
                  : "text-text-secondary/60 border-transparent hover:text-text-secondary hover:border-divider"
              )}
            >
              <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
              {tab.label}
            </button>
          );
        })}
        <div className="flex-1" />
      </div>

      <div className="flex-1 overflow-auto p-3 font-mono text-xs text-text-secondary">
        {bottomPanelTab === "terminal" && (
          <div className="space-y-1">
            <div className="text-green">$ npm run dev</div>
            <div className="text-text-secondary/60">{'>'} acme-storefront@1.0.0 dev</div>
            <div className="text-text-secondary/60">{'>'} next dev</div>
            <div className="text-text-primary">▲ Next.js 15.1.2</div>
            <div className="text-text-secondary/60">- Local: http://localhost:3000</div>
            <div className="text-green">✓ Ready in 842ms</div>
          </div>
        )}
        {bottomPanelTab === "problems" && (
          <div className="space-y-1 text-text-secondary">
            <div className="text-error">✕ Property 'itemCount' does not exist on type 'CartState'</div>
            <div className="text-warn">⚠ 'useEffect' has a missing dependency: 'itemCount'</div>
            <div className="text-text-secondary/40">No other problems</div>
          </div>
        )}
        {bottomPanelTab === "output" && (
          <div className="space-y-1 text-text-secondary/60">
            <div>[12:04:18] Build watcher started</div>
            <div>[12:04:19] TypeScript: 0 errors, 7 warnings</div>
            <div className="text-green">[12:07:11] Build succeeded</div>
          </div>
        )}
        {bottomPanelTab === "debug" && (
          <div className="text-text-secondary/40">Debug console ready</div>
        )}
      </div>
    </div>
  );
}