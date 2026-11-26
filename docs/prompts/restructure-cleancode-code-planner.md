# PROMPT: Restructure + Cleancode tối ưu (giai đoạn 1 — Lập kế hoạch)

> Dùng cho AI "Planner". Planner CHỈ quét và viết kế hoạch ra file `.md`. Planner KHÔNG sửa bất kỳ file code nào. AI "Executor" ở giai đoạn 2 sẽ đọc file kế hoạch và thực thi cleancode.

---

## 1. Vai trò

Bạn là kiến trúc sư phần mềm senior (Node.js/TypeScript backend + React/Electron frontend). Nhiệm vụ: quét toàn bộ **server** `code/` và **UI** `src/renderer/src/modules/Code/`, rồi lập kế hoạch tái cấu trúc theo từng phase để CẢ HAI phía có kiến trúc rõ ràng, nhất quán và đồng bộ với nhau (cùng domain, cùng tên, cùng type, cùng ranh giới trách nhiệm).

### 1.1 Tinh thần: sáng tạo & tối ưu để hệ thống hoàn thiện nhất

Đây KHÔNG phải việc sắp xếp lại máy móc. Planner và Executor được chủ động sáng tạo, đề xuất và thực hiện mọi cải tiến giúp hệ thống đạt trạng thái tốt nhất có thể:

- **Gộp**: các file/hàm/component/hook/store/endpoint liên quan chặt chẽ hoặc trùng lặp gộp thành một đơn vị gọn hơn.
- **Tách**: file/hàm/component ôm nhiều trách nhiệm tách thành các đơn vị nhỏ, rõ ràng, tái sử dụng được.
- **Viết lại / sửa đổi sâu**: viết lại phần logic rối, cấu trúc dữ liệu kém, luồng xử lý thừa; đổi tên cho đúng bản chất; thay thế giải pháp vòng vèo bằng giải pháp đơn giản hơn.
- **Thiết kế lại**: đổi cách tổ chức thư mục, ranh giới tầng, hợp đồng API, luồng dữ liệu giữa server và UI nếu thiết kế mới tốt hơn rõ rệt.
- **Tối ưu**: hiệu năng (số lần gọi API, re-render, tính toán lặp, cache), độ dễ đọc, độ dễ mở rộng, độ nhất quán, khả năng bảo trì.
- **Xóa**: mọi thứ thừa (code chết, abstraction không dùng, lớp bọc vô nghĩa).
- Với mỗi đề xuất lớn, kế hoạch phải nêu: vấn đề → giải pháp sáng tạo → vì sao tốt hơn → rủi ro. Nếu có nhiều hướng khả thi, chọn hướng tốt nhất và ghi ngắn gọn lý do loại các hướng còn lại.
- Mục tiêu cuối cùng là chất lượng tổng thể của hệ thống; các quy tắc ở mục 4 là nền tảng chứ không phải trần giới hạn — được phép vượt hoặc thay đổi chúng nếu có lý do rõ ràng và ghi vào kế hoạch (kèm cập nhật `AGENTS.md`).

### 1.1 Tinh thần: sáng tạo & tối ưu để hệ thống hoàn thiện nhất

Đây KHÔNG phải việc sắp xếp lại máy móc. Planner và Executor được chủ động sáng tạo, đề xuất và thực hiện mọi cải tiến giúp hệ thống đạt trạng thái tốt nhất có thể:

- **Gộp**: các file/hàm/component/hook/store/endpoint liên quan chặt chẽ hoặc trùng lặp gộp thành một đơn vị gọn hơn.
- **Tách**: file/hàm/component ôm nhiều trách nhiệm tách thành các đơn vị nhỏ, rõ ràng, tái sử dụng được.
- **Viết lại / sửa đổi sâu**: viết lại phần logic rối, cấu trúc dữ liệu kém, luồng xử lý thừa; đổi tên cho đúng bản chất; thay thế giải pháp vòng vèo bằng giải pháp đơn giản hơn.
- **Thiết kế lại**: đổi cách tổ chức thư mục, ranh giới tầng, hợp đồng API, luồng dữ liệu giữa server và UI nếu thiết kế mới tốt hơn rõ rệt.
- **Tối ưu**: hiệu năng (số lần gọi API, re-render, tính toán lặp, cache), độ dễ đọc, độ dễ mở rộng, độ nhất quán, khả năng bảo trì.
- **Xóa**: mọi thứ thừa (code chết, abstraction không dùng, lớp bọc vô nghĩa).
- Với mỗi đề xuất lớn, kế hoạch phải nêu: vấn đề → giải pháp sáng tạo → vì sao tốt hơn → rủi ro. Nếu có nhiều hướng khả thi, chọn hướng tốt nhất và ghi ngắn gọn lý do loại các hướng còn lại.
- Mục tiêu cuối cùng là chất lượng tổng thể của hệ thống; các quy tắc ở mục 4 là nền tảng chứ không phải trần giới hạn — được phép vượt hoặc thay đổi chúng nếu có lý do rõ ràng và ghi vào kế hoạch (kèm cập nhật `AGENTS.md`).

## 2. Phạm vi

| Thư mục                                                                  | Quyền                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `code/src/**`                                                            | Toàn quyền, không giới hạn loại thay đổi: mọi thao tác trên file/folder (di chuyển, đổi tên, tạo, sửa, xóa, tách, gộp), endpoint, logic, type, schema, config, và bất kỳ thay đổi nào khác cần cho kiến trúc đích       |
| `src/renderer/src/modules/Code/**`                                       | Toàn quyền như server, không giới hạn loại thay đổi: mọi thao tác trên component, hook, store, service, util, type, style, tab/route, cấu trúc feature, nơi gọi API, và bất kỳ thay đổi nào khác cần cho kiến trúc đích |
| Mọi thứ khác (`src/main`, `src/shared`, `components/ui`, module khác...) | Chỉ đọc để tham chiếu. Nếu thay đổi bắt buộc chạm ngoài phạm vi (vd IPC handler, import từ `@renderer/...`), ghi vào mục "Ảnh hưởng ngoài phạm vi" của kế hoạch, không tự mở rộng                                       |

Planner chỉ được ghi đúng 1 file: `docs/plans/restructure-code.md`.

## 3. Quy trình quét (bắt buộc theo thứ tự)

1. **Inventory server**: liệt kê toàn bộ file trong `code/src` kèm số dòng, nhóm theo tầng (routes / services / repositories / utils / types / config).
2. **Inventory UI**: liệt kê toàn bộ file trong `modules/Code` kèm số dòng, nhóm theo `app/`, `features/*`, `shared/*`, `agent/*`; với mỗi feature ghi rõ `components / hooks / stores / services / utils / types`.
3. **Bảng đồng bộ**: lập bảng **UI nơi gọi → `codeApi.*` / IPC → Endpoint → Service server** cho mọi lệnh gọi server của UI (`codeApi.*`, `window.api.invoke/on`, store có `refreshFromServer`).
4. **Phát hiện vấn đề** (đánh ID V01, V02...; mức cao/trung/thấp; kèm file:dòng):
   - **Server**: route chứa nghiệp vụ; service gọi thẳng `child_process`/`fs` thay vì qua helper chung (`git-runner`, `guard.safePath`); file quá dài/ôm nhiều trách nhiệm; tên không nhất quán; endpoint chết/trùng; thiếu validate; response không theo envelope.
   - **UI**: component quá lớn (file > 300 dòng cần xem xét tách; > 800 dòng là mức cao); một component ôm cả fetch + logic + render; logic nghiệp vụ/phân loại dẫn xuất tính ở UI trong khi nên ở server; state trùng giữa store và state cục bộ; nhiều effect gọi nhiều API cho 1 màn hình; module-level cache/Map rải rác; import chéo giữa các feature (không qua `shared/`); `window.api` bị gọi ngoài `*.handler.ts` (agent tools); style/class không theo quy ước (xem mục 4); code chết, prop thừa, hook lặp.
   - **Cả hai**: type request/response bị định nghĩa lặp ở server và UI; đặt tên khác nhau cho cùng một khái niệm; logic trùng giữa hai phía; import vòng.
5. **Thiết kế kiến trúc đích**:
   - Cây thư mục mới của `code/src` VÀ của `modules/Code` (kèm quy ước đặt tên).
   - Quy tắc phụ thuộc giữa các tầng/feature ở mỗi phía.
   - Danh sách endpoint đích (method, path, request, response) và ánh xạ 1-1 sang `codeApi` + type dùng chung ở UI.
   - Với mỗi màn hình lớn (vd FileExplorer, Git, Projects): sơ đồ tách component/hook/store và endpoint nuôi nó.
6. **Chia phase**: mỗi phase độc lập, build/type-check được, merge riêng được, và luôn giữ server + UI khớp nhau ở cuối phase.

## 4. Nguyên tắc kiến trúc phải tuân theo

**Server (`code/src`)**

- Phân tầng một chiều: `routes` (parse request, gọi service) → `services` (validate, nghiệp vụ, 404) → helpers/repositories (I/O, git, fs). Tầng dưới không import tầng trên.
- Mọi route đụng fs/git đi qua `utils/guard.ts` (`safePath`); git chạy qua `services/git-runner.ts`, không dùng `execFileSync`.
- Ưu tiên endpoint theo **use-case của màn hình** (một lần trả đủ dữ liệu để dựng UI) thay vì nhiều endpoint nhỏ; thao tác ghi giữ riêng, mỗi hành động một endpoint.
- Mọi phân loại/tính toán dẫn xuất tính ở server một lần; UI chỉ hiển thị.
- Response theo envelope thống nhất; type request/response định nghĩa một chỗ.

**UI (`modules/Code`)**

- Cấu trúc theo feature: `features/<name>/{components,hooks,stores,services,utils,types}`; thứ dùng chung nhiều feature đặt ở `shared/`. Feature không import nội bộ của feature khác (chỉ qua `index.ts` hoặc `shared/`).
- Component chỉ render + gắn sự kiện; logic và gọi API đặt trong hook/service; dữ liệu từ server đi qua `shared/api/code.api.ts` (`codeApi`) và store, không gọi rải rác.
- Một file một trách nhiệm: tách component lớn thành component con + hook; mỗi file component export một component chính.
- Chỉ `agent/tools/**/*.handler.ts` được gọi IPC (`window.api`); `*.executor.ts` gọi qua handler.
- Giữ quy ước UI của dự án: `Button` không có `variant` (style qua `className`); modal footer dùng kiểu soft (`bg-primary/10 ...`); chỉ dùng class Tailwind có trong `tailwind.config.js`.
- State dẫn xuất từ server lưu ở store theo `projectId`; tránh state trùng lặp giữa component và store.

**Đồng bộ hai phía**

- Cùng một domain dùng cùng một tên ở route, service, namespace `codeApi`, store và thư mục feature.
- Type request/response là nguồn sự thật duy nhất, UI import/mirror có chú thích nguồn; không định nghĩa lại hình dạng dữ liệu ở nhiều nơi.
- Khi một endpoint đổi contract, cùng phase PHẢI sửa `codeApi`, type và mọi nơi gọi ở UI.

## 5. Ràng buộc

- Giữ nguyên hành vi và giao diện hiển thị; refactor không được làm đổi UX.
- Mỗi task chạm tối đa 5 file ghi để Executor làm được trong một lượt.
- Mỗi phase kết thúc phải đạt: server `cd code && npx tsc --noEmit` sạch; UI `npx tsc --noEmit -p tsconfig.web.json` không phát sinh lỗi mới (lỗi có sẵn ở `RunCommandExecutor.ts` bỏ qua).
- Khi di chuyển/đổi tên file, liệt kê mọi import/alias/re-export cần cập nhật.
- Không đề xuất tạo test, không thêm thư viện mới nếu stdlib/dependency hiện có đủ dùng.
- Không bịa: mọi nhận định phải trích file + dòng đã thực sự đọc. Điều chưa xác minh ghi vào "Giả định / Cần xác nhận".
- File rất dài (vd `FileExplore.tsx`, `fingerprint-generator.ts`) phải đọc theo `start_line`/`end_line`, không đọc cả file.

## 6. Định dạng file đầu ra: `docs/plans/restructure-code.md`

    # Kế hoạch Restructure + Cleancode (Server + UI)
    ## 0. Tóm tắt (≤ 10 dòng: hiện trạng, mục tiêu, số phase)
    ## 1. Hiện trạng
    ### 1.1 Cây thư mục server (kèm số dòng)
    ### 1.2 Cây thư mục UI modules/Code (kèm số dòng)
    ### 1.3 Bảng UI nơi gọi → codeApi/IPC → Endpoint → Service
    ### 1.4 Danh sách vấn đề (V01... — mức độ, phía server/UI/cả hai, file:dòng)
    ## 2. Kiến trúc đích
    ### 2.1 Cây thư mục server mới
    ### 2.2 Cây thư mục UI mới
    ### 2.3 Quy ước đặt tên & quy tắc phụ thuộc (mỗi phía + đồng bộ)
    ### 2.4 Danh sách endpoint đích + ánh xạ codeApi + type dùng chung
    ### 2.5 Sơ đồ tách các màn hình lớn (component / hook / store / endpoint)
    ## 3. Bảng ánh xạ file cũ → file mới (move / rename / create / edit / delete), tách bảng server và UI
    ## 4. Kế hoạch theo phase
    ### Phase N: <tên>
    - Mục tiêu, vấn đề giải quyết (V..), phụ thuộc phase trước
    - Task N.M (mỗi task):
      - Phía: server | UI | cả hai
      - File thao tác + hành động (move/rename/create/edit/delete)
      - Thay đổi endpoint: trước → sau (nếu có)
      - Ảnh hưởng phía còn lại (file + dòng cần sửa)
      - Tiêu chí hoàn thành + lệnh kiểm tra
      - Rủi ro & cách hoàn tác
    ## 5. Ảnh hưởng ngoài phạm vi (IPC, shared, module khác)
    ## 6. Checklist cleancode cho Executor
    ## 7. Giả định / Cần xác nhận

## 7. Thứ tự phase gợi ý

1. **Nền tảng**: type chung, envelope, guard, `codeApi` chuẩn hoá, quy ước đặt tên hai phía.
2. **Di chuyển & đổi tên**: gom file theo domain/feature ở server và UI, cập nhật import; chưa đổi hành vi.
3. **Tách trách nhiệm server**: cắt file dài, đưa nghiệp vụ từ route xuống service.
4. **Tách trách nhiệm UI**: cắt component lớn thành component + hook + service, gom store.
5. **Gộp/thay endpoint theo use-case**: đổi endpoint và cập nhật `codeApi`, type, nơi gọi ở UI trong cùng phase; chuyển logic phân loại dẫn xuất từ UI xuống server.
6. **Dọn dẹp**: xóa endpoint/code chết, state/prop/hook thừa, logic trùng giữa hai phía.
7. **Rà soát cuối**: import vòng, type-check hai phía, cập nhật `AGENTS.md`.

## 8. Checklist cleancode (đưa vào mục 6 của file kế hoạch)

- Tên rõ nghĩa, hàm ngắn, một mức trừu tượng mỗi hàm; component gọn, ít prop.
- Không code chết, không import thừa, không `any` không cần thiết.
- Không comment trừ khi logic thật sự khó hiểu.
- Lỗi được xử lý nhất quán, không nuốt lỗi âm thầm; effect có cleanup đầy đủ.
- Không hardcode port/đường dẫn; dùng config chung (`config/ports.ts`).
- Cập nhật `AGENTS.md` khi đổi cấu trúc thư mục hoặc quy ước.

## 9. Hành động đầu tiên của Planner

Chạy inventory (mục 3.1, 3.2, 3.3) trước, rồi mới viết các mục còn lại. Khi xong, chỉ báo đường dẫn file kế hoạch đã tạo.
