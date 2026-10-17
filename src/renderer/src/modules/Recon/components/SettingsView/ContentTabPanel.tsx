import { useReconSettings } from '../Settings';
import { SettingSection, SettingRow, Switch, Segmented } from './controls';

export default function ContentTabPanel() {
  const { settings, updateContentTabUI } = useReconSettings();
  const s = settings.contentTabUI;

  return (
    <SettingSection title='Tab nội dung' description='Thanh tab phía trên vùng nội dung hồ sơ'>
      <SettingRow label='Kiểu tab'>
        <Segmented
          value={s.tabStyle}
          options={[
            { value: 'underline', label: 'Gạch chân' },
            { value: 'pill', label: 'Nền' },
          ]}
          onChange={(v) => updateContentTabUI({ tabStyle: v })}
        />
      </SettingRow>
      <SettingRow label='Hiện icon'>
        <Switch checked={s.showIcons} onChange={(v) => updateContentTabUI({ showIcons: v })} />
      </SettingRow>
      <SettingRow label='Hiện số lượng box'>
        <Switch checked={s.showBoxCount} onChange={(v) => updateContentTabUI({ showBoxCount: v })} />
      </SettingRow>
    </SettingSection>
  );
}