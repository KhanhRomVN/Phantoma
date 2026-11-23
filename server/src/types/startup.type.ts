/** Tuỳ chọn người dùng lưu tại `~/.phantoma/preferences.json`. */
export interface Preferences {
  /** Port được chọn lần cuối qua Welcome UI. */
  lastPort?: number;
  /** Id các alert rule mà người dùng đã tắt trong System Monitor. */
  disabledAlertRules?: string[];
}

export interface ServerAddress {
  host: string;
  port: number;
}
