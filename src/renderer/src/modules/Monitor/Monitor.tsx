import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Check, Command, ExternalLink, FileText, GitCompare, Layers, List, MessageSquare, Minimize2, MoreHorizontal, Palette, Plus, RefreshCw, Search, Star, Trash2, X, Zap } from 'lucide-react';
import type { Density, MediaKind, MonitorItem, Post, Priority, ViewId } from './types/monitor.types';
import { ACCENTS, DENS, THEME } from './constants/theme';
import { MEDIA_KINDS, SRC, SRC_META } from './constants/meta';
import { CSS, CSS_EXTRA } from './constants/styles';
import { MOCK_GROUPS, MOCK_MONITORS } from './mocks/monitors';
import { MOCK_POSTS, MOCK_TAGS, buildPost } from './mocks/posts';
import { c } from './utils/color';
import { uid } from './utils/random';
import { NAV, NavigationSidebar } from './components/NavigationSidebar';
import { ContextSidebar } from './components/ContextSidebar';
import { CommandPalette } from './components/CommandPalette';
import type { Cmd } from './components/CommandPalette';
import { WizardModal } from './components/modal/QuickModals';
import { FeedView } from './components/ContentView/Feed/FeedView';
import type { Chip } from './components/ContentView/Feed/FeedView';
import { PostDetailDrawer } from './components/ContentView/Feed/PostDetailDrawer';
import { MonitorsView } from './components/ContentView/Monitor/MonitorsView';
import { BookmarkView } from './components/ContentView/Bookmark/BookmarkView';

export function Monitor() {
  const [view, setView] = useState<ViewId>('feed');
  const [chip, setChip] = useState<Chip>('all');
  const [group, setGroup] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [media, setMedia] = useState<Set<MediaKind>>(new Set(MEDIA_KINDS));
  const [priority, setPriority] = useState<'all' | Priority>('all');
  const [posts, setPosts] = useState<Post[]>(MOCK_POSTS);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [monitors, setMonitors] = useState<MonitorItem[]>(MOCK_MONITORS);
  const [loading, setLoading] = useState(true);
  const [newCount, setNewCount] = useState(0);
  const [detail, setDetail] = useState<{ id: string; tab: 'media' | 'diff' } | null>(null);
  const [wizard, setWizard] = useState(false);
  const [menu, setMenu] = useState<{ post: Post; x: number; y: number } | null>(null);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const [focus, setFocus] = useState(false);
  const [density, setDensity] = useState<Density>('cozy');
  const [accent, setAccent] = useState(ACCENTS[0]);
  const [palette, setPalette] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [seen, setSeen] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const extra = useRef(24);
  const toastSeq = useRef(0);

  const say = (text: string) => {
    const id = ++toastSeq.current;
    setToasts((t) => [...t.slice(-3), { id, text }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2200);
  };
  useEffect(() => {
    const t1 = window.setTimeout(() => setLoading(false), 900);
    const t2 = window.setTimeout(() => setNewCount(2), 9000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  const monitorOf = (id: string) => monitors.find((m) => m.id === id);
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = posts.filter((p) => {
      if (hidden.has(p.id)) return false;
      if (p.isNote) return true;
      if (chip !== 'all' && p.sourceType !== chip) return false;
      if (group && monitors.find((m) => m.id === p.monitorId)?.group !== group) return false;
      if (tag && !p.tags.includes(tag)) return false;
      if (!media.has(p.mediaType)) return false;
      if (priority !== 'all' && p.priority !== priority) return false;
      if (q && !`${p.title || ''} ${p.body} ${p.sourceName} ${p.tags.join(' ')}`.toLowerCase().includes(q)) return false;
      return true;
    });
    return [...list.filter((p) => p.pinned), ...list.filter((p) => !p.pinned)];
  }, [posts, hidden, chip, group, tag, media, priority, monitors, search]);

  const patch = (id: string, fn: (p: Post) => Post) => setPosts((ps) => ps.map((p) => (p.id === id ? fn(p) : p)));
  const archive = (post: Post) => {
    patch(post.id, (p) => ({ ...p, archived: !p.archived, stage: !p.archived ? 'saved' : 'new' }));
    if (!post.archived) {
      setFlashId(post.id);
      window.setTimeout(() => setFlashId(null), 1100);
    }
    say(post.archived ? 'Removed from saved posts' : 'Saved post');
  };
  const openPost = (post: Post, tab: 'media' | 'diff' = 'media') => {
    patch(post.id, (p) => ({ ...p, viewedCount: p.viewedCount + 1 }));
    setSeen((s) => [post.id, ...s.filter((x) => x !== post.id)].slice(0, 12));
    setDetail({ id: post.id, tab });
  };
  const addNote = (id: string, text: string) =>
    patch(id, (p) => ({ ...p, notes: [...p.notes, { id: uid('note'), author: 'you', text, at: new Date().toISOString() }] }));
  const composeNote = (text: string, pin: boolean, team: boolean, exp: boolean) => {
    const note: Post = {
      id: uid('post'),
      monitorId: 'note',
      sourceType: 'reddit',
      sourceName: 'My note',
      sourceDomain: 'internal',
      body: text,
      mediaType: 'text',
      tags: [],
      priority: 'low',
      createdAt: new Date().toISOString(),
      archived: false,
      notes: [],
      viewedCount: 0,
      isNote: true,
      pinned: pin,
      assigned: team,
      expires: exp,
    };
    setPosts((ps) => [note, ...ps]);
    say('Note posted');
  };
  const showNew = () => {
    const fresh = [buildPost(extra.current++, 0.01), buildPost(extra.current++, 0.02)];
    setPosts((ps) => [...fresh, ...ps]);
    setNewCount(0);
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const loadMore = () => {
    const oldest = 72 + (extra.current - 24) * 3;
    const more = Array.from({ length: 4 }, (_, k) => buildPost(extra.current++, oldest + k * 3));
    setPosts((ps) => [...ps, ...more]);
  };

  const resetFilters = () => {
    setChip('all');
    setGroup(null);
    setTag(null);
    setSearch('');
    setPriority('all');
    setMedia(new Set(MEDIA_KINDS));
  };
  const relatedOf = (post: Post): Post[] =>
    posts
      .filter((o) => !o.isNote && o.id !== post.id)
      .map((o) => ({ o, score: o.tags.filter((t) => post.tags.includes(t)).length * 2 + (o.monitorId === post.monitorId ? 1 : 0) }))
      .filter((x) => x.score >= 2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map((x) => x.o);
  const detailPost = detail ? posts.find((p) => p.id === detail.id) : undefined;
  const seenIds = useMemo(() => new Set(seen), [seen]);
  const running = monitors.filter((m) => m.status === 'running').length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && !!e.target.closest('input,textarea,select');
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette((p) => !p);
        return;
      }
      if (e.key === 'Escape') {
        if (palette) setPalette(false);
        else if (wizard) setWizard(false);
        else if (detail) setDetail(null);
        else if (menu) setMenu(null);
        else if (railOpen) setRailOpen(false);
        else if (focus) setFocus(false);
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'f' || e.key === 'F') {
        setView('feed');
        setFocus((f) => !f);
      } else if (e.key === '/') {
        e.preventDefault();
        setView('feed');
        window.setTimeout(() => document.getElementById('mn-search')?.focus(), 30);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [palette, wizard, detail, menu, railOpen, focus]);

  const cmds: Cmd[] = [
    ...NAV.map((n) => ({ id: `v-${n.id}`, label: `Go to ${n.label}`, group: 'Navigation', icon: n.icon, run: () => setView(n.id) })),
    { id: 'a-focus', label: 'Toggle Focus mode', hint: 'F', group: 'Actions', icon: Minimize2, run: () => { setView('feed'); setFocus((f) => !f); } },
    { id: 'a-monitor', label: 'Create new monitor', group: 'Actions', icon: Plus, run: () => setWizard(true) },
    { id: 'a-note', label: 'Write a quick note', group: 'Actions', icon: MessageSquare, run: () => { setView('feed'); window.setTimeout(() => document.getElementById('mn-composer')?.focus(), 30); } },
    { id: 'a-new', label: 'Load new posts', group: 'Actions', icon: RefreshCw, run: () => { setView('feed'); showNew(); } },
    { id: 'a-high', label: 'Show high priority only', group: 'Actions', icon: Zap, run: () => { setView('feed'); setPriority('high'); } },
    { id: 'a-reset', label: 'Clear all filters', group: 'Actions', icon: X, run: resetFilters },
    ...(['compact', 'cozy', 'spacious'] as Density[]).map((d) => ({ id: `d-${d}`, label: `Density: ${d}`, group: 'Appearance', icon: Layers, run: () => setDensity(d) })),
    ...ACCENTS.slice(0, 4).map((a, i) => ({ id: `ac-${i}`, label: `Accent #${i + 1}`, group: 'Appearance', icon: Palette, run: () => setAccent(a) })),
    ...SRC.map((s) => ({ id: `s-${s}`, label: `Filter platform: ${SRC_META[s].short}`, group: 'Platforms', icon: Search, run: () => { setView('feed'); setChip(s); } })),
    ...MOCK_GROUPS.map((g) => ({ id: `g-${g.id}`, label: `Project: ${g.name}`, group: 'Groups / Tags', icon: FileText, run: () => { setView('feed'); setGroup(g.name); } })),
    ...MOCK_TAGS.map((t) => ({ id: `t-${t.name}`, label: `Tag #${t.name}`, group: 'Groups / Tags', icon: Search, run: () => { setView('feed'); setTag(t.name); } })),
  ];

  return (
    <div
      className={`mn ${focus ? 'focus' : ''}`}
      style={{ ['--pad' as string]: DENS[density], ['--primary' as string]: accent } as CSSProperties}
      onClick={() => setMenu(null)}
    >
      <style>{CSS}{CSS_EXTRA}</style>
      <NavigationSidebar view={view} setView={setView} chip={chip} setChip={setChip} monitors={monitors} posts={posts} />
      <main style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex' }}>
        {view === 'feed' && (
          <FeedView
            posts={visible}
            allPosts={posts}
            loading={loading}
            running={running}
            chip={chip}
            setChip={setChip}
            group={group}
            tag={tag}
            setGroup={setGroup}
            setTag={setTag}
            search={search}
            setSearch={setSearch}
            newCount={newCount}
            onShowNew={showNew}
            onLoadMore={loadMore}
            onCreateMonitor={() => setWizard(true)}
            onNote={composeNote}
            onView={setView}
            onQuick={() => setPriority('high')}
            onReset={resetFilters}
            onRail={() => setRailOpen(true)}
            scrollRef={scrollRef}
            cardProps={{ onOpen: openPost, onArchive: archive, onMenu: (post, x, y) => setMenu({ post, x, y }), flashId, seenIds, relatedOf }}
          />
        )}
        {view === 'monitors' && <MonitorsView monitors={monitors} setMonitors={setMonitors} say={say} onCreate={() => setWizard(true)} />}
        {view === 'bookmarks' && <BookmarkView posts={posts.filter((p) => !p.isNote && p.archived && !hidden.has(p.id))} onOpen={openPost} onUnsave={archive} />}

      </main>
      {view === 'feed' && (
        <ContextSidebar priority={priority} setPriority={setPriority} monitors={monitors} posts={posts} open={railOpen} onClose={() => setRailOpen(false)} />
      )}

      <nav className="bnav" aria-label="Main navigation">
        {NAV.filter((n) => !n.lens).map((n) => (
          <button key={n.id} className={`nav ${view === n.id ? 'on' : ''}`} aria-label={n.label} style={{ width: 'auto', position: 'relative', flexDirection: 'column', gap: 2, fontSize: 10, borderRadius: 16 }} onClick={() => setView(n.id)}>
            <n.icon size={17} />
            {n.label}
            {n.id === 'feed' && newCount > 0 && <span className="mono" style={{ position: 'absolute', top: 2, right: 4, minWidth: 14, height: 14, borderRadius: 7, fontSize: 9, background: c('primary'), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{newCount}</span>}
          </button>
        ))}
        <button className="ico" aria-label="Command palette" style={{ borderRadius: 16 }} onClick={() => setPalette(true)}><Command size={16} /></button>
      </nav>

      {focus && (
        <button className="soft card-pop" style={{ position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 59, borderRadius: 18, background: 'rgba(17,17,29,.8)', backdropFilter: 'blur(10px)' }} onClick={() => setFocus(false)}>
          <Minimize2 size={13} />
          Focus mode · exit <kbd>F</kbd>
        </button>
      )}

      {menu && (
        <div className="menu" style={{ top: Math.min(menu.y, window.innerHeight - 340), left: Math.max(8, Math.min(menu.x - 160, window.innerWidth - 210)) }} onClick={(e) => e.stopPropagation()}>
          <button onClick={() => { archive(menu.post); setMenu(null); }}><Star size={14} />{menu.post.archived ? 'Unsave post' : 'Save post'}</button>
          {menu.post.diff && <button onClick={() => { openPost(menu.post, 'diff'); setMenu(null); }}><GitCompare size={14} />Diff</button>}
          <button onClick={() => { openPost(menu.post); setMenu(null); }}><ExternalLink size={14} />Source</button>
          <button onClick={() => { say('Added tag #research'); setMenu(null); }}>#  Add tag</button>
          <button onClick={() => { setHidden((h) => new Set(h).add(menu.post.id)); setMenu(null); say('Post hidden'); }}><Trash2 size={14} />Hide post</button>
          <button onClick={() => { setView('monitors'); setMenu(null); }}><List size={14} />View monitors</button>
          <button onClick={() => { say('More…'); setMenu(null); }}><MoreHorizontal size={14} />More</button>
        </div>
      )}

      {detailPost && detail && (
        <PostDetailDrawer
          key={detail.id + detail.tab}
          post={detailPost}
          monitor={monitorOf(detailPost.monitorId)}
          initialTab={detail.tab}
          related={relatedOf(detailPost)}
          onJump={(p) => openPost(p)}
          onClose={() => setDetail(null)}
          onArchive={archive}
          onAddNote={addNote}
        />
      )}
      {wizard && (
        <WizardModal
          onClose={() => setWizard(false)}
          onDone={(m) => {
            setMonitors((ms) => [m, ...ms]);
            setWizard(false);
            say(`Created monitor ${m.name}`);
          }}
        />
      )}
      {palette && <CommandPalette cmds={cmds} onClose={() => setPalette(false)} />}
      <div aria-live="polite" style={{ position: 'fixed', top: 16, right: 16, zIndex: 100, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
        {toasts.map((t) => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 10, background: 'rgba(17,17,29,.85)', backdropFilter: 'blur(10px)', border: `1px solid ${c('primary', 0.4)}`, boxShadow: `0 10px 30px -10px ${c('primary', 0.5)}`, animation: 'mnslide .25s ease-out both' }}>
            <Check size={14} color={`rgb(${THEME.success})`} />
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Monitor;