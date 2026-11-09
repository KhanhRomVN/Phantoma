/**
 * ------------------------------------------------------------------
 * PR Avatar
 * ------------------------------------------------------------------
 * Avatar GitHub theo login, fallback chữ cái đầu có màu khi ảnh lỗi.
 * ------------------------------------------------------------------
 */

import { memo, useState } from 'react';

import { avatarColor, avatarUrl, initials } from '../Git/graph';

interface PrAvatarProps {
  login?: string | null;
  size?: number;
}

export const PrAvatar = memo(function PrAvatar({ login, size = 18 }: PrAvatarProps) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size };

  if (login && !failed) {
    return (
      <img
        src={avatarUrl(login, size)}
        alt={login}
        style={style}
        className={'rounded-full object-cover shrink-0 block'}
        onError={() => setFailed(true)}
      />
    );
  }

  const name = login || 'unknown';
  return (
    <span
      style={{ ...style, background: avatarColor(name), fontSize: Math.max(8, size * 0.42) }}
      className={'rounded-full flex items-center justify-center font-bold text-white shrink-0'}
    >
      {initials(name)}
    </span>
  );
});

PrAvatar.displayName = 'PrAvatar';