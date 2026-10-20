/**
 * ------------------------------------------------------------------
 * useHomeDraftManagement
 * ------------------------------------------------------------------
 * Custom hook quản lý draft message cho Home MessageInput.
 * Lưu draft riêng theo workspace folder path (hoặc global nếu không có workspace).
 *
 * Main features:
 * - Restore draft khi mount hoặc khi folderPath thay đổi
 * - Debounce-save draft khi message thay đổi (500ms)
 * - Xóa draft khỏi storage khi message trống
 * ------------------------------------------------------------------
 */

import { useState, useRef, useEffect } from 'react';
import {
  extensionService,
  messageDispatcher,
} from '@renderer/components/RightPanel/Zen/services/ExtensionService';

export const useHomeDraftManagement = (folderPath: string | null) => {
  const [message, setMessage] = useState('');
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDraftRestoredRef = useRef(false);

  const getDraftKey = () => {
    const key = folderPath ? `home-draft:${folderPath}` : 'home-draft:global';
    return key;
  };

  // Restore draft on mount or when folderPath changes
  useEffect(() => {
    isDraftRestoredRef.current = false;
    const draftKey = getDraftKey();

    const requestId = `getDraft-${Date.now()}`;
    messageDispatcher.register(
      requestId,
      (msg: any) => {
        if (!isDraftRestoredRef.current && msg.data?.value) {
          setMessage(msg.data.value);
        }
        isDraftRestoredRef.current = true;
      },
      3000,
      () => {
        isDraftRestoredRef.current = true;
      },
    );
    extensionService.postMessage({
      command: 'storageGet',
      requestId,
      key: draftKey,
    });
  }, [folderPath]);

  // Debounce-save draft on message change
  useEffect(() => {
    if (!isDraftRestoredRef.current) {
      return;
    }

    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);

    draftTimerRef.current = setTimeout(() => {
      const draftKey = getDraftKey();

      if (message.trim()) {
        const requestId = `setDraft-${Date.now()}`;
        extensionService.postMessage({
          command: 'storageSet',
          requestId,
          key: draftKey,
          value: message,
        });
      } else {
        const requestId = `deleteDraft-${Date.now()}`;
        extensionService.postMessage({
          command: 'storageDelete',
          requestId,
          key: draftKey,
        });
      }
    }, 500);

    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [message, folderPath]);

  const clearDraft = () => {
    const draftKey = getDraftKey();
    const requestId = `clearDraft-${Date.now()}`;
    extensionService.postMessage({
      command: 'storageDelete',
      requestId,
      key: draftKey,
    });
  };

  return {
    message,
    setMessage,
    clearDraft,
  };
};
