import { useState, useEffect, useCallback } from 'react';
import { ReconController, ReconTarget } from '../../controller/ReconController';
import { useAgentFeature } from '../../components/RightPanel/Agent/context/FeatureContext';

// ── Components 
import LeftPanel from './components/LeftPanel';
import ContentPanel from './components/ContentPanel';
import AddTargetModal from './components/AddTargetModal';

export interface ReconProps {
  activeAppId?: string;
}

export function Recon({}: ReconProps) {
  const { setReconState } = useAgentFeature();
  const [targets, setTargets] = useState<ReconTarget[]>([]);
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Initialize Controller Subscriptions
  useEffect(() => {
    const controller = ReconController.getInstance();

    // Subscribe to updates
    const unsubTargets = controller.onTargetsUpdate((updatedTargets) => {
      setTargets(updatedTargets);
    });

    const unsubActive = controller.onActiveTargetUpdate((targetId) => {
      setActiveTargetId(targetId);
    });

    // Initial load (empty or fetch from storage if implemented later)
    // For now, we start with an empty list unless there's persisted data
    
    return () => {
      unsubTargets?.();
      unsubActive?.();
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
    if (targetId === 'mock-report-nva') {
      setActiveTargetId('mock-report-nva');
      return;
    }
    const controller = ReconController.getInstance();
    controller.setActiveTarget(targetId);
  }, []);

  // Handle mock report selection
  const handleSelectMock = useCallback(() => {
    setActiveTargetId('mock-report-nva');
  }, []);

  // Handle launch browser
  const handleLaunchBrowser = useCallback(async (targetId: string) => {
    const controller = ReconController.getInstance();
    const result = await controller.launchBrowser(targetId);

    if (!result.success) {
      console.error('Failed to launch browser:', result.error);
      // TODO: Show error toast
    }
  }, []);

  // Handle close browser
  const handleCloseBrowser = useCallback(async (targetId: string) => {
    const controller = ReconController.getInstance();
    const result = await controller.closeBrowser(targetId);

    if (!result.success) {
      console.error('Failed to close browser:', result.error);
      // TODO: Show error toast
    }
  }, []);

  // Handle adding a new target via Modal
  const handleAddTarget = useCallback(({ identifier, type }: { identifier: string; type: string }) => {
    const controller = ReconController.getInstance();
    
    // Create a new target object
    const newTarget: ReconTarget = {
      id: `target-${Date.now()}`,
      email: identifier, // Using email field as generic identifier for now
      // Tạm map type của modal (email/domain/username) sang type mới
      type: type === 'domain' ? 'domain' : 'person',
      createdAt: new Date().toISOString(),
      isActive: false,
    };

    controller.addTarget(newTarget);
    
    // Automatically select the newly added target
    setActiveTargetId(newTarget.id);
    setIsAddModalOpen(false);
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
        onSelectMock={handleSelectMock}
        onAddTargetClick={() => setIsAddModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden bg-background relative">
        {activeTargetId === 'mock-report-nva' ? (
          <ContentPanel />
        ) : activeTargetId ? (
           <div className="flex-1 flex items-center justify-center text-text-secondary">
            <div className="text-center space-y-4">
              <div className="text-lg">
                Target:{' '}
                <span className="text-text-primary font-medium">
                  {targets.find((t) => t.id === activeTargetId)?.email}
                </span>
              </div>
              <div className="text-sm opacity-60">Use the Agent panel to control the browser →</div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-secondary">
             <div className="text-center space-y-2">
               <p className="text-sm opacity-60">Chọn một target hoặc thêm mới để bắt đầu.</p>
             </div>
          </div>
        )}

        {/* Overlay Modal */}
        <AddTargetModal 
          isOpen={isAddModalOpen} 
          onClose={() => setIsAddModalOpen(false)} 
          onSubmit={handleAddTarget}
        />
      </div>
    </div>
  );
}

export default Recon;