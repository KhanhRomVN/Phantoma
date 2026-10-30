import { useState, useRef, useEffect } from 'react';
import Map, { Marker, NavigationControl, type MapRef } from 'react-map-gl/maplibre';
import { setWorkerUrl, type MapLayerMouseEvent } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { MapLocation, MapRegion } from '../types';
import { cn } from '@renderer/shared/utils/cn';
import LocationPicker from './LocationPicker';
import RegionLayers, { fetchBoundary, getBounds } from './RegionLayers';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@renderer/components/ui/Dropdown';

interface Props {
  locations: MapLocation[];
  regions?: MapRegion[];
  title?: string;
  subtitle?: string;
}

const LAYER_COLORS: [string, string, string][] = [
  ['background', 'background-color', '#0b0f16'],
  ['water', 'fill-color', '#12385a'],
  ['waterway', 'line-color', '#1a4a73'],
  ['landuse_residential', 'fill-color', '#131a24'],
  ['landcover_wood', 'fill-color', '#12241c'],
  ['landuse_park', 'fill-color', '#14291f'],
  ['building', 'fill-color', '#243044'],
  ['building', 'fill-outline-color', '#36465c'],
  ['highway_path', 'line-color', '#2a3547'],
  ['highway_minor', 'line-color', '#2e3a4e'],
  ['highway_major_casing', 'line-color', '#1a2230'],
  ['highway_major_inner', 'line-color', '#4a5870'],
  ['highway_major_subtle', 'line-color', '#3a475c'],
  ['highway_motorway_casing', 'line-color', '#1a2230'],
  ['highway_motorway_inner', 'line-color', '#6b7a94'],
  ['highway_motorway_subtle', 'line-color', '#3a475c'],
];

export default function CustomMap({ locations, regions = [] }: Props) {
  const mapRef = useRef<MapRef>(null);
  const isFirstRender = useRef(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [, setMouseCoords] = useState<[number, number] | null>(null);
  const [, setMapLoaded] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    lat: number;
    lng: number;
  } | null>(null);

  // Worker offline từ public/maplibre (relative document.baseURI: đúng cả dev http:// lẫn build file://)
  useEffect(() => {
    const workerUrl = new URL('maplibre/maplibre-gl-worker.js', document.baseURI).href;
    console.log(`[DEBUG] maplibre workerUrl: ${workerUrl}`);
    setWorkerUrl(workerUrl);
  }, []);

  if (locations.length === 0) {
    return <div className="text-text-secondary italic p-2">Không có địa điểm nào.</div>;
  }

  const selectedLocation = locations[selectedIndex] ?? locations[0];

  // Bay tới địa điểm / vừa khít vùng khi đổi lựa chọn (bỏ qua lần render đầu)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const loc = locations[selectedIndex];
    if (loc) {
      mapRef.current?.flyTo({
        center: [loc.longitude, loc.latitude],
        zoom: 14.5,
        duration: 1300,
      });
      return;
    }
    const region = regions[selectedIndex - locations.length];
    if (!region) return;
    let cancelled = false;
    fetchBoundary(region.name).then((geometry) => {
      const bounds = geometry && getBounds(geometry);
      if (!cancelled && bounds) mapRef.current?.fitBounds(bounds, { padding: 60, duration: 1300 });
    });
    return () => {
      cancelled = true;
    };
  }, [selectedIndex, locations]);
  // Màu cho các marker theo tone (giống HTML mẫu)
  const getMarkerColor = (tone?: string) => {
    if (tone === 'danger') return '#ff5c7a';
    if (tone === 'warn') return '#f5c542';
    return '#ff9f43';
  };

  const handleMouseMove = (e: any) => {
    if (e.lngLat) {
      setMouseCoords([e.lngLat.lat, e.lngLat.lng]);
    }
  };

  const handleContextMenu = (e: MapLayerMouseEvent) => {
    e.preventDefault();
    const { lngLat, point } = e;
    setContextMenu({
      x: point.x,
      y: point.y,
      lat: lngLat.lat,
      lng: lngLat.lng,
    });
  };

  const handleCopyCoordinates = () => {
    if (!contextMenu) return;
    navigator.clipboard.writeText(`${contextMenu.lat.toFixed(6)}, ${contextMenu.lng.toFixed(6)}`);
    setContextMenu(null);
  };

  const handleCreateLocation = () => {
    if (!contextMenu) return;
    // TODO: Implement create location logic
    setContextMenu(null);
  };

  return (
    <div className="relative w-full flex-1 min-h-[200px] overflow-hidden bg-[#080b10]">
      {/* Location Dropdown */}
      <div className="absolute top-3 left-3 z-10">
        <LocationPicker
          locations={locations}
          regions={regions}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
        />
      </div>

      {/* Map Container */}
      <div className="absolute inset-0 w-full h-full">
        <Map
          ref={mapRef}
          initialViewState={{
            longitude: selectedLocation.longitude,
            latitude: selectedLocation.latitude,
            zoom: 15,
          }}
          style={{ width: '100%', height: '100%' }}
          mapStyle="https://tiles.openfreemap.org/styles/dark"
          maxPitch={0}
          dragRotate={false}
          onMouseMove={handleMouseMove}
          onContextMenu={handleContextMenu}
          onLoad={(e) => {
            LAYER_COLORS.forEach(([layer, prop, color]) => {
              if (e.target.getLayer(layer))
                e.target.setPaintProperty(layer, prop as 'fill-color', color);
            });
            setMapLoaded(true);
          }}
          onError={(e) => {
            console.error('[CustomMap] Map error:', e);
          }}
        >
          <NavigationControl showCompass={false} position="top-right" />

          <RegionLayers regions={regions} />

          {locations.map((loc, idx) => {
            const isSelected = idx === selectedIndex;
            const color = getMarkerColor(loc.meta?.tone);

            return (
              <Marker key={idx} longitude={loc.longitude} latitude={loc.latitude} anchor="center">
                <button
                  type="button"
                  aria-label={loc.name}
                  aria-pressed={isSelected}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedIndex(idx);
                  }}
                  className={cn(
                    'relative grid h-[26px] w-[26px] place-items-center rounded-full border-2 border-[#0d1017]',
                    'font-mono text-xs font-semibold text-[#0d1017] transition-transform duration-150',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
                    isSelected && 'scale-125',
                  )}
                  style={{
                    background: color,
                    outlineColor: color,
                    boxShadow: isSelected ? `0 0 0 4px ${color}4d` : undefined,
                  }}
                >
                  <span
                    className="pointer-events-none absolute bottom-[34px] left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold text-white"
                    style={{ textShadow: '0 1px 3px #000, 0 0 6px #000' }}
                  >
                    {loc.name}
                  </span>
                  {idx + 1}
                </button>
              </Marker>
            );
          })}
        </Map>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <Dropdown
          open={!!contextMenu}
          onOpenChange={(open) => !open && setContextMenu(null)}
          trigger="contextmenu"
          strategy="fixed"
          position={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <DropdownTrigger>
            <div />
          </DropdownTrigger>
          <DropdownContent>
            <DropdownItem
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              }
              onClick={handleCopyCoordinates}
            >
              Copy tọa độ
            </DropdownItem>
            <DropdownItem
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              }
              onClick={handleCreateLocation}
            >
              Tạo địa điểm mới
            </DropdownItem>
          </DropdownContent>
        </Dropdown>
      )}

      {/* Custom styles cho controls */}
      <style>{`
        .maplibregl-ctrl-attrib { background: rgba(13,16,23,.8) !important; color: #7b8494 !important; }
        .maplibregl-ctrl-attrib a { color: #7b8494 !important; }
        .maplibregl-ctrl-scale { background: rgba(13,16,23,.8); color: #7b8494; border-color: #7b8494; font-family: monospace; }
        .maplibregl-ctrl-group { background: #0d1017; border: 1px solid #1c2330; }
        .maplibregl-ctrl-group button + button { border-top: 1px solid #1c2330; }
        .maplibregl-ctrl-group button .maplibregl-ctrl-icon { filter: invert(1) opacity(.7); }
      `}</style>
    </div>
  );
}
