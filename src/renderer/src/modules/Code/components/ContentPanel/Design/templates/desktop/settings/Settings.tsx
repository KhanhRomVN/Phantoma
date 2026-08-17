/**
 * Desktop App - Settings Page
 */

import { SettingSection } from './SettingSection';
import { ToggleSwitch } from './ToggleSwitch';

export function Settings() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Cài Đặt</h1>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* Profile Settings */}
        <SettingSection title="Thông Tin Cá Nhân">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tên Hiển Thị
              </label>
              <input
                type="text"
                defaultValue="Nguyễn Văn A"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="mt-1 text-sm text-gray-500">
                Tên của bạn sẽ hiển thị trong hệ thống
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                defaultValue="example@email.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="mt-1 text-sm text-gray-500">Địa chỉ email liên hệ</p>
            </div>

            <div className="flex gap-3 pt-4">
              <button className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium">
                Lưu Thay Đổi
              </button>
              <button className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium">
                Hủy
              </button>
            </div>
          </div>
        </SettingSection>

        {/* Notification Settings */}
        <SettingSection title="Thông Báo">
          <div className="space-y-4">
            <ToggleSwitch
              label="Thông Báo Email"
              description="Nhận thông báo qua email"
              defaultChecked={true}
            />

            <ToggleSwitch
              label="Thông Báo Push"
              description="Nhận thông báo trên desktop"
              defaultChecked={true}
            />

            <ToggleSwitch
              label="Âm Thanh Thông Báo"
              description="Phát âm thanh khi có thông báo mới"
              defaultChecked={false}
            />
          </div>
        </SettingSection>

        {/* Privacy Settings */}
        <SettingSection title="Bảo Mật & Quyền Riêng Tư">
          <div className="space-y-4">
            <ToggleSwitch
              label="Xác Thực Hai Yếu Tố"
              description="Tăng cường bảo mật tài khoản"
              defaultChecked={false}
            />

            <ToggleSwitch
              label="Hiển Thị Trạng Thái Online"
              description="Cho phép người khác thấy bạn đang online"
              defaultChecked={true}
            />
          </div>
        </SettingSection>
      </div>
    </div>
  );
}
