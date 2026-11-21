import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Dropdown, DropdownTrigger, DropdownContent, DropdownItem, DropdownSeparator } from '@renderer/components/ui/Dropdown';
import { Activity, AlertTriangle, Bookmark, Check, Filter as FilterIcon, Layers, Mail, Pause, ChevronDown, ChevronRight, Eye, EyeOff, Home, List, Pin, PinOff, RotateCcw, Search, Settings, X } from 'lucide-react';
import type { MonitorItem, Post, SourceType, ViewId } from '../types/monitor.types';
import { MON_STATUS, SRC, SRC_META } from '../constants/meta';

import { NOISE } from '../constants/styles';
import { c, tc } from '../utils/color';


import { PlatformIcon } from './common/Charts';
import type { Chip } from './ContentView/Feed/FeedView';

export const NAV: { id: ViewId; label: string; icon: typeof Home; lens?: boolean }[] = [
  { id: 'feed', label: 'Feed', icon: Home },
  { id: 'monitors', label: 'Monitors', icon: List },
  { id: 'bookmarks', label: 'Saved posts', icon: Bookmark },
];

// ASSUMED: chưa có nguồn version trong app, dùng số cũ từ HeaderBar — upgrade path: đọc version từ package.json qua IPC
const APP_VERSION = '1.2.34';

type Filter = 'all' | 'unread' | 'error' | 'paused';
type Sort = 'default' | 'name' | 'unread' | 'recent';

const FILTERS: { id: Filter; label: string; icon: typeof Layers; tone: string }[] = [
  { id: 'all', label: 'All', icon: Layers, tone: 'ts' },
  { id: 'unread', label: 'Unread', icon: Mail, tone: 'primary' },
  { id: 'error', label: 'Errors', icon: AlertTriangle, tone: 'error' },
  { id: 'paused', label: 'Paused', icon: Pause, tone: 'warn' },
];

const SORTS: { id: Sort; label: string }[] = [
  { id: 'default', label: 'Default' },
  { id: 'name', label: 'Name' },
  { id: 'unread', label: 'Unread' },
  { id: 'recent', label: 'Recent' },
];

interface Stat {
  s: SourceType;
  ms: MonitorItem[];
  unseen: number;
  total: number;
  hits: number;
  last: string | null;
  errs: MonitorItem[];
  st: MonitorItem['status'];
}

function usePersist<T>(key: string, init: T) {
  const [v, setV] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : init;
    } catch {
      return init;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {
      return;
    }
  }, [key, v]);
  return [v, setV] as const;
}

const toggle = (arr: SourceType[], s: SourceType) => (arr.includes(s) ? arr.filter((x) => x !== s) : [...arr, s]);

const pill = (bg: string, fg: string): React.CSSProperties => ({
  minWidth: 18,
  height: 16,
  padding: '0 6px',
  borderRadius: 4,
  fontSize: 10,
  background: bg,
  color: fg,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
});

interface NavigationSidebarProps {
  view: ViewId;
  setView: (v: ViewId) => void;
  chip: Chip;
  setChip: (c: Chip) => void;
  monitors: MonitorItem[];
  posts: Post[];
}

export function NavigationSidebar({ view, setView, chip, setChip, monitors, posts }: NavigationSidebarProps) {
  const [collapsed, setCollapsed] = usePersist<Record<string, boolean>>('monitor.nav.collapsed', {});
  const [pinned, setPinned] = usePersist<SourceType[]>('monitor.nav.pinned', []);
  const [hidden, setHidden] = usePersist<SourceType[]>('monitor.nav.hidden', []);
  const [filter, setFilter] = usePersist<Filter>('monitor.nav.filter', 'all');
  const [sort, setSort] = usePersist<Sort>('monitor.nav.sort', 'default');
  const [grouped, setGrouped] = usePersist<boolean>('monitor.nav.grouped', true);
  const [showHidden, setShowHidden] = usePersist<boolean>('monitor.nav.showHidden', false);
  const [compact, setCompact] = usePersist<boolean>('monitor.nav.compact', false);
  const [showHits, setShowHits] = usePersist<boolean>('monitor.nav.hits', true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menu, setMenu] = useState<{ s: SourceType; top: number; left: number } | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const real = posts.filter((p) => !p.isNote);
  const saved = real.filter((p) => p.archived).length;
  const totalUnseen = real.filter((p) => p.viewedCount === 0).length;
  const errorCount = monitors.filter((m) => m.status === 'error').length;
  const imagesUri = (window as any).__zenImagesUri || '/images';
  const pinSet = new Set(pinned);
  const hideSet = new Set(hidden);
  const groups = [...new Set(monitors.map((m) => m.group))];
  const q = query.trim().toLowerCase();

  const navBadge = (id: ViewId) => {
    if (id === 'feed' && totalUnseen > 0) return <span className='mono' style={pill(c('primary'), '#fff')}>{totalUnseen}</span>;
    if (id === 'monitors') return <span className='mono' style={pill(c('ts', 0.15), c('ts'))}>{monitors.length}</span>;
    if (id === 'bookmarks' && saved > 0) return <span className='mono' style={pill(c('ts', 0.15), c('ts'))}>{saved}</span>;
    return null;
  };

  const navBtn = (n: (typeof NAV)[number]) => {
    const on = view === n.id;
    return (
      <button key={n.id} className={`nav ${on ? 'on' : ''}`} style={{ position: 'relative', fontWeight: on ? 600 : 500 }} onClick={() => setView(n.id)}>
        {on && <span style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: 3, background: c('primary') }} />}
        <n.icon size={15} />
        <span style={{ flex: 1 }}>{n.label}</span>
        {navBadge(n.id)}
      </button>
    );
  };

  const stat = (s: SourceType, ms: MonitorItem[]): Stat => {
    const ids = new Set(ms.map((m) => m.id));
    const sp = real.filter((p) => ids.has(p.monitorId));
    const errs = ms.filter((m) => m.status === 'error');
    return {
      s,
      ms,
      unseen: sp.filter((p) => p.viewedCount === 0).length,
      total: sp.length,
      hits: ms.reduce((a, m) => a + m.hits24h, 0),
      last: sp.reduce<string | null>((a, p) => (!a || p.createdAt > a ? p.createdAt : a), null),
      errs,
      st: errs.length ? 'error' : ms.some((m) => m.status === 'running') ? 'running' : 'paused',
    };
  };

  const buildStats = (ms: MonitorItem[]) =>
    SRC.filter((s) => ms.some((m) => m.sourceType === s)).map((s) => stat(s, ms.filter((m) => m.sourceType === s)));

  const matchQ = (x: Stat) =>
    !q || SRC_META[x.s].label.toLowerCase().includes(q) || x.ms.some((m) => m.name.toLowerCase().includes(q) || m.group.toLowerCase().includes(q));
  const matchF = (x: Stat, f: Filter) =>
    f === 'all' || (f === 'unread' && x.unseen > 0) || (f === 'error' && x.errs.length > 0) || (f === 'paused' && x.st === 'paused');
  const pass = (x: Stat) => (showHidden || !hideSet.has(x.s)) && matchQ(x) && matchF(x, filter);
  const countOf = (f: Filter) => buildStats(monitors).filter((x) => (showHidden || !hideSet.has(x.s)) && matchQ(x) && matchF(x, f)).length;

  const order = (list: Stat[]) => {
    const out = list.filter(pass);
    if (sort === 'name') out.sort((a, b) => SRC_META[a.s].label.localeCompare(SRC_META[b.s].label));
    else if (sort === 'unread') out.sort((a, b) => b.unseen - a.unseen);
    else if (sort === 'recent') out.sort((a, b) => (b.last ?? '').localeCompare(a.last ?? ''));
    return out;
  };

  const actionBtn = (title: string, onClick: () => void, icon: ReactNode, active = false) => (
    <button title={title} onClick={(e) => { e.stopPropagation(); onClick(); }} style={{ display: 'inline-flex', padding: 2, borderRadius: 4, flexShrink: 0, color: active ? c('primary') : undefined }}>
      {icon}
    </button>
  );


  const renderCard = (x: Stat, key: string) => {
    const isHidden = hideSet.has(x.s);
    const active = view === 'feed' && chip === x.s && selectedKey === key;


    const open = () => {
      if (active) { setChip('all'); setSelectedKey(null); } else { setChip(x.s); setSelectedKey(key); }
      setView('feed');
    };
    return (
      <div
        key={key}
        role='button'
        tabIndex={0}
        className='nav'
        style={{ position: 'relative', flexDirection: 'column', alignItems: 'stretch', gap: 5, cursor: 'pointer', opacity: isHidden ? 0.5 : 1, padding: compact ? '6px 10px' : '8px 10px', marginBottom: 2, outline: active ? `1px dashed ${c('primary')}` : 'none', outlineOffset: -1 }}
        onContextMenu={(e) => { e.preventDefault(); setMenu({ s: x.s, top: e.clientY, left: e.clientX }); }}
        onClick={open}
        onKeyDown={(e) => { if (e.key === 'Enter') open(); }}
      >

        <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <span style={{ display: 'inline-flex', flexShrink: 0, padding: 4, borderRadius: 8, background: c('tp', 0.1) }}>
          <PlatformIcon type={x.s} size={compact ? 18 : 20} />
        </span>
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5, textAlign: 'left' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className='tr' style={{ flex: 1, fontWeight: 500 }}>{SRC_META[x.s].label}</span>


            {x.unseen > 0 && <span className='mono' title='Unread posts' style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: c('primary') }}><Mail size={12} />{x.unseen}</span>}
            <span className={x.st === 'running' ? 'dot-live' : undefined} title={MON_STATUS[x.st][0]} style={{ width: 6, height: 6, borderRadius: 6, flexShrink: 0, background: tc(MON_STATUS[x.st][1]) }} />
          </span>
          {!compact && x.ms.length > 0 && (
            <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
              {x.ms.map((m) => (
                <span key={m.id} className='mono' title={`${m.name} · ${MON_STATUS[m.status][0]} · every ${m.schedule}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, maxWidth: '100%', padding: '1px 6px', borderRadius: 4, fontSize: 10, background: c('ts', 0.1), color: c('ts') }}>
                  <span style={{ width: 5, height: 5, borderRadius: 5, flexShrink: 0, background: tc(MON_STATUS[m.status][1]) }} />
                  <span className='tr'>{m.name}</span>
                </span>
              ))}
              {showHits && <span className='sub mono' title='Hits in the last 24h' style={{ marginLeft: 'auto' }}>{x.hits}/24h</span>}
            </span>
          )}
        </span>
        </span>

          {x.errs.length > 0 && (
            <span title={x.errs.map((m) => m.name).join(', ')} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '2px 6px', borderRadius: 4, background: c('error', 0.12), color: c('error') }}>
              <AlertTriangle size={11} style={{ flexShrink: 0 }} />
              <span className='tr'>{x.errs.map((m) => m.name).join(', ')}</span>
              <span className='mono' style={{ marginLeft: 'auto', flexShrink: 0 }}>{x.errs.length === 1 ? 'error' : `${x.errs.length} errors`}</span>
            </span>
          )}
      </div>
    );
  };

  // ASSUMED: pinned services are lifted out of their project group into the Pinned section
  const pinnedCards = order(buildStats(monitors).filter((x) => pinSet.has(x.s)));
  const rest = monitors.filter((m) => !pinSet.has(m.sourceType));
  const blocks = grouped
    ? groups
        .map((g) => ({ g, cards: order(buildStats(rest.filter((m) => m.group === g))) }))
        .filter((b) => b.cards.length > 0)
    : [{ g: '', cards: order(buildStats(rest)) }].filter((b) => b.cards.length > 0);

  const check = (text: string, value: boolean, onChange: (v: boolean) => void) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
      <input type='checkbox' checked={value} onChange={(e) => onChange(e.target.checked)} style={{ accentColor: c('primary') }} />
      {text}
    </label>
  );

  const resetAll = () => {
    setPinned([]); setHidden([]); setFilter('all'); setSort('default'); setCollapsed({});
    setGrouped(true); setShowHidden(false); setCompact(false); setShowHits(true); setQuery('');
  };

  return (
    <aside className='lr scroll' style={{ width: 340, flexShrink: 0, padding: 12, borderRight: `1px solid ${c('border')}`, backgroundColor: c('panel'), backgroundImage: NOISE, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '2px 10px 6px', borderRadius: 10, marginBottom: 6 }}>
        <span style={{ display: 'inline-flex', flexShrink: 0, padding: 6, borderRadius: 10, background: c('primary', 0.16), boxShadow: `inset 0 0 0 1px ${c('primary', 0.25)}` }}>
          <img src={`${imagesUri}/phantoma-dark-logo.png`} alt='Phantoma' className='w-8 h-8 shrink-0 object-contain dark:hidden' draggable={false} />
          <img src={`${imagesUri}/phantoma-light-logo.png`} alt='Phantoma' className='w-8 h-8 shrink-0 object-contain hidden dark:block' draggable={false} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div className='tr' style={{ fontWeight: 600, fontSize: 15 }}>Monitor</div>
          <div className='sub mono'>v{APP_VERSION}</div>
        </div>
      </div>

      <div className='div-grad' style={{ margin: '0 0 8px' }} />

      {NAV.filter((n) => !n.lens).map(navBtn)}

      <div className='div-grad' style={{ margin: '12px 0 10px' }} />

      <div style={{ fontWeight: 600, fontSize: 12, margin: '0 0 8px', color: c('ts') }}>Platforms</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 0 8px' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: 11, color: c('ts') }} />
          <input className='field' value={query} onChange={(e) => setQuery(e.target.value)} placeholder='Search platforms, monitors…' style={{ paddingLeft: 30, paddingRight: 28 }} />
          {query && (
            <button title='Clear' onClick={() => setQuery('')} style={{ position: 'absolute', right: 6, top: 9, display: 'inline-flex', padding: 2 }}>
              <X size={14} />
            </button>
          )}
        </div>
        <Dropdown align='end' width={200}>
          <DropdownTrigger asChild>
            <button className='ico' title='Filter & sort' style={{ position: 'relative', flexShrink: 0 }}>
              <FilterIcon size={14} />
              {(filter !== 'all' || sort !== 'default') && <span style={{ position: 'absolute', top: 5, right: 5, width: 6, height: 6, borderRadius: 6, background: c('primary') }} />}
            </button>
          </DropdownTrigger>
          <DropdownContent>
            <div className='sub' style={{ fontWeight: 600, padding: '6px 10px 2px' }}>Status</div>
            {FILTERS.map((f) => (
              <DropdownItem key={f.id} closeOnSelect={false} icon={filter === f.id ? <Check size={13} /> : <span style={{ width: 13 }} />} onClick={() => setFilter(f.id)}>{f.label}</DropdownItem>
            ))}
            <DropdownSeparator />
            <div className='sub' style={{ fontWeight: 600, padding: '6px 10px 2px' }}>Sort by</div>
            {SORTS.map((o) => (
              <DropdownItem key={o.id} closeOnSelect={false} icon={sort === o.id ? <Check size={13} /> : <span style={{ width: 13 }} />} onClick={() => setSort(o.id)}>{o.label}</DropdownItem>
            ))}
            {grouped && groups.length > 1 && (
              <>
                <DropdownSeparator />
                <DropdownItem icon={<ChevronRight size={13} />} onClick={() => setCollapsed(Object.fromEntries(groups.map((g) => [g, true])))}>Collapse all</DropdownItem>
                <DropdownItem icon={<ChevronDown size={13} />} onClick={() => setCollapsed({})}>Expand all</DropdownItem>
              </>
            )}
          </DropdownContent>
        </Dropdown>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '0 10px 8px 0' }}>
        {FILTERS.map((f) => (
          <button key={f.id} className={`chip ${filter === f.id ? 'on' : ''}`} style={{ padding: '2px 7px', gap: 4, fontSize: 11 }} onClick={() => setFilter(f.id)}>
            <f.icon size={11} style={{ color: c(f.tone) }} />
            {f.label}
            <span className='mono' style={{ opacity: 0.65, fontSize: 10 }}>{countOf(f.id)}</span>
          </button>
        ))}
      </div>

      {pinnedCards.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          <div className='sub' style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, padding: '4px 10px' }}><Pin size={12} />Pinned</div>
          {pinnedCards.map((x) => renderCard(x, `pin:${x.s}`))}
        </div>
      )}

      {blocks.map(({ g, cards }) => {
        if (!grouped) return cards.map((x) => renderCard(x, `flat:${x.s}`));
        const open = !collapsed[g];
        const gUnseen = cards.reduce((a, x) => a + x.unseen, 0);
        const gErr = cards.reduce((a, x) => a + x.errs.length, 0);
        const gPaused = cards.reduce((a, x) => a + x.ms.filter((m) => m.status === 'paused').length, 0);
        const gRunning = cards.reduce((a, x) => a + x.ms.filter((m) => m.status === 'running').length, 0);
        return (
          <div key={g} style={{ margin: '0 -12px 6px', background: open ? c('ts', 0.07) : undefined }}>
            <button className='nav' style={{ padding: '8px 22px', borderRadius: 0 }} onClick={() => setCollapsed({ ...collapsed, [g]: open })}>
              {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span className='tr' style={{ flex: 1, fontWeight: 600 }}>{g}</span>
              {!open && gErr > 0 && <span className='mono' title='Monitors with errors' style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: c('error') }}><AlertTriangle size={12} />{gErr}</span>}
              {!open && gUnseen > 0 && <span className='mono' title='Unseen posts' style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: c('primary') }}><Mail size={12} />{gUnseen}</span>}
              {!open && gPaused > 0 && <span className='mono' title='Paused monitors' style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: c('warn') }}><Pause size={12} />{gPaused}</span>}
              {!open && gRunning > 0 && <span className='mono' title='Online monitors' style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: c('success') }}><Activity size={12} />{gRunning}</span>}
            </button>
            {open && <div style={{ padding: '0 12px 8px' }}>{cards.map((x) => renderCard(x, `${g}:${x.s}`))}</div>}
          </div>
        );
      })}

      {pinnedCards.length === 0 && blocks.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: '12px 10px' }}>
          <span className='sub'>No services match.</span>
          <button className='soft' onClick={() => { setFilter('all'); setQuery(''); }}>Clear filters</button>
        </div>
      )}

      <div style={{ marginTop: 'auto', paddingTop: 8 }}>
        {settingsOpen && (
          <div className='card-pop' style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 10, marginBottom: 8, borderRadius: 8, border: `1px solid ${c('border')}`, background: c('ts', 0.06), fontSize: 12 }}>
            {check('Group by project', grouped, setGrouped)}
            {check('Compact cards', compact, setCompact)}
            {check('Show 24h hits', showHits, setShowHits)}
            {check('Show hidden services', showHidden, setShowHidden)}
            {hidden.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className='sub' style={{ fontWeight: 600 }}>Hidden services</span>
                {hidden.map((s) => (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <PlatformIcon type={s} size={14} />
                    <span className='tr' style={{ flex: 1 }}>{SRC_META[s].label}</span>
                    {actionBtn('Unhide', () => setHidden(toggle(hidden, s)), <Eye size={12} />)}
                  </div>
                ))}
              </div>
            )}
            <button onClick={resetAll} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start', color: c('ts') }}>
              <RotateCcw size={12} />Reset sidebar
            </button>
          </div>
        )}
        <Dropdown
          className='absolute'
          open={menu !== null}
          onOpenChange={(o) => { if (!o) setMenu(null); }}
          strategy='fixed'
          position={menu ? { top: menu.top, left: menu.left } : undefined}
          width={180}
        >
          <DropdownTrigger asChild>
            <span style={{ display: 'block', width: 0, height: 0 }} />
          </DropdownTrigger>
          <DropdownContent>
            {menu && (
              <DropdownItem icon={pinSet.has(menu.s) ? <PinOff size={13} /> : <Pin size={13} />} onClick={() => setPinned(toggle(pinned, menu.s))}>
                {pinSet.has(menu.s) ? 'Unpin' : 'Pin'}
              </DropdownItem>
            )}
            {menu && (
              <DropdownItem icon={hideSet.has(menu.s) ? <Eye size={13} /> : <EyeOff size={13} />} onClick={() => setHidden(toggle(hidden, menu.s))}>
                {hideSet.has(menu.s) ? 'Unhide' : 'Hide'}
              </DropdownItem>
            )}
          </DropdownContent>
        </Dropdown>
        <button className={`nav ${settingsOpen ? 'on' : ''}`} onClick={() => setSettingsOpen(!settingsOpen)}>
          <Settings size={15} />
          <span style={{ flex: 1 }}>Settings</span>
          {errorCount > 0 && <span className='mono' title='Monitors with errors' style={pill(c('error', 0.15), c('error'))}>{errorCount}</span>}
        </button>
      </div>
    </aside>
  );
}

export default NavigationSidebar;