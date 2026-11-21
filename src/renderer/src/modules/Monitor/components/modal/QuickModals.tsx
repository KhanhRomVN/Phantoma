import { useState } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import type { MonitorItem, SourceType } from '../../types/monitor.types';
import { SRC, SRC_META } from '../../constants/meta';
import { uid } from '../../utils/random';
import { Modal } from '../common/Primitives';

export function WizardModal({ onClose, onDone }: { onClose: () => void; onDone: (m: MonitorItem) => void }) {
  const [step, setStep] = useState(0);
  const [type, setType] = useState<SourceType>('reddit');
  const [url, setUrl] = useState('');
  const [profile, setProfile] = useState('Profile-01');
  const [proxy, setProxy] = useState('None');
  const [track, setTrack] = useState('New content');
  const [kw, setKw] = useState('');
  const [sched, setSched] = useState('15m');
  const steps = ['Platform', 'URL & Proxy', 'Tracking & schedule'];
  const done = () => {
    onDone({
      id: uid('m'),
      name: `${SRC_META[type].short}-${url.replace(/^https?:\/\//, '').split('/')[0] || 'new'}`,
      sourceType: type,
      schedule: sched,
      hits24h: 0,
      status: 'running',
      group: 'Dự án A',
      tags: [],
    });
  };
  return (
    <Modal
      title={`Create monitor · Step ${step + 1}/3 — ${steps[step]}`}
      onClose={onClose}
      footer={
        <>
          <button className="soft" disabled={step === 0} onClick={() => setStep(step - 1)}><ChevronLeft size={14} />Back</button>
          {step < 2 ? (
            <button className="prim" onClick={() => setStep(step + 1)}>Next<ChevronRight size={14} /></button>
          ) : (
            <button className="prim" onClick={done}><Check size={14} />Create</button>
          )}
        </>
      }
    >
      {step === 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {SRC.map((s) => (
            <button key={s} className={`chip ${type === s ? 'on' : ''}`} onClick={() => setType(s)}>{SRC_META[s].label}</button>
          ))}
        </div>
      )}
      {step === 1 && (
        <>
          <input className="field" placeholder={`Source URL, e.g. ${SRC_META[type].url}`} value={url} onChange={(e) => setUrl(e.target.value)} />
          <select className="field" value={profile} onChange={(e) => setProfile(e.target.value)}>
            {['Profile-01', 'Profile-02', 'Profile-03'].map((x) => <option key={x}>{x}</option>)}
          </select>
          <select className="field" value={proxy} onChange={(e) => setProxy(e.target.value)}>
            {['None', 'VN residential proxy', 'SG datacenter proxy'].map((x) => <option key={x}>{x}</option>)}
          </select>
        </>
      )}
      {step === 2 && (
        <>
          <select className="field" value={track} onChange={(e) => setTrack(e.target.value)}>
            {['New content', 'Changes (Diff)', 'Keyword'].map((x) => <option key={x}>{x}</option>)}
          </select>
          <input className="field" placeholder="Keywords (comma separated)" value={kw} onChange={(e) => setKw(e.target.value)} />
          <select className="field" value={sched} onChange={(e) => setSched(e.target.value)}>
            {['5m', '15m', '1h', '0 */2 * * *'].map((x) => <option key={x}>{x}</option>)}
          </select>
        </>
      )}
    </Modal>
  );
}