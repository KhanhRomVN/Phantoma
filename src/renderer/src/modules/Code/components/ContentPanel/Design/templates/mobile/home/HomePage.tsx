/**
 * Mobile App - Home Page
 */

import { Search } from 'lucide-react';
import { ProductCard } from './ProductCard';

export function HomePage() {
  return (
    <>
      {/* Header */}
      <header className="bg-purple-600 text-white px-4 pt-6 pb-8">
        <div className="mb-1 text-sm opacity-90">Xin chào,</div>
        <h1 className="text-2xl font-bold mb-4">Nguyễn Văn A</h1>
      </header>

      {/* Search Bar */}
      <div className="px-4 -mt-6 mb-6">
        <div className="bg-white rounded-2xl shadow-lg p-4 flex items-center gap-3">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm sản phẩm, dịch vụ..."
            className="flex-1 outline-none text-sm"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 mb-6">
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          <CategoryChip label="Tất Cả" active />
          <CategoryChip label="Phổ Biến" />
          <CategoryChip label="Mới Nhất" />
          <CategoryChip label="Giảm Giá" />
        </div>
      </div>

      {/* Featured Section */}
      <section className="px-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Nổi Bật</h2>
          <button className="text-sm text-purple-600 font-medium">Xem tất cả →</button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <ProductCard
            icon="🎨"
            title="Design Pro"
            subtitle="Công cụ thiết kế"
            price="$29"
          />

          <ProductCard
            icon="📱"
            title="Mobile Kit"
            subtitle="UI Components"
            price="$19"
          />

          <ProductCard icon="💻" title="Dev Tools" subtitle="Công cụ lập trình" price="$39" />

          <ProductCard
            icon="🚀"
            title="Launch Kit"
            subtitle="Khởi động nhanh"
            price="$49"
          />
        </div>
      </section>

      {/* Trending Section */}
      <section className="px-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Đang Trending</h2>
          <button className="text-sm text-purple-600 font-medium">Xem tất cả →</button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <ProductCard
            icon="⚡"
            title="Fast API"
            subtitle="Backend framework"
            price="$35"
          />

          <ProductCard
            icon="🎯"
            title="Analytics"
            subtitle="Phân tích dữ liệu"
            price="$25"
          />
        </div>
      </section>
    </>
  );
}

interface CategoryChipProps {
  label: string;
  active?: boolean;
}

function CategoryChip({ label, active = false }: CategoryChipProps) {
  return (
    <button
      className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
        active
          ? 'bg-purple-600 text-white'
          : 'bg-white text-gray-600 border border-gray-200'
      }`}
    >
      {label}
    </button>
  );
}
