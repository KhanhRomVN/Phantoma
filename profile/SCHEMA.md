# SCHEMA — profile server

## sources

Lưu ở: `<dataDir>/profile.sql` (mặc định `~/.phantoma/profile/profile.sql`)

| Cột    | Kiểu          | Ghi chú                                 |
| ------ | ------------- | --------------------------------------- |
| `id`   | TEXT PK       | uuid; `local` là source Chrome mặc định |
| `name` | TEXT NOT NULL | tên hiển thị, không trùng               |
| `path` | TEXT NOT NULL | folder user-data của Chrome             |

Source nào có `path` không còn tồn tại (kể cả `local`) thì bị xóa khỏi bảng mỗi lần đọc.

## services

Lưu ở: `<dataDir>/profile.sql` (mặc định `~/.phantoma/profile/profile.sql`)

| Cột             | Kiểu          | Ghi chú                                  |
| --------------- | ------------- | ---------------------------------------- |
| `id`            | TEXT PK       | uuid                                     |
| `name`          | TEXT NOT NULL |                                          |
| `website_url`   | TEXT NOT NULL | mặc định rỗng                            |
| `auth_methods`  | TEXT (JSON)   | mảng string: discord, apple, facebook... |
| `custom_fields` | TEXT (JSON)   | mảng `{ id, name, kind, required? }`     |
| `category`      | TEXT          | optional: social, video, messaging, dev, finance, ecommerce, other |

`kind` là một trong: `text`, `secret`, `api`, `totp`, `backup`, `array`, `url`.

## email

Lưu ở: `<profilesDir>/email.json`

| Field            | Kiểu             | Ghi chú       |
| ---------------- | ---------------- | ------------- |
| `email`          | string           |               |
| `display_name`   | string           |               |
| `avatar_hue`     | number           |               |
| `avatar_url`     | string \| null   |               |
| `recovery_email` | string \| null   |               |
| `phone_number`   | string \| null   |               |
| `totp`           | string \| null   | base32 secret |
| `backup_codes`   | { code, used }[] |               |
| `created_at`     | ISO string       |               |
| `updated_at`     | ISO string       |               |

## service_emails

Lưu ở: `<profilesDir>/<emailId>/service_email.sql`

| Cột             | Kiểu                 | Ghi chú                             |
| --------------- | -------------------- | ----------------------------------- |
| `id`            | TEXT PK              |                                     |
| `service_id`    | TEXT                 | id của `services` trong profile.sql |
| `totps`         | TEXT (JSON)          | optional                            |
| `backup_codes`  | TEXT (JSON)          | optional                            |
| `auth_methods`  | TEXT (JSON) NOT NULL | mảng string, mặc định `[]`          |
| `custom_fields` | TEXT (JSON)          | mảng `{ name, value }`, optional    |

`name` là tên field đã định nghĩa trong `services.custom_fields` (không lưu lại `kind`, `required`); `value` tùy kind của field đó.

## backup (chỉ ghi, không đọc)

Lưu ở: `<dataDir>/backup/<sourceName>.sql` (mỗi source một file; ký tự `\ / : * ? " < > |` trong tên được thay bằng `-`). Gồm 2 bảng gom dữ liệu của mọi email thuộc source đó.

Mọi thao tác thêm/sửa/xóa email hoặc service_email đều ghi lại vào file; các API đọc vẫn lấy từ `email.json` / `service_email.sql`. Ghi backup lỗi chỉ log, không làm hỏng thao tác chính.

`emails`: `id` (TEXT PK, email id), `email`, `display_name`, `avatar_hue`, `avatar_url`, `recovery_email`, `phone_number`, `totp`, `backup_codes` (JSON), `created_at`, `updated_at`.

`service_emails`: như bảng `service_emails` ở trên, thêm `email_id` (TEXT NOT NULL, trỏ tới `emails.id`).

Đổi tên source: đổi tên file `<oldName>.sql` → `<newName>.sql` (bỏ file cũ trùng tên nếu còn sót). Xóa source: xóa file backup của source đó cùng với `service_email.sql`/`session.sql` của các email thuộc source. Chuyển email giữa source (move): xóa dòng ở file source cũ, ghi dòng mới (id mới) vào file source đích; duplicate/merge chỉ ghi vào file source đích.

## sessions

Lưu ở: `<profilesDir>/<emailId>/session.sql` (file chỉ chứa bảng `sessions`)

Mỗi dòng = một lần chạy browser (chrome hoặc chromium). Bắt đầu khi browser chạy (`POST .../sessions`), kết thúc khi browser đóng (`POST .../sessions/:id/end`). Chạy lần mới thì session còn mở của email đó được tự đóng.

| Cột          | Kiểu          | Ghi chú                                                   |
| ------------ | ------------- | --------------------------------------------------------- |
| `id`         | TEXT PK       |                                                           |
| `browser`    | TEXT NOT NULL | `chrome` \| `chromium`                                    |
| `started_at` | INTEGER NOT NULL | unix ms (UTC)                                          |
| `ended_at`   | INTEGER       | unix ms (UTC); NULL = browser đang chạy                   |
| `ip`         | TEXT (JSON)   | object IP info (xem bên dưới)                             |
| `footprint`  | TEXT (JSON)   | object device footprint (xem bên dưới)                    |
| `sites`      | TEXT (JSON)   | mảng website đã vào trong session (xem bên dưới), ghi khi browser đóng |

`ip` (theo `IpInfo` của `ip-lookup.service`): `ip`, `type`, `isp`, `org`, `domain`, `asn`, `asName`, `route`, `registry`, `registryCountry`, `continent`, `continentCode`, `country`, `countryCode`, `region`, `city`, `zip`, `capital`, `borders`, `callingCode`, `isEu`, `lat`, `lon`, `timezone`, `tzAbbr`, `tzUtc`, `isDst`, `currencyName`, `currencyCode`, `currencySymbol`, `proxy`, `vpn`, `tor`, `anonymous`, `hosting`, `mobile`, `sources`.

`sites`: mảng `{ url, host, title, visits, durationSec, firstAt, lastAt }` — mỗi URL một dòng, lấy từ file `History` của browser trong khoảng `[started_at, ended_at]` (`firstAt`/`lastAt` là ISO UTC, `durationSec` là tổng `visit_duration`), tối đa 500 URL.

`footprint`: `name`, `os`, `browser`, `screen`, `gpu`, `cores`, `memory`, `lang`, `tz`, `cc`, `userAgent`, `sections` (mảng `{ id, title, fields: [label, value][] }` — ua, hardware, screen, window, locale, meta, canvas, prefs, color, storage, battery, plugins, network).

API (envelope `{ success, data }`): `GET|POST /profiles/:id/sessions`, `GET|PUT|DELETE /profiles/:id/sessions/:sid`, `POST /profiles/:id/sessions/:sid/end`.

## queries

Lưu ở: `<dataDir>/profile.sql` (mặc định `~/.phantoma/profile/profile.sql`)

Các query đã lưu của Profile (QueryModal). Dùng chung cho mọi source. Bảng được tạo bằng `CREATE TABLE IF NOT EXISTS` mỗi lần mở db.

| Cột          | Kiểu             | Ghi chú                                                                 |
| ------------ | ---------------- | ----------------------------------------------------------------------- |
| `id`         | TEXT PK          | uuid / id do client tạo                                                 |
| `name`       | TEXT NOT NULL    | tên hiển thị, mặc định `Untitled query`; có thể trùng                   |
| `mode`       | TEXT NOT NULL    | `all` \| `any` (cách ghép các condition của builder)                    |
| `kind`       | TEXT NOT NULL    | `visual` \| `sql` (`sql` = người dùng đã sửa tay phần SQL)              |
| `conditions` | TEXT (JSON)      | mảng `{ id, field, op, value }`, mặc định `[]`                          |
| `sql`        | TEXT             | câu WHERE do người dùng viết tay; NULL khi `kind = visual`              |
| `text`       | TEXT NOT NULL UNIQUE | câu WHERE cuối cùng đã chuẩn hóa (trim, gộp khoảng trắng, lowercase) dùng để chống trùng |
| `created_at` | INTEGER NOT NULL | unix ms (UTC)                                                           |
| `updated_at` | INTEGER NOT NULL | unix ms (UTC)                                                           |

Chống trùng: client gửi `text` (WHERE đang dùng); server chuẩn hóa rồi so sánh với các dòng khác, trùng thì trả HTTP 409 `duplicate query` và không ghi. Client cũng kiểm tra trước để hiện cảnh báo và chặn nút Save.

API (envelope `{ success, data }`): `GET|POST /queries`, `GET|PUT|DELETE /queries/:id`. Code: `repositories/query.repository.ts` → `services/query.service.ts` → `routes/query.route.ts`.