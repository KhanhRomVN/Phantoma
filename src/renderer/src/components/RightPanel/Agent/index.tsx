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
    setCurrentChat(null);
    setHomeInitialValue(
      typeof contentToReturn === 'string' && contentToReturn.trim() ? contentToReturn : '',
    );
  }, []);

  const handleLoadConversation = useCallback(
    (conversationId: string, sessionId: number, folderPath: string | null) => {
      const newSession: ChatSession = {
        sessionId: sessionId || Date.now(),
        folderPath: folderPath || (window as any).__zenWorkspaceFolderPath || null,
        conversationId,
        canAccept: true,
      };
      setCurrentChat(newSession);
    },
    [],
  );

  return (
    <div
      className="flex-1 overflow-hidden bg-background flex flex-col"
      style={{ display: isVisible ? 'flex' : 'none' }}
    >
      {currentChat ? (
        <ChatPanel
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
    ? reconTargets.find((t) => t.id === reconActiveTargetId)?.isActive ?? false
    : false;

  // Tập hợp các view đã từng mở (keep-alive)
  const openedKeysRef = useRef<Set<string>>(new Set());
  const [, forceUpdate] = useState(0);

  // Xác định active key dựa trên feature
  const activeKey = useMemo(() => {
    if (activeFeature === 'emulate' && activeTargetId && isTargetActive) {
      return `emulate:${activeTargetId}`;
    }
    if (activeFeature === 'code' && currentProjectId) {
      return `code:${currentProjectId}`;
    }
    if (activeFeature === 'recon' && reconActiveTargetId) {
      return `recon:${reconActiveTargetId}`;
    }
    return null;
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
  const showGenericOverlay = activeFeature !== 'emulate' && activeFeature !== 'code' && activeFeature !== 'recon';
  const showEmulateOverlay = activeFeature === 'emulate' && (!activeTargetId || !isTargetActive);
  const showReconOverlay = activeFeature === 'recon' && (!reconActiveTargetId || !isReconTargetActive);

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
            {Array.from(openedKeysRef.current).map((key) => {
              const feature = key.startsWith('emulate:') ? 'emulate' : key.startsWith('recon:') ? 'recon' : 'code';
              return (
                <AgentView
                  key={key}
                  feature={feature}
                  isVisible={key === activeKey}
                />
              );
            })}
          </div>
        )}
      </div>
    </ProjectProvider>
  );
}