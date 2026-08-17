/**
 * Website Template - Pricing Page
 */

import { SectionHeading } from '../components/SectionHeading';
import { PricingCard } from './PricingCard';
import type { Page } from '../index';

interface PricingProps {
  onNavigate: (page: Page) => void;
}

export function Pricing({ onNavigate }: PricingProps) {
  return (
    <section className="py-20 md:py-28 bg-white dark:bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Bảng giá"
          title="Chọn gói phù hợp với quy mô đội ngũ"
          description="Bắt đầu miễn phí, nâng cấp khi cần thêm cộng tác viên hoặc gợi ý AI không giới hạn."
        />

        <div className="mt-16 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-4 max-w-5xl mx-auto">
          <PricingCard
            name="Free"
            price="0₫"
            description="Dành cho cá nhân bắt đầu khám phá Phantoma."
            features={[
              '1 canvas dự án',
              'Inspector cơ bản (10 thuộc tính)',
              '20 gợi ý AI / tháng',
              'Xuất code CSS thuần',
            ]}
            ctaLabel="Bắt đầu miễn phí"
            onClick={() => onNavigate('contact')}
          />

          <PricingCard
            name="Pro"
            price="299.000₫"
            description="Cho freelancer và đội ngũ nhỏ cần tốc độ."
            features={[
              'Canvas không giới hạn',
              'Inspector đầy đủ thuộc tính',
              'Gợi ý AI không giới hạn',
              'Xuất code React / Vue / CSS',
              'Version history 30 ngày',
            ]}
            highlighted
            ctaLabel="Dùng thử Pro 14 ngày"
            onClick={() => onNavigate('contact')}
          />

          <PricingCard
            name="Team"
            price="Liên hệ"
            description="Cho tổ chức cần cộng tác và bảo mật nâng cao."
            features={[
              'Mọi tính năng của gói Pro',
              'Cộng tác realtime không giới hạn',
              'Quản lý quyền theo vai trò',
              'Version history không giới hạn',
              'Hỗ trợ triển khai riêng (SSO)',
            ]}
            ctaLabel="Liên hệ đội ngũ bán hàng"
            onClick={() => onNavigate('contact')}
          />
        </div>
      </div>
    </section>
  );
}
