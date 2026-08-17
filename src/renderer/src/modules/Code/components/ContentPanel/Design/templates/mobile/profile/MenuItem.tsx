/**
 * Menu Item Component
 */

import { ChevronRight } from 'lucide-react';

interface MenuItemProps {
  icon: string;
  iconColor: string;
  label: string;
  description?: string;
}

export function MenuItem({ icon, iconColor, label, description }: MenuItemProps) {
  return (
    <button className="w-full flex items-center gap-4 p-4 active:bg-gray-50 transition-colors">
      <div
        className={`w-10 h-10 ${iconColor} rounded-xl flex items-center justify-center text-xl flex-shrink-0`}
      >
        {icon}
      </div>

      <div className="flex-1 text-left min-w-0">
        <div className="font-medium text-gray-900 text-sm">{label}</div>
        {description && <div className="text-xs text-gray-500 truncate">{description}</div>}
      </div>

      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
    </button>
  );
}
