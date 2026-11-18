import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Download, Maximize2, Pause, Play, Volume2 } from 'lucide-react';
import type { DiffLine, MediaItem, Post, SnapshotDiff } from '../../../types/monitor.types';
import { c, hueOf, tc } from '../../../utils/color';
import { toDiffLines } from '../../../utils/diff';
import { fmtClock } from '../../../utils/format';

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        background: 'rgba(0,0,0,.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <img src={src} alt="" style={{ maxWidth: '92vw', maxHeight: '88vh', borderRadius: 8 }} />
    </div>
  );
}

export function ImageBlock({ item, big }: { item: MediaItem; big?: boolean }) {
  const [zoom, setZoom] = useState(false);
  return (
    <div
      style={{
        position: 'relative',
        aspectRatio: '16 / 9',
        borderRadius: 8,
        overflow: 'hidden',
        background: c('ts', 0.1),
        maxHeight: big ? 460 : undefined,
      }}
    >
      <img
        src={item.url}
        alt={item.alt || ''}
        loading="lazy"
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      <button
        className="ico"
        title="Zoom in"
        style={{ position: 'absolute', right: 8, top: 8, background: 'rgba(0,0,0,.55)', color: '#fff' }}
        onClick={() => setZoom(true)}
      >
        <Maximize2 size={14} />
      </button>
      {zoom && <Lightbox src={item.url} onClose={() => setZoom(false)} />}
    </div>
  );
}

function GalleryBlock({ items }: { items: MediaItem[] }) {
  const [zoom, setZoom] = useState<string | null>(null);
  const shown = items.slice(0, 4);
  const extra = items.length - 4;
  const cols = shown.length === 2 ? '1fr 1fr' : '2fr 1fr';
  const cell = (it: MediaItem, k: number, style?: CSSProperties) => (
    <button
      key={it.url}
      onClick={() => setZoom(it.url)}
      style={{ position: 'relative', overflow: 'hidden', borderRadius: 6, background: c('ts', 0.1), ...style }}
    >
      <img
        src={it.url}
        alt={it.alt || ''}
        loading="lazy"
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      {k === 3 && extra > 0 && (
        <span
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,.55)',
            fontSize: 20,
            fontWeight: 600,
            color: '#fff',
          }}
        >
          +{extra} images
        </span>
      )}
    </button>
  );
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: cols,
        gridTemplateRows: shown.length === 2 ? '220px' : '110px 110px',
        gap: 4,
      }}
    >
      {shown.length === 2 && shown.map((it, k) => cell(it, k))}
      {shown.length >= 3 && cell(shown[0], 0, { gridRow: '1 / span 2' })}
      {shown.length >= 3 && shown.slice(1).map((it, k) => cell(it, k + 1))}
      {zoom && <Lightbox src={zoom} onClose={() => setZoom(null)} />}
    </div>
  );
}

function useProgress(
  playing: boolean,
  speed: number,
  onEnd: () => void,
): [number, (v: number) => void] {
  const [p, setP] = useState(0);
  useEffect(() => {
    if (!playing) return undefined;
    const t = window.setInterval(() => {
      setP((v) => {
        if (v + 0.01 * speed >= 1) {
          onEnd();
          return 0;
        }
        return v + 0.01 * speed;
      });
    }, 250);
    return () => window.clearInterval(t);
  }, [playing, speed, onEnd]);
  return [p, setP];
}

function AudioBlock({ item, seedKey }: { item: MediaItem; seedKey: string }) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [p, setP] = useProgress(playing, speed, () => setPlaying(false));
  const dur = item.durationSec || 60;
  const h = hueOf(seedKey);
  const bars = Array.from({ length: 56 }, (_, k) => 20 + ((k * 37 + h * 13) % 70));
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: c('ts', 0.08) }}>
      <button
        className="ico"
        style={{ width: 38, height: 38, borderRadius: 19, background: c('primary'), color: '#fff' }}
        onClick={() => setPlaying(!playing)}
      >
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 2, height: 36, cursor: 'pointer' }}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setP((e.clientX - r.left) / r.width);
          }}
        >
          {bars.map((b, k) => (
            <span
              key={k}
              style={{
                flex: 1,
                height: `${b}%`,
                borderRadius: 2,
                background: k / bars.length < p ? c('primary') : c('ts', 0.35),
              }}
            />
          ))}
        </div>
        <div className="sub mono" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span>{fmtClock(p * dur)}</span>
          <span>{fmtClock(dur)}</span>
        </div>
      </div>
      <button className="chip" onClick={() => setSpeed(speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1)}>
        {speed}x
      </button>
      <button className="ico" title="Download">
        <Download size={14} />
      </button>
    </div>
  );
}

function VideoBlock({ item, big }: { item: MediaItem; big?: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [p, setP] = useProgress(playing, 1, () => setPlaying(false));
  const dur = item.durationSec || 60;
  return (
    <div
      style={{
        position: 'relative',
        aspectRatio: '16 / 9',
        maxHeight: big ? 460 : undefined,
        borderRadius: 8,
        overflow: 'hidden',
        background: '#000',
      }}
    >
      {item.thumb && (
        <img
          src={item.thumb}
          alt=""
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: playing ? 0.55 : 0.85, display: 'block' }}
        />
      )}
      {!playing && (
        <button
          onClick={() => setPlaying(true)}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%,-50%)',
            width: 56,
            height: 56,
            borderRadius: 28,
            background: c('primary', 0.9),
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Play size={24} />
        </button>
      )}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '18px 10px 8px',
          background: 'linear-gradient(transparent, rgba(0,0,0,.75))',
          color: '#fff',
        }}
      >
        <div
          style={{ height: 4, borderRadius: 4, background: 'rgba(255,255,255,.3)', cursor: 'pointer', marginBottom: 6 }}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setP((e.clientX - r.left) / r.width);
          }}
        >
          <div style={{ width: `${p * 100}%`, height: '100%', borderRadius: 4, background: c('primary') }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setPlaying(!playing)}>{playing ? <Pause size={14} /> : <Play size={14} />}</button>
          <span className="mono" style={{ fontSize: 11 }}>
            {fmtClock(p * dur)} / {fmtClock(dur)}
          </span>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
            <Volume2 size={14} />
            <Maximize2 size={14} />
          </span>
        </div>
      </div>
    </div>
  );
}

export function DiffBlock({ diff, split }: { diff: SnapshotDiff; split?: boolean }) {
  const lines = toDiffLines(diff);
  const col = (title: string, kinds: DiffLine['kind'][], tone: string) => (
    <div style={{ flex: 1, minWidth: 0, borderRadius: 6, border: `1px solid ${c('border')}`, overflow: 'hidden' }}>
      <div className="sub" style={{ padding: '5px 10px', background: c('ts', 0.1), fontWeight: 500 }}>
        {title}
      </div>
      <div className="mono" style={{ fontSize: 11 }}>
        {lines
          .filter((l) => kinds.includes(l.kind))
          .map((l, k) => (
            <div
              key={k}
              className="tr"
              style={{
                padding: '2px 10px',
                background: l.kind === 'same' ? 'transparent' : tc(tone, 0.12),
                color: l.kind === 'same' ? c('ts') : tc(tone),
              }}
            >
              {l.kind === 'add' ? '+ ' : l.kind === 'remove' ? '− ' : '  '}
              {l.text}
            </div>
          ))}
      </div>
    </div>
  );
  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      <span className="scanline" />
      <div style={{ display: 'flex', gap: 8, flexDirection: split ? 'column' : 'row' }}>
        {col('Previous snapshot', ['same', 'remove'], 'error')}
        {col('New snapshot', ['same', 'add'], 'success')}
      </div>
      <div className="sub" style={{ marginTop: 6 }}>
        📊 Diff +{diff.addedCount} lines · -{diff.removedCount} lines
      </div>
    </div>
  );
}

function LinkBlock({ lp }: { lp: NonNullable<Post['linkPreview']> }) {
  return (
    <div
      style={{
        display: 'flex',
        borderRadius: 8,
        overflow: 'hidden',
        border: `1px solid ${c('border')}`,
        background: c('ts', 0.06),
      }}
    >
      <div style={{ width: 96, flexShrink: 0, background: c('ts', 0.15) }}>
        {lp.thumb && (
          <img
            src={lp.thumb}
            alt=""
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}
      </div>
      <div style={{ padding: '8px 12px', minWidth: 0 }}>
        <div className="tr" style={{ fontWeight: 600 }}>
          {lp.title}
        </div>
        <div
          style={{
            color: c('ts'),
            margin: '2px 0',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {lp.description}
        </div>
        <div className="sub">🔗 {lp.domain}</div>
      </div>
    </div>
  );
}

export function MediaArea({ post, big }: { post: Post; big?: boolean }) {
  const it = post.mediaItems?.[0];
  switch (post.mediaType) {
    case 'image':
      return it ? <ImageBlock item={it} big={big} /> : null;
    case 'gallery':
      return post.mediaItems ? <GalleryBlock items={post.mediaItems} /> : null;
    case 'audio':
      return it ? <AudioBlock item={it} seedKey={post.id} /> : null;
    case 'video':
      return it ? <VideoBlock item={it} big={big} /> : null;
    case 'diff':
      return post.diff ? <DiffBlock diff={post.diff} split={big} /> : null;
    case 'link':
      return post.linkPreview ? <LinkBlock lp={post.linkPreview} /> : null;
    default:
      return null;
  }
}