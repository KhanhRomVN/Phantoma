import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { ImagePort, SquareImage } from '../../application/ports/filesystem.port';

export type { SquareImage };

interface Dimensions {
  width: number;
  height: number;
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
const MAX_DOWNLOAD_BYTES = 5 * 1024 * 1024;

const EXT_BY_MIME: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
};

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

function parseSvg(content: string): Dimensions | null {
  const buf = Buffer.from(content, 'utf8');
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



export class ImageAdapter implements ImagePort {
  private readonly scanCache = new Map<string, { at: number; data: SquareImage[] }>();

  constructor(private readonly dataDir: string) {}

  async scanSquareImages(projectPath: string): Promise<SquareImage[]> {
    const cached = this.scanCache.get(projectPath);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;

    const startAt = Date.now();
    const isExpired = (): boolean => Date.now() - startAt > TIME_BUDGET_MS;

    const collected: Array<{ file: string; size: number; priorityDir: boolean; nameHint: boolean }> = [];
    let dirsScanned = 0;

    const walk = async (dir: string, depth: number): Promise<void> => {
      if (depth > MAX_DEPTH || isExpired() || dirsScanned >= MAX_DIRS) return;
      dirsScanned++;
      let entries: fs.Dirent[];
      try {
        entries = await fs.promises.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      if (entries.length > MAX_DIR_ENTRIES) return;

      const basename = path.basename(dir);
      const priorityDir = PRIORITY_DIRS.includes(basename.toLowerCase());
      const subdirs: fs.Dirent[] = [];

      for (const ent of entries) {
        if (isExpired() || collected.length >= MAX_COLLECT) break;
        if (ent.isFile()) {
          const ext = path.extname(ent.name).toLowerCase();
          if (!IMAGE_EXTS.has(ext)) continue;
          const file = path.join(dir, ent.name);
          const stat = await fs.promises.stat(file).catch(() => null);
          if (!stat || stat.size > MAX_FILE_BYTES) continue;
          collected.push({
            file,
            size: stat.size,
            priorityDir,
            nameHint: NAME_HINT.test(ent.name),
          });
        } else if (ent.isDirectory() && !IGNORED_DIRS.has(ent.name)) {
          subdirs.push(ent);
        }
      }

      if (isExpired() || dirsScanned >= MAX_DIRS) return;
      subdirs.sort((a, b) => {
        const ap = PRIORITY_DIRS.includes(a.name.toLowerCase());
        const bp = PRIORITY_DIRS.includes(b.name.toLowerCase());
        if (ap !== bp) return ap ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      for (const sub of subdirs) {
        if (isExpired() || dirsScanned >= MAX_DIRS) break;
        await walk(path.join(dir, sub.name), depth + 1);
      }
    };

    await walk(projectPath, 0);

    collected.sort((a, b) => {
      if (a.priorityDir !== b.priorityDir) return a.priorityDir ? -1 : 1;
      if (a.nameHint !== b.nameHint) return a.nameHint ? -1 : 1;
      return a.size - b.size;
    });

    const results: SquareImage[] = [];
    for (const item of collected) {
      if (results.length >= MAX_RESULTS) break;
      const ext = path.extname(item.file).toLowerCase();
      let dim: Dimensions | null = null;
      if (ext === '.svg') {
        if (item.size <= MAX_SVG_BYTES) {
          const buf = await fs.promises.readFile(item.file).catch(() => null);
          dim = buf ? parseSvg(buf.toString('utf-8')) : null;
        }
      } else {
        const header = await readHead(item.file, HEADER_BYTES).catch(() => null);
        dim = header ? parseRaster(header) : null;
      }
      if (!dim) continue;
      if (dim.width !== dim.height) continue;
      if (ext !== '.svg' && (dim.width < MIN_RASTER_SIDE || dim.width > MAX_RASTER_SIDE)) continue;
      results.push({
        path: item.file,
        name: path.basename(item.file),
        width: dim.width,
        height: dim.height,
        size: item.size,
      });
    }

    const data = results;
    this.scanCache.set(projectPath, { at: Date.now(), data });
    return data;
  }

  async readImageDataUrl(filePath: string): Promise<string | null> {
    const ext = path.extname(filePath).toLowerCase();
    if (!IMAGE_EXTS.has(ext)) return null;
    try {
      const stat = await fs.promises.stat(filePath);
      if (!stat.isFile() || stat.size > (ext === '.svg' ? MAX_SVG_BYTES : MAX_FILE_BYTES)) return null;
      const buf = await fs.promises.readFile(filePath);
      return `data:${MIME[ext]};base64,${buf.toString('base64')}`;
    } catch {
      return null;
    }
  }

  async downloadProjectLogo(url: string): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
      if (!/^https?:\/\//i.test(url)) {
        return { success: false, error: 'URL must start with http:// or https://' };
      }
      const res = await fetch(url);
      if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
      const type = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
      const ext = EXT_BY_MIME[type];
      if (!ext) return { success: false, error: 'Unsupported image type (png, jpg, webp, svg)' };
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > MAX_DOWNLOAD_BYTES) return { success: false, error: 'Image is larger than 5 MB' };
      const dir = path.join(this.dataDir, 'project-logos');
      await fs.promises.mkdir(dir, { recursive: true });
      const hash = crypto.createHash('sha1').update(url).digest('hex').slice(0, 16);
      const file = path.join(dir, `${hash}${ext}`);
      await fs.promises.writeFile(file, buf);
      return { success: true, path: file };
    } catch (err: any) {
      return { success: false, error: err?.message ?? 'Download failed' };
    }
  }
}