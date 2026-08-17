/**
 * Website Template - Features Page
 */

import { LayoutGrid, Wand2, Palette, GitBranch, Users, Boxes } from 'lucide-react';
import { SectionHeading } from '../components/SectionHeading';
import { FeatureBlock } from './FeatureBlock';
import { CTASection } from '../home/CTASection';
import type { Page } from '../index';

interface FeaturesProps {
  onNavigate: (page: Page) => void;
}

export function Features({ onNavigate }: FeaturesProps) {
  return (
    <>
      <section className="py-20 md:py-28 bg-white dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Tính năng chi tiết"
            title="Từng thuộc tính, từng pixel, đều nằm trong tầm tay"
            description="Phantoma không chỉ là công cụ vẽ giao diện — đó là một inspector sống, kết hợp cùng AI để bạn thiết kế nhanh và chính xác hơn."
          />

          <div className="mt-8">
            <FeatureBlock
              eyebrow="Inspector"
              title="Visual Inspector theo thời gian thực"
              description="Chỉ cần di chuột qua bất kỳ element nào trên canvas, một bảng thuộc tính hiện ra ngay lập tức — vị trí, kích thước, màu nền, border-radius, opacity — tất cả có thể chỉnh sửa trực tiếp."
              bullets={[
                'Chỉnh sửa 40+ thuộc tính CSS không cần rời canvas',
                'Xem trước thay đổi tức thì, không cần reload',
                'Hỗ trợ nested element và pseudo-state (hover, focus, active)',
              ]}
              icon={<LayoutGrid className="w-7 h-7" />}
              tone="cyan"
            />

            <FeatureBlock
              eyebrow="AI Assistant"
              title="Trợ lý AI hiểu design system của bạn"
              description="AI được huấn luyện trên chính token màu sắc, spacing và typography bạn đã định nghĩa, nên mọi gợi ý đều nhất quán với phong cách sản phẩm — không chung chung."
              bullets={[
                'Gợi ý cải thiện tương phản và khả năng tiếp cận (a11y)',
                'Tự động căn chỉnh spacing theo hệ 4px / 8px grid',
                'Phát hiện element lệch khỏi design system và đề xuất sửa',
              ]}
              icon={<Wand2 className="w-7 h-7" />}
              tone="violet"
              reversed
            />

            <FeatureBlock
              eyebrow="Design Tokens"
              title="Một nguồn sự thật cho toàn bộ thiết kế"
              description="Màu sắc, font chữ, khoảng cách được quản lý tập trung thành design tokens, áp dụng đồng bộ trên mọi màn hình và mọi thành viên trong nhóm."
              bullets={[
                'Đồng bộ token hai chiều giữa canvas và code',
                'Hỗ trợ theme sáng / tối ngay trong token system',
                'Import trực tiếp từ file Tailwind config hiện có',
              ]}
              icon={<Palette className="w-7 h-7" />}
              tone="cyan"
            />

            <FeatureBlock
              eyebrow="History"
              title="Version history cho từng thuộc tính"
              description="Mỗi lần chỉnh sửa đều được ghi lại theo timeline riêng biệt, giúp bạn so sánh, hoàn tác hoặc khôi phục một thuộc tính cụ thể mà không ảnh hưởng phần còn lại."
              bullets={[
                'Khôi phục theo từng thuộc tính, không cần undo toàn bộ',
                'So sánh song song hai phiên bản thiết kế',
                'Gắn nhãn cột mốc quan trọng để dễ tra cứu',
              ]}
              icon={<GitBranch className="w-7 h-7" />}
              tone="violet"
              reversed
            />

            <FeatureBlock
              eyebrow="Collaboration"
              title="Cùng thiết kế, cùng thời điểm"
              description="Nhiều thành viên có thể chỉnh sửa chung một canvas, nhìn thấy con trỏ và các thay đổi thuộc tính của nhau ngay khi chúng xảy ra."
              bullets={[
                'Con trỏ trực tiếp kèm tên thành viên đang thao tác',
                'Bình luận đính kèm ngay trên từng element',
                'Phân quyền chỉnh sửa theo từng khu vực canvas',
              ]}
              icon={<Users className="w-7 h-7" />}
              tone="cyan"
            />

            <FeatureBlock
              eyebrow="Component Library"
              title="Thư viện component tái sử dụng"
              description="Lưu bất kỳ element nào đã tinh chỉnh thành component dùng lại, đảm bảo tính nhất quán khi mở rộng sản phẩm."
              bullets={[
                'Đồng bộ thay đổi từ component gốc đến mọi bản sao',
                'Gắn thuộc tính có thể tuỳ biến (variant, size, tone)',
                'Xuất trực tiếp thành thư viện npm nội bộ',
              ]}
              icon={<Boxes className="w-7 h-7" />}
              tone="violet"
              reversed
            />
          </div>
        </div>
      </section>

      <CTASection onNavigate={onNavigate} />
    </>
  );
}
