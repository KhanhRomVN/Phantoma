# PROMPT: Restructure + Cleancode Profile (giai đoạn 1 — Lập kế hoạch)

> Dùng cho AI "Planner". Planner CHỈ quét và viết kế hoạch ra file `.md`. Planner KHÔNG sửa bất kỳ file code nào. AI "Executor" ở giai đoạn 2 đọc file kế hoạch, thực thi từng task và **tick checkbox** khi xong.

---

## 0. Đầu vào (điền trước khi chạy)

| Biến          | Giá trị                                                                                   |
| ------------- | ----------------------------------------------------------------------------------------- |
| `UI_ROOT`     | `src/renderer/src/modules/Profile/` — module Profile khép kín (từ `Profile.zip`)          |
| `SERVER_ROOT` | thư mục express-server Profile (từ `profile.zip`), mã nguồn thường ở `<SERVER_ROOT>/src/` |
| `PLAN_FILE`   | `docs/plans/restructure-profile.md`                                                       |

- Nếu `Profile.zip` / `profile.zip` chưa giải nén: giải nén vào thư mục tạm **ngoài repo** (vd `/tmp/profile-ui`, `/tmp/profile-server`) chỉ để đọc. Việc giải nén không tính là "sửa code".
- Nếu cấu trúc thật khác giả định trên (tên thư mục gốc, vị trí `src`), ghi vào mục "Giả định / Cần xác nhận" và dùng đường dẫn thật.

## 1. Vai trò

Bạn là kiến trúc sư phần mềm senior (Node.js/TypeScript + Express backend, React/Electron frontend). Nhiệm vụ:

1. Quét toàn bộ **server Profile** (`SERVER_ROOT`) và **module Profile ở client** (`UI_ROOT`).
2. **So sánh hai phía** để tìm mọi chỗ lệch nhau (domain, tên, type, endpoint, validate, logic dẫn xuất).
3. Lập kế hoạch **restructure + cleancode** theo phase để cả hai phía có kiến trúc rõ ràng, nhất quán và **khớp 1-1** (cùng domain, cùng tên, cùng type, cùng ranh giới trách nhiệm).

### 1.1 Tinh thần: sáng tạo & tối ưu để hệ thống hoàn thiện nhất

Đây KHÔNG phải việc sắp xếp lại máy móc. Planner và Executor được chủ động đề xuất và thực hiện mọi cải tiến giúp hệ thống tốt nhất có thể:

- **Gộp**: file/hàm/component/hook/store/endpoint liên quan chặt chẽ hoặc trùng lặp.
- **Tách**: file/hàm/component ôm nhiều trách nhiệm thành các đơn vị nhỏ, tái sử dụng được.
- **Viết lại / sửa sâu**: logic rối, cấu trúc dữ liệu kém, luồng thừa; đổi tên đúng bản chất; thay giải pháp vòng vèo bằng giải pháp đơn giản.
- **Thiết kế lại**: thư mục, ranh giới tầng, hợp đồng API, luồng dữ liệu client ↔ server nếu thiết kế mới tốt hơn rõ rệt.
- **Tối ưu**: số lần gọi API, re-render, tính toán lặp, cache, độ dễ đọc/mở rộng/bảo trì.
- **Xóa**: code chết, abstraction không dùng, lớp bọc vô nghĩa.
- Mỗi đề xuất lớn phải nêu: vấn đề → giải pháp → vì sao tốt hơn → rủi ro. Có nhiều hướng thì chọn hướng tốt nhất, ghi ngắn gọn lý do loại các hướng còn lại.
- Các quy tắc ở mục 5 là nền tảng, không phải trần giới hạn: được vượt/thay đổi nếu có lý do rõ ràng, ghi vào kế hoạch (kèm cập nhật `AGENTS.md` nếu có).

## 2. Phạm vi

| Thư mục                                                                  | Quyền                                                                                                                                                                |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SERVER_ROOT/**`                                                         | Toàn quyền, mọi loại thay đổi: file/folder (move, rename, create, edit, delete, split, merge), endpoint, logic, type, schema, config                                 |
| `UI_ROOT/**`                                                             | Toàn quyền như server: component, hook, store, service, util, type, style, route/tab, cấu trúc feature, nơi gọi API                                                  |
| Mọi thứ khác (`src/main`, `src/shared`, `components/ui`, module khác...) | Chỉ đọc để tham chiếu. Nếu thay đổi bắt buộc chạm ngoài phạm vi (IPC handler, import từ `@renderer/...`...), ghi vào mục "Ảnh hưởng ngoài phạm vi", không tự mở rộng |

Planner chỉ được ghi đúng 1 file: `PLAN_FILE`.

## 3. Quy trình quét (bắt buộc theo thứ tự)

1. **Inventory server**: liệt kê toàn bộ file trong `SERVER_ROOT` (bỏ `node_modules`, `dist`, lock file) kèm số dòng, nhóm theo tầng (routes / controllers / services / repositories-models / middlewares / utils / types / config).
2. **Inventory UI**: liệt kê toàn bộ file trong `UI_ROOT` kèm số dòng, nhóm theo thư mục; với mỗi nhóm ghi rõ `components / hooks / stores / services / utils / types`.
3. **Bảng đồng bộ gọi API**: UI nơi gọi → hàm API client/IPC → Endpoint → Handler/Service server, cho mọi lệnh gọi server của UI.
4. **So sánh Profile UI ↔ Server** (bước trọng tâm, xem mục 4).
5. **Phát hiện vấn đề** (ID V01, V02...; mức cao/trung/thấp; kèm `file:dòng`):
   - **Server**: route chứa nghiệp vụ; service gọi thẳng `fs`/`child_process`/DB thay vì qua helper/repository; file quá dài/ôm nhiều trách nhiệm; tên không nhất quán; endpoint chết/trùng; thiếu validate input; response không theo envelope; xử lý lỗi không thống nhất.
   - **UI**: component > 300 dòng cần xem xét tách, > 800 dòng là mức cao; component ôm cả fetch + logic + render; logic dẫn xuất tính ở UI trong khi nên ở server; state trùng giữa store và state cục bộ; nhiều effect gọi nhiều API cho 1 màn hình; cache/Map ở module-level rải rác; import chéo giữa các feature không qua `shared/`; gọi `window.api` rải rác thay vì tập trung; style/class sai quy ước dự án; code chết, prop thừa, hook lặp.
   - **Cả hai**: type request/response định nghĩa lặp ở hai phía; cùng khái niệm khác tên; logic trùng; import vòng.
6. **Thiết kế kiến trúc đích** (cây thư mục, quy tắc phụ thuộc, endpoint đích, sơ đồ tách màn hình lớn).
7. **Chia phase**: mỗi phase độc lập, build/type-check được, merge riêng được, và **luôn giữ server + UI khớp nhau ở cuối phase**.

## 4. So sánh Profile UI ↔ Server (bắt buộc có trong kế hoạch)

Planner phải lập đủ các bảng sau, mọi dòng kèm `file:dòng` ở cả hai phía:

| Bảng                       | Nội dung                                                                                                                                                                                                       |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **C1. Domain/Entity**      | Mỗi entity/khái niệm (vd Profile, session, cookie, fingerprint, proxy, group, tag...): tên ở server (route/service/model) vs tên ở UI (type/store/folder). Đánh dấu ✅ khớp / ⚠️ lệch tên / ❌ chỉ có một phía |
| **C2. Type/Field**         | Từng type request/response: field, kiểu, optional/required, giá trị mặc định ở server vs UI. Liệt kê field thừa/thiếu/khác kiểu/khác tên (camelCase vs snake_case...)                                          |
| **C3. Endpoint coverage**  | Endpoint server có nhưng UI không gọi (đề xuất xóa/giữ); UI gọi nhưng server không có hoặc UI tự xử lý cục bộ; endpoint trùng chức năng; method/path/status code không nhất quán                               |
| **C4. Validate & lỗi**     | Rule validate ở server vs ở UI (trùng, mâu thuẫn, chỉ một phía); mã lỗi/message server trả vs cách UI hiểu/hiển thị                                                                                            |
| **C5. Logic dẫn xuất**     | Phân loại/tính toán/format đang nằm ở UI mà nên ở server (hoặc ngược lại); logic bị nhân đôi ở hai phía                                                                                                        |
| **C6. Luồng dữ liệu**      | Với từng màn hình lớn: số request khi mở màn hình, có thể gộp thành 1 endpoint theo use-case không; chỗ nào cache/refresh thừa                                                                                 |
| **C7. Cấu trúc & quy ước** | So sánh tổ chức thư mục, đặt tên file, kiểu export, config (port/đường dẫn hardcode) giữa hai phía; chỗ nào cần thống nhất                                                                                     |

Kết thúc mục này bằng **"Danh sách lệch cần khớp"**: mỗi lệch là một ID (S01, S02...), nói rõ phía nào sửa (server / UI / cả hai), hướng thống nhất được chọn và lý do.

## 5. Nguyên tắc kiến trúc phải tuân theo

**Server**

- Phân tầng một chiều: `routes` (parse request, gọi service) → `services` (validate, nghiệp vụ, 404) → helpers/repositories (I/O, DB, fs). Tầng dưới không import tầng trên.
- Mọi thao tác fs/đường dẫn đi qua một helper bảo vệ chung (vd `safePath`) nếu dự án đã có; không tự dựng đường dẫn rải rác.
- Ưu tiên endpoint theo **use-case của màn hình** (một lần trả đủ dữ liệu dựng UI); thao tác ghi giữ riêng, mỗi hành động một endpoint.
- Phân loại/tính toán dẫn xuất tính ở server một lần; UI chỉ hiển thị.
- Response theo envelope thống nhất; type request/response định nghĩa một chỗ.

**UI**

- Tổ chức khép kín trong `UI_ROOT`: `features/<name>/{components,hooks,stores,services,utils,types}`; thứ dùng chung đặt ở `shared/`. Feature không import nội bộ feature khác (chỉ qua `index.ts` hoặc `shared/`). Module Profile không import ngược nội bộ module khác.
- Component chỉ render + gắn sự kiện; logic và gọi API đặt trong hook/service; dữ liệu từ server đi qua **một** lớp API client duy nhất của module và store, không gọi rải rác.
- Một file một trách nhiệm; mỗi file component export một component chính.
- Giữ quy ước UI của dự án: `Button` không có `variant` (style qua `className`); modal footer kiểu soft (`bg-primary/10 ...`); chỉ dùng class Tailwind có trong `tailwind.config.js`.
- State dẫn xuất từ server lưu ở store theo khóa định danh; tránh state trùng giữa component và store.

**Đồng bộ hai phía**

- Cùng một domain dùng cùng một tên ở route, service, namespace API client, store và thư mục feature.
- Type request/response là nguồn sự thật duy nhất; UI import/mirror có chú thích nguồn; không định nghĩa lại hình dạng dữ liệu ở nhiều nơi.
- Khi một endpoint đổi contract, **cùng phase** PHẢI sửa API client, type và mọi nơi gọi ở UI.

## 6. Ràng buộc

- Giữ nguyên hành vi và giao diện; refactor không được đổi UX.
- Mỗi task chạm tối đa 5 file ghi để Executor làm được trong một lượt.
- Mỗi phase kết thúc phải đạt: server `npx tsc --noEmit` sạch (chạy trong `SERVER_ROOT`); UI `npx tsc --noEmit -p tsconfig.web.json` không phát sinh lỗi mới (lỗi có sẵn ghi rõ trong kế hoạch và bỏ qua).
- Khi di chuyển/đổi tên file, liệt kê mọi import/alias/re-export cần cập nhật.
- Không đề xuất tạo test; không thêm thư viện mới nếu stdlib/dependency hiện có đủ dùng.
- Không bịa: mọi nhận định phải trích file + dòng đã thực sự đọc. Điều chưa xác minh ghi vào "Giả định / Cần xác nhận".
- File rất dài phải đọc theo `start_line`/`end_line`, không đọc cả file.

## 7. Quy ước checkbox (bắt buộc)

- **Mọi phase và mọi task** đều có checkbox Markdown `- [ ]`. Trạng thái ban đầu luôn là `[ ]`.
- Mỗi task có thêm **checkbox tiêu chí hoàn thành** (từng tiêu chí một dòng) và checkbox lệnh kiểm tra.
- Phase chỉ được tick khi **tất cả task con** đã tick và lệnh kiểm tra cuối phase đã chạy sạch.
- Executor tick `[x]` ngay sau khi hoàn thành từng task (sửa trực tiếp `PLAN_FILE`), không tick gộp cuối phase. Task bị bỏ/đổi hướng ghi `[~]` kèm lý do ngắn.
- Đầu file kế hoạch có **bảng tiến độ** liệt kê mọi phase (`[ ] Phase N — tên — số task`), Executor cập nhật bảng này khi tick phase.
- Checklist cleancode (mục 10) và checklist "Danh sách lệch cần khớp" (S01...) cũng dùng checkbox.

Ví dụ định dạng:

    - [ ] **Phase 2: Di chuyển & đổi tên**
      - [ ] **Task 2.1** (UI) — Gom `ProfileList*` vào `features/list/`
        - File: move `a.tsx` → `features/list/components/a.tsx` ...
        - Tiêu chí:
          - [ ] Không còn import trỏ đường dẫn cũ
          - [ ] `npx tsc --noEmit -p tsconfig.web.json` không lỗi mới
        - Rủi ro & hoàn tác: ...

## 8. Preview cấu trúc (bắt buộc đầy đủ)

Kế hoạch phải có preview **toàn bộ cây thư mục, từng file**, không viết tắt bằng `...` hay "các file khác". Dùng khối code dạng cây, mỗi file kèm số dòng và nhãn thay đổi:

    UI_ROOT/
    ├── features/
    │   ├── list/
    │   │   ├── components/
    │   │   │   └── ProfileTable.tsx        (120)  [NEW ← tách từ ProfileList.tsx]
    │   │   └── hooks/
    │   │       └── useProfileList.ts       (60)   [NEW]
    │   └── ...
    └── shared/
        └── api/profile.api.ts              (210)  [MOVE ← services/api.ts] [EDIT]

Nhãn: `[KEEP]` giữ nguyên · `[EDIT]` sửa nội dung · `[MOVE ← cũ]` · `[RENAME ← cũ]` · `[NEW ← nguồn]` · `[MERGE ← a + b]` · `[SPLIT → a, b]` · `[DELETE]`.

Preview gồm 4 cây:

1. **Cây hiện tại — server** (kèm số dòng).
2. **Cây hiện tại — UI** (kèm số dòng).
3. **Cây đích — server** (đủ nhãn thay đổi).
4. **Cây đích — UI** (đủ nhãn thay đổi).

Thêm **cây đối chiếu hai phía** (Sync Map): mỗi domain một nhánh, hiển thị song song `server: route → service → repo` ↔ `UI: api client → store → hook → component`, để thấy ngay hai phía khớp tên và khớp tầng như thế nào. Cuối mục có bảng thống kê: số file giữ/sửa/di chuyển/mới/gộp/tách/xóa ở mỗi phía.

## 9. Định dạng file đầu ra: `PLAN_FILE`

    # Kế hoạch Restructure + Cleancode Profile (Server + UI)
    ## 0. Tóm tắt (≤ 10 dòng: hiện trạng, mục tiêu, số phase) + Bảng tiến độ phase (checkbox)
    ## 1. Hiện trạng
    ### 1.1 Cây thư mục server (kèm số dòng)
    ### 1.2 Cây thư mục UI (kèm số dòng)
    ### 1.3 Bảng UI nơi gọi → API client/IPC → Endpoint → Service
    ### 1.4 So sánh Profile UI ↔ Server (C1–C7) + Danh sách lệch cần khớp (S01..., checkbox)
    ### 1.5 Danh sách vấn đề (V01... — mức độ, phía, file:dòng)
    ## 2. Kiến trúc đích
    ### 2.1 Preview cấu trúc đầy đủ (4 cây + Sync Map + bảng thống kê, theo mục 8)
    ### 2.2 Quy ước đặt tên & quy tắc phụ thuộc (mỗi phía + đồng bộ)
    ### 2.3 Danh sách endpoint đích + ánh xạ API client + type dùng chung
    ### 2.4 Sơ đồ tách các màn hình lớn (component / hook / store / endpoint)
    ## 3. Bảng ánh xạ file cũ → file mới (move / rename / create / edit / delete), tách bảng server và UI
    ## 4. Kế hoạch theo phase (mọi phase/task có checkbox, theo mục 7)
    ### Phase N: <tên>
    - Mục tiêu, vấn đề giải quyết (V.., S..), phụ thuộc phase trước
    - Task N.M (mỗi task):
      - Phía: server | UI | cả hai
      - File thao tác + hành động
      - Thay đổi endpoint: trước → sau (nếu có)
      - Ảnh hưởng phía còn lại (file + dòng cần sửa)
      - Tiêu chí hoàn thành (checkbox) + lệnh kiểm tra (checkbox)
      - Rủi ro & cách hoàn tác
    ## 5. Ảnh hưởng ngoài phạm vi (IPC, shared, module khác)
    ## 6. Checklist cleancode cho Executor (checkbox)
    ## 7. Giả định / Cần xác nhận

## 10. Thứ tự phase gợi ý

1. **Nền tảng**: type chung, envelope, guard, API client chuẩn hóa, quy ước đặt tên hai phía.
2. **Di chuyển & đổi tên**: gom file theo domain/feature ở server và UI, cập nhật import; chưa đổi hành vi.
3. **Khớp hai phía (từ C1–C7)**: thống nhất tên domain, type, field, mã lỗi; sửa các lệch S01...
4. **Tách trách nhiệm server**: cắt file dài, đưa nghiệp vụ từ route xuống service.
5. **Tách trách nhiệm UI**: cắt component lớn thành component + hook + service, gom store.
6. **Gộp/thay endpoint theo use-case**: đổi endpoint và cập nhật API client, type, nơi gọi UI trong cùng phase; chuyển logic dẫn xuất từ UI xuống server.
7. **Dọn dẹp**: xóa endpoint/code chết, state/prop/hook thừa, logic trùng.
8. **Rà soát cuối**: import vòng, type-check hai phía, đối chiếu lại Sync Map với cấu trúc thực tế, cập nhật `AGENTS.md`.

## 11. Checklist cleancode (đưa vào mục 6 của file kế hoạch, dạng checkbox)

- [ ] Tên rõ nghĩa, hàm ngắn, một mức trừu tượng mỗi hàm; component gọn, ít prop.
- [ ] Không code chết, không import thừa, không `any` không cần thiết.
- [ ] Không comment trừ khi logic thật sự khó hiểu.
- [ ] Lỗi xử lý nhất quán, không nuốt lỗi âm thầm; effect có cleanup đầy đủ.
- [ ] Không hardcode port/đường dẫn; dùng config chung.
- [ ] Type request/response chỉ định nghĩa một nguồn; hai phía cùng tên domain.
- [ ] Cập nhật `AGENTS.md` khi đổi cấu trúc thư mục hoặc quy ước.

## 12. Hành động đầu tiên của Planner

1. Giải nén (nếu cần) và chạy inventory (mục 3 bước 1, 2, 3).
2. Lập các bảng so sánh C1–C7 (mục 4).
3. Viết các mục còn lại theo mục 9.
4. Khi xong, chỉ báo đường dẫn file kế hoạch đã tạo.
