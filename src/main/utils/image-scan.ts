import * as fs from 'fs';
import * as path from 'path';
import { nativeImage } from 'electron';

export interface SquareImage {
  path: string;
  name: string;
  width: number;
  height: number;
  size: number;
}

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg']);
const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

const IGNORED_DIRS = new Set([
  'node_modules',
  'dist',
  'out',
  'release',
  'release-build',
  'coverage',
  'target',
  'vendor',
  'venv',
  'env',
  '__pycache__',
  'bower_components',
  'pods',
  'deriveddata',
  'gradle',
  'obj',
  'tmp',
  'temp',
  'logs',
  'cache',
  'storybook-static',
]);

const PRIORITY_DIRS = [
  'public',
  'assets',
  'static',
  'images',
  'img',
  'icons',
  'resources',
  'build',
  'branding',
  'logo',
  'logos',
  'media',
  'docs',
  'src',
  'app',
  '.github',
];
const NAME_HINT = /(logo|icon|favicon|brand|mark|avatar)/i;

const MAX_DEPTH = 3;
const MAX_DIRS = 120;
const MAX_DIR_ENTRIES = 400;
const MAX_COLLECT = 24;
const MAX_RESULTS = 12;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_SVG_BYTES = 256 * 1024;
const MIN_RASTER_SIDE = 32;
const MAX_RASTER_SIDE = 4096;
const HEADER_BYTES = 65536;
const TIME_BUDGET_MS = 1500;
const CACHE_TTL_MS = 30000;

const scanCache = new Map<string, { at: number; data: SquareImage[] }>();

interface Dimensions {
  width: number;
  height: number;
}

async function readHead(filePath: string, length: number): Promise<Buffer> {
  const fh = await fs.promises.open(filePath, 'r');
  try {
    const buf = Buffer.alloc(length);
    const { bytesRead } = await fh.read(buf, 0, length, 0);
    return buf.subarray(0, bytesRead);
  } finally {
    await fh.close();
  }
}

function parseRaster(buf: Buffer): Dimensions | null {
  if (buf.length >= 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }

  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = buf[i + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2;
        continue;
      }
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
    return null;
  }

  if (buf.length >= 30 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const kind = buf.toString('ascii', 12, 16);
    if (kind === 'VP8 ') {
      return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    }
    if (kind === 'VP8L') {
      const b0 = buf[21];
      const b1 = buf[22];
      const b2 = buf[23];
      const b3 = buf[24];
      return {
        width: 1 + (((b1 & 0x3f) << 8) | b0),
        height: 1 + (((b3 & 0xf) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
      };
    }
    if (kind === 'VP8X') {
      return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
    }
  }

  return null;
}

function parseSvg(buf: Buffer): Dimensions | null {
  const tag = /<svg\b[^>]*>/i.exec(buf.toString('utf8'));
  if (!tag) return null;

  const vb = /viewBox\s*=\s*["']\s*[-\d.eE]+[\s,]+[-\d.eE]+[\s,]+([\d.eE]+)[\s,]+([\d.eE]+)\s*["']/i.exec(tag[0]);
  if (vb) return { width: parseFloat(vb[1]), height: parseFloat(vb[2]) };

  const w = /\swidth\s*=\s*["']([\d.]+)(?:px)?["']/i.exec(tag[0]);
  const h = /\sheight\s*=\s*["']([\d.]+)(?:px)?["']/i.exec(tag[0]);
  if (w && h) return { width: parseFloat(w[1]), height: parseFloat(h[1]) };
  return null;
}

function isSquare(dim: Dimensions, ext: string): boolean {
  const { width, height } = dim;
  if (!(width > 0) || !(height > 0)) return false;
  if (ext !== '.svg') {
    if (width < MIN_RASTER_SIDE || height < MIN_RASTER_SIDE) return false;
    if (width > MAX_RASTER_SIDE || height > MAX_RASTER_SIDE) return false;
  }
  return Math.abs(width - height) / Math.max(width, height) < 0.01;
}

async function inspectImage(full: string, name: string): Promise<SquareImage | null> {
  const ext = path.extname(name).toLowerCase();
  if (!IMAGE_EXTS.has(ext)) return null;
  try {
    const stat = await fs.promises.stat(full);
    const limit = ext === '.svg' ? MAX_SVG_BYTES : MAX_FILE_BYTES;
    if (stat.size === 0 || stat.size > limit) return null;
    const head = await readHead(full, Math.min(stat.size, HEADER_BYTES));
    const dim = ext === '.svg' ? parseSvg(head) : parseRaster(head);
    if (!dim || !isSquare(dim, ext)) return null;
    return {
      path: full,
      name,
      width: Math.round(dim.width),
      height: Math.round(dim.height),
      size: stat.size,
    };
  } catch {
    return null;
  }
}

function isScannableDir(name: string): boolean {
  const lower = name.toLowerCase();
  if (IGNORED_DIRS.has(lower)) return false;
  if (lower.startsWith('.')) return lower === '.github';
  return true;
}

function dirRank(dir: string): number {
  const idx = PRIORITY_DIRS.indexOf(path.basename(dir).toLowerCase());
  return idx === -1 ? PRIORITY_DIRS.length : idx;
}

export async function scanSquareImages(projectPath: string): Promise<SquareImage[]> {
  const cached = scanCache.get(projectPath);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;

  const started = Date.now();
  const expired = () => Date.now() - started > TIME_BUDGET_MS;
  const found: Array<SquareImage & { score: number; depth: number }> = [];
  const queue: Array<{ dir: string; depth: number }> = [{ dir: projectPath, depth: 0 }];
  let visited = 0;

  while (queue.length && visited < MAX_DIRS && found.length < MAX_COLLECT && !expired()) {
    const { dir, depth } = queue.shift()!;
    visited++;

    let entries: fs.Dirent[];
    try {
      entries = (await fs.promises.readdir(dir, { withFileTypes: true })).slice(0, MAX_DIR_ENTRIES);
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (found.length >= MAX_COLLECT || expired()) break;
      if (entry.isSymbolicLink()) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (depth < MAX_DEPTH && isScannableDir(entry.name)) {
          queue.push({ dir: full, depth: depth + 1 });
        }
        continue;
      }
      if (!entry.isFile()) continue;
      const img = await inspectImage(full, entry.name);
      if (img) found.push({ ...img, score: NAME_HINT.test(entry.name) ? 1 : 0, depth });
    }

    queue.sort((a, b) => a.depth - b.depth || dirRank(a.dir) - dirRank(b.dir));
  }

  const data = found
    .sort((a, b) => b.score - a.score || a.depth - b.depth || b.width - a.width)
    .slice(0, MAX_RESULTS)
    .map(({ score: _score, depth: _depth, ...img }) => img);

  scanCache.set(projectPath, { at: Date.now(), data });
  return data;
}

export async function readImageDataUrl(filePath: string, maxSide = 96): Promise<string | null> {
  const ext = path.extname(filePath).toLowerCase();
  if (!IMAGE_EXTS.has(ext)) return null;
  try {
    const stat = await fs.promises.stat(filePath);
    if (!stat.isFile() || stat.size > (ext === '.svg' ? MAX_SVG_BYTES : MAX_FILE_BYTES)) return null;

    if (ext !== '.svg') {
      const img = nativeImage.createFromPath(filePath);
      if (!img.isEmpty()) {
        const side = Math.min(Math.max(Math.round(maxSide) || 96, 16), 512);
        const out = img.getSize().width > side ? img.resize({ width: side, quality: 'good' }) : img;
        return out.toDataURL();
      }
    }

    const buf = await fs.promises.readFile(filePath);
    return `data:${MIME[ext]};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}