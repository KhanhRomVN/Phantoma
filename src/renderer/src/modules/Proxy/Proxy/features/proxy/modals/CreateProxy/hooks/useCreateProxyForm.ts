import { useEffect, useState } from 'react';
import type { ProxyDraft } from '../../../../../shared/types/proxy-domain.types';
import type { ProxySource } from '../../../../../shared/types/source-domain.types';
import { joinExpiry, splitExpiry } from '../../../utils/expiry';
import type { Form } from '../CreateProxyModal.types';
import { EMPTY_FORM } from '../utils/proxy-form.constants';
import { parseProxyInput } from '../utils/parse-proxy-input';
import { validateProxyDraft } from '../utils/validate-proxy-draft';
import { useProxyConnectionTest } from './useProxyConnectionTest';

interface UseCreateProxyFormOptions {
  isOpen: boolean;
  sources?: ProxySource[];
  activeSourceId?: string;
  onCreate: (draft: ProxyDraft, sourceId: string) => void;
  onClose: () => void;
}

/** Form state, validation, quick-paste, expiry editing and submit for the "Add proxy" form. */
export function useCreateProxyForm({ isOpen, sources, activeSourceId, onCreate, onClose }: UseCreateProxyFormOptions) {
  const [draft, setDraft] = useState<Form>(EMPTY_FORM);
  const [quick, setQuick] = useState('');
  const [quickError, setQuickError] = useState(false);
  const [reveal, setReveal] = useState(false);

  const set = (patch: Partial<Form>): void => setDraft((d) => ({ ...d, ...patch }));

  const { host, portOk, valid, hostError } = validateProxyDraft(draft);
  const { test, resetTest } = useProxyConnectionTest({
    valid,
    host,
    port: draft.port,
    protocol: draft.protocol,
    username: draft.username,
    password: draft.password,
  });

  useEffect(() => {
    if (!isOpen) {
      setDraft(EMPTY_FORM);
      setQuick('');
      setQuickError(false);
      setReveal(false);
      resetTest();
    }
  }, [isOpen]);

  // ASSUMED: "normal" sources are vendor-type sources; WARP is excluded because it has its own creation flow
  const normalSources = (sources ?? []).filter(
    (s) => s.type !== 'vpn' && !s.vpn && s.provider !== 'warp',
  );
  const [sourceId, setSourceId] = useState('');
  useEffect(() => {
    if (!isOpen) return;
    const preferred = normalSources.find((s) => s.id === activeSourceId) ?? normalSources[0];
    setSourceId(preferred?.id ?? '');
  }, [isOpen, activeSourceId, sources]);

  const changeQuick = (value: string): void => {
    setQuick(value);
    setQuickError(false);
  };

  const applyQuick = (text: string): void => {
    const parsed = parseProxyInput(text);
    if (!parsed) {
      setQuickError(text.trim().length > 0);
      return;
    }
    set(parsed);
    setQuick('');
    setQuickError(false);
  };

  const exp = splitExpiry(draft.expiresAt);
  const setExpiry = (patch: Partial<{ date: string; hour: number; minute: number }>): void => {
    const base = exp ?? { date: '', hour: 23, minute: 59 };
    const next = { ...base, ...patch };
    set({ expiresAt: next.date ? joinExpiry(next.date, next.hour, next.minute) : null });
  };

  const submit = (): void => {
    if (!valid || !sourceId) return;
    onCreate(
      {
        ...draft,
        host,
        provider: normalSources.find((s) => s.id === sourceId)?.name ?? draft.provider,
        name: draft.name.trim(),
        isp: draft.isp.trim(),
        notes: draft.notes.trim(),
      },
      sourceId,
    );
    onClose();
  };

  return {
    draft,
    set,
    host,
    portOk,
    valid,
    hostError,
    test,
    quick,
    quickError,
    changeQuick,
    applyQuick,
    reveal,
    toggleReveal: () => setReveal((v) => !v),
    normalSources,
    sourceId,
    setSourceId,
    exp,
    setExpiry,
    submit,
  };
}
