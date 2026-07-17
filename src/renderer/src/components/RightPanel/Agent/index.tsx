// ─── Agent Panel (Main Export) ────────────────────────────────────────────
import { useState, useCallback, useRef, useEffect } from 'react';
import HomePanel from './feature/Home';
import ChatPanel from './feature/Chat';
import { ChatSession } from './feature/Chat/types/chat';
import { ProjectProvider } from './context/ProjectContext';
import { BackendConnectionProvider } from './context/BackendConnectionContext';
import { useAgentFeature } from './context/FeatureContext';
import AgentOverlay from './components/AgentOverlay';
// import { AgentFooterBar } from './components/AgentFooterBar';
import { MousePointer } from 'lucide-react';

// ─── AgentPanel ────────────────────────────────────────────────────────────

interface AgentState {
  currentChat: ChatSession | null;
  initialMessageData: {
    content: string;
    files: any[];
    model: any;
    account: any;
  } | null;
  homeInitialValue: string;
}

export function AgentPanel() {
  const { activeFeature, emulateState } = useAgentFeature();
  const { activeTargetId, targetStates } = emulateState;
  const currentTargetState = activeTargetId ? targetStates[activeTargetId] : null;
  const isTargetActive = currentTargetState?.isActive || false;

  // Lưu state theo targetId để restore khi quay lại
  const targetStatesMap = useRef<Map<string, AgentState>>(new Map());
  const [currentTargetId, setCurrentTargetId] = useState<string | null>(null);

  // State hiện tại
  const [currentChat, setCurrentChat] = useState<ChatSession | null>(null);
  const [initialMessageData, setInitialMessageData] = useState<{
    content: string;
    files: any[];
    model: any;
    account: any;
  } | null>(null);
  const [homeInitialValue, setHomeInitialValue] = useState('');

  // Kiểm tra xem có nên hiển thị overlay không
  const shouldShowOverlay = () => {
    if (activeFeature !== 'emulate') {
      return true; // Feature khác Emulate -> hiển thị overlay mặc định
    }
    // Feature là Emulate: kiểm tra target
    if (!activeTargetId || !isTargetActive) {
      return true; // Chưa chọn target hoặc session chưa chạy
    }
    return false;
  };

  // Lưu state hiện tại vào Map khi target thay đổi
  const saveCurrentState = useCallback(() => {
    if (currentTargetId) {
      targetStatesMap.current.set(currentTargetId, {
        currentChat,
        initialMessageData,
        homeInitialValue,
      });
    }
  }, [currentTargetId, currentChat, initialMessageData, homeInitialValue]);

  // Restore state từ Map hoặc tạo mới
  const restoreStateForTarget = useCallback((targetId: string) => {
    const savedState = targetStatesMap.current.get(targetId);
    if (savedState) {
      setCurrentChat(savedState.currentChat);
      setInitialMessageData(savedState.initialMessageData);
      setHomeInitialValue(savedState.homeInitialValue);
    } else {
      // Reset về mặc định
      setCurrentChat(null);
      setInitialMessageData(null);
      setHomeInitialValue('');
    }
    setCurrentTargetId(targetId);
  }, []);

  // Khi activeTargetId thay đổi
  useEffect(() => {
    if (activeFeature === 'emulate') {
      // Lưu state cũ trước khi chuyển
      saveCurrentState();

      if (activeTargetId && isTargetActive) {
        restoreStateForTarget(activeTargetId);
      } else {
        // Không có target active -> reset về mặc định
        setCurrentTargetId(null);
        setCurrentChat(null);
        setInitialMessageData(null);
        setHomeInitialValue('');
      }
    }
  }, [activeTargetId, isTargetActive, activeFeature, saveCurrentState, restoreStateForTarget]);

  // Lưu state khi component unmount hoặc khi các state thay đổi
  useEffect(() => {
    if (currentTargetId && activeFeature === 'emulate') {
      targetStatesMap.current.set(currentTargetId, {
        currentChat,
        initialMessageData,
        homeInitialValue,
      });
    }
  }, [currentChat, initialMessageData, homeInitialValue, currentTargetId, activeFeature]);

  const handleHomeSendMessage = useCallback(
    (content: string, files: any[], model: any, account: any) => {
      setInitialMessageData({
        content,
        files,
        model,
        account,
      });
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
    if (typeof contentToReturn === 'string' && contentToReturn.trim()) {
      setHomeInitialValue(contentToReturn);
    } else {
      setHomeInitialValue('');
    }
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

  // Render overlay cho Emulate khi chưa có target active
  const renderEmulateOverlay = () => {
    return (
      <AgentOverlay
        title="Select a target to start"
        description="Please select a target and start a CDP or MITM session to use the Agent"
        icon={<MousePointer className="w-8 h-8 text-primary opacity-80" />}
      />
    );
  };

  return (
    <BackendConnectionProvider>
      <ProjectProvider>
        <div className="flex flex-col bg-background rounded-xl overflow-hidden shadow-2xl h-full font-sans text-text-primary relative">
          {activeFeature !== 'emulate' && <AgentOverlay featureName={activeFeature || undefined} />}
          {activeFeature === 'emulate' && shouldShowOverlay() && renderEmulateOverlay()}

          {/* Main content - chỉ hiển thị khi không có overlay */}
          {!shouldShowOverlay() && (
            <>
              <div className="flex-1 overflow-hidden bg-background flex flex-col">
                {currentChat ? (
                  <ChatPanel
                    currentChat={currentChat}
                    onBack={handleBack}
                    feature={activeFeature}
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
              {/* <AgentFooterBar /> */}
            </>
          )}
        </div>
      </ProjectProvider>
    </BackendConnectionProvider>
  );
}
