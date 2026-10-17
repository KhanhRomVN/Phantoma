import { useReconSettings } from '../Settings';
import { SettingSection, SettingRow, Switch, Segmented } from './controls';

export default function LeftSidebarPanel() {
  const { settings, updateLeftSidebar } = useReconSettings();
  const s = settings.leftSidebar;

  return (
    <SettingSection title='Thanh bên trái' description='Danh sách target ở bên trái module Recon'>
      <SettingRow label='Độ rộng' description='Có thể kéo trực tiếp mép phải của thanh bên'>
        <div className='flex items-center gap-3'>
          <input
            type='range'
            min={200}
            max={500}
            step={10}
            value={s.width}
            onChange={(e) => updateLeftSidebar({ width: Number(e.target.value) })}
            className='w-40 accent-primary'
          />
          <span className='w-12 text-right text-xs tabular-nums text-text-secondary'>{s.width}px</span>
        </div>
      </SettingRow>
      <SettingRow label='Hiện ô tìm kiếm'>
        <Switch checked={s.showSearch} onChange={(v) => updateLeftSidebar({ showSearch: v })} />
      </SettingRow>
      <SettingRow label='Hiện bộ lọc loại'>
        <Switch checked={s.showTypeFilter} onChange={(v) => updateLeftSidebar({ showTypeFilter: v })} />
      </SettingRow>
      <SettingRow label='Mật độ'>
        <Segmented
          value={s.density}
          options={[
            { value: 'comfortable', label: 'Thoải mái' },
            { value: 'compact', label: 'Gọn' },
          ]}
          onChange={(v) => updateLeftSidebar({ density: v })}
        />
      </SettingRow>
    </SettingSection>
  );
}