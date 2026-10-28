/**
 * ------------------------------------------------------------------
 * UserAvatar
 * ------------------------------------------------------------------
 * Avatar vuông bo góc: ảnh user, hoặc chữ cái đầu, tô màu theo user.color.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import React from 'react';
import type { ChatUser, UserRole } from '../types';

// ─── Constants ──────────────────────────────────────────────────────────
export const ROLE_META: Record<Exclude<UserRole, 'member'>, { label: string; color: string }> = {
  owner: { label: 'Owner', color: '#f59e0b' },
  admin: { label: 'Admin', color: '#a855f7' },
};

// ─── Interfaces ─────────────────────────────────────────────────────────
interface UserAvatarProps {
  user: ChatUser;
  size?: number;
}

// ─── Component ──────────────────────────────────────────────────────────
const UserAvatar: React.FC<UserAvatarProps> = ({ user, size = 36 }) => (
  <div
    style={{
      width: size,
      height: size,
      flexShrink: 0,
      borderRadius: 6,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      fontSize: Math.round(size * 0.4),
      fontWeight: 700,
      color: user.color,
      backgroundColor: `color-mix(in srgb, ${user.color} 18%, transparent)`,
      border: user.avatar
        ? 'none'
        : `1px solid color-mix(in srgb, ${user.color} 35%, transparent)`,
      userSelect: 'none',
    }}
  >
    {user.avatar ? (
      <img
        src={user.avatar}
        alt={user.name}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    ) : (
      user.name.charAt(0).toUpperCase()
    )}
  </div>
);

export default UserAvatar;