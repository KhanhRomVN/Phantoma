/**
 * ------------------------------------------------------------------
 * AgentPanel
 * ------------------------------------------------------------------
 * Panel chính của Agent, quản lý chuyển đổi giữa Home và Chat view.
 * Sử dụng keep-alive để bảo toàn state khi chuyển giữa các target/project.
 *
 * Main features:
 * - Keep-alive: mỗi target/project có một AgentView riêng, giữ mounted
 * - handleHomeSendMessage()  : Nhận message từ Home, tạo ChatSession mới
 * - handleBack()             : Quay về Home từ Chat, giữ nội dung dang dở
 * - handleLoadConversation() : Load conversation từ history vào Chat view
 * ------------------------------------------------------------------
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

// ── Components ──
import HomePanel from './feature/Home';
import ChatPanel from './feature/Chat';
import AgentOverlay from './components/AgentOverlay';
import AccountPanel from './feature/Account';
import HistoryPanel from './feature/History';
import MarketplacePanel from './feature/Marketplace';
import SettingsPanel from './feature/Setting';

// CONTEXT
import { ProjectProvider } from './context/ProjectContext';
import { useAgentFeature } from './context/FeatureContext';
import { useDesignStore } from '@renderer/modules/Code/hooks/useDesignStore';

// ── Types ──
import { ChatSession } from './feature/Chat/types/chat';

// ── Utils ── (icons)
import { MousePointer } from 'lucide-react';

// ─── Page switcher ─────────────────────────────────────────────────────────

type SubView = 'history' | 'marketplace' | 'account' | 'setting' | null;


// ─── AgentView (keep-alive unit) ───────────────────────────────────────────

interface AgentViewProps {
  feature: string;
  isVisible: boolean;
  initialConversationId?: string | null;
  onConversationChange?: (conversationId: string | null) => void;
  onTitleChange?: (title: string | null) => void;
}

/** Một instance Agent cho một target/project cụ thể — luôn mounted, ẩn/hiện bằng CSS */
function AgentView({
  feature,
  isVisible,
  initialConversationId,
  onConversationChange,
  onTitleChange,
}: AgentViewProps) {
  const [currentChat, setCurrentChat] = useState<ChatSession | null>(() =>
    initialConversationId
      ? {
          sessionId: Date.now(),
          folderPath: (window as any).__zenWorkspaceFolderPath || null,
          conversationId: initialConversationId,
          canAccept: true,
        }
      : null,
  );
  const [initialMessageData, setInitialMessageData] = useState<{
    content: string;
    files: any[];
    model: any;
    account: any;
    conversationOverrides?: {
      useSkillEnabled?: boolean;
      memoryEnabled?: boolean;
      toolFormat?: 'xml' | 'json';
    };
  } | null>(null);
  const [homeInitialValue, setHomeInitialValue] = useState('');
  const [subView, setSubView] = useState<SubView>(null);

  const onConversationChangeRef = useRef(onConversationChange);
  onConversationChangeRef.current = onConversationChange;
  const isVisibleRef = useRef(isVisible);
  isVisibleRef.current = isVisible;
  const chatConversationId = currentChat?.conversationId || null;

  const onTitleChangeRef = useRef(onTitleChange);
  onTitleChangeRef.current = onTitleChange;

  // Về Home (không có chat) → xóa title đang hiển thị ở header RightPanel
  useEffect(() => {
    if (isVisible && !currentChat) onTitleChangeRef.current?.(null);
  }, [currentChat, isVisible]);

  const handleChatTitleChange = useCallback((title: string) => {
    if (isVisibleRef.current) onTitleChangeRef.current?.(title);
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    onConversationChangeRef.current?.(chatConversationId);
  }, [chatConversationId, isVisible]);

  const handleChatConversationChange = useCallback((conversationId: string) => {
    if (isVisibleRef.current) onConversationChangeRef.current?.(conversationId);
  }, []);

  const handleHomeSendMessage = useCallback(
    (
      content: string,
      files: any[],
      model: any,
      account: any,
      conversationOverrides?: {
        useSkillEnabled?: boolean;
        memoryEnabled?: boolean;
        toolFormat?: 'xml' | 'json';
      },
    ) => {
      setInitialMessageData({ content, files, model, account, conversationOverrides });
      const newSession: ChatSession = {
        sessionId: Date.now(),
        folderPath: (window as any).__zenWorkspaceFolderPath || null,
        conversationId: '',
        canAccept: true,
      };
      setCurrentChat(newSession);
      setHomeInitialValue('');
    },
    [],
  );

  const handleBack = useCallback((contentToReturn?: string) => {
    setCurrentChat(null);
    setHomeInitialValue(
      typeof contentToReturn === 'string' && contentToReturn.trim() ? contentToReturn : '',
    );
  }, []);

  const handleLoadConversation = useCallback(
    (conversationId: string, sessionId: number, folderPath: string | null) => {
      // Clear any pending initial message data so each history load starts fresh
      setInitialMessageData(null);
      // Always generate a new sessionId to ensure useEffect in useConversationRestore triggers
      const newSession: ChatSession = {
        sessionId: Date.now(),
        folderPath: folderPath || (window as any).__zenWorkspaceFolderPath || null,
        conversationId,
        canAccept: true,
      };
      setCurrentChat(newSession);
      setSubView(null);
    },
    [],
  );


  // Listen for reset to home event from RightPanel Plus button
  useEffect(() => {
    const handleResetToHome = () => {
      if (isVisible) {
        handleBack();
      }
    };

    window.addEventListener('agent:resetToHome', handleResetToHome);
    return () => {
      window.removeEventListener('agent:resetToHome', handleResetToHome);
    };
  }, [isVisible, handleBack]);

  return (
    <div
      className="flex-1 overflow-hidden bg-background flex flex-col"
      style={{ display: isVisible ? 'flex' : 'none' }}
    >

      <div className="relative flex-1 min-h-0 overflow-hidden flex flex-col">
        {currentChat ? (
          <ChatPanel
            key={currentChat.sessionId} // Force remount when sessionId changes
            currentChat={currentChat}
            onBack={handleBack}
            feature={feature}
            onLoadConversation={handleLoadConversation}
            initialMessageData={initialMessageData}
            onClearInitialData={() => setInitialMessageData(null)}
            onConversationChange={handleChatConversationChange}
            onTitleChange={handleChatTitleChange}
            onOpenSubView={setSubView}
          />
        ) : (
          <HomePanel
            onSendMessage={handleHomeSendMessage}
            onLoadConversation={handleLoadConversation}
            initialValue={homeInitialValue}
            onOpenSubView={setSubView}
          />
        )}
        {subView === 'history' && (
          <HistoryPanel
            isOpen={true}
            onClose={() => setSubView(null)}
            onLoadConversation={handleLoadConversation}
            onNavigate={setSubView}
          />
        )}
        {subView === 'marketplace' && (
          <MarketplacePanel isOpen={true} onClose={() => setSubView(null)} onNavigate={setSubView} />
        )}
        {subView === 'account' && (
          <AccountPanel isOpen={true} onClose={() => setSubView(null)} onNavigate={setSubView} />
        )}
        {subView === 'setting' && (
          <SettingsPanel isOpen={true} onClose={() => setSubView(null)} onNavigate={setSubView} />
        )}
      </div>
    </div>
  );
}

// ─── AgentPanel ────────────────────────────────────────────────────────────

interface AgentPanelProps {
  initialConversationId?: string | null;
  onConversationChange?: (conversationId: string | null) => void;
  /** Title conversation đang hiển thị (null khi ở Home) — dùng cho tab 'Zen|<title>' ở CodeAgent. */
  onTitleChange?: (title: string | null) => void;
}

export function AgentPanel({

  initialConversationId,
  onConversationChange,
  onTitleChange,
}: AgentPanelProps) {
  const firstViewKeyRef = useRef<string | null>(null);
  const { activeFeature, emulateState, codeState, reconState } = useAgentFeature();
  const { activeTargetId, targetStates } = emulateState;
  const { currentProjectId } = codeState;
  const { activeTargetId: reconActiveTargetId, targets: reconTargets } = reconState;
  const activeDesignId = useDesignStore((s) => s.activeDesignId);
  const currentTargetState = activeTargetId ? targetStates[activeTargetId] : null;
  const isTargetActive = currentTargetState?.isActive || false;
  const isReconTargetActive = reconActiveTargetId
    ? (reconTargets.find((t) => t.id === reconActiveTargetId)?.isActive ?? false)
    : false;

  // Tập hợp các view đã từng mở (keep-alive)
  const openedKeysRef = useRef<Set<string>>(new Set());
  const [, forceUpdate] = useState(0);

  // Xác định active key dựa trên feature
  const activeKey = useMemo(() => {
    let key: string | null = null;

    if (activeFeature === 'emulate' && activeTargetId && isTargetActive) {
      key = `emulate:${activeTargetId}`;
      // Set global context for conversation service
      (window as any).__activeFeature = 'emulate';
      (window as any).__activeTargetId = activeTargetId;
    } else if (activeFeature === 'code' && currentProjectId) {
      key = `code:${currentProjectId}`;
      // Set global context for conversation service
      (window as any).__activeFeature = 'code';
      (window as any).__currentProjectId = currentProjectId;
    } else if (activeFeature === 'recon' && reconActiveTargetId) {
      key = `recon:${reconActiveTargetId}`;
      // Set global context for conversation service
      (window as any).__activeFeature = 'recon';
      (window as any).__activeTargetId = reconActiveTargetId;
    } else if (activeFeature === 'design' && activeDesignId) {
      key = `design:${activeDesignId}`;
      (window as any).__activeFeature = 'design';
      (window as any).__activeDesignId = activeDesignId;
    }
    return key;
  }, [
    activeFeature,
    activeTargetId,
    isTargetActive,
    currentProjectId,
    reconActiveTargetId,
    activeDesignId,
  ]);

  useEffect(() => {
    console.log('[DEBUG][AgentPanel] state', {
      activeFeature,
      currentProjectId,
      activeKey,
      openedKeys: Array.from(openedKeysRef.current),
    });
  }, [activeFeature, currentProjectId, activeKey]);

  // Khi activeKey thay đổi, thêm vào openedKeys
  useEffect(() => {
    if (activeKey && !openedKeysRef.current.has(activeKey)) {
      openedKeysRef.current.add(activeKey);
      forceUpdate((n) => n + 1);
    }
  }, [activeKey]);

  // Cleanup keys không còn hợp lệ (target/project đã bị xóa)
  useEffect(() => {
    const keys = Array.from(openedKeysRef.current);
    let changed = false;
    for (const key of keys) {
      if (key.startsWith('emulate:')) {
        const targetId = key.slice('emulate:'.length);
        if (!targetStates[targetId]) {
          openedKeysRef.current.delete(key);
          changed = true;
        }
      }
      if (key.startsWith('recon:')) {
        const targetId = key.slice('recon:'.length);
        if (!reconTargets.find((t) => t.id === targetId)) {
          openedKeysRef.current.delete(key);
          changed = true;
        }
      }
      // code keys được giữ vĩnh viễn — project có thể bị xóa nhưng state vẫn trong memory
      // upgrade path: cleanup code keys khi project bị remove khỏi useCodeStore
    }
    if (changed) {
      forceUpdate((n) => n + 1);
    }
  }, [targetStates, reconTargets]);

  // Overlay checks
  const showGenericOverlay =
    activeFeature !== 'emulate' &&
    activeFeature !== 'code' &&
    activeFeature !== 'recon' &&
    activeFeature !== 'design';
  const showDesignOverlay = activeFeature === 'design' && !activeDesignId;
  const showEmulateOverlay = activeFeature === 'emulate' && (!activeTargetId || !isTargetActive);
  const showReconOverlay = activeFeature === 'recon' && !reconActiveTargetId;

  const renderEmulateOverlay = () => {
    const hasTarget = !!activeTargetId;
    return (
      <AgentOverlay
        title={hasTarget ? 'Start the target session' : 'Select a target to start'}
        description={
          hasTarget
            ? 'Click Start on the selected target to begin a CDP or MITM session and use the Agent'
            : 'Please select a target and start a CDP or MITM session to use the Agent'
        }
        icon={<MousePointer className="w-8 h-8 text-primary opacity-80" />}
      />
    );
  };

  return (
    <ProjectProvider>
      <div className="flex flex-col bg-background rounded-xl overflow-hidden shadow-2xl h-full font-sans text-text-primary relative">
        {/* Overlay cho feature không hỗ trợ */}
        {showGenericOverlay && <AgentOverlay featureName={activeFeature || undefined} />}

        {/* Overlay cho emulate khi chưa có target */}
        {showEmulateOverlay && renderEmulateOverlay()}

        {/* Overlay cho recon khi chưa có target */}
        {showReconOverlay && (
          <AgentOverlay
            title="Select a target to start"
            description="Please select a target from the left panel to use the Agent"
            icon={<MousePointer className="w-8 h-8 text-primary opacity-80" />}
          />
        )}

        {showDesignOverlay && (
          <AgentOverlay
            title="Open a design to start"
            description="Please open or create a design to use the Design Agent"
            icon={<MousePointer className="w-8 h-8 text-primary opacity-80" />}
          />
        )}

        {/* Keep-alive views — tất cả đều mounted, chỉ activeKey hiển thị */}
        {!showGenericOverlay && !showEmulateOverlay && (
          <div className="flex-1 overflow-hidden bg-background flex flex-col">
            {(() => {
              const keys = Array.from(openedKeysRef.current);
              return keys.map((key) => {
                const feature = key.startsWith('emulate:')
                  ? 'emulate'
                  : key.startsWith('recon:')
                    ? 'recon'
                    : key.startsWith('design:')
                      ? 'design'
                      : 'code';
                const isVisible = key === activeKey;
                if (firstViewKeyRef.current === null) firstViewKeyRef.current = key;
                return (
                  <AgentView
                    key={key}
                    feature={feature}
                    isVisible={isVisible}
                    initialConversationId={
                      key === firstViewKeyRef.current ? initialConversationId : undefined
                    }
                    onConversationChange={onConversationChange}
                    onTitleChange={onTitleChange}
                  />
                );
              });
            })()}
          </div>
        )}
      </div>
    </ProjectProvider>
  );
}
