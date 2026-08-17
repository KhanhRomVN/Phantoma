/**
 * Testimonials - đánh giá từ người dùng
 */

import { Quote } from 'lucide-react';
import { SectionHeading } from '../components/SectionHeading';

const TESTIMONIALS = [
  {
    quote:
      'Trước đây team mình mất cả buổi để đồng bộ token màu và spacing. Giờ chỉ cần hover, sửa, xong — code tự cập nhật.',
    name: 'Đặng Minh Khuê',
    role: 'Product Designer, Loop Studio',
  },
  {
    quote:
      'Gợi ý AI không hề chung chung, nó đọc đúng design system của mình rồi mới đề xuất. Cảm giác như có một senior designer ngồi cạnh.',
    name: 'Trịnh Bảo Long',
    role: 'Founder, Nomad UI',
  },
  {
    quote:
      'Chuyển từ Figma qua Phantoma để prototyping nhanh vì xuất code React sạch, không cần dọn lại layer nào cả.',
    name: 'Vũ Thanh Trúc',
    role: 'Frontend Lead, Bitcove',
  },
];

export function Testimonials() {
  return (
    <section className="py-24 bg-white dark:bg-zinc-900/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Người dùng nói gì"
          title="Được tin dùng bởi các đội ngũ thiết kế sản phẩm"
        />

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="rounded-2xl border border-black/5 dark:border-white/5 bg-zinc-50 dark:bg-zinc-900 p-7 flex flex-col"
            >
              <Quote className="h-6 w-6 text-cyan-500/60 mb-4" />
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed mb-6 flex-1">
                “{t.quote}”
              </p>
              <div>
                <p className="font-semibold text-sm text-zinc-900 dark:text-white">{t.name}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
