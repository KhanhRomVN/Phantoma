/**
 * PropertyChip - chip dạng "key: value" theo phong cách bảng thuộc tính (inspector panel).
 * Đây là yếu tố thị giác đặc trưng, lặp lại xuyên suốt trang để gợi nhắc tính năng
 * "hover để chỉnh thuộc tính element" của Phantoma.
 */

interface PropertyChipProps {
  label: string;
  value: string;
  tone?: 'cyan' | 'violet' | 'neutral';
}

const toneClasses: Record<string, string> = {
  cyan: 'text-cyan-600 dark:text-cyan-400 border-cyan-500/30 bg-cyan-500/[0.06]',
  violet: 'text-violet-600 dark:text-violet-400 border-violet-500/30 bg-violet-500/[0.06]',
  neutral: 'text-zinc-500 dark:text-zinc-400 border-zinc-500/20 bg-zinc-500/[0.05]',
};

export function PropertyChip({ label, value, tone = 'neutral' }: PropertyChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[11px] leading-none ${toneClasses[tone]}`}
    >
      <span className="opacity-60">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}
