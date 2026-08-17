/**
 * Desktop App - Sidebar Navigation
 */

import { Home, TrendingUp, Users, Folder, Settings as SettingsIcon } from 'lucide-react';

type Page = 'dashboard' | 'settings';

interface SidebarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
}

export function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard' as Page, icon: Home, label: 'Tổng Quan' },
    { id: 'analytics' as Page, icon: TrendingUp, label: 'Phân Tích' },
    { id: 'users' as Page, icon: Users, label: 'Người Dùng' },
    { id: 'projects' as Page, icon: Folder, label: 'Dự Án' },
    { id: 'settings' as Page, icon: SettingsIcon, label: 'Cài Đặt' },
  ];

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-2xl">
            📊
          </div>
          <span className="text-xl font-bold">Dashboard</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all ${
                isActive
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-xl">
            👤
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">Nguyễn Văn A</p>
            <p className="text-xs text-gray-400 truncate">Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
