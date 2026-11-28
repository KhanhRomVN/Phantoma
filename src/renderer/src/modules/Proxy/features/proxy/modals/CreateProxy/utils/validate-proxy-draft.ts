import type { Form } from '../CreateProxyModal.types';

const HOST_RE =
  /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?([.][a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;

export interface DraftValidation {
  /** Trimmed host. */
  host: string;
  hostOk: boolean;
  portOk: boolean;
  valid: boolean;
  /** True when a host was typed but is not valid (so the field can show an error). */
  hostError: boolean;
}

export function validateProxyDraft(draft: Pick<Form, 'host' | 'port'>): DraftValidation {
  const host = draft.host.trim();
  const hostOk = HOST_RE.test(host);
  const portOk = Number.isInteger(draft.port) && draft.port > 0 && draft.port <= 65535;
  return { host, hostOk, portOk, valid: hostOk && portOk, hostError: host.length > 0 && !hostOk };
}
