import { useMemo } from 'react';
import { Copy, Check } from 'lucide-react';
import { TAB_SPEC } from '../tabSpec';
import { RISKY, UNITS } from '../data/constants';
import { label } from '../utils/format';
import { useCopy } from '../hooks/useCopy';
import { Val, Note } from './Val';
import { HINTS } from '../data/constants';
import type { ScanData, GroupData } from '../../types';

interface Props { tab: string; src: ScanData }

export function DetailTab({ tab, src }: Props) {
  const spec = TAB_SPEC[tab];
  const data: GroupData = src[tab] || {};
  const warn = (src.warnings?.[tab] || []).filter((f: string) => f in data);
  const { copy, copied } = useCopy();

  const sections = useMemo(() => {
    if (!spec) return [];
    const known = new Set([...spec.used, ...spec.sections.flatMap(([, , fs]) => fs)]);
    const other = Object.keys(data).filter((k) => !known.has(k) && !/^_/.test(k));
    return other.length ? [...spec.sections, ['Other', null, other] as [string, any, string[]]] : spec.sections;
  }, [spec, data]);

  if (!spec) return <div className="blank">No configuration for {tab}</div>;
  if (!Object.keys(data).length) return <div className="blank">No data for {tab}</div>;

  const Hero = spec.hero;

  return (
    <div className="stack">
      <Hero d={data} warn={warn} copy={copy} copied={copied} />
      <div className="dcols">
        {sections.map(([title, Icon, fields]) => (
          <div key={title} className="dsec">
            <div className="card">
              <div className="ch">
                <div className="hl">
                  {Icon && <Icon size={16} />}
                  <h3>{title}</h3>
                </div>
              </div>
              <div className="dbd">
                {fields.map((f) => {
                  const v = data[f], fl = warn.includes(f), risky = RISKY.has(f), unit = UNITS[f] || '';
                  return (
                    <div key={f} className={'dr' + (fl ? ' fl' : '')}>
                      <div className="dk">{label(f)}</div>
                      <div className="dv"><Val v={v} risky={risky} />{unit}</div>
                      <button type="button" className={'dc' + (copied === f ? ' ok' : '')} onClick={() => copy(f, v)}>
                        {copied === f ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                      {fl && HINTS[f] && <p className="dh">{HINTS[f]}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
      {warn.filter((f) => !spec.used.includes(f) && HINTS[f]).map((f) => <Note key={f} text={HINTS[f]} />)}
    </div>
  );
}