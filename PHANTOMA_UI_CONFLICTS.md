# PHANTOM v2.5.0 — UI Layout Conflicts & Design Issues

> Danh sách các vấn đề bố trí UI không hợp lý, được phân tích từ toàn bộ source HTML.
> Mỗi issue được phân loại theo mức độ: 🔴 Nghiêm trọng / 🟡 Trung bình / 🔵 Nhỏ

--- 

## 1. Sidebar — Tab "Targets" chứa quá nhiều thứ không liên quan
🔴 **Nghiêm trọng**

**Vấn đề**: Tab Targets gom 4 section hoàn toàn khác nhau vào cùng một chỗ:
- Active Targets ✅ (đúng chỗ)
- Wordlists ❌ (không phải data của target)
- Credentials ❌ (vừa là input brute force, vừa là output harvest — nhập nhằng)
- CVE Database ❌ (knowledge base toàn cục, không thuộc target nào)

**Hậu quả**: Wordlist `rockyou.txt` hiển thị như thể nó thuộc riêng target `target.corp.local`, điều này sai về mặt logic. CVE Database cũng vậy — đây là dữ liệu tham chiếu toàn cục.

**Đề xuất**:
- Tách thành tab riêng: **Arsenal** (Wordlists + CVEs) hoặc **Resources**
- Credentials harvest → chuyển vào tab **Sessions** vì đó là output của exploitation
- Credentials input (để brute force) → để trong module **Intruder** hoặc **Cracking**

---

## 2. Module "Web App Scanner" nhét Decoder/Encoder vào cùng panel với Repeater
🔴 **Nghiêm trọng**

**Vấn đề**: Module Web App Scanner có 3 panel:
1. Site Map
2. Repeater (gửi request thủ công)
3. **Decoder/Encoder + WAF Detection** — 2 tính năng hoàn toàn độc lập bị nhét chung 1 panel

**Hậu quả**:
- Decoder là công cụ utility dùng ở **mọi** module (SQLi cần decode, phishing cần encode, cracking cần hash) — không phải riêng web scanner
- WAF Detection là một bước *trong workflow scan*, không phải utility decode
- Đặt chúng chung một panel tạo cảm giác chúng liên quan nhau, nhưng thực ra không

**Đề xuất**:
- Decoder/Encoder → tách thành module độc lập hoặc floating utility window truy cập từ bất kỳ đâu
- WAF Detection → đưa vào toolbar chính của Web App Scanner thay vì nhét vào panel Decoder

---

## 3. Toolbar Web App Scanner: Repeater, Decoder, Comparer là tab chứ không phải nút
🟡 **Trung bình**

**Vấn đề**: Toolbar của module Web App Scanner có các nút:
```
▶ Spider | Repeater | Decoder | Comparer | Sequencer | WAF Detect | Import HAR
```
Trong đó **Repeater**, **Decoder**, **Comparer**, **Sequencer** là các *sub-view/panel* độc lập (trong Burp Suite chúng là tab riêng biệt). Nhưng ở đây chúng được render như nút toolbar bình thường — không có trạng thái active/inactive, không hiển thị đang ở sub-view nào.

**Hậu quả**: User không biết mình đang xem Repeater hay Decoder. Click vào "Comparer" không làm gì cả (không có `onclick`).

**Đề xuất**: Chuyển Repeater, Decoder, Comparer, Sequencer thành **ws-tabs** (workspace tabs) thay vì toolbar buttons — giống pattern của module Recon (Overview / DNS Enum / Breach Data / WHOIS).

---

## 4. Module "Post-Exploitation": Credential Harvest nằm trong panel Process List
🔴 **Nghiêm trọng**

**Vấn đề**: Panel "Process List" hiển thị danh sách tiến trình Windows, nhưng ở cuối panel lại có section "Credential Harvest" với NTLM hash, Kerberos ticket, cleartext password.

**Hậu quả**:
- Credential Harvest là *output của nhiều action khác nhau* (hashdump, Mimikatz, keylogger) — không phải output riêng của Process List
- User phải scroll xuống cuối Process List mới thấy credentials — không intuitive
- Credentials bị "chôn vùi" trong một panel không liên quan về mặt chức năng

**Đề xuất**:
- Tạo panel riêng **"Loot / Credentials"** trong Post-Exploitation
- Hoặc đưa kết quả harvest vào tab **Sessions** ở sidebar (vì credentials thuộc về một session cụ thể)

---

## 5. Module "Vulnerability Scanner": nút filter severity nằm sai chỗ
🟡 **Trung bình**

**Vấn đề**: Toolbar của Vuln Scanner có:
```
CRITICAL (3) | HIGH (7) | MEDIUM (12) | LOW (5) | [sep] | Auto-Exploit | Generate Report | Export CSV
```
Các nút **CRITICAL / HIGH / MEDIUM / LOW** là *filter* — chức năng khác hoàn toàn với **Auto-Exploit / Generate Report** là *action*. Nhưng tất cả nằm cùng một hàng toolbar không có phân cách rõ ràng giữa 2 nhóm.

**Hậu quả**: User dễ nhầm severity filter là action button. Nút `HIGH (7)` còn không có class `tb-btn` riêng — dùng `style="color:var(--red)"` inline thay vì consistent styling.

**Đề xuất**: Đặt severity filters thành tab hoặc toggle-group riêng phía trên danh sách vuln, tách biệt hoàn toàn với action buttons trong toolbar.

---

## 6. Module "Hash Cracking": toolbar có nút "Identify Hash" nhưng Hash Identifier đã nằm trong panel bên dưới
🟡 **Trung bình**

**Vấn đề**: Toolbar có nút `Identify Hash`, nhưng panel "Hash Input" bên dưới đã *tự động hiển thị* kết quả Hash Identifier cho từng hash (type, mode, status).

**Hậu quả**: Hai chỗ làm cùng việc — toolbar button và inline panel — tạo ra sự trùng lặp về chức năng. User không rõ nút toolbar để làm gì thêm so với những gì đã hiển thị sẵn.

**Đề xuất**: Bỏ nút "Identify Hash" khỏi toolbar, hoặc rename thành "Import Hashes" để phân biệt rõ chức năng.

---

## 7. Module "Phishing": Harvested Credentials là output nhưng nằm trong module Phishing thay vì tập trung về một nơi
🟡 **Trung bình**

**Vấn đề**: Credentials harvest từ phishing (alice, bob, ceo...) nằm trong panel của module Phishing. Trong khi đó:
- Credentials từ Hashdump/Mimikatz → nằm trong Post-Exploitation
- Credentials từ brute force → nằm trong Intruder results
- Credentials từ sidebar Targets tab → không rõ nguồn gốc

**Hậu quả**: Credentials bị scatter khắp nơi — không có một "loot vault" tập trung. Pentest thực tế cần biết tổng hợp tất cả credentials đã thu được từ mọi vector.

**Đề xuất**: Tất cả credentials harvest (dù từ phishing, hashdump, brute force, hay OSINT) nên đổ về một nơi tập trung — có thể là tab mới **"Loot"** trong sidebar, hoặc section trong tab Sessions.

---

## 8. Workspace Tab Bar của Recon không đồng bộ với các module khác
🔵 **Nhỏ**

**Vấn đề**: Module Recon có workspace tabs riêng:
```
Overview | DNS Enum | Breach Data [3] | WHOIS | + Tab
```
Nhưng không có module nào khác dùng workspace tabs. Tất cả module còn lại chỉ dùng grid panel (2 hoặc 3 cột) mà không có tab navigation.

**Hậu quả**: Pattern điều hướng không nhất quán — Recon dùng tabs, Scanner dùng grid 2 cột, Vulns dùng grid 3 cột. User phải học lại cách navigate cho từng module.

**Đề xuất**: Hoặc áp dụng workspace tabs cho tất cả các module phức tạp (Scanner, Post-Exploit, Cloud), hoặc bỏ tabs ở Recon và dùng grid thuần nhất.

---

## 9. Right Panel "Inspector" hiển thị nội dung cố định không thay đổi theo module
🟡 **Trung bình**

**Vấn đề**: Right Panel luôn hiển thị:
- Selected Target info
- Scan Progress (7 giai đoạn cố định)
- Quick Stats (27 vulns, 3 sessions...)
- Quick Actions (Exploit Engine, Post-Exploit, AI, Report, Collab)

Không có gì thay đổi khi user chuyển sang module Phishing, Cloud, hay Forensics.

**Hậu quả**:
- Khi đang ở module **Cloud Security**, Quick Actions vẫn hiện "Exploit Engine" — không contextual
- Khi đang ở module **Phishing**, Scan Progress vẫn hiện "Port Scan 100%" — không liên quan
- Quick Actions không adapt theo context → "Post-Exploitation" không có ý nghĩa khi đang xem Report Builder

**Đề xuất**: Right Panel nên render contextual actions tương ứng với module đang active. Ví dụ: khi ở Cloud → hiển thị AWS resource stats và IAM actions; khi ở Phishing → hiển thị campaign stats.

---

## 10. Module "Forensics" và "Malware Sandbox" thiếu toolbar chức năng so với các module khác
🔵 **Nhỏ**

**Vấn đề**: Forensics có toolbar với: `Open File | Memory Dump | Strings Extract | PCAP Analyze | Entropy Scan`. Malware Sandbox có toolbar rất tương đồng. Nhưng cả hai module đều thiếu nút **Export** hoặc **Save to Report** — trong khi tất cả module khác đều có.

**Hậu quả**: Forensics findings (IOCs, strings, hex analysis) không có đường ra báo cáo trực tiếp từ toolbar. User phải nhớ tự làm thủ công.

**Đề xuất**: Thêm nút `Export IOCs` và `Send to Report` vào toolbar của Forensics và Malware Sandbox — đồng nhất với pattern của các module khác.

---

## 11. Module "Intruder": chỉ có 2 panel nhưng thiếu panel cấu hình Payload
🟡 **Trung bình**

**Vấn đề**: Intruder có 2 panel: Request Template và Attack Results. Nhưng Payload Sets (usernames.txt, top-500-passwords.txt) lại được đặt *bên trong* panel Request Template — cùng chỗ với HTTP request.

**Hậu quả**: Request template và payload configuration là 2 việc khác nhau nhưng bị gộp vào 1 panel. Khi request template dài, user phải scroll xuống mới thấy payload config.

**Đề xuất**: Tách thành 3 panel (grid3): Request Template | Payload Config | Attack Results — hoặc ít nhất dùng collapsible sections trong panel.

---

## 12. Module "Network Sniffer": ARP Spoof và MITM là toolbar button nhưng thực ra là attack mode, không phải filter
🔵 **Nhỏ**

**Vấn đề**: Toolbar của Sniffer:
```
Interface [dropdown] | ▶ Start | ■ Stop | ARP Spoof | MITM | [sep] | Filter: [input] | Save PCAP
```
**ARP Spoof** và **MITM** là các *attack operations* có side effect lớn (thay đổi traffic của cả mạng), nhưng được đặt cạnh nút Start/Stop và filter input — tạo cảm giác chúng là tính năng passive/capture bình thường.

**Hậu quả**: Một người mới dùng có thể vô tình click ARP Spoof trong khi chỉ muốn capture traffic.

**Đề xuất**: Tách ARP Spoof và MITM ra khỏi toolbar chính, đặt vào section riêng có warning visual rõ ràng (ví dụ nút màu đỏ với confirm dialog).

---

## 13. "Settings" button ở leftbar không có module view tương ứng
🔵 **Nhỏ**

**Vấn đề**: Icon Settings ở cuối leftbar có `class="nav-btn active-amber"` nhưng không có `onclick="switchModule(...)"`. Trong JS, object `MODULES` cũng không có entry `settings`.

**Hậu quả**: Click vào Settings không làm gì — chức năng dead, không có view settings nào được implement dù icon hiển thị.

**Đề xuất**: Hoặc implement `view-settings`, hoặc bỏ icon này khỏi leftbar để tránh gây nhầm lẫn.

---

## 14. Report Builder: nút "Auto-Fill from Findings" ở toolbar nhưng không rõ "findings" từ module nào
🟡 **Trung bình**

**Vấn đề**: Toolbar có nút `Auto-Fill from Findings` — ngụ ý tự động lấy data từ các module khác (Vuln Scanner, SQLi, Post-Exploit, Phishing...). Nhưng không có UI nào cho phép user chọn *module nào* hoặc *findings nào* để đưa vào report.

**Hậu quả**: Nút này hoạt động như black box — không có feedback, không có selection, không có preview trước khi fill. Đây là một trong những action quan trọng nhất của tool nhưng lại thiếu control hoàn toàn.

**Đề xuất**: Khi click "Auto-Fill", hiện modal/dialog cho phép chọn nguồn data: Vuln Scanner ✅, Post-Exploit ✅, Phishing ✅... trước khi điền vào report.

---

## Tổng kết

| # | Module/Khu vực | Loại conflict | Mức độ |
|---|---|---|---|
| 1 | Sidebar — Targets | Nhầm lẫn scope (global vs per-target) | 🔴 |
| 2 | Web App Scanner | Decoder nhét sai panel | 🔴 |
| 3 | Web App Scanner | Sub-views dùng sai component (button thay vì tab) | 🟡 |
| 4 | Post-Exploitation | Credentials chôn vùi trong Process List | 🔴 |
| 5 | Vulnerability Scanner | Filter và Action buttons không phân biệt | 🟡 |
| 6 | Hash Cracking | Duplicate chức năng toolbar vs inline | 🟡 |
| 7 | Toàn tool | Credentials scatter khắp nơi, không tập trung | 🟡 |
| 8 | Recon vs tất cả | Pattern điều hướng không nhất quán | 🔵 |
| 9 | Right Panel | Không contextual — cứng nhắc bất kể module | 🟡 |
| 10 | Forensics / Malware | Thiếu Export/Report button | 🔵 |
| 11 | Intruder | Payload config nhét sai panel | 🟡 |
| 12 | Network Sniffer | Attack buttons lẫn với capture controls | 🔵 |
| 13 | Leftbar Settings | Icon chết — không có view tương ứng | 🔵 |
| 14 | Report Builder | Auto-Fill thiếu control UI | 🟡 |

**Tổng: 3 🔴 nghiêm trọng — 7 🟡 trung bình — 4 🔵 nhỏ**
