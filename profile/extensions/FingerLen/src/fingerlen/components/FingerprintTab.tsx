import { Copy, Check, AlertTriangle } from 'lucide-react';
import { FP_IDS, FP_CAPS, FP_EXTRA_CAPS, FP_MAIN_HASHES, FP_PROFILE, HINTS, UNITS } from '../data/constants';
import { hue, label } from '../utils/format';
import { useCopy, type CopyFn } from '../hooks/useCopy';
import { Identicon } from './Identicon';
import { Note, Val } from './Val';
import type { ScanData } from '../../types';

interface Props { src: ScanData }

const cssVars = (v: Record<string, string>) => v as React.CSSProperties;
/** Hash dài (sha256) chỉ hiện đầu chuỗi; bấm copy vẫn lấy đủ. */
const view = (h: string) => (h.length > 16 ? `${h.slice(0, 16)}…` : h);

type HashEntry = [key: string, name: string, hint: string];

interface GridProps { title: string; items: HashEntry[]; fp: Record<string, any>; copy: CopyFn; copied: string | null }

function HashGrid({ title, items, fp, copy, copied }: GridProps) {
  return (
    <div className="card">
      <div className="sech"><h3>{title}</h3></div>
      <div className="hg">
        {items.map(([k, name, hint]) => (
          <button key={k} type="button" className={'hc' + (copied === k ? ' ok' : '')} onClick={() => copy(k, fp[k])}>
            <div className="ht">
              <b>{name}</b>
              <small>{hint}</small>
              <code style={cssVars({ '--h': hue(fp[k]) })}>{view(String(fp[k]))}</code>
            </div>
            <span className="ci">{copied === k ? <Check size={16} /> : <Copy size={16} />}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function FingerprintTab({ src }: Props) {
  const fp = src.fingerprint || {};
  const warn = (src.warnings?.fingerprint || []).filter((f: string) => f in fp);
  const { copy, copied } = useCopy();

  if (!Object.keys(fp).length) return <div className="blank">No fingerprint data</div>;

  const main: HashEntry[] = FP_MAIN_HASHES.filter((k) => k in fp).map((k) => [k, label(k).replace(/ hash$/i, ''), FP_CAPS[k] || '']);
  const extra: HashEntry[] = Object.keys(FP_EXTRA_CAPS).filter((k) => k in fp).map((k) => [k, label(k).replace(/ hash$/i, ''), FP_EXTRA_CAPS[k]]);
  const profile = FP_PROFILE.filter((k) => k in fp);

  return (
    <div className="stack">
      <div className="idg">
        {FP_IDS.filter(([k]) => k in fp).map(([k, name, hint]) => (
          <div key={k} className="idc">
            <div className="idh">
              <Identicon seed={fp[k]} size={48} />
              <div className="idt"><b>{name}</b><span>{hint}</span></div>
            </div>
            <button type="button" className={'cpb' + (copied === k ? ' ok' : '')} onClick={() => copy(k, fp[k])}>
              {copied === k ? <Check size={13} /> : <Copy size={13} />}{copied === k ? 'Copied' : 'Copy'}
            </button>
          </div>
        ))}
      </div>

      {profile.length > 0 && (
        <div className="card">
          <div className="sech"><h3>Identity profile</h3></div>
          <div className="dbd">
            {profile.map((k) => (
              <div key={k} className="dr">
                <div className="dk">{label(k)}</div>
                <div className="dv"><Val v={fp[k]} />{UNITS[k] || ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {warn.includes('extensionsDetected') && fp.extensionsDetected && (
        <div className="card">
          <div className="xl">
            {fp.extensionsDetected.map((e: string) => <div key={e} className="xi"><AlertTriangle size={14} />{e}</div>)}
          </div>
          <p className="xh">Sites can detect these extensions and add them to your fingerprint. Consider using fewer or less distinctive ones.</p>
        </div>
      )}

      {main.length > 0 && <HashGrid title="Capability hashes" items={main} fp={fp} copy={copy} copied={copied} />}
      {extra.length > 0 && <HashGrid title="Detail-test hashes" items={extra} fp={fp} copy={copy} copied={copied} />}

      {warn.filter((f) => HINTS[f]).map((f) => <Note key={f} text={HINTS[f]} />)}
    </div>
  );
}
