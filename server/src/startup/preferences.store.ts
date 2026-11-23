/**
 * ------------------------------------------------------------------
 * Preferences Store
 * ------------------------------------------------------------------
 * Lưu và đọc tuỳ chọn người dùng (port đã chọn lần trước, alert rule đã tắt...)
 * vào `~/.phantoma/preferences.json`. Dùng JSON đơn giản (không dùng SQLite)
 * để sẵn sàng trước khi khởi tạo DB.
 *
 * Main methods:
 * - load() / save()                 : Đọc / ghi toàn bộ object
 * - getLastPort() / saveLastPort()  : Port người dùng chọn lần cuối
 * - getDisabledAlertRules() / setDisabledAlertRules()
 * ------------------------------------------------------------------
 */

import fs from 'fs';
import path from 'path';
import type { Preferences } from '../types/startup.type';

export class PreferencesStore {
  constructor(private readonly file: string) {}

  load(): Preferences {
    try {
      if (!fs.existsSync(this.file)) return {};
      return JSON.parse(fs.readFileSync(this.file, 'utf8')) as Preferences;
    } catch {
      return {};
    }
  }

  save(prefs: Preferences): void {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(this.file, JSON.stringify(prefs, null, 2), 'utf8');
    } catch {
      // Lỗi ghi file không được làm crash app
    }
  }

  getLastPort(): number | undefined {
    return this.load().lastPort;
  }

  /**
   * Chỉ lưu port khi người dùng đã nhập tường minh (khác với default).
   * @param port Port người dùng chọn
   * @param defaultPort Port mặc định ban đầu
   */
  saveLastPort(port: number, defaultPort: number): void {
    const prefs = this.load();
    if (port !== defaultPort || prefs.lastPort !== undefined) {
      this.save({ ...prefs, lastPort: port });
    }
  }

  getDisabledAlertRules(): string[] {
    return this.load().disabledAlertRules ?? [];
  }

  setDisabledAlertRules(ids: string[]): void {
    this.save({ ...this.load(), disabledAlertRules: ids });
  }
}
