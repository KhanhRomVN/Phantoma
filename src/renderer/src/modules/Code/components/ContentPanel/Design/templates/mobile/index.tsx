/**
 * Mobile App Template - Main Router
 * Platform: Mobile (Smartphones & Tablets)
 */

import { useState } from 'react';
import { Home, Search, ShoppingCart, User } from 'lucide-react';
import { HomePage } from './home/HomePage';
import { ProfilePage } from './profile/ProfilePage';

type Page = 'home' | 'explore' | 'cart' | 'profile';

export function MobileTemplate() {
  const [currentPage, setCurrentPage] = useState<Page>('home');

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen flex flex-col">
      {/* Status Bar */}
      <div className="bg-purple-600 text-white px-4 py-3 flex items-center justify-between text-sm">
        <span>9:41</span>
        <div className="flex items-center gap-2">
          <span>📶</span>
          <span>🔋</span>
        </div>
      </div>

      {/* Page Content */}
      <div className="flex-1 overflow-auto pb-20">
        {currentPage === 'home' && <HomePage />}
        {currentPage === 'profile' && <ProfilePage />}
        {currentPage === 'explore' && (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <Search className="w-16 h-16 mx-auto mb-4" />
              <p>Khám Phá Page</p>
            </div>
          </div>
        )}
        {currentPage === 'cart' && (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <ShoppingCart className="w-16 h-16 mx-auto mb-4" />
              <p>Giỏ Hàng Page</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 shadow-lg">
        <div className="flex items-center justify-around py-2">
          <NavItem
            icon={<Home className="w-6 h-6" />}
            label="Trang Chủ"
            active={currentPage === 'home'}
            onClick={() => setCurrentPage('home')}
          />
          <NavItem
            icon={<Search className="w-6 h-6" />}
            label="Khám Phá"
            active={currentPage === 'explore'}
            onClick={() => setCurrentPage('explore')}
          />
          <NavItem
            icon={<ShoppingCart className="w-6 h-6" />}
            label="Giỏ Hàng"
            active={currentPage === 'cart'}
            onClick={() => setCurrentPage('cart')}
          />
          <NavItem
            icon={<User className="w-6 h-6" />}
            label="Cá Nhân"
            active={currentPage === 'profile'}
            onClick={() => setCurrentPage('profile')}
          />
        </div>
      </nav>
    </div>
  );
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function NavItem({ icon, label, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
        active ? 'text-purple-600' : 'text-gray-400'
      }`}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
