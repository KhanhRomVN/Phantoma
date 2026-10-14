import type { MapLocation, MapRegion } from '../types';
import { cn } from '@renderer/shared/utils/cn';
import { getMarkerColor } from './markerColor';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@renderer/components/ui/Dropdown';
import BadgeNumber from './BadgeNumber';
import LocationAddress from './LocationAddress';

interface Props {
  locations: MapLocation[];
  regions?: MapRegion[];
  /** Chỉ số gộp: địa điểm trước, vùng sau */
  selectedIndex: number;
  onSelect: (index: number) => void;
}

type Item =
  | { kind: 'location'; name: string; tone?: string; location: MapLocation }
  | { kind: 'region'; name: string; tone?: string };

function ItemSubtitle({ item, className }: { item: Item; className: string }) {
  if (item.kind === 'location')
    return <LocationAddress location={item.location} className={className} />;
  return <div className={className}>Vùng</div>;
}

export default function LocationPicker({
  locations,
  regions = [],
  selectedIndex,
  onSelect,
}: Props) {
  const items: Item[] = [
    ...locations.map((loc): Item => ({
      kind: 'location',
      name: loc.name,
      tone: loc.meta?.tone,
      location: loc,
    })),
    ...regions.map((r): Item => ({ kind: 'region', name: r.name, tone: r.meta?.tone })),
  ];
  const selected = items[selectedIndex] ?? items[0];
  const activeIndex = items[selectedIndex] ? selectedIndex : 0;

  return (
    <Dropdown align="start" side="bottom">
      <DropdownTrigger>
        <button
          type="button"
          className="flex items-center gap-2 bg-[#0d1017]/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-[#1c2330] hover:border-[#232c3b] transition-colors"
        >
          <BadgeNumber index={activeIndex} color={getMarkerColor(selected.tone)} />
          <div className="text-left min-w-0">
            <div className="text-sm font-medium text-[#e6e9ef]">{selected.name}</div>
            <ItemSubtitle
              item={selected}
              className="text-xs text-[#7b8494] truncate max-w-[260px]"
            />
          </div>
          <svg
            className="w-4 h-4 text-[#7b8494]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </DropdownTrigger>
      <DropdownContent className="max-h-[300px] overflow-y-auto">
        {items.map((item, idx) => (
          <DropdownItem
            key={`${item.kind}-${idx}`}
            onClick={() => onSelect(idx)}
            className={cn(
              'grid grid-cols-[26px_1fr] gap-2.5 h-auto py-2',
              activeIndex === idx && 'bg-[#11151d]',
            )}
          >
            <BadgeNumber index={idx} color={getMarkerColor(item.tone)} size="md" />
            <div className="flex-1 text-left min-w-0">
              <div className="text-sm font-medium text-[#e6e9ef] truncate">{item.name}</div>
              <ItemSubtitle item={item} className="text-xs text-[#7b8494] mt-0.5 truncate" />
            </div>
          </DropdownItem>
        ))}
      </DropdownContent>
    </Dropdown>
  );
}
