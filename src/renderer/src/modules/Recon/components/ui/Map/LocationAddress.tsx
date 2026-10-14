import { useEffect, useState } from 'react';
import type { MapLocation } from '../types';

const MIN_INTERVAL_MS = 1100; // chính sách Nominatim: tối đa 1 request/giây
const cache = new Map<string, string>();
let queue: Promise<unknown> = Promise.resolve();

const keyOf = (lat: number, lng: number) => `${lat.toFixed(5)},${lng.toFixed(5)}`;

function fetchAddress(lat: number, lng: number): Promise<string | null> {
  const key = keyOf(lat, lng);
  const task = queue.then(async () => {
    const cached = cache.get(key);
    if (cached) return cached;
    let result: string | null = null;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=vi`,
      );
      if (res.ok) {
        const json = await res.json();
        result = json.display_name ?? null;
      }
    } catch {
      result = null;
    }
    if (result) cache.set(key, result);
    await new Promise((resolve) => setTimeout(resolve, MIN_INTERVAL_MS));
    return result;
  });
  queue = task;
  return task;
}

function useAddress(lat: number, lng: number): string | null {
  const [address, setAddress] = useState<string | null>(cache.get(keyOf(lat, lng)) ?? null);

  useEffect(() => {
    const cached = cache.get(keyOf(lat, lng));
    if (cached) {
      setAddress(cached);
      return;
    }
    setAddress(null);
    let cancelled = false;
    fetchAddress(lat, lng).then((result) => {
      if (!cancelled) setAddress(result);
    });
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  return address;
}

interface Props {
  location: MapLocation;
  className?: string;
}

export default function LocationAddress({ location, className }: Props) {
  const address = useAddress(location.latitude, location.longitude);
  const coords = `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;

  return (
    <div className={className} title={address ? `${address}\n${coords}` : coords}>
      {address ?? coords}
    </div>
  );
}