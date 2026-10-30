/**
 * ------------------------------------------------------------------
 * useChatProfile
 * ------------------------------------------------------------------
 * Đọc/ghi profile chatroom (userId, name, country, avatar) qua
 * extensionService.getStorage() (localStorage, dùng chung mọi module).
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import { useCallback, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { extensionService } from '../../../services/ExtensionService';
import { PRESENCE_ID_KEY, PROFILE_STORAGE_KEY } from '../constants/config';
import type { ChatProfile } from '../types';

// ─── Types ──────────────────────────────────────────────────────────────
export interface ChatProfileInput {
  name: string;
  country: string;
  avatar?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────
const parseProfile = (raw: string): ChatProfile | null => {
  try {
    const p = JSON.parse(raw);
    if (p?.userId && p?.name && p?.country) return p as ChatProfile;
  } catch {
    /* ignore malformed */
  }
  return null;
};

// ─── Hook ───────────────────────────────────────────────────────────────
export const useChatProfile = () => {
  const [profile, setProfile] = useState<ChatProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let disposed = false;
    extensionService
      .getStorage()
      .get(PROFILE_STORAGE_KEY)
      .then((res) => (res ? parseProfile(res.value) : null))
      .catch(() => null)
      .then((p) => {
        if (disposed) return;
        setProfile(p);
        setLoading(false);
      });
    return () => {
      disposed = true;
    };
  }, []);

  const saveProfile = useCallback(
    async (input: ChatProfileInput) => {
      const presenceId = (await extensionService.getStorage().get(PRESENCE_ID_KEY).catch(() => null))
        ?.value;
      const next: ChatProfile = {
        userId: profile?.userId ?? presenceId ?? `zen-${uuidv4()}`,
        name: input.name,
        country: input.country,
        avatar: input.avatar,
      };
      await extensionService.getStorage().set(PROFILE_STORAGE_KEY, JSON.stringify(next));
      setProfile(next);
    },
    [profile],
  );

  return { profile, loading, saveProfile };
};