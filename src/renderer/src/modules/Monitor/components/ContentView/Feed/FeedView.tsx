import { useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { ArrowUp, Bookmark, Layers, Plus, Search, X } from 'lucide-react';
import type { Post, SourceType, ViewId } from '../../../types/monitor.types';
import { c } from '../../../utils/color';
import { dayLabel } from '../../../utils/format';
import { TimeMarker } from '../../common/Charts';
import { EmptyArt, SystemCard } from './FeedBits';
import { PostCard, SkeletonCard } from './PostCard';
import type { PostCardProps } from './PostCard';

export type Chip = 'all' | SourceType;

interface FeedViewProps {
  posts: Post[];
  allPosts: Post[];
  loading: boolean;
  running: number;
  chip: Chip;
  setChip: (c: Chip) => void;
  group: string | null;
  tag: string | null;
  setGroup: (g: string | null) => void;
  setTag: (t: string | null) => void;
  search: string;
  setSearch: (s: string) => void;
  newCount: number;
  onShowNew: () => void;
  onLoadMore: () => void;
  onCreateMonitor: () => void;
  onNote: (text: string, pin: boolean, team: boolean, exp: boolean) => void;
  onView: (v: ViewId) => void;
  onQuick: () => void;
  onReset: () => void;
  onRail: () => void;
  cardProps: Omit<PostCardProps, 'post'>;
  scrollRef: RefObject<HTMLDivElement | null>;
}

export function FeedView(p: FeedViewProps) {
  const [st, setSt] = useState(0);
  const filtersOn = !!(p.group || p.tag || p.search || p.chip !== 'all');

  const real = p.posts.filter((x) => !x.isNote);
  const sys = (k: number): ReactNode => {
    const v = [
      { icon: Bookmark, tone: 'primary', text: `🔖 ${real.filter((x) => x.archived).length} saved posts`, cta: 'Open saved', run: () => p.onView('bookmarks') },
    ][k % 1];
    return <SystemCard key={`sys-${k}`} icon={v.icon} tone={v.tone} text={v.text} cta={v.cta} onClick={v.run} />;
  };
  const rows: ReactNode[] = [];
  let lastDay = '';
  p.posts.forEach((post, idx) => {
    const day = dayLabel(post.createdAt);
    if (day !== lastDay) {
      rows.push(<TimeMarker key={`day-${day}-${idx}`} label={day} />);
      lastDay = day;
    }
    rows.push(<PostCard key={post.id} post={post} {...p.cardProps} />);
    if ((idx + 1) % 4 === 0 && idx < p.posts.length - 1) rows.push(sys(Math.floor(idx / 4)));
  });

  return (
    <div ref={p.scrollRef} className="scroll" onScroll={(e) => setSt(e.currentTarget.scrollTop)} style={{ flex: 1, minWidth: 0, padding: 'var(--pad,16px)', position: 'relative' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: 10, color: c('ts') }} />
            <input id="mn-search" className="field" style={{ paddingLeft: 34 }} value={p.search} onChange={(e) => p.setSearch(e.target.value)} placeholder="Search signals, tags, sources…   ( / )" aria-label="Search feed" />
          </div>
          <button className="soft rail-toggle" style={{ height: 34 }} aria-label="Open right panel" onClick={p.onRail}>
            <Layers size={14} />
            Filters
          </button>
        </div>

        {(p.group || p.tag) && (
          <div className="sub">
            Filtering: {p.group && <b>📁 {p.group} </b>}
            {p.tag && <b>#{p.tag} </b>}
            <button style={{ color: c('primary') }} onClick={() => { p.setGroup(null); p.setTag(null); }}>
              Clear filter
            </button>
          </div>
        )}

        {p.loading && (
          <>
            <div className="sub" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="dot-live" style={{ width: 6, height: 6, borderRadius: 6, background: c('info') }} />
              Listening to sources…
            </div>
            {[1, 2, 3].map((k) => <SkeletonCard key={k} />)}
          </>
        )}
        {!p.loading && p.posts.length === 0 && (
          <EmptyArt
            title={filtersOn ? 'No matching signals' : 'Nothing to see yet'}
            sub={filtersOn ? 'Try widening your filters — or look at all sources again.' : 'Create your first monitor and Monitor will start listening for you.'}
            actions={[
              { label: 'Clear filters', icon: X, run: p.onReset },
              { label: 'Create monitor', icon: Plus, run: p.onCreateMonitor },
            ]}
          />
        )}
        {!p.loading && rows}
        {!p.loading && p.posts.length > 0 && (
          <button className="soft" style={{ justifyContent: 'center', height: 36 }} onClick={p.onLoadMore}>
            Load more posts
          </button>
        )}
      </div>
      <div style={{ position: 'sticky', bottom: 8, height: 0, display: 'flex', justifyContent: 'flex-end', pointerEvents: 'none' }}>
        {st > 500 ? (
          <button className="prim" aria-label="Back to top" style={{ pointerEvents: 'auto', position: 'relative', top: -44, borderRadius: 18, height: 36, background: c('primary', 0.92), color: '#fff', boxShadow: `0 8px 24px -8px ${c('primary', 0.8)}` }} onClick={() => p.scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}>
            <ArrowUp size={14} />
            Back to top
          </button>
        ) : (
          <button className="prim" aria-label="Quick note" style={{ pointerEvents: 'auto', position: 'relative', top: -44, borderRadius: 18, height: 36 }} onClick={() => { document.getElementById('mn-composer')?.focus(); }}>
            <Plus size={14} />
            Quick note
          </button>
        )}
      </div>
    </div>
  );
}

export default FeedView;