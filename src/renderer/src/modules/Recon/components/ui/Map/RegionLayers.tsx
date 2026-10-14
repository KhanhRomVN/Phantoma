import { useEffect, useState } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import type { MapRegion } from '../types';
import { getMarkerColor } from './markerColor';

const MIN_INTERVAL_MS = 1100; // chính sách Nominatim: tối đa 1 request/giây
const cache = new Map<string, any>();
let queue: Promise<unknown> = Promise.resolve();

export function getBounds(geometry: any): [[number, number], [number, number]] | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const walk = (c: any) => {
    if (typeof c[0] === 'number') {
      minX = Math.min(minX, c[0]);
      maxX = Math.max(maxX, c[0]);
      minY = Math.min(minY, c[1]);
      maxY = Math.max(maxY, c[1]);
    } else {
      c.forEach(walk);
    }
  };
  walk(geometry.coordinates);
  return Number.isFinite(minX)
    ? [
        [minX, minY],
        [maxX, maxY],
      ]
    : null;
}

export function fetchBoundary(name: string): Promise<any | null> {
  const task = queue.then(async () => {
    if (cache.has(name)) return cache.get(name);
    let geojson: any = null;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&polygon_geojson=1&accept-language=vi&q=${encodeURIComponent(name)}`,
      );
      if (res.ok) {
        const json = await res.json();
        const g = json[0]?.geojson;
        if (g && (g.type === 'Polygon' || g.type === 'MultiPolygon')) geojson = g;
      }
    } catch {
      geojson = null;
    }
    if (geojson) cache.set(name, geojson);
    await new Promise((resolve) => setTimeout(resolve, MIN_INTERVAL_MS));
    return geojson;
  });
  queue = task;
  return task;
}

function RegionItem({ region, index }: { region: MapRegion; index: number }) {
  const [geometry, setGeometry] = useState<any | null>(cache.get(region.name) ?? null);
  const color = getMarkerColor(region.meta?.tone);

  useEffect(() => {
    if (cache.has(region.name)) {
      setGeometry(cache.get(region.name));
      return;
    }
    let cancelled = false;
    fetchBoundary(region.name).then((g) => {
      if (!cancelled) setGeometry(g);
    });
    return () => {
      cancelled = true;
    };
  }, [region.name]);

  if (!geometry) return null;

  return (
    <Source
      id={`region-${index}`}
      type="geojson"
      data={{ type: 'Feature', properties: { name: region.name }, geometry }}
    >
      <Layer
        id={`region-fill-${index}`}
        type="fill"
        paint={{ 'fill-color': color, 'fill-opacity': 0.12 }}
      />
      <Layer
        id={`region-line-${index}`}
        type="line"
        paint={{ 'line-color': color, 'line-width': 2, 'line-opacity': 0.8, 'line-dasharray': [3, 2] }}
      />
    </Source>
  );
}

export default function RegionLayers({ regions }: { regions: MapRegion[] }) {
  return (
    <>
      {regions.map((region, idx) => (
        <RegionItem key={region.name} region={region} index={idx} />
      ))}
    </>
  );
}