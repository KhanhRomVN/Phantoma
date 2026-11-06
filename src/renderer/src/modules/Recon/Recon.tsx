import { useState, useEffect, useCallback, useMemo } from 'react';
import { useReconStore } from './stores/useReconStore';
import { ReconTargetHandlers } from './handler/ReconTargetHandlers';
import { useAgentFeature } from '../../components/RightPanel/Zen/context/FeatureContext';

// ── Components
import LeftPanel from './components/LeftPanel';
import ContentPanel from './components/ContentPanel';
import { ReconFsContext } from './components/ui/FileManager/ReconFsContext';
import { buildFileSystem } from './components/ui/FileManager/fileStore';
import type { RawFsEntry } from './components/ui/FileManager/fileStore';
import { ReconSettingsProvider } from './components/Settings';
import { SettingsView } from './components/SettingsView';

export interface ReconProps {
  activeAppId?: string;
}

export function Recon({}: ReconProps) {
  const { setReconState } = useAgentFeature();
  const targets = useReconStore((s) => s.targets);
  const activeTargetId = useReconStore((s) => s.activeTargetId);
  const setActiveTarget = useReconStore((s) => s.setActiveTarget);
  const [targetFiles, setTargetFiles] = useState<Record<string, string>>({});
  const [targetFsEntries, setTargetFsEntries] = useState<RawFsEntry[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Nạp danh sách target từ ~/.phantoma/recon:{targetId}
  useEffect(() => {
    void ReconTargetHandlers.loadTargets();
  }, []);

  // Update Agent context
  useEffect(() => {
    setReconState({
      activeTargetId,
      targets: targets.map((t) => ({ id: t.id, email: t.title, isActive: t.isActive })),
    });
  }, [activeTargetId, targets, setReconState]);

  // Nạp file .recon + thư mục files/ của target đang chọn
  useEffect(() => {
    if (!activeTargetId) {
      setTargetFiles({});
      setTargetFsEntries([]);
      return;
    }
    let cancelled = false;
    void Promise.all([
      ReconTargetHandlers.readTargetFiles(activeTargetId),
      ReconTargetHandlers.readTargetFs(activeTargetId),
    ]).then(([filesResult, fsResult]) => {
      if (cancelled) return;
      if (filesResult.success) setTargetFiles(filesResult.data ?? {});
      if (fsResult.success) setTargetFsEntries(fsResult.data ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [activeTargetId]);

  const targetFs = useMemo(() => buildFileSystem(targetFsEntries), [targetFsEntries]);

  const handleLaunchBrowser = useCallback(async (targetId: string) => {
    const result = await ReconTargetHandlers.launchBrowser(targetId);
    if (!result.success) {
      console.error('Failed to launch browser:', result.error);
    }
  }, []);

  const handleCloseBrowser = useCallback(async (targetId: string) => {
    const result = await ReconTargetHandlers.closeBrowser(targetId);
    if (!result.success) {
      console.error('Failed to close browser:', result.error);
    }
  }, []);

  // Nút `+`: tạo card mới với template sẵn có, chọn luôn target vừa tạo
  const handleAddTarget = useCallback(async () => {
    const result = await ReconTargetHandlers.createTarget();
    if (!result.success || !result.data) {
      console.error('Failed to create target:', result.error);
      return;
    }
    setActiveTarget(result.data.id);
  }, [setActiveTarget]);

  const activeTarget = targets.find((t) => t.id === activeTargetId) ?? null;

  return (
    <ReconSettingsProvider>
      <ReconFsContext.Provider value={targetFs}>
      <div className="flex h-full w-full overflow-hidden bg-background">
        {/* Left Panel - Target List */}
        <LeftPanel
          targets={targets}
          activeTargetId={activeTargetId}
          onTargetSelect={setActiveTarget}
          onLaunchBrowser={handleLaunchBrowser}
          onCloseBrowser={handleCloseBrowser}
          onAddTargetClick={handleAddTarget}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden bg-background relative">
          {isSettingsOpen ? (
            <SettingsView onClose={() => setIsSettingsOpen(false)} />
          ) : activeTarget ? (
            <ContentPanel
              key={activeTarget.id}
              files={targetFiles}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-text-secondary">
              <div className="text-center space-y-2">
                <p className="text-sm opacity-60">Chọn một target hoặc thêm mới để bắt đầu.</p>
              </div>
            </div>
          )}
        </div>
      </div>
      </ReconFsContext.Provider>
    </ReconSettingsProvider>
  );
}

export default Recon;