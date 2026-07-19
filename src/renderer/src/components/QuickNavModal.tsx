import { useState, useEffect, useRef } from 'react';
import { Search, ArrowUp, ArrowDown, CornerDownLeft } from 'lucide-react';
import { Modal, ModalBody, ModalFooter } from './ui/Modal';
import { Kbd } from './ui/Kbd';
import { cn } from '../shared/lib/utils';

interface QuickNavItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  color?: string;
}

interface QuickNavModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: QuickNavItem[];
}

export function QuickNavModal({ isOpen, onClose, items }: QuickNavModalProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isKeyboardNav, setIsKeyboardNav] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const keyboardTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filter items based on search
  const filteredItems = items.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()),
  );

  // Reset selected index when items change, but only if current index is out of bounds
  useEffect(() => {
    if (selectedIndex >= filteredItems.length) {
      setSelectedIndex(0);
    }
  }, [filteredItems, selectedIndex]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      setIsKeyboardNav(true);
      if (keyboardTimeoutRef.current) {
        clearTimeout(keyboardTimeoutRef.current);
      }
      keyboardTimeoutRef.current = setTimeout(() => {
        setIsKeyboardNav(false);
      }, 300);
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIndex = Math.min(selectedIndex + 1, filteredItems.length - 1);
      setSelectedIndex(newIndex);
      scrollToSelected(newIndex);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIndex = Math.max(selectedIndex - 1, 0);
      setSelectedIndex(newIndex);
      scrollToSelected(newIndex);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const scrollToSelected = (index: number) => {
    if (listRef.current) {
      const items = listRef.current.querySelectorAll('[data-item]');
      if (items[index]) {
        items[index].scrollIntoView({ block: 'nearest' });
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-full max-w-2xl">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3 bg-sidebar-item-hover rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-text-secondary" strokeWidth={1.5} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search modules..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none text-text-primary placeholder:text-text-secondary/60 text-sm"
            autoFocus
          />
        </div>
      </div>

      <ModalBody className="p-0 max-h-[400px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/50">
        <div ref={listRef} className="py-2">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-text-secondary/60 text-sm">No results found</div>
          ) : (
            filteredItems.map((item, index) => (
              <div
                key={item.id}
                data-item
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors',
                  index === selectedIndex
                    ? 'bg-primary/10 text-text-primary'
                    : 'hover:bg-sidebar-item-hover text-text-secondary',
                )}
                onClick={() => {
                  item.action();
                  onClose();
                }}
                onMouseEnter={() => {
                  if (!isKeyboardNav) {
                    setSelectedIndex(index);
                  }
                }}
              >
                <div
                  className={cn(
                    'shrink-0 w-8 h-8 flex items-center justify-center rounded-md bg-sidebar-item-hover/50',
                    item.color || 'text-primary',
                  )}
                >
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{item.title}</div>
                  <div className="text-xs text-text-secondary/70 truncate">{item.description}</div>
                </div>
                {index === selectedIndex && (
                  <div className="shrink-0 text-text-secondary/50">
                    <CornerDownLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ModalBody>

      <ModalFooter className="px-4 py-3 border-t border-border flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="flex items-center justify-center bg-sidebar-item-hover/70 rounded p-1">
              <Kbd>
                <ArrowUp className="w-3 h-3" strokeWidth={1.5} />
                <ArrowDown className="w-3 h-3" strokeWidth={1.5} />
              </Kbd>
            </div>
            <span className="text-text-primary">Navigate</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex items-center justify-center bg-sidebar-item-hover/70 rounded p-1">
              <Kbd>
                <CornerDownLeft className="w-3 h-3" strokeWidth={1.5} />
              </Kbd>
            </div>
            <span className="text-text-primary">Select</span>
          </div>
          <div className="flex items-center gap-1">
            <Kbd>ESC</Kbd>
            <span className="text-text-primary">Close</span>
          </div>
        </div>
        <span className="text-text-secondary/60">{filteredItems.length} results</span>
      </ModalFooter>
    </Modal>
  );
}
