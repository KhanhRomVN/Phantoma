/**
 * Product Card Component
 */

import { Plus } from 'lucide-react';

interface ProductCardProps {
  icon: string;
  title: string;
  subtitle: string;
  price: string;
}

export function ProductCard({ icon, title, subtitle, price }: ProductCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden active:scale-95 transition-transform">
      {/* Icon/Image */}
      <div className="aspect-square bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-5xl">
        {icon}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-gray-900 mb-1 text-sm">{title}</h3>
        <p className="text-xs text-gray-500 mb-3">{subtitle}</p>

        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-purple-600">{price}</span>
          <button className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-purple-100 transition-colors">
            <Plus className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
}
