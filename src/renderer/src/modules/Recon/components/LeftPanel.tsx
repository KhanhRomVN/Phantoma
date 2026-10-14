import { useState, useRef, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { ReconTarget } from '../../../controller/ReconController';
import { cn } from '@renderer/shared/utils/cn';
import { $ } from '@renderer/utils/color';
import { parseReconFile } from './ui/parser';
import { TYPE_META, TYPE_ORDER, resolveType, withAlpha, TypeIcon, TypeBadgeIcon } from './targetType';
import type { TargetType } from './targetType';
import mockIndexRaw from '../mock/mock1/_index.recon?raw';

const MOCK_ID = 'mock-report-nva';
const FALLBACK_SUBTITLE = 'Chưa có mô tả'; // Tạm thời, chờ quyết định nội dung dòng 2

interface LeftPanelProps {
  targets: ReconTarget[];
  activeTargetId: string | null;
  onTargetSelect: (targetId: string) => void;
  onLaunchBrowser: (targetId: string) => void;
  onCloseBrowser: (targetId: string) => void;
  onSelectMock?: () => void;
  onAddTargetClick?: () => void; // Callback to open modal
}

export default function LeftPanel({
  targets,
  activeTargetId,
  onTargetSelect,
  onLaunchBrowser,
  onCloseBrowser,
  onSelectMock,
  onAddTargetClick,
}: LeftPanelProps) {
  const [width, setWidth] = useState(320); // Default w-80 (20rem * 16px)
  const [isResizing, setIsResizing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TargetType | null>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // Title + type của hồ sơ mẫu lấy từ _index.recon
  const mockMeta = useMemo(() => parseReconFile('_index.recon', mockIndexRaw).taskMeta ?? {}, []);
  const mockType = resolveType(mockMeta.targetType);
  const mockTitle = mockMeta.title || 'Hồ sơ mẫu';

  const matches = (title: string, type: TargetType) =>
    (!typeFilter || type === typeFilter) &&
    title.toLowerCase().includes(searchQuery.toLowerCase());

  const showMock = !!onSelectMock && matches(mockTitle, mockType);
  const filteredTargets = targets.filter((t) => matches(t.email, resolveType(t.type)));

  // Mouse handlers for resizing
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startXRef.current;
      const newWidth = Math.max(200, Math.min(500, startWidthRef.current + delta)); // Min 200px, Max 500px
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div
      className='relative flex flex-col h-full bg-sidebar-background border-r border-border select-none'
      style={{ width: `${width}px`, borderColor: $('--border') }}
    >
      {/* Header */}
      <div className='px-3 py-2 border-b border-border shrink-0 space-y-3' style={{ borderColor: $('--border') }}>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <div className='w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-primary/15 text-primary'>
              <svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                <circle cx='12' cy='12' r='10'></circle>
                <circle cx='12' cy='12' r='6'></circle>
                <circle cx='12' cy='12' r='2'></circle>
              </svg>
            </div>
            <h2 className='text-sm font-bold text-text-primary'>Recon</h2>
          </div>
          <button
            onClick={onAddTargetClick}
            className='p-1.5 rounded-md hover:bg-white/10 text-text-secondary hover:text-primary transition-colors group'
            title='Thêm target mới'
          >
            <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='group-hover:scale-110 transition-transform'>
              <line x1='12' y1='5' x2='12' y2='19'></line>
              <line x1='5' y1='12' x2='19' y2='12'></line>
            </svg>
          </button>
        </div>

        {/* Search Bar */}
        <div className='relative'>
          <input
            type='text'
            placeholder='Tìm kiếm...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='w-full pl-8 pr-3 py-2 text-xs rounded-lg bg-input-background border border-transparent focus:border-primary/50 outline-none text-text-primary placeholder:text-text-secondary/50 transition-all'
            style={{ backgroundColor: $('--input-background') }}
          />
          <svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none'>
            <circle cx='11' cy='11' r='8'></circle>
            <line x1='21' y1='21' x2='16.65' y2='16.65'></line>
          </svg>
        </div>

        {/* Type filter badges */}
        <div className='flex flex-wrap gap-1.5'>
          {TYPE_ORDER.map((type) => {
            const { label, color } = TYPE_META[type];
            const isOn = typeFilter === type;
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(isOn ? null : type)}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors',
                  !isOn && 'bg-border/30 text-text-secondary hover:bg-border/50'
                )}
                style={isOn ? { backgroundColor: withAlpha(color, 0.2), color } : undefined}
                title={isOn ? 'Bỏ lọc' : `Lọc ${label}`}
              >
                <TypeIcon type={type} size={10} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Target List */}
      <div className='flex-1 overflow-y-auto px-3 py-2 space-y-1.5 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent'>
        {!showMock && filteredTargets.length === 0 ? (
          <div className='h-full flex flex-col items-center justify-center text-center p-4 opacity-50'>
            <svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1' strokeLinecap='round' strokeLinejoin='round' className='mb-2 text-text-secondary'>
              <path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'></path>
              <circle cx='12' cy='7' r='4'></circle>
            </svg>
            <span className='text-xs text-text-secondary'>Không có target nào</span>
          </div>
        ) : (
          <>
            {showMock && (
              <TargetCard
                title={mockTitle}
                subtitle={FALLBACK_SUBTITLE}
                type={mockType}
                isSelected={activeTargetId === MOCK_ID}
                onSelect={onSelectMock}
              />
            )}
            {filteredTargets.map((target) => (
              <TargetCard
                key={target.id}
                title={target.email}
                subtitle={FALLBACK_SUBTITLE}
                type={resolveType(target.type)}
                isSelected={target.id === activeTargetId}
                isRunning={target.isActive}
                onSelect={() => onTargetSelect(target.id)}
                actions={
                  target.isActive ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); onCloseBrowser(target.id); }}
                      className='p-1 rounded hover:bg-error/20 text-error transition-colors'
                      title='Dừng browser'
                    >
                      <svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><rect x='3' y='3' width='18' height='18' rx='2' ry='2'></rect><line x1='9' y1='9' x2='15' y2='15'></line><line x1='15' y1='9' x2='9' y2='15'></line></svg>
                    </button>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); onLaunchBrowser(target.id); }}
                      className='p-1 rounded hover:bg-success/20 text-success transition-colors'
                      title='Chạy browser'
                    >
                      <svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polygon points='5 3 19 12 5 21 5 3'></polygon></svg>
                    </button>
                  )
                }
              />
            ))}
          </>
        )}
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className='group absolute -right-1 top-0 bottom-0 w-2 cursor-col-resize z-10 flex justify-center'
      >
        <div
          className={cn(
            'h-full w-px transition-colors',
            isResizing ? 'bg-primary' : 'bg-transparent group-hover:bg-primary/60'
          )}
        />
      </div>
    </div>
  );
}

interface TargetCardProps {
  title: string;
  subtitle: string;
  type: TargetType;
  isSelected: boolean;
  isRunning?: boolean;
  onSelect?: () => void;
  actions?: ReactNode;
}

/** Card: [badgeIcon] [title / subtitle]. Selected có outline + vạch accent bên trái (80% chiều cao, căn giữa). */
function TargetCard({ title, subtitle, type, isSelected, isRunning, onSelect, actions }: TargetCardProps) {
  const { color } = TYPE_META[type];

  return (
    <div
      onClick={onSelect}
      className={cn(
        'group relative flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-lg border cursor-pointer transition-colors duration-150',
        isSelected
          ? 'bg-card-background border-border'
          : 'bg-card-background/50 border-transparent hover:bg-card-background-hover'
      )}
    >
      {isSelected && (
        <span
          className='absolute left-0 top-1/2 -translate-y-1/2 h-[80%] w-[3px] rounded-full'
          style={{ backgroundColor: color }}
        />
      )}

      <TypeBadgeIcon type={type} />

      <div className='min-w-0 flex-1'>
        <div className='flex items-center gap-1.5'>
          <span className='text-sm font-medium truncate text-text-primary'>{title}</span>
          {isRunning && <span className='w-1.5 h-1.5 rounded-full bg-success animate-pulse shrink-0' />}
        </div>
        <div className='text-[11px] text-text-secondary truncate'>{subtitle}</div>
      </div>

      {actions && (
        <div className={cn('flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity', isSelected && 'opacity-100')}>
          {actions}
        </div>
      )}
    </div>
  );
}