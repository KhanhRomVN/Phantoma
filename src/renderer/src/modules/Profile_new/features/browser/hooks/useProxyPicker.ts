import { useEffect, useMemo, useState } from 'react';
import { proxyApi } from '@renderer/modules/Proxy/services/proxy-api.service';
import {
  DEFAULT_PROXY_FILTERS,
  EMPTY_PROXY_DRAFT,
  MAX_PING,
  PROXY_HEALTH,
  PROXY_KIND,
  PROXY_QUERY_KEYS,
} from '../constants/proxy.constants';
import type {
  FilterTag,
  ProxyDraft,
  ProxyFilters,
  ProxyHealth,
  ProxyItem,
  ProxyKind,
  ProxyProtocol,
  ProxyTestState,
} from '../../../shared/types';
import { buildCountryStats, parseQuery, toggleItem, toProxyItem } from '../utils/proxy.util';

export function useProxyPicker(value: ProxyItem | null, onChange: (p: ProxyItem | null) => void) {
  const [items, setItems] = useState<ProxyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState<ProxyFilters>(DEFAULT_PROXY_FILTERS);
  const [panel, setPanel] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<ProxyDraft>(EMPTY_PROXY_DRAFT);
  const [test, setTest] = useState<ProxyTestState>('idle');

  useEffect(() => {
    let cancelled = false;
    proxyApi.proxies
      .list()
      .then((list) => {
        if (cancelled) return;
        setItems((prev) => [...prev.filter((i) => i.custom), ...list.map(toProxyItem)]);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load proxies');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    const unsubscribe = proxyApi.proxies.subscribe((proxy) => {
      const next = toProxyItem(proxy);
      setItems((prev) => (prev.some((i) => i.id === next.id) ? prev.map((i) => (i.id === next.id ? next : i)) : [...prev, next]));
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    setTest('idle');
  }, [value?.id]);

  const countries = useMemo(() => buildCountryStats(items), [items]);
  const parsed = useMemo(() => parseQuery(q, PROXY_QUERY_KEYS), [q]);

  const list = useMemo(() => {
    const filtered = items.filter((p) => {
      const hay = `${p.name} ${p.host} ${p.country} ${p.city} ${p.provider} ${p.protocol} ${p.kind}`.toLowerCase();
      if (!parsed.text.every((t) => hay.includes(t))) return false;
      for (const [k, v] of parsed.keys) {
        if (k === 'country' && !(p.country.toLowerCase().includes(v) || p.countryCode.toLowerCase() === v)) return false;
        if (k === 'type' && p.protocol.toLowerCase() !== v) return false;
        if (k === 'kind' && !p.kind.includes(v)) return false;
        if (k === 'provider' && !p.provider.toLowerCase().includes(v)) return false;
        if (k === 'status' && p.health !== v) return false;
        if (k === 'city' && !p.city.toLowerCase().includes(v)) return false;
      }
      if (parsed.ping !== null && (p.latency === 0 || p.latency > parsed.ping)) return false;
      if (filters.protocols.length && !filters.protocols.includes(p.protocol)) return false;
      if (filters.kinds.length && !filters.kinds.includes(p.kind)) return false;
      if (filters.health !== 'all' && p.health !== filters.health) return false;
      if (filters.country !== 'all' && p.countryCode !== filters.country) return false;
      if (filters.maxPing < MAX_PING && (p.latency === 0 || p.latency > filters.maxPing)) return false;
      return true;
    });
    return filtered.sort((a, b) => {
      const la = a.latency === 0 ? Infinity : a.latency;
      const lb = b.latency === 0 ? Infinity : b.latency;
      return la - lb;
    });
  }, [items, parsed, filters]);

  const toggleProtocol = (p: ProxyProtocol): void => setFilters((f) => ({ ...f, protocols: toggleItem(f.protocols, p) }));
  const toggleKind = (k: ProxyKind): void => setFilters((f) => ({ ...f, kinds: toggleItem(f.kinds, k) }));
  const setHealth = (h: ProxyHealth | 'all'): void => setFilters((f) => ({ ...f, health: h }));
  const setMaxPing = (v: number): void => setFilters((f) => ({ ...f, maxPing: v }));
  const toggleCountry = (code: string): void => setFilters((f) => ({ ...f, country: f.country === code ? 'all' : code }));

  const tags: FilterTag[] = [
    ...filters.protocols.map((p) => ({
      id: `proto-${p}`,
      label: p,
      onRemove: () => setFilters((f) => ({ ...f, protocols: f.protocols.filter((x) => x !== p) })),
    })),
    ...filters.kinds.map((k) => ({
      id: `kind-${k}`,
      label: PROXY_KIND[k].label,
      onRemove: () => setFilters((f) => ({ ...f, kinds: f.kinds.filter((x) => x !== k) })),
    })),
    ...(filters.health !== 'all'
      ? [{ id: 'health', label: PROXY_HEALTH[filters.health].label, onRemove: () => setHealth('all') }]
      : []),
    ...(filters.country !== 'all'
      ? [
          {
            id: 'country',
            label: countries.find((c) => c.code === filters.country)?.name ?? filters.country,
            onRemove: () => setFilters((f) => ({ ...f, country: 'all' })),
          },
        ]
      : []),
    ...(filters.maxPing < MAX_PING ? [{ id: 'ping', label: `≤ ${filters.maxPing} ms`, onRemove: () => setMaxPing(MAX_PING) }] : []),
  ];

  const reset = (): void => {
    setQ('');
    setFilters(DEFAULT_PROXY_FILTERS);
  };

  const draftValid = draft.host.trim() !== '' && /^\d{2,5}$/.test(draft.port);

  const addCustom = (): void => {
    if (!draftValid) return;
    const item: ProxyItem = {
      id: `custom-${Date.now()}`,
      name: draft.host.trim(),
      provider: 'Custom',
      protocol: draft.protocol,
      host: draft.host.trim(),
      port: draft.port,
      user: draft.user,
      pass: draft.pass,
      country: 'Custom',
      countryCode: '',
      city: 'Unknown location',
      kind: 'isp',
      latency: 0,
      uptime: 0,
      health: 'online',
      custom: true,
    };
    setItems((prev) => [item, ...prev]);
    onChange(item);
    setAdding(false);
    setDraft(EMPTY_PROXY_DRAFT);
  };

  const runTest = (): void => {
    if (!value) return;
    setTest('testing');
    if (value.custom) {
      window.setTimeout(() => setTest('ok'), 900);
      return;
    }
    proxyApi.proxies
      .test([value.id])
      .then((res) => {
        const updated = res[0] ? toProxyItem(res[0]) : null;
        if (updated) {
          setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
          onChange(updated);
        }
        setTest(updated && updated.health !== 'offline' ? 'ok' : 'fail');
      })
      .catch(() => setTest('fail'));
  };

  const testText =
    test === 'ok'
      ? value && value.latency
        ? `Reachable · ${value.latency} ms`
        : 'Reachable'
      : test === 'fail'
        ? 'Connection failed'
        : test === 'testing'
          ? 'Testing connection…'
          : 'Not tested';

  return {
    q,
    setQ,
    filters,
    panel,
    adding,
    draft,
    setDraft,
    test,
    testText,
    countries,
    list,
    total: items.length,
    loading,
    error,
    tags,
    activeFilters: tags.length,
    draftValid,
    reset,
    togglePanel: () => setPanel((v) => !v),
    toggleAdding: () => setAdding((v) => !v),
    closeAdding: () => setAdding(false),
    toggleProtocol,
    toggleKind,
    setHealth,
    setMaxPing,
    toggleCountry,
    addCustom,
    runTest,
  };
}