import { useEffect } from "react";
import { useCodeStore } from "./hooks/useCodeStore";
import { ProjectTabBar } from "./components/ProjectTabBar";
import { ProjectManagerModal } from "./components/ProjectTabBar/ProjectManagerModal";
import { ServiceTabBar } from "./components/ServiceTabBar";
import { ContentPanel } from "./components/ContentPanel";
import { ActivityPanel } from "./components/ActivityPanel";
import { BottomPanel } from "./components/BottomPanel";
// import { CODE_SHORTCUTS } from "./shortcuts"; // TODO: Use for centralized shortcut management

export function Code() {
  const { isProjectManagerOpen, setProjectManagerOpen } = useCodeStore();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+O (shortcut id: 'open-project-manager')
      if (e.ctrlKey && e.key === 'o') {
        e.preventDefault();
        setProjectManagerOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setProjectManagerOpen]);

  return (
    <div className="flex flex-col h-full w-full bg-background">
      <ProjectTabBar onOpenManager={() => setProjectManagerOpen(true)} />
      <ServiceTabBar />
      <div className="flex flex-1 min-h-0">
        <ActivityPanel />
        <div className="flex-1 flex flex-col min-w-0">
          <ContentPanel />
          <BottomPanel />
        </div>
      </div>
      <ProjectManagerModal
        isOpen={isProjectManagerOpen}
        onClose={() => setProjectManagerOpen(false)}
      />
    </div>
  );
}

export default Code;