/**
 * HowItWorks - quy trình 3 bước thực tế khi dùng Phantoma
 */

import { MousePointerClick, BrainCircuit, Code2 } from 'lucide-react';
import { SectionHeading } from '../components/SectionHeading';

const STEPS = [
  {
    icon: MousePointerClick,
    title: 'Trỏ vào element',
    description:
      'Hover vào bất kỳ thành phần nào trên canvas, Phantoma tự động bóc tách toàn bộ thuộc tính: kích thước, màu sắc, spacing, typography.',
  },
  {
    icon: BrainCircuit,
    title: 'AI phân tích & gợi ý',
    description:
      'Mô hình AI đối chiếu với design system của bạn, đề xuất chỉnh sửa hợp lý về khoảng cách, độ tương phản và bố cục theo thời gian thực.',
  },
  {
    icon: Code2,
    title: 'Áp dụng & xuất code',
    description:
      'Chấp nhận gợi ý bằng một cú click, thuộc tính cập nhật ngay trên canvas và mã nguồn tương ứng (React, Vue, CSS) được đồng bộ tức thì.',
  },
];

export function HowItWorks() {
  return (
    <section className="py-24 bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Quy trình"
          title="Ba bước từ ý tưởng đến giao diện hoàn chỉnh"
          description="Không chuyển đổi qua lại giữa các công cụ. Mọi thứ diễn ra ngay trên canvas."
        />

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Đường nối ngang cho desktop, thể hiện tính tuần tự */}
          <div className="hidden md:block absolute top-8 left-[16.6%] right-[16.6%] h-px bg-gradient-to-r from-cyan-500/40 via-violet-500/40 to-cyan-500/40" />

          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="relative flex flex-col items-start">
                <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 shadow-sm mb-6">
                  <Icon className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                  <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 text-white font-mono text-[11px] font-bold">
                    {idx + 1}
                  </span>
                </div>
                <h3 className="font-[Space_Grotesk] text-lg font-bold text-zinc-900 dark:text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
