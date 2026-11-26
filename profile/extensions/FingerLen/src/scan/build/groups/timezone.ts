import { type G, type Pages, put, flag } from '../helpers';
import { glassbox, GB } from '../glassbox';

export function buildTimezone(p: Pages, dateStr: string, tzOffset: number | undefined): G {
  const js = p('bl-javascript'), ip = p('bl-ip');
  const gb = glassbox(p);
  const t: G = {};

  put(t, 'timezone', js.timeZone || ip.ipTimezone);
  put(t, 'timezoneOffset', tzOffset);
  put(t, 'timezoneName', (dateStr.match(/\(([^)]+)\)\s*$/) || [])[1]);
  put(t, 'observesDst', flag(gb.row(GB.tz, 'observes DST')));
  put(t, 'locale', js.locale);
  put(t, 'calendar', gb.row(GB.tz, 'calendar'));
  put(t, 'numberingSystem', gb.row(GB.tz, 'numbering'));
  put(t, 'intlDateTimeFormat', js.dateTimeFormat);
  put(t, 'dateStringSample', dateStr);
  if (js.hourCycle) t.hour12 = /h1[12]/i.test(js.hourCycle);
  return t;
}
