/**
 * Mobile App - Profile Page
 */

import { StatBox } from './StatBox';
import { MenuItem } from './MenuItem';
import { ToggleSwitch } from './ToggleSwitch';

export function ProfilePage() {
  return (
    <>
      {/* Profile Header */}
      <header className="bg-gradient-to-br from-purple-600 via-pink-600 to-purple-700 text-white px-4 py-8 text-center">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-5xl mx-auto mb-4 shadow-lg">
          👤
        </div>
        <h1 className="text-2xl font-bold mb-1">Nguyễn Văn A</h1>
        <p className="text-purple-100">nguyenvana@email.com</p>
      </header>

      {/* Stats */}
      <div className="px-4 -mt-8 mb-6">
        <div className="grid grid-cols-3 gap-4">
          <StatBox value="128" label="Đơn Hàng" />
          <StatBox value="45" label="Yêu Thích" />
          <StatBox value="892" label="Điểm" />
        </div>
      </div>

      {/* Account Menu */}
      <section className="px-4 mb-6">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">
          Tài Khoản
        </h2>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <MenuItem
            icon="👤"
            iconColor="bg-blue-100"
            label="Thông Tin Cá Nhân"
            description="Chỉnh sửa hồ sơ của bạn"
          />
          <MenuItem
            icon="🔒"
            iconColor="bg-green-100"
            label="Bảo Mật"
            description="Mật khẩu, xác thực 2 yếu tố"
          />
          <MenuItem
            icon="💳"
            iconColor="bg-yellow-100"
            label="Thanh Toán"
            description="Quản lý phương thức thanh toán"
          />
        </div>
      </section>

      {/* Preferences Menu */}
      <section className="px-4 mb-6">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">
          Tùy Chọn
        </h2>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
          <ToggleSwitch label="Thông Báo" defaultChecked={true} />
          <ToggleSwitch label="Chế Độ Tối" defaultChecked={false} />
          <MenuItem
            icon="🌐"
            iconColor="bg-green-100"
            label="Ngôn Ngữ"
            description="Tiếng Việt"
          />
        </div>
      </section>

      {/* Other Menu */}
      <section className="px-4 mb-6">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">
          Khác
        </h2>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <MenuItem icon="❓" iconColor="bg-yellow-100" label="Trợ Giúp & Hỗ Trợ" />
          <MenuItem icon="🚪" iconColor="bg-red-100" label="Đăng Xuất" />
        </div>
      </section>
    </>
  );
}
