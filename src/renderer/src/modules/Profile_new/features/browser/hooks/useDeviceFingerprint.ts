import { useEffect, useState } from 'react';
import type { FootprintPreset } from '@renderer/services/fingerprint-generator';
import { profileApi } from '../../../shared/api/profile.api';

export function useDeviceFingerprint(enabled: boolean) {
  const [preset, setPreset] = useState<FootprintPreset | null>(null);

  useEffect(() => {
    if (!enabled || preset) return;
    let cancelled = false;
    profileApi.system
      .deviceFingerprint()
      .then((d) => {
        if (cancelled) return;
        setPreset({
          id: 'this-device',
          name: `${d.os} · ${d.browser}`,
          family: d.family,
          os: d.os,
          browser: d.browser,
          screen: `${window.screen.width}×${window.screen.height}`,
          gpu: d.gpu,
          cores: d.cores,
          memory: d.memory,
          lang: d.lang,
          tz: d.tz,
          cc: d.cc,
          usage: 0,
          tag: 'This device',
          tone: 'success',
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [enabled, preset]);

  return preset;
}