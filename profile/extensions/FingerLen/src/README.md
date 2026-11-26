# FingerLen — cấu trúc source

```
background.ts            Service worker: mở tab → scrape → build → ghi chrome.storage.session
types.ts                 Kiểu dùng chung (ScanTarget, RawPages, ScanData, ScanState…)

scan/
  targets.ts             Danh sách trang quét — NGUỒN DUY NHẤT (background + tab Raw Data cùng dùng)
  scrape.ts              Hàm tự chứa được inject vào tab (đọc DOM từng trang) → RawPages
  build/                 RawPages → ScanData (group → field) cho UI
    index.ts             Ghép các group + điểm số
    helpers.ts           put / flag / toNum / grab / sameTimezone
    glassbox.ts          Truy cập panel GlassBox theo tên (gb.row('Panel', 'row'))
    groups/              Mỗi file = 1 tab:  network · navigator · screen · webgl · timezone ·
                         detection · media · fingerprint
    checks.ts            Phép kiểm tra nhất quán (IP/timezone/ngôn ngữ/UA/GPU/màn hình)
    warnings.ts          Field nào bị gắn cờ cảnh báo
    overview.ts          Điểm security/privacy/consistency/uniqueness/trust (Dashboard)
  scrapers/              (chưa dùng) bản tách riêng của scrape.ts — xem "Lưu ý" bên dưới

fingerlen/               UI (React)
  tabSpec.ts             Cấu hình section/field từng tab
  data/                  hints · country · risk (RISKY, UNITS, META) · labels · fingerprint
                         (constants.ts là barrel re-export)
  components/            Dashboard · DetailTab · FingerprintTab · RawDataTab · heroes · Sidebar…
```

## Luồng dữ liệu
`targets.ts` → `scrape.ts` (RawPages) → `build/` (ScanData) → `App.tsx` → tab.

## Thêm một field mới
1. Lấy từ raw trong `scan/build/groups/<tab>.ts` bằng `put(group, 'tenField', giaTri)`.
2. Khai báo vào section trong `fingerlen/tabSpec.ts` (nếu quên, field vẫn hiện ở section **Other**).
3. Nếu là boolean mà `true` = đáng chú ý: thêm vào `RISKY` (`data/risk.ts`); cần đơn vị: thêm `UNITS`.

## Lưu ý
- `scan/scrapers/` hiện không được import ở đâu cả; `scrape.ts` mới là code chạy thật. Hai nơi có thể lệch nhau — nên chọn một nguồn (bundle scrapers vào `scrape.ts` hoặc xoá thư mục).
- Thêm vào `RISKY` các flag mới làm `checksTotal/checksPassed` ở Dashboard tăng (mẫu thử: 23 → 34 checks).
