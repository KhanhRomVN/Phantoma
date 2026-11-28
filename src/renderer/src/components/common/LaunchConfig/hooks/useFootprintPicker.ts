import { useMemo, useState } from 'react';
import { generateFootprints } from '@renderer/services/fingerprint-generator';
import type { FootprintPreset, OsFamily } from '@renderer/services/fingerprint-generator';
import { FOOTPRINT_PRESETS, FOOTPRINT_QUERY_KEYS, OS_FAMILIES } from '../constants/footprint';
import type { FilterTag, ProxyItem } from '../types';
import { parseQuery, toggleItem } from '../utils/proxy';
import { useIpLookup } from './useIpLookup';

export function useFootprintPicker(proxy: ProxyItem | null) {
  const lookup = useIpLookup(proxy ? proxy.exitIp || proxy.host : null);
  const info = lookup.state.status === 'ok' ? lookup.state.data : null;
  const source = useMemo<FootprintPreset[]>(() => (info ? generateFootprints({ ...info, mobile: info.mobile ?? undefined, proxy: info.proxy ?? undefined, hosting: info.hosting ?? undefined, vpn: info.vpn ?? undefined, tor: info.tor ?? undefined, asn: Number(info.asn) || undefined }) : FOOTPRINT_PRESETS), [info]);
  const generated = info !== null;

  const [q, setQ] = useState('');
  const [panel, setPanel] = useState(false);
  const [families, setFamilies] = useState<OsFamily[]>([]);
  const [browser, setBrowser] = useState('all');
  const [lang, setLang] = useState('all');
  const [matchOnly, setMatchOnly] = useState(false);

  const regionCode = (info?.countryCode || proxy?.countryCode || '').toUpperCase();
  const browsers = useMemo(() => Array.from(new Set(source.map((p) => p.browser.split(' ')[0]))), [source]);
  const langs = useMemo(() => Array.from(new Set(source.map((p) => p.lang))).sort(), [source]);
  const parsed = useMemo(() => parseQuery(q, FOOTPRINT_QUERY_KEYS), [q]);

  const list = useMemo(() => {
    const filtered = source.filter((p) => {
      const hay = `${p.name} ${p.os} ${p.browser} ${p.gpu} ${p.lang} ${p.tz} ${p.tag}`.toLowerCase();
      if (!parsed.text.every((t) => hay.includes(t))) return false;
      for (const [k, v] of parsed.keys) {
        if (k === 'os' && !p.os.toLowerCase().includes(v)) return false;
        if (k === 'browser' && !p.browser.toLowerCase().includes(v)) return false;
        if (k === 'gpu' && !p.gpu.toLowerCase().includes(v)) return false;
        if (k === 'lang' && !p.lang.toLowerCase().startsWith(v)) return false;
        if (k === 'tz' && !p.tz.toLowerCase().includes(v)) return false;
      }
      if (families.length && !families.includes(p.family)) return false;
      if (browser !== 'all' && !p.browser.startsWith(browser)) return false;
      if (lang !== 'all' && p.lang !== lang) return false;
      if (matchOnly && p.cc !== regionCode) return false;
      return true;
    });
    if (generated) return filtered;
    return [...filtered].sort((a, b) => {
      const ma = regionCode !== '' && a.cc === regionCode ? 1 : 0;
      const mb = regionCode !== '' && b.cc === regionCode ? 1 : 0;
      if (ma !== mb) return mb - ma;
      return b.usage - a.usage;
    });
  }, [source, generated, parsed, families, browser, lang, matchOnly, regionCode]);

  const tags: FilterTag[] = [
    ...families.map((f) => ({
      id: `os-${f}`,
      label: OS_FAMILIES.find((x) => x.id === f)?.label ?? f,
      onRemove: () => setFamilies((l) => l.filter((x) => x !== f)),
    })),
    ...(browser !== 'all' ? [{ id: 'browser', label: browser, onRemove: () => setBrowser('all') }] : []),
    ...(lang !== 'all' ? [{ id: 'lang', label: lang, onRemove: () => setLang('all') }] : []),
    ...(matchOnly ? [{ id: 'match', label: `Region ${regionCode}`, onRemove: () => setMatchOnly(false) }] : []),
  ];

  const reset = (): void => {
    setQ('');
    setFamilies([]);
    setBrowser('all');
    setLang('all');
    setMatchOnly(false);
  };

  const matches = (p: FootprintPreset): boolean => regionCode !== '' && p.cc === regionCode;

  return {
    q,
    setQ,
    panel,
    families,
    browser,
    setBrowser,
    lang,
    setLang,
    matchOnly,
    regionCode,
    browsers,
    langs,
    list,
    source,
    generated,
    info,
    lookupStatus: lookup.state.status,
    tags,
    activeFilters: tags.length,
    reset,
    matches,
    togglePanel: () => setPanel((v) => !v),
    toggleFamily: (f: OsFamily) => setFamilies((l) => toggleItem(l, f)),
    toggleMatchOnly: () => setMatchOnly((v) => !v),
  };
}