// ─── Agent Panel (Main Export) ────────────────────────────────────────────
import React, { useState, useCallback } from 'react';
import HomePanel from './feature/Home';
import ChatPanel from './feature/Chat';
import { ChatSession } from './feature/Chat/types/chat';
import { ProjectProvider } from './context/ProjectContext';

// ─── AgentPanel ────────────────────────────────────────────────────────────

export function AgentPanel() {
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

  return (
    <ProjectProvider>
      <div className="flex flex-col bg-background rounded-xl overflow-hidden shadow-2xl h-full font-sans text-text-primary">
        <div className="flex-1 overflow-hidden bg-background flex flex-col">
          {currentChat ? (
            <ChatPanel
              currentChat={currentChat}
              onBack={handleBack}
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
      </div>
    </ProjectProvider>
  );
}
