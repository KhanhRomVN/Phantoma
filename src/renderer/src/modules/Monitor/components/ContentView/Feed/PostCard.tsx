import { ExternalLink, MoreHorizontal, Pin } from 'lucide-react';
import type { Post } from '../../../types/monitor.types';
import { THEME } from '../../../constants/theme';
import { c, tc } from '../../../utils/color';
import { timeAgo } from '../../../utils/format';
import { SourceAvatar } from '../../common/Charts';
import { MediaArea } from './Media';
import { CheckDraw, PlatformBadge, PriorityPill, TagChip } from './FeedBits';

export interface PostCardProps {
  post: Post;
  onOpen: (p: Post, tab?: 'media' | 'diff') => void;
  onArchive: (p: Post) => void;
  onMenu: (p: Post, x: number, y: number) => void;
  flashId?: string | null;
  seenIds?: Set<string>;
  relatedOf?: (p: Post) => Post[];
}

export function PostCard({ post, onOpen, onMenu, flashId, seenIds }: PostCardProps) {
  const flash = flashId === post.id;
  const high = post.priority === 'high' && !post.isNote;
  const rec = !!post.isRecommended && !post.isNote;
  return (
    <article
      className={`card post ${rec ? 'noise' : ''}`}
      style={{
        padding: 'var(--pad,14px)',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: high ? `0 0 0 1px ${tc('error', 0.22)}, 0 0 26px -10px ${tc('error', 0.55)}` : undefined,
        animation: flash ? 'mnflash .9s ease-out' : undefined,
      }}
      onClick={() => onOpen(post)}
    >
      {flash && <CheckDraw />}
      <header style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <SourceAvatar name={post.sourceName} type={post.sourceType} size={36} read={seenIds?.has(post.id)} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600 }}>{post.sourceName}</span>
            <PlatformBadge type={post.sourceType} />
            {rec && (
              <span className="shimmer-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 500, color: c('primary') }}>
                ✨ Suggested
              </span>
            )}
            {post.pinned && <Pin size={12} color={`rgb(${THEME.warn})`} />}
          </div>
          <div className="sub tr">
            {post.sourceDomain} · {timeAgo(post.createdAt)}
          </div>
        </div>
        <button className="ico" aria-label="Open source" title="Source" style={{ width: 28, height: 28 }} onClick={(e) => { e.stopPropagation(); onOpen(post); }}>
          <ExternalLink size={14} />
        </button>
        <button className="ico" aria-label="More actions" style={{ width: 28, height: 28 }} onClick={(e) => { e.stopPropagation(); onMenu(post, e.clientX, e.clientY); }}>
          <MoreHorizontal size={14} />
        </button>
      </header>
      {post.title && !post.isNote && <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-.005em', marginBottom: 4 }}>{post.title}</div>}
      <div style={{ lineHeight: 1.6, marginBottom: 10, color: c('tp', 0.88), fontWeight: 400 }}>{post.body}</div>
      <div onClick={(e) => e.stopPropagation()} style={{ marginBottom: 10 }}>
        <MediaArea post={post} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 10 }}>
        {post.tags.map((t) => (
          <TagChip key={t} name={t} />
        ))}
        {!post.isNote && <PriorityPill p={post.priority} />}
      </div>

    </article>
  );
}

export function SkeletonCard() {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <div className="skel" style={{ width: 36, height: 36 }} />
        <div style={{ flex: 1 }}>
          <div className="skel" style={{ height: 12, width: '40%', marginBottom: 6 }} />
          <div className="skel" style={{ height: 10, width: '25%' }} />
        </div>
      </div>
      <div className="skel" style={{ height: 12, marginBottom: 6 }} />
      <div className="skel" style={{ height: 12, width: '80%', marginBottom: 12 }} />
      <div className="skel" style={{ height: 140 }} />
    </div>
  );
}