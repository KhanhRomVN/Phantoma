// ─── Agent Panel (Main Export) ────────────────────────────────────────────
import { useState, useCallback, useRef, useEffect } from 'react';
import HomePanel from './feature/Home';
import ChatPanel from './feature/Chat';
import { ChatSession } from './feature/Chat/types/chat';
import { ProjectProvider } from './context/ProjectContext';
import { BackendConnectionProvider } from './context/BackendConnectionContext';
import { useAgentFeature } from './context/FeatureContext';
import AgentOverlay from './components/AgentOverlay';
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
  const currentTargetIdRef = useRef<string | null>(null);

  // State hiện tại
  const [currentChat, setCurrentChat] = useState<ChatSession | null>(null);
  const [initialMessageData, setInitialMessageData] = useState<{
    content: string;
    files: any[];
    model: any;
    account: any;
  } | null>(null);
  const [homeInitialValue, setHomeInitialValue] = useState('');

  // Ref để giữ giá trị mới nhất
  const currentChatRef = useRef(currentChat);
  const initialMessageDataRef = useRef(initialMessageData);
  const homeInitialValueRef = useRef(homeInitialValue);
  currentChatRef.current = currentChat;
  initialMessageDataRef.current = initialMessageData;
  homeInitialValueRef.current = homeInitialValue;

  // Cập nhật ref khi currentTargetId thay đổi
  useEffect(() => {
    currentTargetIdRef.current = currentTargetId;
  }, [currentTargetId]);

  // Kiểm tra overlay
  const shouldShowOverlay = () => {
    if (activeFeature === 'emulate') {
      return !activeTargetId || !isTargetActive;
    }
    return false;
  };

  // Lưu state hiện tại vào Map — dùng ref
  const saveCurrentState = useCallback(() => {
    const targetId = currentTargetIdRef.current;
    if (targetId) {
      targetStatesMap.current.set(targetId, {
        currentChat: currentChatRef.current,
        initialMessageData: initialMessageDataRef.current,
        homeInitialValue: homeInitialValueRef.current,
      });
    }
  }, []);

  // Restore state từ Map
  const restoreStateForTarget = useCallback((targetId: string) => {
    const savedState = targetStatesMap.current.get(targetId);
    if (savedState) {
      setCurrentChat(savedState.currentChat);
      setInitialMessageData(savedState.initialMessageData);
      setHomeInitialValue(savedState.homeInitialValue);
    } else {
      setCurrentChat(null);
      setInitialMessageData(null);
      setHomeInitialValue('');
    }
    setCurrentTargetId(targetId);
  }, []);

  // Khi activeTargetId hoặc activeFeature thay đổi
  useEffect(() => {
    if (activeFeature === 'emulate') {
      saveCurrentState();

      if (activeTargetId && isTargetActive) {
        restoreStateForTarget(activeTargetId);
      } else {
        setCurrentTargetId(null);
        setCurrentChat(null);
        setInitialMessageData(null);
        setHomeInitialValue('');
      }
    }
  }, [activeTargetId, isTargetActive, activeFeature, saveCurrentState, restoreStateForTarget]);

  // Lưu state khi có thay đổi — dùng ref cho targetId
  useEffect(() => {
    const targetId = currentTargetIdRef.current;
    if (targetId && activeFeature === 'emulate') {
      targetStatesMap.current.set(targetId, {
        currentChat,
        initialMessageData,
        homeInitialValue,
      });
    }
  }, [currentChat, initialMessageData, homeInitialValue, activeFeature]);

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
    setHomeInitialValue(typeof contentToReturn === 'string' && contentToReturn.trim() ? contentToReturn : '');
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
    <BackendConnectionProvider>
      <ProjectProvider>
        <div className="flex flex-col bg-background rounded-xl overflow-hidden shadow-2xl h-full font-sans text-text-primary relative">
          {activeFeature !== 'emulate' && <AgentOverlay featureName={activeFeature || undefined} />}
          {activeFeature === 'emulate' && shouldShowOverlay() && renderEmulateOverlay()}

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
            </>
          )}
        </div>
      </ProjectProvider>
    </BackendConnectionProvider>
  );
}