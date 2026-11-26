import type { G } from './helpers';

/** Cảnh báo: chỉ khi giá trị thật sự đáng chú ý. Trả về group → danh sách key. */
export function buildWarnings(g: Record<string, G>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const warn = (group: string, key: string, cond: boolean | undefined) => {
    if (cond) (out[group] ||= []).push(key);
  };
  const { fingerprint, network, navigator, screen, webgl, detection, media } = g;

  warn('fingerprint', 'extensionsDetected', (fingerprint.extensionsDetected || []).length > 0);
  warn('network', 'dnsLeak', network.dnsLeak === true);
  warn('network', 'webrtcLeak', network.webrtcLeak === true);
  warn('network', 'timezoneMismatch', network.timezoneMismatch === true);
  warn('navigator', 'doNotTrack', /^(1|yes|true)$/i.test(String(navigator.doNotTrack ?? '')));
  warn('screen', 'devicePixelRatio',
    screen.devicePixelRatio !== undefined && ![1, 1.25, 1.5, 2, 2.5, 3].includes(screen.devicePixelRatio));
  warn('webgl', 'antiFingerprintNoise', webgl.antiFingerprintNoise === true);
  warn('detection', 'likeHeadlessScore', (detection.likeHeadlessScore ?? 0) >= 50);
  warn('media', 'speechVoicesCount', media.speechVoicesCount === 0);
  return out;
}
