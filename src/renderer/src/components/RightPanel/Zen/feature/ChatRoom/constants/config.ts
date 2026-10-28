/**
 * ------------------------------------------------------------------
 * ChatRoom Config
 * ------------------------------------------------------------------
 * Static config for the shared chat room (Tencent Cloud Chat).
 * Endpoints point at Zen's already-deployed Cloudflare Workers.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import type { ChatRoomInfo } from '../types';

// ─── Constants ──────────────────────────────────────────────────────────
export const TOKEN_ENDPOINT = 'https://zen.khanhromvn.workers.dev/';

export const PRESENCE_ENDPOINT = 'wss://zen-presence.khanhromvn.workers.dev/';

export const CHAT_GROUP_ID = 'zen_general_public';

export const PROFILE_STORAGE_KEY = 'zen_chatroom_profile';

export const PRESENCE_ID_KEY = 'zen_presence_id';

export const CHAT_ROOM: ChatRoomInfo = {
  id: CHAT_GROUP_ID,
  name: 'general',
  topic: 'General chat for the Zen community',
};

// Phantoma theme colors — palette used for avatar/name coloring.
export const USER_COLORS: string[] = [
  '#3b82f6',
  '#f59e0b',
  '#a855f7',
  '#22c55e',
  '#ef4444',
  '#eab308',
];