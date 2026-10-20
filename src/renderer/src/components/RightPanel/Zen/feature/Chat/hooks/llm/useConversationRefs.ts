/**
 * ------------------------------------------------------------------
 * useConversationRefs
 * ------------------------------------------------------------------
 * Tập trung tất cả useRef dùng trong ChatLLM.
 *
 * Main returns:
 * - messagesRef               : Ref cho danh sách messages
 * - currentConversationIdRef  : Ref cho conversation ID hiện tại
 * - backendConversationIdRef  : Ref cho backend conversation ID
 * - abortControllerRef        : Ref cho AbortController
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useRef } from 'react';

// ── Types ──
import { Message } from '../../types/message';

// ─── Hook ───────────────────────────────────────────────────────────────
export const useConversationRefs = () => {
  const messagesRef = useRef<Message[]>([]);
  const currentConversationIdRef = useRef<string>('');
  const backendConversationIdRef = useRef<string>('');
  const lastUsedModelRef = useRef<any>(null);
  const lastUsedAccountRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const qwenParentIdRef = useRef<string | undefined>(undefined);
  const userRequestCountRef = useRef<number>(0);
  const renderCountRef = useRef(0);
  const prevDepsRef = useRef<any>({});

  return {
    messagesRef,
    currentConversationIdRef,
    backendConversationIdRef,
    lastUsedModelRef,
    lastUsedAccountRef,
    abortControllerRef,
    qwenParentIdRef,
    userRequestCountRef,
    renderCountRef,
    prevDepsRef,
  };
};
