import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from '@renderer/components/ui/Dropdown';
import { ServiceIcon } from '../ServiceBadges';
import type { ServicePreset } from '../../constants/service.constants';

export function PresetDropdown({
  presets,
  onClose,
  onPick,
}: {
  presets: ServicePreset[];
  onClose: () => void;
  onPick: (preset: ServicePreset) => void;
}) {
  return (
    <Dropdown
      open={presets.length > 0}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
      align="start"
      sideOffset={4}
      className="block w-full"
    >
      <DropdownTrigger>
        <div className="h-0 w-full" />
      </DropdownTrigger>
      <DropdownContent className="max-h-[260px] overflow-y-auto">
        {presets.map((p) => (
          <DropdownItem
            key={p.name}
            noPadding
            className="items-start gap-2.5 px-2 py-2"
            icon={
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-text-secondary/10">
                <ServiceIcon name={p.name} url={p.websiteUrl} size={18} />
              </span>
            }
            onClick={() => onPick(p)}
          >
            <span className="flex min-w-0 flex-col gap-1">
              <span className="truncate text-xs font-semibold text-text-primary">{p.name}</span>
              <span className="flex flex-wrap gap-1">
                {p.customFields.slice(0, 4).map((f) => (
                  <span
                    key={f.name}
                    className="rounded-md bg-text-secondary/10 px-1.5 py-0.5 text-[10px] font-medium text-text-secondary"
                  >
                    {f.name}
                  </span>
                ))}
                {p.customFields.length > 4 && (
                  <span className="rounded-md bg-text-secondary/10 px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">
                    +{p.customFields.length - 4}
                  </span>
                )}
              </span>
            </span>
          </DropdownItem>
        ))}
      </DropdownContent>
    </Dropdown>
  );
}
