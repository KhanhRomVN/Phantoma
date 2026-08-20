/**
 * Website Template - Showcase / Demo Page
 * Demo tương tác thật (dùng React state) mô phỏng trải nghiệm chọn element -> xem thuộc tính.
 */

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { SectionHeading } from '../components/SectionHeading';
import { PropertyChip } from '../components/PropertyChip';
import { CTASection } from '../home/CTASection';
import type { Page } from '../index';

interface ShowcaseProps {
  onNavigate: (page: Page) => void;
}

type NodeKey = 'button' | 'card' | 'heading';

const NODES: Record<
  NodeKey,
  { name: string; properties: { label: string; value: string }[]; suggestion: string }
> = {
  button: {
    name: 'button.primary',
    properties: [
      { label: 'width', value: 'auto' },
      { label: 'padding', value: '16 · 10' },
      { label: 'radius', value: '999px' },
      { label: 'fill', value: '#22D3EE → #A78BFA' },
    ],
    suggestion: 'Tăng padding ngang lên 20px để cân đối với chiều cao 44px.',
  },
  card: {
    name: 'card.pricing',
    properties: [
      { label: 'width', value: '320px' },
      { label: 'radius', value: '16px' },
      { label: 'shadow', value: 'lg' },
      { label: 'gap', value: '12px' },
    ],
    suggestion: 'Giảm shadow xuống "md" khi ở chế độ tối để tránh viền quá gắt.',
  },
  heading: {
    name: 'text.heading-lg',
    properties: [
      { label: 'font', value: 'Space Grotesk' },
      { label: 'size', value: '32px' },
      { label: 'weight', value: '700' },
      { label: 'leading', value: '1.15' },
    ],
    suggestion: 'Tăng line-height lên 1.2 để dễ đọc hơn trên màn hình nhỏ.',
  },
};

export function Showcase({ onNavigate }: ShowcaseProps) {
  const [selected, setSelected] = useState<NodeKey>('card');
  const node = NODES[selected];

  return (
    <>
      <section className="py-20 md:py-28 bg-white dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Demo trực tiếp"
            title="Chọn một element, xem thuộc tính hiện ra ngay"
            description="Bấm vào từng thành phần bên dưới để xem cách Phantoma đọc và gợi ý chỉnh sửa thuộc tính của nó."
          />

          <div className="mt-14 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8">
            {/* Canvas giả lập */}
            <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/60 p-10 flex flex-col items-center justify-center gap-8 min-h-[420px]">
              <button
                onClick={() => setSelected('heading')}
                className={`text-3xl font-bold text-zinc-900 dark:text-white text-center rounded-lg px-2 transition-all ${
                  selected === 'heading'
                    ? 'ring-2 ring-cyan-500 ring-offset-2 ring-offset-zinc-50 dark:ring-offset-zinc-900'
                    : 'hover:ring-1 hover:ring-cyan-500/40'
                }`}
              >
                Thiết kế giao diện,
                <br />
                gọn trong một cú chạm
              </button>

              <button
                onClick={() => setSelected('card')}
                className={`w-72 rounded-2xl bg-white dark:bg-zinc-800 border border-black/5 dark:border-white/5 shadow-lg p-6 text-left transition-all ${
                  selected === 'card'
                    ? 'ring-2 ring-cyan-500 ring-offset-2 ring-offset-zinc-50 dark:ring-offset-zinc-900'
                    : 'hover:ring-1 hover:ring-cyan-500/40'
                }`}
              >
                <div className="h-20 rounded-lg bg-gradient-to-br from-cyan-400/30 to-violet-400/30 mb-4" />
                <div className="h-3 w-2/3 rounded bg-zinc-300 dark:bg-zinc-600 mb-2" />
                <div className="h-3 w-1/2 rounded bg-zinc-200 dark:bg-zinc-700" />
              </button>

              <button
                onClick={() => setSelected('button')}
                className={`rounded-full px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-violet-500 transition-all ${
                  selected === 'button'
                    ? 'ring-2 ring-cyan-500 ring-offset-2 ring-offset-zinc-50 dark:ring-offset-zinc-900'
                    : 'hover:ring-1 hover:ring-cyan-500/40'
                }`}
              >
                Bắt đầu thiết kế
              </button>
            </div>

            {/* Panel thuộc tính */}
            <div className="rounded-2xl border border-cyan-500/20 bg-zinc-950 p-6 text-white flex flex-col">
              <span className="font-mono text-xs uppercase tracking-wider text-cyan-400 mb-1">
                {node.name}
              </span>
              <p className="text-xs text-zinc-500 mb-5">Bảng thuộc tính đang chọn</p>

              <div className="flex flex-col gap-2 mb-6">
                {node.properties.map((p) => (
                  <PropertyChip key={p.label} label={p.label} value={p.value} tone="cyan" />
                ))}
              </div>

              <div className="mt-auto rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
                <div className="flex items-center gap-2 text-violet-300 font-mono text-[11px] uppercase tracking-wider mb-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  Gợi ý AI
                </div>
                <p className="text-sm text-zinc-200 leading-relaxed">{node.suggestion}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CTASection onNavigate={onNavigate} />
    </>
  );
}
