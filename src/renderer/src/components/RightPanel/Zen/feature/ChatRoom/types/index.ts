/**
 * ------------------------------------------------------------------
 * ChatRoom Types
 * ------------------------------------------------------------------
 * Type definitions for the shared chat room.
 * ------------------------------------------------------------------
 */

export type UserRole = 'owner' | 'admin' | 'member';

export interface ChatUser {
  id: string;
  name: string;
  role: UserRole;
  color: string;
  country?: string;
  avatar?: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  content: string;
  timestamp: number;
}

export interface ChatRoomInfo {
  id: string;
  name: string;
  topic: string;
}

export interface ChatProfile {
  userId: string;
  name: string;
  country: string;
  avatar?: string;
}