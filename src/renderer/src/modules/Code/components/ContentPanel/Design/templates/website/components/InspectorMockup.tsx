/**
 * InspectorMockup - yếu tố signature của trang chủ.
 * Mô phỏng canvas thiết kế: khi hover vào từng element, một bảng thuộc tính
 * (inspector panel) hiện ra bên cạnh, đúng với tính năng cốt lõi của Phantoma.
 */

import { Sparkles, MousePointer2 } from 'lucide-react';
import { PropertyChip } from './PropertyChip';

export function InspectorMockup() {
  return (
    <div className="relative w-full max-w-xl mx-auto">
      {/* Frame trình duyệt */}
      <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl shadow-2xl overflow-visible">
        {/* Top bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-black/5 dark:border-white/5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          <div className="ml-3 flex-1 rounded-md bg-black/5 dark:bg-white/5 px-3 py-1 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
            phantoma.app/canvas/hero
          </div>
        </div>

        {/* Canvas */}
        <div className="relative p-8 min-h-[320px] bg-[radial-gradient(circle_at_1px_1px,rgba(120,120,140,0.15)_1px,transparent_0)] [background-size:16px_16px]">
          {/* Node: Card */}
          <div className="group/card relative w-64 rounded-xl border border-dashed border-cyan-500/40 hover:border-cyan-400 p-4 bg-white/80 dark:bg-zinc-800/80 transition-colors">
            <div className="h-24 w-full rounded-lg bg-gradient-to-br from-cyan-400/30 to-violet-400/30 mb-3" />
            <div className="h-3 w-3/4 rounded bg-zinc-300 dark:bg-zinc-600 mb-2" />
            <div className="h-3 w-1/2 rounded bg-zinc-200 dark:bg-zinc-700" />

            {/* Node: Button (lồng bên trong card) */}
            <div className="group/btn relative mt-4 inline-block">
              <span className="inline-block rounded-full border border-dashed border-violet-500/40 group-hover/btn:border-violet-400 px-4 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-violet-500">
                Xem chi tiết
              </span>

              {/* Inspector panel cho Button */}
              <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-4 w-44 opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all duration-200 z-20">
                <div className="rounded-lg border border-violet-500/30 bg-white dark:bg-zinc-900 shadow-xl p-3 flex flex-col gap-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-violet-500 mb-1">
                    button.primary
                  </span>
                  <PropertyChip label="radius" value="999px" tone="violet" />
                  <PropertyChip label="padding" value="16 6" tone="violet" />
                  <PropertyChip label="fill" value="#A78BFA" tone="violet" />
                </div>
              </div>
            </div>

            {/* Inspector panel cho Card */}
            <div className="pointer-events-none absolute right-0 -top-4 translate-x-[calc(100%+16px)] w-48 opacity-0 group-hover/card:opacity-100 group-hover/card:translate-y-0 -translate-y-2 transition-all duration-200 z-10 hidden sm:block">
              <div className="rounded-lg border border-cyan-500/30 bg-white dark:bg-zinc-900 shadow-xl p-3 flex flex-col gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-500 mb-1">
                  card.feature
                </span>
                <PropertyChip label="w" value="256px" tone="cyan" />
                <PropertyChip label="radius" value="12px" tone="cyan" />
                <PropertyChip label="shadow" value="md" tone="cyan" />
                <div className="mt-1 flex items-center gap-1 text-[10px] font-mono text-cyan-600 dark:text-cyan-400">
                  <Sparkles className="h-3 w-3" />
                  AI đề xuất: radius 16px
                </div>
              </div>
            </div>
          </div>

          {/* Con trỏ minh hoạ */}
          <div className="absolute bottom-6 right-10 flex items-center gap-1.5 text-zinc-400 dark:text-zinc-600 animate-pulse">
            <MousePointer2 className="h-4 w-4" />
            <span className="font-mono text-[10px]">hover để chỉnh sửa</span>
          </div>
        </div>
      </div>

      {/* Ambient glow phía sau frame */}
      <div className="absolute -inset-x-10 -top-10 -bottom-10 -z-10 bg-gradient-to-br from-cyan-500/20 via-violet-500/10 to-transparent blur-3xl" />
    </div>
  );
}
