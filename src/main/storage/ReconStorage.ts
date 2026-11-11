/**
 * Recon Storage — lưu target recon dưới dạng thư mục file .recon
 *
 * Mỗi target là một thư mục `~/.phantoma/recon/{targetId}/` chứa các file `.recon`
 * (cùng định dạng với `src/renderer/src/modules/Recon/mock/mock1/`).
 * `_index.recon` là nguồn sự thật cho danh sách target (title, target_type, tags).
 */

import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { logger } from '../utils/logger';

const TARGET_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const RECON_FILE_PATTERN = /\.recon$/;

function getReconRoot(): string {
  return path.join(app.getPath('home'), '.phantoma', 'recon');
}

function getTargetDir(targetId: string): string {
  if (!TARGET_ID_PATTERN.test(targetId)) {
    throw new Error(`Invalid target id: ${targetId}`);
  }
  return path.join(getReconRoot(), targetId);
}

function writeFileAtomic(filePath: string, content: string): void {
  const tmpPath = `${filePath}.tmp`;
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(tmpPath, content, 'utf-8');
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    logger.error('[ReconStorage] Write failed:', err);
    throw err;
  }
}

/** Đọc nhanh frontmatter của `_index.recon` để lấy title + target_type. */
function parseIndexMeta(content: string): { title: string; targetType: string; updated: string } {
  const result = { title: '', targetType: 'other', updated: '' };
  const lines = content.split('\n');
  if (lines[0]?.trim() !== '---') return result;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '---') break;
    const m = /^([A-Za-z_]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const [, key, value] = m;
    if (key === 'title') result.title = value.trim();
    else if (key === 'target_type') result.targetType = value.trim();
    else if (key === 'updated') result.updated = value.trim();
  }
  return result;
}

/** Template `_index.recon` tối thiểu cho target mới. */
function buildIndexTemplate(title: string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  return [
    '---',
    'recon: 1.0',
    'type: index',
    `title: ${title}`,
    'target_type: other',
    'tags:',
    `updated: ${stamp}`,
    'theme:',
    '  preset: ember',
    '  mode: dark',
    '---',
    '',
    '# Header',
    '@box w=10 ui=kv',
    '',
    'entities: 0',
    'sources_used: 0',
    '',
  ].join('\n');
}

export interface ReconFsEntry {
  path: string;
  size: number;
  modified: string;
  content?: string;
  base64?: string;
  mime?: string;
}

/** MIME tối thiểu theo đuôi file, đủ để renderer dựng data URL. */
function mimeOf(ext: string): string {
  const map: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    pdf: 'application/pdf',
  };
  return map[ext] ?? 'application/octet-stream';
}

export interface ReconTargetRecord {
  id: string;
  title: string;
  targetType: string;
  updated: string;
  createdAt: string;
}

class ReconStorageService {
  /** Liệt kê mọi target đã lưu (đọc từ `_index.recon` của từng thư mục). */
  public listTargets(): ReconTargetRecord[] {
    const root = getReconRoot();
    if (!fs.existsSync(root)) return [];

    const records: ReconTargetRecord[] = [];
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const id = entry.name;
      const indexPath = path.join(root, entry.name, '_index.recon');
      if (!fs.existsSync(indexPath)) continue;

      try {
        const content = fs.readFileSync(indexPath, 'utf-8');
        const meta = parseIndexMeta(content);
        const stat = fs.statSync(indexPath);
        records.push({
          id,
          title: meta.title || id,
          targetType: meta.targetType || 'other',
          updated: meta.updated,
          createdAt: stat.birthtime.toISOString(),
        });
      } catch (err) {
        logger.error(`[ReconStorage] Failed to read target ${id}:`, err);
      }
    }

    records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return records;
  }

  /** Tạo target mới với `_index.recon` tối thiểu. Trả về id vừa tạo. */
  public createTarget(): ReconTargetRecord {
    const now = new Date();
    const id = `target-${now.getTime()}`;
    const title = now.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const dir = getTargetDir(id);
    writeFileAtomic(path.join(dir, '_index.recon'), buildIndexTemplate(title));

    return {
      id,
      title,
      targetType: 'other',
      updated: '',
      createdAt: now.toISOString(),
    };
  }

  /** Đọc toàn bộ file `.recon` của một target → map { filename: content }. */
  public readTargetFiles(targetId: string): Record<string, string> {
    const dir = getTargetDir(targetId);
    const result: Record<string, string> = {};
    if (!fs.existsSync(dir)) return result;

    const walk = (current: string) => {
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (RECON_FILE_PATTERN.test(entry.name)) {
          result[entry.name] = fs.readFileSync(full, 'utf-8');
        }
      }
    };
    walk(dir);
    return result;
  }

  /** Ghi đè nội dung một file `.recon` của target. */
  public writeTargetFile(targetId: string, fileName: string, content: string): void {
    if (!RECON_FILE_PATTERN.test(fileName) || fileName.includes('/') || fileName.includes('\\')) {
      throw new Error(`Invalid recon file name: ${fileName}`);
    }
    writeFileAtomic(path.join(getTargetDir(targetId), fileName), content);
  }

  /**
   * Đọc toàn bộ file trong thư mục `files/` của target (mọi độ sâu).
   * File text trả về `content`, file binary trả về `base64` + `mime`.
   */
  public readTargetFs(targetId: string): ReconFsEntry[] {
    const filesDir = path.join(getTargetDir(targetId), 'files');
    const result: ReconFsEntry[] = [];
    if (!fs.existsSync(filesDir)) return result;

    const TEXT_EXTS = new Set([
      'md', 'txt', 'json', 'js', 'ts', 'tsx', 'jsx', 'css', 'html', 'csv', 'xml', 'yml', 'yaml',
    ]);

    const walk = (current: string) => {
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        const rel = path.relative(filesDir, full).split(path.sep).join('/');
        const ext = path.extname(entry.name).slice(1).toLowerCase();
        const stat = fs.statSync(full);

        if (TEXT_EXTS.has(ext)) {
          result.push({
            path: rel,
            size: stat.size,
            modified: stat.mtime.toISOString(),
            content: fs.readFileSync(full, 'utf-8'),
          });
        } else {
          result.push({
            path: rel,
            size: stat.size,
            modified: stat.mtime.toISOString(),
            base64: fs.readFileSync(full).toString('base64'),
            mime: mimeOf(ext),
          });
        }
      }
    };
    walk(filesDir);
    return result;
  }

  /** Xoá một target (toàn bộ thư mục). */
  public deleteTarget(targetId: string): void {
    const dir = getTargetDir(targetId);
    if (!fs.existsSync(dir)) return;
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export const reconStorage = new ReconStorageService();