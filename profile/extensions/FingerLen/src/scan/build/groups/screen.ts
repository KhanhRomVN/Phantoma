import { type G, type Pages, put, flag } from '../helpers';
import { glassbox, GB } from '../glassbox';

export function buildScreen(p: Pages): G {
  const js = p('bl-javascript');
  const gb = glassbox(p);
  const s: G = {};

  put(s, 'screenWidth', js.screen_width);
  put(s, 'screenHeight', js.screen_height);
  put(s, 'availWidth', js.screen_availWidth);
  put(s, 'availHeight', js.screen_availHeight);
  put(s, 'innerWidth', js.screen_innerWidth);
  put(s, 'innerHeight', js.screen_innerHeight);
  put(s, 'outerWidth', js.screen_outerWidth);
  put(s, 'outerHeight', js.screen_outerHeight);
  put(s, 'devicePixelRatio', js.screen_devicePixelRatio);
  put(s, 'colorDepth', js.screen_colorDepth);
  put(s, 'pixelDepth', js.screen_pixelDepth);
  put(s, 'orientation', js.screen_orientation);
  put(s, 'multiMonitor', flag(gb.row(GB.screen, 'screen.isExtended')));
  if (js.maxTouchPoints !== undefined) s.touchSupport = js.maxTouchPoints > 0;

  /* Tuỳ chọn hiển thị của OS (CSS media features) */
  put(s, 'prefersColorScheme', gb.row(GB.css, 'color-scheme'));
  put(s, 'colorGamut', gb.row(GB.css, 'color-gamut'));
  put(s, 'hdr', flag(gb.row(GB.css, 'dynamic-range HDR')));
  put(s, 'reducedMotion', flag(gb.row(GB.css, 'reduced-motion')));
  put(s, 'forcedColors', flag(gb.row(GB.css, 'forced-colors')));
  put(s, 'pointerType', gb.row(GB.css, 'pointer'));
  put(s, 'scrollbarWidth', gb.row(GB.css, 'scrollbar width'));
  return s;
}
