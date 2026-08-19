/**
 * AgentPanel — panel chính của Agent, quản lý chuyển đổi giữa Home và Chat view.
 *
 *    Keep-alive: mỗi target/project có một AgentView riêng, được giữ mounted
 *    nhưng ẩn/hiện bằng CSS. Khi chuyển qua lại, toàn bộ state (chat, messages,
 *    streaming, tools) được bảo toàn.
 *
 *    handleHomeSendMessage()   : Nhận message từ Home, tạo ChatSession mới.
 *    handleBack()              : Quay về Home từ Chat, giữ lại nội dung dang dở.
 *    handleLoadConversation()  : Load conversation từ history vào Chat view.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { logger } from '@renderer/utils/logger';

// Components
import HomePanel from './feature/Home';
import ChatPanel from './feature/Chat';
import AgentOverlay from './components/AgentOverlay';

// CONTEXT
import { ProjectProvider } from './context/ProjectContext';
import { useAgentFeature } from './context/FeatureContext';

// Types
import { ChatSession } from './feature/Chat/types/chat';

// UtilsS (icons)
import { MousePointer } from 'lucide-react';

// ─── AgentView (keep-alive unit) ───────────────────────────────────────────

interface AgentViewProps {
  feature: string;
  isVisible: boolean;
}

/** Một instance Agent cho một target/project cụ thể — luôn mounted, ẩn/hiện bằng CSS */
function AgentView({ feature, isVisible }: AgentViewProps) {
  const [currentChat, setCurrentChat] = useState<ChatSession | null>(null);
  const [initialMessageData, setInitialMessageData] = useState<{
    content: string;
    files: any[];
    model: any;
    account: any;
  } | null>(null);
  const [homeInitialValue, setHomeInitialValue] = useState('');

  // DEBUG: Log AgentView render
  console.log('[AgentView] 🎨 Rendering:', {
    feature,
    isVisible,
    hasCurrentChat: !!currentChat,
    sessionId: currentChat?.sessionId,
    conversationId: (currentChat as any)?.conversationId,
  });

  const handleHomeSendMessage = useCallback(
    (content: string, files: any[], model: any, account: any) => {
      setInitialMessageData({ content, files, model, account });
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
    console.log('[AgentView] 🔙 handleBack called:', { contentToReturn });
    setCurrentChat(null);
    setHomeInitialValue(
      typeof contentToReturn === 'string' && contentToReturn.trim() ? contentToReturn : '',
    );
    console.log('[AgentView] ✅ handleBack: currentChat set to null');
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
      console.log('[AgentView] 🔄 Setting currentChat:', newSession);
      setCurrentChat(newSession);
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
      {(() => {
        console.log('[AgentView] 🖼️ Rendering content:', {
          hasCurrentChat: !!currentChat,
          sessionId: currentChat?.sessionId,
          conversationId: (currentChat as any)?.conversationId,
          willRenderChatPanel: !!currentChat,
        });
        return null;
      })()}
      {currentChat ? (
        <ChatPanel
          key={currentChat.sessionId} // Force remount when sessionId changes
          currentChat={currentChat}
          onBack={handleBack}
          feature={feature}
          onLoadConversation={handleLoadConversation}
          initialMessageData={initialMessageData}
          onClearInitialData={() => setInitialMessageData(null)}
        />
      ) : (
        <HomePanel
          onSendMessage={handleHomeSendMessage}
          onLoadConversation={handleLoadConversation}
          initialValue={homeInitialValue}
        />
      )}
    </div>
  );
}

// ─── AgentPanel ────────────────────────────────────────────────────────────

export function AgentPanel() {
  const { activeFeature, emulateState, codeState, reconState } = useAgentFeature();
  const { activeTargetId, targetStates } = emulateState;
  const { currentProjectId } = codeState;
  const { activeTargetId: reconActiveTargetId, targets: reconTargets } = reconState;
  const currentTargetState = activeTargetId ? targetStates[activeTargetId] : null;
  const isTargetActive = currentTargetState?.isActive || false;
  const isReconTargetActive = reconActiveTargetId
    ? (reconTargets.find((t) => t.id === reconActiveTargetId)?.isActive ?? false)
    : false;

  // Tập hợp các view đã từng mở (keep-alive)
  const openedKeysRef = useRef<Set<string>>(new Set());
  const [, forceUpdate] = useState(0);

  console.log('[AgentPanel] 🎨 Rendering:', {
    activeFeature,
    activeTargetId,
    isTargetActive,
    openedKeysCount: openedKeysRef.current.size,
    openedKeys: Array.from(openedKeysRef.current),
  });

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
    }

    console.log('[AgentPanel] 🔑 Active key computed:', { key });
    return key;
  }, [activeFeature, activeTargetId, isTargetActive, currentProjectId, reconActiveTargetId]);

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
    activeFeature !== 'emulate' && activeFeature !== 'code' && activeFeature !== 'recon';
  const showEmulateOverlay = activeFeature === 'emulate' && (!activeTargetId || !isTargetActive);
  const showReconOverlay =
    activeFeature === 'recon' && (!reconActiveTargetId || !isReconTargetActive);

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
            title={reconActiveTargetId ? 'Start the target session' : 'Select a target to start'}
            description={
              reconActiveTargetId
                ? 'Click Start on the selected target to begin a browser session and use the Agent'
                : 'Please select a target and start a browser session to use the Agent'
            }
            icon={<MousePointer className="w-8 h-8 text-primary opacity-80" />}
          />
        )}

        {/* Keep-alive views — tất cả đều mounted, chỉ activeKey hiển thị */}
        {!showGenericOverlay && !showEmulateOverlay && (
          <div className="flex-1 overflow-hidden bg-background flex flex-col">
            {(() => {
              const keys = Array.from(openedKeysRef.current);
              console.log('[AgentPanel] 🖼️ Rendering AgentViews:', {
                keysCount: keys.length,
                keys,
                activeKey,
              });
              return keys.map((key) => {
                const feature = key.startsWith('emulate:')
                  ? 'emulate'
                  : key.startsWith('recon:')
                    ? 'recon'
                    : 'code';
                const isVisible = key === activeKey;
                console.log(`[AgentPanel] 📦 Rendering AgentView key="${key}":`, {
                  feature,
                  isVisible,
                });
                return <AgentView key={key} feature={feature} isVisible={isVisible} />;
              });
            })()}
          </div>
        )}
      </div>
    </ProjectProvider>
  );
}
