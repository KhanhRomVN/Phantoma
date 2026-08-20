/**
 * Website Template - Home Page
 */

import { Sparkles, LayoutGrid, Palette, Wand2, GitBranch, Users, ArrowRight } from 'lucide-react';
import { Button } from '../components/Button';
import { PropertyChip } from '../components/PropertyChip';
import { InspectorMockup } from '../components/InspectorMockup';
import { SectionHeading } from '../components/SectionHeading';
import { FeatureCard } from './FeatureCard';
import { StatsBar } from './StatsBar';
import { HowItWorks } from './HowItWorks';
import { Testimonials } from './Testimonials';
import { CTASection } from './CTASection';
import type { Page } from '../index';

interface HomeProps {
  onNavigate: (page: Page) => void;
}

export function Home({ onNavigate }: HomeProps) {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5 mb-6">
              <Sparkles className="h-3.5 w-3.5 text-cyan-500" />
              <span className="font-mono text-xs text-cyan-600 dark:text-cyan-400">
                Được hỗ trợ bởi AI thiết kế thế hệ mới
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] text-zinc-900 dark:text-white mb-6 text-balance">
              Hover vào element.
              <br />
              <span className="bg-gradient-to-r from-cyan-500 to-violet-500 bg-clip-text text-transparent">
                Chỉnh sửa mọi thuộc tính.
              </span>
            </h1>

            <p className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed mb-8 max-w-lg">
              Phantoma biến canvas thiết kế thành một inspector sống động — trỏ chuột vào bất kỳ
              đâu, chỉnh vị trí, màu sắc, radius theo thời gian thực, với gợi ý từ AI được huấn
              luyện trên chính design system của bạn.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-8">
              <Button size="lg" onClick={() => onNavigate('contact')}>
                Dùng thử miễn phí
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="secondary" onClick={() => onNavigate('showcase')}>
                Xem demo trực tiếp
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <PropertyChip label="setup" value="< 2 phút" tone="cyan" />
              <PropertyChip label="pricing" value="miễn phí để bắt đầu" tone="violet" />
              <PropertyChip label="export" value="React / Vue / CSS" tone="neutral" />
            </div>
          </div>

          <InspectorMockup />
        </div>
      </section>

      <StatsBar />

      {/* Features Section */}
      <section className="py-24 bg-white dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Tính năng"
            title="Mọi công cụ để thiết kế UI/UX siêu tiện lợi"
            description="Từ inspector trực quan đến trợ lý AI, Phantoma gói gọn toàn bộ quy trình thiết kế vào một canvas duy nhất."
          />

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<LayoutGrid className="w-6 h-6" />}
              title="Visual Inspector"
              description="Hover để xem và chỉnh sửa mọi thuộc tính CSS của element — kích thước, spacing, radius — ngay trên canvas."
              tag="inspector.core"
              tone="cyan"
            />
            <FeatureCard
              icon={<Wand2 className="w-6 h-6" />}
              title="AI Design Assistant"
              description="AI phân tích bố cục hiện tại và đề xuất cải thiện về tương phản, khoảng cách, phân cấp thị giác."
              tag="ai.assistant"
              tone="violet"
            />
            <FeatureCard
              icon={<Palette className="w-6 h-6" />}
              title="Design Tokens"
              description="Đồng bộ màu sắc, typography, spacing thành design tokens dùng chung cho toàn bộ dự án."
              tag="tokens.sync"
              tone="cyan"
            />
            <FeatureCard
              icon={<GitBranch className="w-6 h-6" />}
              title="Version History"
              description="Mọi thay đổi thuộc tính đều được lưu lại, dễ dàng so sánh và khôi phục phiên bản trước đó."
              tag="history.git"
              tone="violet"
            />
            <FeatureCard
              icon={<Users className="w-6 h-6" />}
              title="Realtime Collaboration"
              description="Nhiều thành viên cùng chỉnh sửa một canvas, thấy con trỏ và thay đổi của nhau theo thời gian thực."
              tag="collab.live"
              tone="cyan"
            />
            <FeatureCard
              icon={<Sparkles className="w-6 h-6" />}
              title="Instant Code Export"
              description="Xuất ngay component React, Vue hoặc CSS thuần từ những gì bạn vừa chỉnh sửa trên canvas."
              tag="export.code"
              tone="violet"
            />
          </div>
        </div>
      </section>

      <HowItWorks />
      <Testimonials />
      <CTASection onNavigate={onNavigate} />
    </>
  );
}
