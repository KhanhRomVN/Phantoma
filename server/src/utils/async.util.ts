/**
 * ------------------------------------------------------------------
 * Async Utils
 * ------------------------------------------------------------------
 * TtlCache: cache 1 giá trị bất đồng bộ với thời gian sống (TTL), gộp các
 * lần gọi đồng thời vào 1 lần load, và giữ giá trị cũ nếu lần load mới lỗi.
 * Dùng cho các nguồn dữ liệu chậm (spawn lệnh hệ thống) của System Monitor.
 * ------------------------------------------------------------------
 */

export class TtlCache<T> {
  private value: T | undefined;
  private hasValue = false;
  private loadedAt = 0;
  private inflight: Promise<T> | null = null;

  constructor(
    private readonly ttlMs: number,
    private readonly loader: () => Promise<T>,
  ) {}

  private isFresh(): boolean {
    return this.hasValue && Date.now() - this.loadedAt < this.ttlMs;
  }

  /** Lấy giá trị; nếu hết hạn thì load lại và chờ kết quả. */
  get(force = false): Promise<T> {
    if (!force && this.isFresh()) return Promise.resolve(this.value as T);
    if (this.inflight) return this.inflight;

    this.inflight = this.loader()
      .then((v) => {
        this.value = v;
        this.hasValue = true;
        this.loadedAt = Date.now();
        return v;
      })
      .catch((err: unknown) => {
        if (!this.hasValue) throw err;
        this.loadedAt = Date.now(); // lỗi tạm thời: giữ giá trị cũ thêm 1 TTL
        return this.value as T;
      })
      .finally(() => {
        this.inflight = null;
      });
    return this.inflight;
  }

  /** Trả giá trị cũ ngay (nếu có) và refresh nền; chỉ chờ ở lần đầu tiên. */
  getStale(): Promise<T> {
    if (!this.hasValue) return this.get();
    this.refresh();
    return Promise.resolve(this.value as T);
  }

  /** Giá trị hiện có, không chờ, không load. */
  peek(): T | undefined {
    return this.value;
  }

  /** Kích hoạt load nền nếu đã hết hạn; không bao giờ ném lỗi. */
  refresh(): void {
    if (this.isFresh() || this.inflight) return;
    this.get().catch(() => undefined);
  }
}
