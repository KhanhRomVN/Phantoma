import { useState, useMemo, useRef, useEffect } from 'react';
import type { UIEvent, ReactNode } from 'react';
import {
  Search,
  Download,
  Share2,
  Star,
  MoreHorizontal,
  ChevronRight,
  ChevronLeft,
  Clock,
  Network,
  Database,
  Info,
  Server,
  Link2,
  FileText,
  Table2,
  List,
  Tag,
  ChevronsUpDown,
  BarChart3,
  History,
  ListChecks,
  Code,
  StickyNote,
  Quote,
  MessageSquare,
  LayoutGrid,
  Check,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { parseReconFile } from './ui/parser';
import type { ReconTab, ReconTask } from './ui/types';
import BoxGrid from './ui/BoxGrid';
import { ReconGraphContext } from './ui/Graph/ReconGraphContext';
import { applyRects } from './ui/layout';
import { cn } from '@renderer/shared/utils/cn';
import { Dropdown, DropdownTrigger, DropdownContent, DropdownItem } from '@renderer/components/ui/Dropdown';
import { TYPE_META, resolveType, withAlpha, TypeIcon, TypeBadgeIcon } from './targetType';

// Tự nạp mọi file _*.recon trong thư mục mock: thêm/xoá file mock không cần sửa import.
const MOCK_MODULES = import.meta.glob('../mock/**/_*.recon', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** Bộ mock đang dùng (tên thư mục con của mock/). */
const MOCK_FOLDER = 'mock1';

const MOCK_FILES: Record<string, string> = Object.fromEntries(
  Object.entries(MOCK_MODULES)
    .filter(([path]) => path.includes(`/mock/${MOCK_FOLDER}/`))
    .map(([path, content]) => [path.split('/').pop() as string, content])
);

/** Các tag đầu tiên mỗi tag một màu accent; các tag phía sau dùng chung một màu trung tính. */
const TAG_ACCENTS = ['#3686ff', '#a855f7', '#22c55e', '#f97316'];

/** Icon theo tên tab (tên file không đuôi); tab lạ dùng FileText. */
const TAB_ICONS: Record<string, LucideIcon> = {
  information: Info,
  infrastructure: Server,
  sources: Link2,
  table: Table2,
  kv: List,
  badges: Tag,
  accordion: ChevronsUpDown,
  text: FileText,
  stats: BarChart3,
  timeline: History,
  checklist: ListChecks,
  links: Link2,
  graph: Share2,
  code: Code,

  callout: Info,
  sticky: StickyNote,
  quote: Quote,
  annotation: MessageSquare,
};

/** Màu accent theo tên tab cho vạch gradient ở đáy; tab lạ dùng TAB_ACCENT_DEFAULT. */
const TAB_ACCENTS: Record<string, string> = {
  information: '#a855f7',
  infrastructure: '#22c55e',
  sources: '#f97316',
  table: '#3686ff',
  kv: '#a855f7',
  badges: '#22c55e',
  accordion: '#f97316',
  text: '#eab308',
  stats: '#ec4899',
  timeline: '#06b6d4',
  checklist: '#22c55e',
  links: '#3686ff',
  graph: '#a855f7',
  code: '#9ca3af',

  callout: '#eab308',
  sticky: '#ec4899',
  quote: '#06b6d4',
  annotation: '#3686ff',
};
const TAB_ACCENT_DEFAULT = '#a855f7';

const ARROW_BTN =
  'shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-sidebar-item-hover transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-default';

/** Định dạng thời điểm sửa đổi; nếu không parse được thì giữ nguyên chuỗi gốc. */
function formatUpdated(raw: string): string {
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function HeaderIconButton({
  title,
  onClick,
  highlighted,
  children,
}: {
  title: string;
  onClick?: () => void;
  highlighted?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={cn(
        'w-7 h-7 rounded-md flex items-center justify-center transition-colors hover:bg-sidebar-item-hover',
        highlighted ? 'text-amber-400' : 'text-text-secondary hover:text-text-primary'
      )}
    >
      {children}
    </button>
  );
}

function Stat({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <span className='inline-flex items-center gap-1'>
      <Icon className='w-3 h-3' strokeWidth={2} />
      {text}
    </span>
  );
}

interface TabBarProps {
  tabs: ReconTab[];
  activeIndex: number;
  onSelect: (index: number) => void;
  stuck: boolean;
}

/**
 * TabBar: icon + tên + số box; tab đang chọn chỉ có vạch gradient ở đáy.
 * Khi tràn: cuộn ngang (mờ mép), nút mũi tên trái/phải và nút ⋯ liệt kê toàn bộ tab.
 * Sticky ở top của vùng cuộn; `stuck` bật bóng đổ khi header phía trên đã cuộn khuất.
 */
function TabBar({ tabs, activeIndex, onSelect, stuck }: TabBarProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [edges, setEdges] = useState({ overflowing: false, canLeft: false, canRight: false });
  // Chỉ số các tab chưa nằm trọn trong vùng nhìn thấy; menu ⋯ chỉ liệt kê những tab này
  const [hidden, setHidden] = useState<number[]>([]);

  const updateEdges = () => {
    const el = listRef.current;
    if (!el) return;
    const next = {
      overflowing: el.scrollWidth > el.clientWidth + 1,
      canLeft: el.scrollLeft > 1,
      canRight: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
    };
    setEdges((prev) =>
      prev.overflowing === next.overflowing &&
      prev.canLeft === next.canLeft &&
      prev.canRight === next.canRight
        ? prev
        : next
    );

    const hiddenNext: number[] = [];
    itemRefs.current.forEach((item, idx) => {
      if (!item) return;
      const left = item.offsetLeft;
      const right = left + item.offsetWidth;
      if (left < el.scrollLeft - 1 || right > el.scrollLeft + el.clientWidth + 1) hiddenNext.push(idx);
    });
    setHidden((prev) =>
      prev.length === hiddenNext.length && prev.every((v, i) => v === hiddenNext[i]) ? prev : hiddenNext
    );
  };

  // Đo lại khi danh sách tab hoặc độ rộng thay đổi
  useEffect(() => {
    updateEdges();
    const el = listRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);
    return () => ro.disconnect();
  }, [tabs]);

  // Tự cuộn tab đang chọn vào vùng nhìn thấy (chỉ cuộn ngang, không đụng cuộn dọc)
  useEffect(() => {
    const el = listRef.current;
    const item = itemRefs.current[activeIndex];
    if (!el || !item) return;
    const left = item.offsetLeft;
    const right = left + item.offsetWidth;
    if (left < el.scrollLeft + 32) {
      el.scrollTo({ left: Math.max(0, left - 32), behavior: 'smooth' });
    } else if (right > el.scrollLeft + el.clientWidth - 32) {
      el.scrollTo({ left: right - el.clientWidth + 32, behavior: 'smooth' });
    }
  }, [activeIndex]);

  // Cuộn ngang bằng con lăn chuột (không cần giữ Shift); listener non-passive để chặn cuộn dọc
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const scrollByPage = (dir: -1 | 1) => {
    const el = listRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.6, behavior: 'smooth' });
  };

  // Chỉ mờ ở phía còn nội dung bị che
  const stops = [
    edges.canLeft ? 'transparent 0px, black 28px' : 'black 0px',
    edges.canRight ? 'black calc(100% - 28px), transparent 100%' : 'black 100%',
  ].join(', ');
  const mask = `linear-gradient(to right, ${stops})`;

  return (
    <div
      className={cn(
        'sticky top-0 z-20 shrink-0 bg-background border-b border-border transition-shadow',
        stuck && 'shadow-[0_2px_10px_rgba(0,0,0,0.25)]'
      )}
    >
      <div className='flex items-center gap-1 px-2'>
        {edges.overflowing && (
          <button
            onClick={() => scrollByPage(-1)}
            disabled={!edges.canLeft}
            className={ARROW_BTN}
            title='Cuộn trái'
          >
            <ChevronLeft className='w-4 h-4' />
          </button>
        )}

        <div
          ref={listRef}
          onScroll={updateEdges}
          className='relative flex-1 min-w-0 flex overflow-x-auto [&::-webkit-scrollbar]:hidden'
          style={{ maskImage: mask, WebkitMaskImage: mask, scrollbarWidth: 'none' }}
        >
          {tabs.map((tab, idx) => {
            const Icon = TAB_ICONS[tab.name] ?? FileText;
            const selected = idx === activeIndex;
            return (
              <button
                key={tab.name}
                ref={(el) => {
                  itemRefs.current[idx] = el;
                }}
                onClick={() => onSelect(idx)}
                className={cn(
                  'relative shrink-0 flex items-center gap-2 px-4 h-10 text-sm font-medium whitespace-nowrap transition-colors',
                  selected ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'
                )}
              >
                <Icon className={cn('w-4 h-4', selected && 'text-primary')} strokeWidth={2} />
                {tab.title}
                <span
                  className={cn(
                    'min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold tabular-nums flex items-center justify-center',
                    selected ? 'bg-primary/15 text-primary' : 'bg-border/40 text-text-secondary'
                  )}
                >
                  {tab.boxes.length}
                </span>
                {selected && (
                  <span
                    className='absolute left-3 right-3 bottom-0 h-0.5 rounded-full bg-gradient-to-r from-primary to-[color:var(--tab-accent)]'
                    style={{ ['--tab-accent' as string]: TAB_ACCENTS[tab.name] ?? TAB_ACCENT_DEFAULT }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {edges.overflowing && (
          <>
            <button
              onClick={() => scrollByPage(1)}
              disabled={!edges.canRight}
              className={ARROW_BTN}
              title='Cuộn phải'
            >
              <ChevronRight className='w-4 h-4' />
            </button>

            <div className='shrink-0'>
              <Dropdown strategy='fixed' align='end' width={224}>
                <DropdownTrigger asChild>
                  <button className={ARROW_BTN} title='Tất cả tab'>
                    <MoreHorizontal className='w-4 h-4' />
                  </button>
                </DropdownTrigger>
                <DropdownContent className='max-h-72 overflow-y-auto gap-1'>
                  {hidden.map((idx) => {
                    const tab = tabs[idx];
                    const Icon = TAB_ICONS[tab.name] ?? FileText;
                    const accent = TAB_ACCENTS[tab.name] ?? TAB_ACCENT_DEFAULT;
                    return (
                      <DropdownItem
                        key={tab.name}
                        icon={<Icon className='w-3.5 h-3.5' strokeWidth={2} style={{ color: accent }} />}
                        onClick={() => onSelect(idx)}
                        className={cn(idx === activeIndex && 'bg-primary/10')}
                      >
                        <span className='flex-1 truncate'>{tab.title}</span>
                        <span className='text-[10px] tabular-nums text-text-secondary'>{tab.boxes.length}</span>
                      </DropdownItem>
                    );
                  })}
                </DropdownContent>
              </Dropdown>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export interface ContentPanelProps {
  /** Optional: pass a custom set of files instead of the default mock1 */
  files?: Record<string, string>;
}

export default function ContentPanel({ files: sourceFiles = MOCK_FILES }: ContentPanelProps) {
  // Chế độ chỉnh bố cục + nội dung file đã chỉnh (ghi đè lên file gốc, chỉ giữ trong bộ nhớ)
  const [editing, setEditing] = useState(false);
  const [edited, setEdited] = useState<Record<string, string>>({});
  const files = useMemo(() => ({ ...sourceFiles, ...edited }), [sourceFiles, edited]);
  
  // Parse all files into Tasks/Tabs structure
  const parsedData = useMemo(() => {
    let taskMeta: Partial<ReconTask> = {};
    const tabs: ReconTab[] = [];
    const warnings: string[] = [];

    // Process each file
    Object.entries(files).forEach(([filename, content]) => {
      const result = parseReconFile(filename, content);
      
      if (result.taskMeta) {
        taskMeta = { ...taskMeta, ...result.taskMeta };
      }
      
      if (result.tab) {
        tabs.push(result.tab);
      }
      
      if (result.warnings.length > 0) {
        warnings.push(...result.warnings.map(w => `${filename}: ${w}`));
      }
    });

    // Sort tabs alphabetically by name as per spec 2.4
    tabs.sort((a, b) => a.name.localeCompare(b.name));

    return { taskMeta, tabs, warnings };
  }, [files]);

  const { taskMeta, tabs, warnings } = parsedData;
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stuck, setStuck] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  if (tabs.length === 0 && !taskMeta.title) {
     return (
       <div className="flex-1 flex items-center justify-center text-text-secondary">
         <span>Không tìm thấy dữ liệu hợp lệ.</span>
       </div>
     );
  }

  const currentTab = tabs[activeTabIndex];
  const type = resolveType(taskMeta.targetType);
  const { label: typeLabel, color: typeColor } = TYPE_META[type];
  const tags = taskMeta.tags ?? [];
  const name = taskMeta.title || 'Untitled Task';

  // Header cuộn khuất hẳn => chỉ còn tabBar bám ở top
  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    setStuck(e.currentTarget.scrollTop >= (headerRef.current?.offsetHeight ?? 0) - 1);
  };

  // Đổi tab khi đang thu gọn: đưa nội dung tab mới về đầu, ngay dưới tabBar
  const handleSelectTab = (index: number) => {
    setActiveTabIndex(index);
    if (stuck && scrollRef.current) {
      scrollRef.current.scrollTop = headerRef.current?.offsetHeight ?? 0;
    }
  };


  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className='flex-1 h-full w-full overflow-y-auto bg-background flex flex-col'
    >
      <header ref={headerRef} className='shrink-0 px-4 pt-3 pb-3 space-y-3'>
        {/* Row 1: breadcrumb + actions */}
        <div className='flex items-center justify-between gap-3'>
          <nav className='flex items-center gap-1.5 min-w-0 text-xs text-text-secondary'>
            <span className='hover:text-text-primary transition-colors'>Phantoma</span>
            <ChevronRight className='w-3 h-3 shrink-0 opacity-50' />
            <span className='hover:text-text-primary transition-colors'>Recon</span>
            <ChevronRight className='w-3 h-3 shrink-0 opacity-50' />
            <span className='hover:text-text-primary transition-colors'>{typeLabel}</span>
            <ChevronRight className='w-3 h-3 shrink-0 opacity-50' />
            <span className='truncate font-medium text-text-primary'>{name}</span>
          </nav>

          <div className='flex items-center gap-1 shrink-0'>
            {/* Warnings Toggle (Dev Mode Placeholder) */}
            {warnings.length > 0 && (
              <details className='relative mr-1 text-xs text-yellow-500 cursor-pointer'>
                <summary>⚠️ {warnings.length}</summary>
                <ul className='absolute right-0 top-full mt-1 z-30 w-80 pl-6 pr-2 py-2 list-disc text-left max-h-32 overflow-auto bg-card-background p-2 rounded border border-yellow-500/20 shadow-xl'>
                  {warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </details>
            )}

            <div className='relative mr-1'>
              <Search
                className='absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary/60 pointer-events-none'
                strokeWidth={1.5}
              />
              <input
                type='text'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Tìm trong hồ sơ...'
                className='w-52 h-7 bg-input-background border border-input-border-default rounded-md pl-8 pr-2 text-xs text-text-primary placeholder:text-text-secondary/50 focus:border-primary/50 outline-none transition-colors'
              />
            </div>

            <button
              title={editing ? 'Hoàn tất chỉnh bố cục' : 'Chỉnh bố cục (kéo thả / đổi cỡ ô)'}
              onClick={() => setEditing((v) => !v)}
              className={cn(
                'h-7 rounded-md flex items-center gap-1.5 px-2 text-xs font-medium transition-colors',
                editing
                  ? 'bg-primary text-white hover:bg-primary/90'
                  : 'text-text-secondary hover:text-text-primary hover:bg-sidebar-item-hover'
              )}
            >
              {editing ? (
                <Check className='w-4 h-4' strokeWidth={2} />
              ) : (
                <LayoutGrid className='w-4 h-4' strokeWidth={1.5} />
              )}
              {editing && 'Xong'}
            </button>
            <HeaderIconButton title='Xuất'>
              <Download className='w-4 h-4' strokeWidth={1.5} />
            </HeaderIconButton>
            <HeaderIconButton title='Chia sẻ'>
              <Share2 className='w-4 h-4' strokeWidth={1.5} />
            </HeaderIconButton>
            <HeaderIconButton
              title={isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}
              highlighted={isFavorite}
              onClick={() => setIsFavorite((v) => !v)}
            >
              <Star className={cn('w-4 h-4', isFavorite && 'fill-current')} strokeWidth={1.5} />
            </HeaderIconButton>
            <HeaderIconButton title='Thêm'>
              <MoreHorizontal className='w-4 h-4' strokeWidth={1.5} />
            </HeaderIconButton>
          </div>
        </div>

        {/* Row 2: badge icon (cao bằng 3 dòng) + title / tags / stats */}
        <div className='flex items-stretch gap-3'>
          <div className='relative w-16 shrink-0 min-h-[64px]'>
            <TypeBadgeIcon type={type} className='absolute inset-x-0 inset-y-[10%] rounded-xl' iconSize={28} />
          </div>

          <div className='min-w-0 flex-1 flex flex-col justify-center gap-1.5'>
            {/* Line 1: title + target_type badge */}
            <div className='flex items-center gap-2 min-w-0'>
              <h1 className='text-lg font-bold leading-tight text-text-primary truncate'>{name}</h1>
              <span
                className='shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium'
                style={{ backgroundColor: withAlpha(typeColor, 0.15), color: typeColor }}
              >
                <TypeIcon type={type} size={11} />
                {typeLabel}
              </span>
              {taskMeta.status && (
                <span className={cn(
                  'shrink-0 px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wide',
                  taskMeta.status === 'active' ? 'bg-green-900/30 text-green-400 border border-green-500/30' :
                  taskMeta.status === 'done' ? 'bg-blue-900/30 text-blue-400 border border-blue-500/30' :
                  'bg-gray-800 text-gray-400 border border-gray-600'
                )}>
                  {taskMeta.status}
                </span>
              )}
            </div>

            {/* Line 2: tags (đầu nhiều màu accent, sau dùng 1 màu) */}
            {tags.length > 0 && (
              <div className='flex items-center gap-1.5 overflow-hidden'>
                {tags.map((tag, i) => {
                  const accent = i < TAG_ACCENTS.length ? TAG_ACCENTS[i] : null;
                  return (
                    <span
                      key={`${tag}-${i}`}
                      className={cn(
                        'shrink-0 px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap',
                        !accent && 'bg-border/30 text-text-secondary'
                      )}
                      style={accent ? { backgroundColor: withAlpha(accent, 0.15), color: accent } : undefined}
                    >
                      {tag}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Line 3: stats */}
            <div className='flex items-center flex-wrap gap-x-4 gap-y-1 text-[11px] text-text-secondary'>
              {taskMeta.updated && (
                <Stat icon={Clock} text={`Cập nhật ${formatUpdated(taskMeta.updated)}`} />
              )}
              {taskMeta.entityCount !== undefined && (
                <Stat icon={Network} text={`${taskMeta.entityCount} thực thể`} />
              )}
              {taskMeta.sourceCount !== undefined && (
                <Stat icon={Database} text={`${taskMeta.sourceCount} nguồn dữ liệu`} />
              )}
            </div>
          </div>
        </div>
      </header>

      <TabBar tabs={tabs} activeIndex={activeTabIndex} onSelect={handleSelectTab} stuck={stuck} />

      {/* Main Content Grid (Lego Layout) */}
      <main className="flex-1 p-4">
        {currentTab && currentTab.boxes.length > 0 ? (
          <ReconGraphContext.Provider value={{ tabs, activeTab: currentTab.name }}>
            <BoxGrid
              key={currentTab.name}
              boxes={currentTab.boxes}
              editing={editing}
              scrollRef={scrollRef}
              onCommit={(rects) => {
                const filename = `_${currentTab.name}.recon`;
                const content = files[filename];
                if (content === undefined) return;
                setEdited((prev) => ({ ...prev, [filename]: applyRects(content, rects) }));
              }}
            />
          </ReconGraphContext.Provider>
        ) : (
          <div className="h-full min-h-[160px] flex items-center justify-center text-text-secondary italic">
            Tab này chưa có nội dung.
          </div>
        )}
      </main>
    </div>
  );
}