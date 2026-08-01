import React from 'react';
import FilesPreviews from '../../../components/common/MessageInput/FilesPreviews';
import MessageInput from '../../../components/common/MessageInput';
import { type FileMutationTool } from '../constants/constants';
interface ChatFooterProps {
  message: string;
  setMessage: React.Dispatch<React.SetStateAction<string>>;
  isHistoryMode: boolean;
  uploadedFiles: any[];
  attachedItems: any[];
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  handleTextareaChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handlePaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  setShowAtMenu: (value: boolean) => void;
  handleFileSelect: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onOpenProjectStructure: () => void;
  showChangesDropdown: boolean;
  setShowChangesDropdown: (value: boolean) => void;
  messages: any[];
  handleSend: (model: any, account: any) => void;
  hasProjectContext: boolean;
  onOpenProjectContext: () => void;
  folderPath: string | null;
  isConversationStarted: boolean;
  currentModel: any;
  setCurrentModel: (model: any) => void;
  currentAccount: any;
  setCurrentAccount: (account: any) => void;
  isProcessing: boolean;
  isStreaming: boolean;
  onStopGeneration: () => void;
  showBrowserWarning: boolean;
  isLaunchingBrowser: boolean;
  onLaunchBrowserSession: () => void;
  onGitPullRequest: () => void;
  gitLoading: boolean;
  isGitStatusVisible?: boolean;
  removeAttachedItem: (id: string) => void;
  onOpenImage: (file: any) => void;
  removeFile: (id: string) => void;
  externalFileInputRef: React.RefObject<HTMLInputElement | null>;
  handleExternalFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  gitStatus?: { items?: any[]; branch?: string } | null;
  onOpenGitStatus?: () => void;
  loadedConversationFileStats?: {
    totalFiles: number;
    totalAdditions: number;
    totalDeletions: number;
  } | null;
  footerPaddingBottom: string;
  onModelSwitch?: (
    newModel: any,
    newAccount: any,
    contextData: {
      fileChanges: Array<{
        path: string;
        additions: number;
        deletions: number;
      }>;
      userMessages: Array<{ content: string; responseNumber: number }>;
    },
  ) => void;
  onRevertConversation?: (messageId: string, timestamp: number) => void;
  autoScrollPaused?: boolean;
  scrollToBottom?: () => void;
}

const ChatFooter: React.FC<ChatFooterProps> = ({
  message,
  setMessage,
  isHistoryMode,
  uploadedFiles,
  attachedItems,
  textareaRef,
  handleTextareaChange,
  handleKeyDown,
  handlePaste,
  handleDragOver,
  handleDrop,
  setShowAtMenu,
  handleFileSelect,
  fileInputRef,
  onOpenProjectStructure,
  showChangesDropdown,
  setShowChangesDropdown,
  messages,
  handleSend,
  hasProjectContext,
  onOpenProjectContext,
  folderPath,
  isConversationStarted,
  currentModel,
  setCurrentModel,
  currentAccount,
  setCurrentAccount,
  isProcessing,
  isStreaming,
  onStopGeneration,
  showBrowserWarning,
  isLaunchingBrowser,
  onLaunchBrowserSession,
  onGitPullRequest,
  gitLoading,
  isGitStatusVisible,
  removeAttachedItem,
  onOpenImage,
  removeFile,
  externalFileInputRef,
  handleExternalFileInputChange,
  handleFileInputChange,
  gitStatus,
  onOpenGitStatus,
  loadedConversationFileStats,
  footerPaddingBottom,
  onModelSwitch,
  onRevertConversation,
  autoScrollPaused = false,
  scrollToBottom,
}) => {
  // Calculate response range - count all assistant responses in the conversation
  const responseRange = React.useMemo(() => {
    const assistantResponses = messages.filter((m: any) => m.role === 'assistant');
    const totalResponses = assistantResponses.length;
    if (totalResponses === 0) return null;
    return { start: 1, end: totalResponses };
  }, [messages]);

  // Calculate response ranges per manual user message
  const responseRanges = React.useMemo(() => {
    const ranges: Array<{
      start: number;
      end: number;
      isCurrent: boolean;
      messageId?: string;
      timestamp?: number;
      fileChanges: Map<
        string,
        {
          additions: number;
          deletions: number;
          toolType?: FileMutationTool;
          content?: string;
          oldContent?: string;
          newContent?: string;
        }
      >;
    }> = [];

    let currentRangeStart = 1;
    let assistantCount = 0;

    messages.forEach((msg: any) => {
      if (msg.role === 'assistant') {
        assistantCount++;
      }

      if (msg.role === 'user') {
        const isManual = !msg.actionIds || msg.actionIds.length === 0;
        if (isManual) {
          let rangeEnd = assistantCount;

          ranges.push({
            start: currentRangeStart,
            end: rangeEnd,
            isCurrent: false,
            messageId: msg.id,
            timestamp: msg.timestamp,
            fileChanges: new Map(),
          });

          currentRangeStart = rangeEnd + 1;
        }
      }
    });

    // Mark the last range as current
    if (ranges.length > 0) {
      ranges[ranges.length - 1].isCurrent = true;
    }

    return [...ranges].reverse();
  }, [messages]);

  // Calculate file changes from conversation messages
  const { conversationFileStats, fileChangesMap } = React.useMemo(() => {
    const fileChanges = new Map<
      string,
      { additions: number; deletions: number; toolType?: FileMutationTool }
    >();

    messages.forEach((msg: any) => {
      if (msg.role === 'assistant' && msg.content) {
        // Match write_to_file
        const writeMatches = msg.content.matchAll(
          /<write_to_file[^>]*?>[\s\S]*?<file_path[^>]*?>(.*?)<\/file_path>[\s\S]*?<content[^>]*?>([\s\S]*?)<\/content>[\s\S]*?<\/write_to_file>/gi,
        );
        for (const match of writeMatches) {
          const filePath = match[1]?.trim();
          const content = match[2] || '';
          if (filePath) {
            if (!fileChanges.has(filePath)) {
              fileChanges.set(filePath, { additions: 0, deletions: 0 });
            }
            const stats = fileChanges.get(filePath)!;
            stats.additions += content.split('\n').length;
          }
        }

        // Match replace_in_file
        const replaceMatches = msg.content.matchAll(
          /<replace_in_file[^>]*?>[\s\S]*?<file_path[^>]*?>(.*?)<\/file_path>[\s\S]*?<old_content[^>]*?>([\s\S]*?)<\/old_content>[\s\S]*?<new_content[^>]*?>([\s\S]*?)<\/new_content>[\s\S]*?<\/replace_in_file>/gi,
        );
        for (const match of replaceMatches) {
          const filePath = match[1]?.trim();
          const oldContent = match[2] || '';
          const newContent = match[3] || '';
          if (filePath) {
            if (!fileChanges.has(filePath)) {
              fileChanges.set(filePath, { additions: 0, deletions: 0 });
            }
            const stats = fileChanges.get(filePath)!;
            stats.deletions += oldContent.split('\n').length;
            stats.additions += newContent.split('\n').length;
          }
        }

        // Match revert_file and SUBTRACT
        const revertMatches = msg.content.matchAll(
          /<revert_file[^>]*?>[\s\S]*?<file_path[^>]*?>(.*?)<\/file_path>[\s\S]*?<\/revert_file>/gi,
        );
        for (const match of revertMatches) {
          const filePath = match[1]?.trim();
          if (filePath && fileChanges.has(filePath)) {
            const stats = fileChanges.get(filePath)!;
            stats.additions = 0;
            stats.deletions = 0;
          }
        }
      }
    });

    const totalFiles = loadedConversationFileStats?.totalFiles ?? fileChanges.size;
    const totalAdditions =
      loadedConversationFileStats?.totalAdditions ??
      Array.from(fileChanges.values()).reduce((sum, stat) => sum + stat.additions, 0);
    const totalDeletions =
      loadedConversationFileStats?.totalDeletions ??
      Array.from(fileChanges.values()).reduce((sum, stat) => sum + stat.deletions, 0);

    return {
      conversationFileStats: { totalFiles, totalAdditions, totalDeletions },
      fileChangesMap: fileChanges,
    };
  }, [messages, loadedConversationFileStats]);

  return (
    <div
      id="chat-footer-container"
      className="flex flex-col w-full overflow-hidden transition-[bottom] duration-200 flex-shrink-0 bg-background px-4 pb-4"
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
        accept="image/*,text/*"
      />
      <input
        ref={externalFileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleExternalFileInputChange}
      />

      <FilesPreviews
        uploadedFiles={uploadedFiles}
        attachedItems={attachedItems}
        onRemoveFile={removeFile}
        onRemoveAttachedItem={removeAttachedItem}
        onOpenImage={onOpenImage}
        onAttachedItemClick={(item) => {
          const vscodeApi = (window as any).vscodeApi;
          if (!vscodeApi) return;
          if (item.type === 'file') {
            vscodeApi.postMessage({
              command: 'openWorkspaceFile',
              path: item.path,
            });
          } else if (item.type === 'folder') {
            vscodeApi.postMessage({
              command: 'openWorkspaceFolder',
              path: item.path,
            });
          } else if (item.type === ('terminal' as any)) {
            vscodeApi.postMessage({
              command: 'focusTerminal',
              terminalId: item.path,
            });
          }
        }}
      />

      <div className="relative">
        <MessageInput
          message={message}
          setMessage={setMessage}
          isHistoryMode={isHistoryMode}
          uploadedFiles={uploadedFiles}
          textareaRef={textareaRef as React.RefObject<HTMLTextAreaElement>}
          handleTextareaChange={handleTextareaChange}
          handleKeyDown={handleKeyDown}
          handlePaste={handlePaste}
          handleDragOver={handleDragOver}
          handleDrop={handleDrop}
          setShowAtMenu={setShowAtMenu}
          handleFileSelect={handleFileSelect}
          fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>}
          onOpenProjectStructure={onOpenProjectStructure}
          showChangesDropdown={showChangesDropdown}
          setShowChangesDropdown={setShowChangesDropdown}
          messages={messages}
          handleSend={handleSend}
          hasProjectContext={hasProjectContext}
          onOpenProjectContext={onOpenProjectContext}
          folderPath={folderPath}
          isConversationStarted={isConversationStarted}
          currentModel={currentModel}
          setCurrentModel={setCurrentModel}
          currentAccount={currentAccount}
          setCurrentAccount={setCurrentAccount}
          isProcessing={isProcessing}
          isStreaming={isStreaming}
          onStopGeneration={onStopGeneration}
          showBrowserWarning={showBrowserWarning}
          isLaunchingBrowser={isLaunchingBrowser}
          onLaunchBrowserSession={onLaunchBrowserSession}
          onGitPullRequest={onGitPullRequest}
          isGitLoading={gitLoading}
          isGitStatusVisible={isGitStatusVisible}
          gitStatus={gitStatus}
          onOpenGitStatus={onOpenGitStatus}
          conversationFileStats={conversationFileStats}
          responseRange={responseRange}
          responseRanges={responseRanges}
          onRevertConversation={onRevertConversation}
          onModelSwitch={onModelSwitch}
          autoScrollPaused={autoScrollPaused}
          scrollToBottom={scrollToBottom}
        />
      </div>
    </div>
  );
};

export default ChatFooter;
