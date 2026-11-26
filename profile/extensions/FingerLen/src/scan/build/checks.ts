import { COUNTRY } from '../../fingerlen/data/constants';
import type { G } from './helpers';

/** Các phép kiểm tra "nhất quán" giữa IP / timezone / ngôn ngữ / UA / GPU / kích thước màn hình. */
export function consistencyChecks(g: { network: G; navigator: G; screen: G; webgl: G; timezone: G }, dateStr: string) {
  const { network, navigator, screen, webgl, timezone } = g;
  let pass = 0, total = 0;
  const check = (ok: boolean) => { total++; if (ok) pass++; };

  const cc = COUNTRY[network.country];
  const tz: string = timezone.timezone || '';
  const p: string = navigator.platform || '';
  const ua: string = navigator.userAgent || '';

  if (cc && tz) check(cc.tz.some((z) => tz.startsWith(z)));
  if (cc && navigator.languages)
    check(navigator.languages.some((l: string) => cc.lang.includes(l.toLowerCase().split('-')[0])));

  const m = dateStr.match(/GMT([+-])(\d{2})(\d{2})/);
  if (m && timezone.timezoneOffset != null)
    check(-(m[1] === '-' ? -1 : 1) * (+m[2] * 60 + +m[3]) === timezone.timezoneOffset);

  if (p && ua) {
    const key = /^Win/.test(p) ? 'Windows' : /^Mac/.test(p) ? 'Macintosh' : /Linux|X11/.test(p) ? 'Linux' : p;
    check(ua.includes(key) || (key === 'Linux' && /X11|Android/.test(ua)));
  }
  if (p && webgl.webglRenderer) {
    const r: string = webgl.webglRenderer, win = /^Win/.test(p), mac = /^Mac/.test(p);
    check(!((!win && /Direct3D|D3D/.test(r)) || ((win || mac) && /Mesa/.test(r))));
  }
  if (screen.screenWidth) {
    const SW = screen.screenWidth, SH = screen.screenHeight;
    const OW = screen.outerWidth || SW, OH = screen.outerHeight || SH;
    const IW = screen.innerWidth || OW, IH = screen.innerHeight || OH;
    check(IW <= OW && OW <= SW && IH <= OH && OH <= SH);
  }
  return { pass, total };
}
