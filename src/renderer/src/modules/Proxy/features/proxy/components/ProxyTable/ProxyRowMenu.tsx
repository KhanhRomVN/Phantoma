import { Activity, Copy, Link2, Trash2 } from 'lucide-react';
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
} from '@renderer/components/ui/Dropdown';
import type { Proxy } from '../../../../shared/types/proxy-domain.types';
import { buildProxyUrl } from '../../../../shared/utils/format';

export interface RowMenuState {
  id: string;
  top: number;
  left: number;
}

interface ProxyRowMenuProps {
  menu: RowMenuState | null;
  /** The proxy the menu was opened on (null when the menu is closed or the proxy is gone). */
  proxy: Proxy | null;
  onClose: () => void;
  onTest: (proxy: Proxy) => void;
  onDelete: (proxy: Proxy) => void;
}

export function ProxyRowMenu({ menu, proxy, onClose, onTest, onDelete }: ProxyRowMenuProps) {
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
        {proxy && (
          <>
            <DropdownItem icon={<Activity className='h-3.5 w-3.5' />} onClick={() => onTest(proxy)}>
              Test connection
            </DropdownItem>
            <DropdownItem
              icon={<Link2 className='h-3.5 w-3.5' />}
              onClick={() => void navigator.clipboard.writeText(buildProxyUrl(proxy, true)).catch(() => undefined)}
            >
              Copy proxy URL
            </DropdownItem>
            <DropdownItem
              icon={<Copy className='h-3.5 w-3.5' />}
              onClick={() => void navigator.clipboard.writeText(`${proxy.host}:${proxy.port}`).catch(() => undefined)}
            >
              Copy host:port
            </DropdownItem>
            <DropdownSeparator />
            <DropdownItem variant='error' icon={<Trash2 className='h-3.5 w-3.5' />} onClick={() => onDelete(proxy)}>
              Delete
            </DropdownItem>
          </>
        )}
      </DropdownContent>
    </Dropdown>
  );
}
