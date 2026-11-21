import { X } from 'lucide-react';
import type { Post } from '../../../types/monitor.types';
import { SRC_META } from '../../../constants/meta';
import { timeAgo } from '../../../utils/format';
import { Empty } from '../../common/Primitives';
import { PlatformIcon } from '../../common/Charts';
import { ViewShell } from '../../common/ViewShell';
import { PriorityPill, TagChip } from '../Feed/FeedBits';

interface BookmarkViewProps {
  posts: Post[];
  onOpen: (p: Post) => void;
  onUnsave: (p: Post) => void;
}

export function BookmarkView({ posts, onOpen, onUnsave }: BookmarkViewProps) {
  return (
    <ViewShell title="Saved posts" subtitle={`${posts.length} saved`} accent="warn">
      {posts.length === 0 ? (
        <Empty text="No saved posts yet. Save a post from the feed and it will show up here." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 760 }}>
          {posts.map((p) => (
            <div key={p.id} className="card post" style={{ padding: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
              <button onClick={() => onOpen(p)} style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1, minWidth: 0, textAlign: 'left' }}>
                <PlatformIcon type={p.sourceType} size={24} />
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span className="tr" style={{ display: 'block', fontWeight: 600 }}>{p.title || p.sourceName}</span>
                  <span className="sub tr" style={{ display: 'block' }}>{SRC_META[p.sourceType].label} · {p.sourceName} · {timeAgo(p.createdAt)}</span>
                </span>
              </button>
              {p.tags.map((t) => (
                <TagChip key={t} name={t} />
              ))}
              <PriorityPill p={p.priority} />
              <button className="ico" aria-label="Remove from saved" onClick={() => onUnsave(p)}>
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </ViewShell>
  );
}

export default BookmarkView;