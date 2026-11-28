import type { ProxyDraft } from '../../../../shared/types/proxy-domain.types';
import type { ProxySource } from '../../../../shared/types/source-domain.types';

export type Form = Required<ProxyDraft>;

export type TestState =
  | { status: 'idle' }
  | { status: 'testing' }
  | { status: 'ok'; ms: number }
  | { status: 'fail' };

export interface CreateProxyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (draft: ProxyDraft, sourceId: string) => void;
  sources?: ProxySource[];
  activeSourceId?: string;
}
