/**
 * Website Template - About Page
 */

import { Target, Compass, Heart } from 'lucide-react';
import { SectionHeading } from '../components/SectionHeading';
import { PropertyChip } from '../components/PropertyChip';
import { TeamMember } from './TeamMember';
import { CTASection } from '../home/CTASection';
import type { Page } from '../index';

interface AboutProps {
  onNavigate: (page: Page) => void;
}

const VALUES = [
  {
    icon: Target,
    title: 'Tốc độ trước hết',
    description:
      'Mọi tính năng đều được đo bằng số mili-giây nó tiết kiệm được cho người thiết kế.',
  },
  {
    icon: Compass,
    title: 'AI đồng hành, không thay thế',
    description:
      'AI chỉ đề xuất dựa trên design system thật của bạn, quyết định cuối cùng luôn thuộc về con người.',
  },
  {
    icon: Heart,
    title: 'Chi tiết là tôn trọng',
    description: 'Một border-radius lệch 1px cũng đáng để sửa — đó là cách chúng tôi xây Phantoma.',
  },
];

export function About({ onNavigate }: AboutProps) {
  return (
    <>
      {/* Header */}
      <section className="py-20 md:py-28 bg-white dark:bg-zinc-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="font-mono text-xs tracking-[0.2em] uppercase text-cyan-600 dark:text-cyan-400">
            // về chúng tôi
          </span>
          <h1 className="text-4xl md:text-5xl font-bold mt-4 mb-6 text-zinc-900 dark:text-white text-balance">
            Chúng tôi xây Phantoma vì ghét việc chờ đợi
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl mx-auto">
            Phantoma bắt đầu từ một câu hỏi đơn giản: tại sao chỉnh một thuộc tính CSS lại phải rời
            canvas, mở devtools, rồi quay lại? Chúng tôi tin thiết kế nên diễn ra ở đúng nơi bạn
            đang nhìn vào — ngay trên element đó.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-8">
            <PropertyChip label="thành lập" value="2023" tone="cyan" />
            <PropertyChip label="đội ngũ" value="12 người" tone="violet" />
            <PropertyChip label="trụ sở" value="TP. Hồ Chí Minh" tone="neutral" />
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-zinc-50 dark:bg-zinc-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Giá trị cốt lõi" title="Những điều dẫn lối mọi quyết định" />

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
            {VALUES.map((v) => {
              const Icon = v.icon;
              return (
                <div
                  key={v.title}
                  className="rounded-2xl border border-black/5 dark:border-white/5 bg-white dark:bg-zinc-900 p-7"
                >
                  <div className="inline-flex p-3 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 mb-5">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className=" text-lg font-bold text-zinc-900 dark:text-white mb-2">
                    {v.title}
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {v.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 bg-white dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Đội ngũ" title="Những người đứng sau Phantoma" />

          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <TeamMember
              emoji="👨‍💼"
              name="Nguyễn Văn A"
              role="CEO & Founder"
              description="10+ năm kinh nghiệm trong lĩnh vực công nghệ, từng dẫn dắt đội ngũ thiết kế tại nhiều startup."
              tone="cyan"
            />
            <TeamMember
              emoji="👩‍💻"
              name="Trần Thị B"
              role="CTO"
              description="Chuyên gia kiến trúc hệ thống, đứng sau engine inspector thời gian thực của Phantoma."
              tone="violet"
            />
            <TeamMember
              emoji="👨‍🎨"
              name="Lê Văn C"
              role="Lead Designer"
              description="Thiết kế UI/UX với hơn 8 năm kinh nghiệm, chịu trách nhiệm cho ngôn ngữ thị giác của sản phẩm."
              tone="cyan"
            />
            <TeamMember
              emoji="👩‍🔬"
              name="Phạm Thị D"
              role="AI Research Lead"
              description="Dẫn dắt đội ngũ huấn luyện mô hình gợi ý thiết kế dựa trên design system thực tế."
              tone="violet"
            />
          </div>
        </div>
      </section>

      <CTASection onNavigate={onNavigate} />
    </>
  );
}
