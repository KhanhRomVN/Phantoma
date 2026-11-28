/**
 * ------------------------------------------------------------------
 * useComposerDraft
 * ------------------------------------------------------------------
 * Draft message cho Composer của Home, lưu theo workspace folder path
 * (hoặc global). Storage key giữ nguyên: home-draft:<folderPath> / home-draft:global.
 *
 * - Restore khi mount / folderPath đổi; callback của key cũ bị bỏ qua.
 * - Khi workspace đổi, nội dung cũ được clear trước khi restore key mới.
 * - Debounce-save (500ms) chỉ chạy sau khi restore đúng key hiện tại xong.
 * ------------------------------------------------------------------
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  electronWidgetBridge,
  messageDispatcher,
} from '@renderer/components/Widgets/Zen/shared/platform/electron-widget-bridge.service';

export const useComposerDraft = (folderPath: string | null) => {
  const draftKey = folderPath ? `home-draft:${folderPath}` : 'home-draft:global';
  const draftKeyRef = useRef(draftKey);
  draftKeyRef.current = draftKey;

  const [message, setMessageState] = useState('');
  const [restoredKey, setRestoredKey] = useState<string | null>(null);
  const touchedRef = useRef(false);

  const setMessage = useCallback((value: string) => {
    touchedRef.current = true;
    setMessageState(value);
  }, []);

  // Restore draft theo key
  useEffect(() => {
    let active = true;
    touchedRef.current = false;
    setMessageState('');
    setRestoredKey(null);

    const requestId = `getDraft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    messageDispatcher.register(
      requestId,
      (msg: any) => {
        if (!active) return;
        if (msg.data?.value && !touchedRef.current) setMessageState(msg.data.value);
        setRestoredKey(draftKey);
      },
      3000,
      () => {
        if (active) setRestoredKey(draftKey);
      },
    );
    electronWidgetBridge.postMessage({ command: 'storageGet', requestId, key: draftKey });

    return () => {
      active = false;
    };
  }, [draftKey]);

  // Debounce-save
  useEffect(() => {
    if (restoredKey !== draftKey) return;

    const timer = setTimeout(() => {
      if (message.trim()) {
        electronWidgetBridge.postMessage({
          command: 'storageSet',
          requestId: `setDraft-${Date.now()}`,
          key: draftKey,
          value: message,
        });
      } else {
        electronWidgetBridge.postMessage({
          command: 'storageDelete',
          requestId: `deleteDraft-${Date.now()}`,
          key: draftKey,
        });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [message, draftKey, restoredKey]);

  const clearDraft = useCallback(() => {
    electronWidgetBridge.postMessage({
      command: 'storageDelete',
      requestId: `clearDraft-${Date.now()}`,
      key: draftKeyRef.current,
    });
  }, []);

  return { message, setMessage, clearDraft };
};
