import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BrowserPanel } from './BrowserPanel';
import { ConfigPanel } from './ConfigPanel';
import { DetailPanel } from './DetailPanel';
import { useDeviceFingerprint } from '../../hooks/useDeviceFingerprint';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { useLaunchConfig } from '../../hooks/useLaunchConfig';
import { lookupIp } from '@renderer/services/ip-lookup.service';
import { notifyBrowserChanged } from '../../hooks/useRunningBrowsers';
import { profileApi } from '../../../../shared/api/profile.api';
import type { Profile, ProfileSource, SessionFootprint } from '../../../../shared/types';
import { buildFullReport } from '@renderer/services/fingerprint-generator';
import type { FootprintPreset } from '@renderer/services/fingerprint-generator';

interface LaunchBrowserModalProps {
  open: boolean;
  profile: Profile;
  source?: ProfileSource;
  onClose: () => void;
}

function toSessionFootprint(p: FootprintPreset): SessionFootprint {
  const sections = buildFullReport(p).sections.map((s) => ({
    id: s.id,
    title: s.title,
    fields: s.fields.map((f) => [f.label, f.value] as [string, string]),
  }));
  const userAgent = sections.flatMap((s) => s.fields).find(([label]) => label === 'User agent')?.[1] ?? '';
  return {
    name: p.name,
    os: p.os,
    browser: p.browser,
    screen: p.screen,
    gpu: p.gpu,
    cores: p.cores,
    memory: p.memory,
    lang: p.lang,
    tz: p.tz,
    cc: p.cc,
    userAgent,
    sections,
  };
}

export function LaunchBrowserModal({ open, profile, onClose }: LaunchBrowserModalProps) {
  const c = useLaunchConfig(profile);
  const devicePreset = useDeviceFingerprint(c.isChrome);
  useEscapeKey(open, onClose);

  const [error, setError] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);

  // ASSUMED: proxy auth (user/pass) is not passed to Chromium; only protocol://host:port — upgrade path: local proxy bridge
  const launch = async (): Promise<void> => {
    if (launching) return;
    setLaunching(true);
    setError(null);
    try {
      const preset = c.isChrome ? devicePreset : c.preset;
      // c.preset === null → system footprint: không ghi đè fingerprint
      const proxyServer =
        !c.isChrome && c.proxy ? `${c.proxy.protocol.toLowerCase()}://${c.proxy.host}:${c.proxy.port}` : undefined;
      const ip = await lookupIp(c.isChrome ? null : (c.proxy?.host ?? null)).catch(() => null);
      await profileApi.browser.launch(profile.id, {
        browser: c.isChrome ? 'chrome' : 'chromium',
        proxyServer,
        forkId: c.isChrome ? undefined : c.forkId || undefined,
        ip,
        footprint: preset ? toSessionFootprint(preset) : null,
      });
      notifyBrowserChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLaunching(false);
    }
  };

  const handleLaunch = (): void => {
    void launch();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className='relative grid h-[min(92vh,max(780px,100vh))] w-[90vw] min-w-[1040px] max-w-full grid-cols-[340px_minmax(0,1fr)_480px] overflow-hidden rounded-2xl border border-border bg-background shadow-2xl'
          >
            {error && (
              <div className='absolute bottom-16 left-1/2 z-10 max-w-[520px] -translate-x-1/2 rounded-md bg-error/10 px-3 py-2 text-xs text-error shadow-lg'>
                {error}
              </div>
            )}
            <BrowserPanel
              profile={profile}

              isChrome={c.isChrome}
              forks={c.forks}
              loading={c.loadingForks}
              forkId={c.forkId}
              onSelectChrome={c.selectChrome}
              onSelectFork={c.selectFork}
            />
            <ConfigPanel
              isChrome={c.isChrome}
              fork={c.fork}
              proxy={c.proxy}
              onProxyChange={c.setProxy}
              preset={c.preset}
              onPresetChange={c.setPreset}
              flags={c.flags}
              onFlag={c.setFlag}
              summary={c.summary}
              onClose={onClose}
              onLaunch={handleLaunch}
            />
            <DetailPanel
              tab={c.detailTab}
              onTabChange={c.setDetailTab}
              proxy={c.isChrome ? null : c.proxy}
              preset={c.isChrome || c.preset === null ? devicePreset : c.preset}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export default LaunchBrowserModal;
