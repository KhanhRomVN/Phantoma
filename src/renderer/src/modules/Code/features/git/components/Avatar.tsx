// ─── Imports ─────────────────────────────────────────────────────────────────
// ── React ──
import { memo, useState } from 'react';

// ── Utils ──
import { avatarColor, avatarUrl, githubUsername, initials } from '../utils/graph.util';

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface AvatarProps {
  author: string;
  email: string;
  size?: number;
}

// ─── Component ───────────────────────────────────────────────────────────────
export const Avatar = memo(function Avatar({ author, email, size = 18 }: AvatarProps) {
  const user = githubUsername(author, email);
  const [failedUser, setFailedUser] = useState<string | null>(null);
  const style = { width: size, height: size };

  if (user && failedUser !== user) {
    return (
      <img
        src={avatarUrl(user, size)}
        alt={author}
        style={style}
        className={'rounded-full object-cover shrink-0 block'}
        onError={() => setFailedUser(user)}
      />
    );
  }

  return (
    <span
      style={{ ...style, background: avatarColor(email || author), fontSize: Math.max(8, size * 0.42) }}
      className={'rounded-full flex items-center justify-center font-bold text-white shrink-0'}
    >
      {initials(author)}
    </span>
  );
});