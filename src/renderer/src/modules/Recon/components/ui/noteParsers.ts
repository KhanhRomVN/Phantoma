import type {
  CalloutItem,
  StickyItem,
  QuoteItem,
  AnnotationItem,
  MapLocation,
  MapRegion,
} from './types';

/** Tách các khối {k=v} ở cuối dòng, trả về phần text sạch và map thuộc tính. */
export function splitProps(raw: string): { clean: string; props: Record<string, string> } {
  const props: Record<string, string> = {};
  let clean = raw;
  for (const m of raw.matchAll(/\{([^}]+)\}/g)) {
    for (const p of m[1].matchAll(/(\w+)=(?:"([^"]*)"|(\S+))/g)) {
      props[p[1]] = p[2] ?? p[3];
    }
    clean = clean.replace(m[0], '');
  }
  return { clean: clean.trim(), props };
}

export function bulletParts(body: string): { parts: string[]; props: Record<string, string> }[] {
  const out: { parts: string[]; props: Record<string, string> }[] = [];
  for (const line of body.split('\n')) {
    const match = line.match(/^\-\s+(.+)$/);
    if (!match) continue;
    const { clean, props } = splitProps(match[1]);
    out.push({ parts: clean.split('|').map((s) => s.trim()), props });
  }
  return out;
}

/** Callout: `- info | Tiêu đề | Nội dung {src=S-001}` (tone: ok|warn|danger|info|neutral). */
export function parseCallout(body: string): CalloutItem[] {
  return bulletParts(body)
    .filter((b) => b.parts.length >= 3)
    .map((b) => ({
      tone: b.parts[0],
      title: b.parts[1],
      content: b.parts[2],
      src: b.props.src?.split(','),
      color: b.props.color,
    }));
}

/** Sticky: `- orange | Nội dung ngắn` (trường đầu là id màu). */
export function parseSticky(body: string): StickyItem[] {
  return bulletParts(body)
    .filter((b) => b.parts.length >= 2)
    .map((b) => ({ color: b.parts[0], text: b.parts[1] }));
}

/** Quote: `- Nội dung trích | Tác giả {src=S-001, color=orange}`. */
export function parseQuote(body: string): QuoteItem[] {
  return bulletParts(body)
    .filter((b) => b.parts[0])
    .map((b) => ({
      text: b.parts[0],
      author: b.parts[1],
      src: b.props.src?.split(','),
      color: b.props.color,
    }));
}

/**
 * Annotation: `- 2026-05-12 14:30 | Tác giả | Mô tả ngắn | Nội dung {color=blue}`.
 * Mô tả là tuỳ chọn: bỏ qua thì viết `- thời gian | Tác giả | Nội dung`.
 */
export function parseAnnotation(body: string): AnnotationItem[] {
  return bulletParts(body)
    .filter((b) => b.parts.length >= 3)
    .map((b) => {
      const [time, author, ...rest] = b.parts;
      // Từ 4 phần trở lên: phần thứ 3 là mô tả, phần còn lại ghép lại thành nội dung
      const hasDesc = rest.length >= 2;
      return {
        time,
        author,
        desc: hasDesc ? rest[0] || undefined : undefined,
        content: hasDesc ? rest.slice(1).join(' | ') : rest[0],
        color: b.props.color,
      };
    });
}

/**
 * Map: `Tên địa điểm: latitude, longitude {tone=warn}`.
 * Ví dụ: `Hà Nội: 21.028511, 105.804817` hoặc `TP HCM: 10.762622, 106.660172 {tone=danger}`
 */
export function parseMap(body: string): MapLocation[] {
  const locations: MapLocation[] = [];
  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    const { clean, props } = splitProps(trimmed);
    const match = clean.match(/^([^:]+):\s*([\-\d.]+)\s*,\s*([\-\d.]+)$/);
    if (!match) continue;
    
    const name = match[1].trim();
    const latitude = parseFloat(match[2]);
    const longitude = parseFloat(match[3]);
    
    if (isNaN(latitude) || isNaN(longitude)) continue;
    
    locations.push({
      name,
      latitude,
      longitude,
      meta: props.tone ? { tone: props.tone as any } : undefined,
    });
  }
  return locations;
}

/**
 * Vùng: `Tên vùng: region {tone=warn}`. Ranh giới được tra theo tên (Nominatim).
 * Ví dụ: `An Giang: region`
 */
export function parseMapRegions(body: string): MapRegion[] {
  const regions: MapRegion[] = [];
  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const { clean, props } = splitProps(trimmed);
    const match = clean.match(/^([^:]+):\s*region$/i);
    if (!match) continue;

    regions.push({
      name: match[1].trim(),
      meta: props.tone ? { tone: props.tone as any } : undefined,
    });
  }
  return regions;
}