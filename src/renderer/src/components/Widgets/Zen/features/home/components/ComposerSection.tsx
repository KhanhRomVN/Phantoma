/**
 * ComposerSection — vùng nhập liệu của Home.
 * Sở hữu: draft, file handling, attachments, model/account, toggles, previews, send orchestration.
 */

import React, { useCallback, useRef, useState } from 'react';
import { useComposerDraft } from '../hooks/useComposerDraft';
import { useWorkflowAgentSync } from '@renderer/components/Widgets/Zen/context/WorkflowAgentContext';
import { useSettings } from '@renderer/components/Widgets/Zen/context/SettingsContext';
import { useModelAccount } from '@renderer/components/Widgets/Zen/shared/hooks/useModelAccount';
import { useToolFormatSettings } from '@renderer/components/Widgets/Zen/shared/hooks/useToolFormatSettings';
import { useFileHandling } from '@renderer/components/Widgets/Zen/shared/hooks/useFileHandling';
import FilesPreviews from '../../composer/components/FilesPreviews';
import Composer from '../../composer/Composer';

export interface SendOverrides {
  useSkillEnabled?: boolean;
  memoryEnabled?: boolean;
  toolFormat?: 'xml' | 'json';
  workflowAgentId?: 'orchestrator' | 'planner' | 'executor' | 'reviewer' | null;
}

interface ComposerSectionProps {
  folderPath: string | null;
  onSendMessage: (
    content: string,
    files: any[],
    model: any,
    account: any,
    conversationOverrides?: SendOverrides,
  ) => void;
}

const ComposerSection: React.FC<ComposerSectionProps> = ({ folderPath, onSendMessage }) => {
  const workflowSync = useWorkflowAgentSync();
  const workflowAgentId = workflowSync?.agentType ?? workflowSync?.agentId ?? undefined;
  const isLockedByWorkflow = !!workflowSync && workflowSync.agentId !== 'orchestrator';

  const {
    useSkillEnabled: globalUseSkillEnabled,
    setUseSkillEnabled,
    memoryEnabled: globalMemoryEnabled,
    setMemoryEnabled,
  } = useSettings();

  const { currentModel, setCurrentModel, currentAccount, setCurrentAccount } =
    useModelAccount(folderPath);
  const { toolFormat: conversationToolFormat, toggleToolFormat: toggleConversationToolFormat } =
    useToolFormatSettings(currentModel?.providerId, currentModel?.id);

  const [conversationUseSkillEnabled, setConversationUseSkillEnabled] =
    useState(globalUseSkillEnabled);
  const [conversationMemoryEnabled, setConversationMemoryEnabled] = useState(globalMemoryEnabled);

  const { message, setMessage, clearDraft } = useComposerDraft(folderPath);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [attachedItems, setAttachedItems] = useState<any[]>([]);

  const handleAddAttachedItem = useCallback((item: any) => {
    setAttachedItems((prev) => [...prev, item]);
  }, []);

  const handleRemoveAttachedItem = useCallback((id: string) => {
    setAttachedItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const {
    uploadedFiles,
    fileInputRef,
    externalFileInputRef,
    handlePaste,
    handleFileSelect,
    handleFileInputChange,
    removeFile,
    handleExternalFileInputChange,
    handleDragOver,
    handleDrop,
    clearFiles,
  } = useFileHandling({
    accountId: currentAccount?.id,
    onAddAttachedItem: handleAddAttachedItem,
  });

  const handleSend = useCallback(
    (model: any, account: any) => {
      if (!message.trim() && uploadedFiles.length === 0 && attachedItems.length === 0) return;
      onSendMessage(message, [...uploadedFiles, ...attachedItems], model, account, {
        useSkillEnabled: conversationUseSkillEnabled,
        memoryEnabled: conversationMemoryEnabled,
        toolFormat: conversationToolFormat,
        workflowAgentId: workflowAgentId as SendOverrides['workflowAgentId'],
      });
      setMessage('');
      clearDraft();
      clearFiles();
      setAttachedItems([]);
    },
    [
      message,
      uploadedFiles,
      attachedItems,
      onSendMessage,
      setMessage,
      clearDraft,
      clearFiles,
      conversationUseSkillEnabled,
      conversationMemoryEnabled,
      conversationToolFormat,
      workflowAgentId,
    ],
  );

  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value),
    [setMessage],
  );

  const handleOpenImage = useCallback((file: { content: any; name: string }) => {
    const vscodeApi = (window as any).vscodeApi;
    vscodeApi?.postMessage({
      command: 'openTempImage',
      content: file.content,
      filename: file.name,
    });
  }, []);

  // Các callback rỗng / giá trị cố định bên dưới là contract hiện tại của MessageInput;
  // chỉ bỏ sau khi xác minh Composer public contract (xem plan §10.2).
  const noop = useCallback(() => {}, []);

  return (
    <div
      className="shrink-0 bg-transparent"
      style={{ maxWidth: '680px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
        accept="image/*,text/*"
      />
      <input
        ref={externalFileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleExternalFileInputChange}
      />
      <FilesPreviews
        uploadedFiles={uploadedFiles}
        attachedItems={attachedItems}
        onRemoveFile={removeFile}
        onRemoveAttachedItem={handleRemoveAttachedItem}
        onOpenImage={handleOpenImage}
        onAttachedItemClick={noop}
      />
      <div
        className={isLockedByWorkflow ? 'opacity-50 pointer-events-none select-none' : undefined}
        {...(isLockedByWorkflow ? ({ inert: '' } as object) : {})}
      >
        <Composer
          message={message}
          setMessage={setMessage}
          isHistoryMode={false}
          uploadedFiles={uploadedFiles}
          attachedItems={attachedItems}
          textareaRef={textareaRef as React.RefObject<HTMLTextAreaElement>}
          handleTextareaChange={handleTextareaChange}
          handleKeyDown={noop}
          handlePaste={handlePaste}
          handleDragOver={handleDragOver}
          handleDrop={handleDrop}
          handleFileSelect={handleFileSelect}
          onOpenProjectStructure={noop}
          showChangesDropdown={false}
          setShowChangesDropdown={noop}
          messages={[]}
          handleSend={handleSend}
          hasProjectContext={false}
          onOpenProjectContext={noop}
          folderPath={folderPath}
          isConversationStarted={false}
          currentModel={currentModel}
          setCurrentModel={setCurrentModel}
          currentAccount={currentAccount}
          setCurrentAccount={setCurrentAccount}
          isProcessing={false}
          isStreaming={false}
          conversationUseSkillEnabled={conversationUseSkillEnabled}
          conversationMemoryEnabled={conversationMemoryEnabled}
          conversationToolFormat={conversationToolFormat}
          onConversationUseSkillToggle={() => {
            const next = !conversationUseSkillEnabled;
            setConversationUseSkillEnabled(next);
            setUseSkillEnabled(next);
          }}
          onConversationMemoryToggle={() => {
            const next = !conversationMemoryEnabled;
            setConversationMemoryEnabled(next);
            setMemoryEnabled(next);
          }}
          onConversationToolFormatToggle={(format) => toggleConversationToolFormat(format)}
        />
      </div>
    </div>
  );
};

export default ComposerSection;
