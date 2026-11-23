import fs from 'fs';

/** Đọc file text; trả `null` nếu không tồn tại / không có quyền. */
export async function readTextFile(file: string): Promise<string | null> {
  try {
    return (await fs.promises.readFile(file, 'utf8')).trim();
  } catch {
    return null;
  }
}

export async function readNumberFile(file: string): Promise<number | null> {
  const text = await readTextFile(file);
  if (text === null) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

export async function listDir(dir: string): Promise<string[]> {
  try {
    return await fs.promises.readdir(dir);
  } catch {
    return [];
  }
}

/** Đọc tối đa `bytes` byte cuối của file (dùng cho log lớn); `null` nếu không đọc được. */
export async function readTail(file: string, bytes: number): Promise<string | null> {
  let handle: fs.promises.FileHandle | null = null;
  try {
    handle = await fs.promises.open(file, 'r');
    const { size } = await handle.stat();
    const length = Math.min(size, bytes);
    const buf = Buffer.alloc(length);
    await handle.read(buf, 0, length, size - length);
    return buf.toString('utf8');
  } catch {
    return null;
  } finally {
    await handle?.close();
  }
}
