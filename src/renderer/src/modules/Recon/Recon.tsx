import { useState, useEffect, useCallback } from 'react';
import { ReconController, ReconTarget } from '../../controller/ReconController';
import { useAgentFeature } from '../../components/RightPanel/Agent/context/FeatureContext';

// Components
import LeftPanel from './components/LeftPanel';
import { logger } from '@renderer/utils/logger';

export interface ReconProps {
  activeAppId?: string;
}

export function Recon({}: ReconProps) {
  const { setReconState } = useAgentFeature();
  const [targets, setTargets] = useState<ReconTarget[]>([]);
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null);

  // Initialize with default target
  useEffect(() => {
    const controller = ReconController.getInstance();

    // Create default target
    const defaultTarget: ReconTarget = {
      id: 'target-1',
      email: 'khanhromvn@gmail.com',
      createdAt: new Date().toISOString(),
      isActive: false,
    };

    controller.addTarget(defaultTarget);
    controller.setActiveTarget(defaultTarget.id);

    // Subscribe to updates
    controller.onTargetsUpdate((updatedTargets) => {
      setTargets(updatedTargets);
    });

    controller.onActiveTargetUpdate((targetId) => {
      setActiveTargetId(targetId);
    });

    // Initial load
    setTargets([defaultTarget]);
    setActiveTargetId(defaultTarget.id);

    return () => {
      // Cleanup subscriptions
      controller.onTargetsUpdate(() => {});
      controller.onActiveTargetUpdate(() => {});
    };
  }, []);

  // Update Agent context
  useEffect(() => {
    setReconState({
      activeTargetId,
      targets,
    });
  }, [activeTargetId, targets, setReconState]);

  // Handle target selection
  const handleTargetSelect = useCallback((targetId: string) => {
    const controller = ReconController.getInstance();
    controller.setActiveTarget(targetId);
  }, []);

  // Handle launch browser
  const handleLaunchBrowser = useCallback(async (targetId: string) => {
    const controller = ReconController.getInstance();
    const result = await controller.launchBrowser(targetId);

    if (!result.success) {
      logger.error('Failed to launch browser:', result.error);
      // TODO: Show error toast
    }
  }, []);

  // Handle close browser
  const handleCloseBrowser = useCallback(async (targetId: string) => {
    const controller = ReconController.getInstance();
    const result = await controller.closeBrowser(targetId);

    if (!result.success) {
      logger.error('Failed to close browser:', result.error);
      // TODO: Show error toast
    }
  }, []);

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      {/* Left Panel - Target List */}
      <LeftPanel
        targets={targets}
        activeTargetId={activeTargetId}
        onTargetSelect={handleTargetSelect}
        onLaunchBrowser={handleLaunchBrowser}
        onCloseBrowser={handleCloseBrowser}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex items-center justify-center text-text-secondary">
          {activeTargetId ? (
            <div className="text-center space-y-4">
              <div className="text-lg">
                Target:{' '}
                <span className="text-text-primary font-medium">
                  {targets.find((t) => t.id === activeTargetId)?.email}
                </span>
              </div>
              <div className="text-sm opacity-60">Use the Agent panel to control the browser →</div>
            </div>
          ) : (
            <div className="text-sm opacity-60">Select a target to begin</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Recon;
