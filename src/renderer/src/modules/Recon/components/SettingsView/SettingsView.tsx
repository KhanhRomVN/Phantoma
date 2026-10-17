import { useState } from 'react';
import type { ComponentType } from 'react';
import { ArrowLeft, PanelLeft, PanelTop, RotateCcw } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';
import { Button } from '@renderer/components/ui/Button';
import { useReconSettings } from '../Settings';
import LeftSidebarPanel from './LeftSidebarPanel';
import ContentTabPanel from './ContentTabPanel';

interface SettingsItem {
  id: string;
  label: string;
  icon: LucideIcon;
  Panel: ComponentType;
}

/** Thêm mục setting mới: khai báo thêm một phần tử ở đây, sidebar và vùng nội dung tự cập nhật. */
const ITEMS: SettingsItem[] = [
  { id: 'leftSidebar', label: 'Thanh bên trái', icon: PanelLeft, Panel: LeftSidebarPanel },
  { id: 'contentTabUI', label: 'Tab nội dung', icon: PanelTop, Panel: ContentTabPanel },
];

interface SettingsViewProps {
  onClose: () => void;
}

export default function SettingsView({ onClose }: SettingsViewProps) {
  const { reset } = useReconSettings();
  const [activeId, setActiveId] = useState(ITEMS[0].id);
  const active = ITEMS.find((i) => i.id === activeId) ?? ITEMS[0];
  const ActivePanel = active.Panel;

  return (
    <div className='flex-1 h-full min-w-0 flex flex-col bg-background'>
      <header className='shrink-0 h-12 px-4 flex items-center justify-between gap-3 border-b border-border'>
        <div className='flex items-center gap-2 min-w-0'>
          <button
            onClick={onClose}
            title='Quay lại'
            className='w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-sidebar-item-hover transition-colors'
          >
            <ArrowLeft className='w-4 h-4' strokeWidth={2} />
          </button>
          <h1 className='text-sm font-bold text-text-primary truncate'>Cài đặt Recon</h1>
        </div>
        <Button variant='outline' size='sm' onClick={reset}>
          <RotateCcw className='w-3.5 h-3.5' strokeWidth={2} />
          Đặt lại mặc định
        </Button>
      </header>

      <div className='flex-1 min-h-0 flex'>
        <nav className='w-56 shrink-0 border-r border-border bg-sidebar-background p-2 space-y-1 overflow-y-auto'>
          {ITEMS.map((item) => {
            const Icon = item.icon;
            const selected = item.id === active.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveId(item.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left',
                  selected
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-sidebar-item-hover'
                )}
              >
                <Icon className='w-4 h-4 shrink-0' strokeWidth={2} />
                <span className='truncate'>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <main className='flex-1 min-w-0 overflow-y-auto p-6'>
          <div className='max-w-2xl'>
            <ActivePanel />
          </div>
        </main>
      </div>
    </div>
  );
}