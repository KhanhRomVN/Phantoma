import type { MapLocation, MapRegion } from '../types';
import CustomMap from './CustomMap';
import GoogleMap from './GoogleMap';

export type MapMode = 'google' | 'custom';

interface Props {
  locations: MapLocation[];
  regions?: MapRegion[];
  mode?: MapMode;
  title?: string;
  subtitle?: string;
}

export default function Map({ locations, regions, mode = 'custom', title, subtitle }: Props) {
  if (locations.length === 0) {
    return <div className="text-text-secondary italic p-2">Không có địa điểm nào.</div>;
  }

  if (mode === 'google') {
    return <GoogleMap locations={locations} />;
  }

  return <CustomMap locations={locations} regions={regions} title={title} subtitle={subtitle} />;
}