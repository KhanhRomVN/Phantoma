import { useState } from 'react';
import { Clock, ExternalLink, FileText, GitCompare, History, MessageSquare, Send, Star, Target, X } from 'lucide-react';
import type { MonitorItem, Post } from '../../../types/monitor.types';
import { THEME } from '../../../constants/theme';
import { SRC_META } from '../../../constants/meta';
import { c, confTone, hueOf } from '../../../utils/color';
import { fmtDate, timeAgo } from '../../../utils/format';
import { Avatar, Empty, InfoRow, Section } from '../../common/Primitives';
import { Ring } from '../../common/Charts';
import { DiffBlock, ImageBlock, MediaArea } from './Media';
import { PriorityPill, TagChip } from './FeedBits';

interface DetailProps {
  post: Post;
  monitor?: MonitorItem;
  initialTab: 'media' | 'diff';
  onClose: () => void;
  onArchive: (p: Post) => void;
  onAddNote: (id: string, text: string) => void;
  related: Post[];
  onJump: (p: Post) => void;
}

export function PostDetailDrawer({ post, monitor, initialTab, onClose, onArchive, onAddNote, related, onJump }: DetailProps) {
  const [tab, setTab] = useState<'media' | 'diff'>(initialTab);
  const [text, setText] = useState('');
  const history: [string, string][] = [
    ['Crawled', post.createdAt],
    ['Snapshot saved', new Date(new Date(post.createdAt).getTime() + 40000).toISOString()],
    ...(post.archived ? ([['Saved post', new Date().toISOString()]] as [string, string][]) : []),
  ];
  const submit = () => {
    if (!text.trim()) return;
    onAddNote(post.id, text.trim());
    setText('');
  };
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 55, background: 'rgba(4,4,9,.62)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
      <aside
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(1040px, 100vw)', height: '100%', background: c('panel'), borderLeft: `1px solid ${c('border')}`, display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: `1px solid ${c('border')}`, flexWrap: 'wrap' }}>
          <Avatar name={post.sourceName} hue={hueOf(post.sourceName)} size={30} />
          <div style={{ flex: 1, minWidth: 120 }}>
            <div className="tr" style={{ fontWeight: 600 }}>{post.title || post.sourceName}</div>
            <div className="sub">{post.sourceName} · {timeAgo(post.createdAt)}</div>
          </div>
          <button className="soft" onClick={() => onArchive(post)}>
            <Star size={13} fill={post.archived ? `rgb(${THEME.warn})` : 'none'} />
            {post.archived ? 'Saved' : 'Save'}
          </button>
          {post.diff && (
            <button className="soft" onClick={() => setTab('diff')}>
              <GitCompare size={13} />
              Diff
            </button>
          )}
          <button className="soft">
            <ExternalLink size={13} />
            Source
          </button>
          <button className="ico" onClick={onClose}>
            <X size={14} />
          </button>
        </div>
        <div className="detail-cols scroll" style={{ flex: 1, display: 'flex', gap: 16, padding: 16, overflowY: 'auto' }}>
          <div style={{ flex: 1.4, minWidth: 0 }}>
            {post.diff && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <button className={`chip ${tab === 'media' ? 'on' : ''}`} onClick={() => setTab('media')}>Content</button>
                <button className={`chip ${tab === 'diff' ? 'on' : ''}`} onClick={() => setTab('diff')}>Diff</button>
              </div>
            )}
            {post.diff && tab === 'diff' ? (
              <DiffBlock diff={post.diff} split />
            ) : post.mediaType === 'gallery' && post.mediaItems ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {post.mediaItems.map((it) => (
                  <ImageBlock key={it.url} item={it} big />
                ))}
              </div>
            ) : post.mediaType === 'text' ? (
              <div className="sec" style={{ lineHeight: 1.6 }}>{post.body}</div>
            ) : (
              <>
                <MediaArea post={post} big />
                {post.mediaType === 'diff' && null}
              </>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Section title="Content" icon={FileText} tone="primary">
              <div style={{ lineHeight: 1.55 }}>{post.body}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {post.tags.map((t) => <TagChip key={t} name={t} />)}
                <PriorityPill p={post.priority} />
              </div>
            </Section>
            <Section title="Metadata" icon={Clock} tone="info">
              <InfoRow label="Monitor">{monitor?.name || post.sourceName}</InfoRow>
              <InfoRow label="Platform">{SRC_META[post.sourceType].label}</InfoRow>
              <InfoRow label="Schedule">{monitor?.schedule || '—'}</InfoRow>
              <InfoRow label="Last crawl">{fmtDate(post.createdAt)}</InfoRow>
              <InfoRow label="Author">{post.author || '—'}</InfoRow>
              <InfoRow label="Source"><span className="mono">{post.sourceDomain}</span></InfoRow>
            </Section>
            <Section title={`Internal notes (${post.notes.length})`} icon={MessageSquare} tone="warn">
              {post.notes.length === 0 && <Empty text="No notes yet." />}
              {post.notes.map((n) => (
                <div key={n.id} className="row" style={{ alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{n.author}</div>
                    <div>{n.text}</div>
                  </div>
                  <span className="sub" style={{ flexShrink: 0 }}>{timeAgo(n.at)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <input className="field" value={text} placeholder="Add a note..." onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
                <button className="prim" onClick={submit}>
                  <Send size={13} />
                </button>
              </div>
            </Section>
            {post.confidence !== undefined && (
              <Section title="Signal confidence" icon={Target} tone={confTone(post.confidence)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Ring value={post.confidence} size={52} stroke={5} tone={confTone(post.confidence)} label={post.confidence} />
                  <div className="sub" style={{ lineHeight: 1.5 }}>Confidence is based on how much sources overlap and how stable the monitor is.</div>
                </div>
              </Section>
            )}
            {related.length > 0 && (
              <Section title="Related signals" icon={ExternalLink} tone="info">
                {related.map((r) => (
                  <button key={r.id} className="row" style={{ width: '100%', textAlign: 'left' }} onClick={() => onJump(r)}>
                    <span className="tr">{r.title || r.sourceName}</span>
                    <span className="sub">{SRC_META[r.sourceType].short}</span>
                  </button>
                ))}
              </Section>
            )}
            <Section title="History" icon={History} tone="success">
              {history.map(([label, at]) => (
                <InfoRow key={label} label={label}>{fmtDate(at)}</InfoRow>
              ))}
            </Section>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default PostDetailDrawer;