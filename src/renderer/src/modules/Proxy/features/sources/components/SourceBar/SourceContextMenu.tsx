import { ExternalLink, Pencil, Trash2 } from 'lucide-react';
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
} from '@renderer/components/ui/Dropdown';
import type { ProxySource } from '../../../../shared/types/source-domain.types';
import { isProtectedSource } from '../../utils/source-protection';

export interface SourceMenuState {
  id: string;
  top: number;
  left: number;
}

interface SourceContextMenuProps {
  menu: SourceMenuState | null;
  source: ProxySource | null;
  onClose: () => void;
  onEditSource?: (id: string) => void;
  onDeleteSource?: (id: string) => void;
}

export function SourceContextMenu({ menu, source, onClose, onEditSource, onDeleteSource }: SourceContextMenuProps) {
  return (
    <Dropdown
      className='absolute'
      open={menu !== null}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      strategy='fixed'
      position={menu ? { top: menu.top, left: menu.left } : undefined}
      width={190}
    >
      <DropdownTrigger asChild>
        <span className='block h-0 w-0' />
      </DropdownTrigger>
      <DropdownContent>
        {source && (
          <>
            <DropdownItem
              icon={<ExternalLink className='h-3.5 w-3.5' />}
              onClick={() => source.url && window.open(source.url, '_blank')}
            >
              Open website
            </DropdownItem>
            <DropdownItem icon={<Pencil className='h-3.5 w-3.5' />} onClick={() => onEditSource?.(source.id)}>
              Edit source
            </DropdownItem>
            {!isProtectedSource(source) && (
              <>
                <DropdownSeparator />
                <DropdownItem
                  variant='error'
                  icon={<Trash2 className='h-3.5 w-3.5' />}
                  onClick={() => onDeleteSource?.(source.id)}
                >
                  Delete source
                </DropdownItem>
              </>
            )}
          </>
        )}
      </DropdownContent>
    </Dropdown>
  );
}
