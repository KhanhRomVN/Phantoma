import { useState } from 'react';
import type { MapLocation } from '../types';
import LocationPicker from './LocationPicker';

interface Props {
  locations: MapLocation[];
}

export default function GoogleMap({ locations }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Google Maps Embed URL - thay đổi theo địa điểm được chọn
  const getMapUrl = (location: MapLocation) => {
    return `https://maps.google.com/maps?q=${location.latitude},${location.longitude}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
  };

  return (
    <div className="relative w-full flex-1 min-h-[200px] overflow-hidden bg-[#080b10]">
      <div className="absolute top-3 left-3 z-10">
        <LocationPicker
          locations={locations}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
        />
      </div>

      <iframe
        key={selectedIndex}
        title="Google Map"
        width="100%"
        height="100%"
        className="absolute inset-0 w-full h-full"
        style={{ border: 0 }}
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        src={getMapUrl(locations[selectedIndex])}
      />
    </div>
  );
}