/**
 * CTASection - lời kêu gọi hành động cuối trang
 */

import { ArrowRight } from 'lucide-react';
import { Button } from '../components/Button';
import type { Page } from '../index';

interface CTASectionProps {
  onNavigate: (page: Page) => void;
}

export function CTASection({ onNavigate }: CTASectionProps) {
  return (
    <section className="py-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 to-zinc-950 dark:from-zinc-900 dark:to-black px-8 py-16 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(167,139,250,0.18),transparent_50%)]" />
          <div className="relative">
            <h2 className="font-[Space_Grotesk] text-3xl md:text-4xl font-bold text-white mb-4">
              Sẵn sàng thiết kế nhanh hơn 10 lần?
            </h2>
            <p className="text-zinc-400 max-w-xl mx-auto mb-8">
              Bắt đầu miễn phí, không cần thẻ thanh toán. Kết nối design system hiện có chỉ
              trong vài phút.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" onClick={() => onNavigate('contact')}>
                Dùng thử miễn phí
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="secondary" onClick={() => onNavigate('showcase')}>
                Xem demo trực tiếp
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
