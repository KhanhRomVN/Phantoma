# 📄 Phantoma REPORT — Tài Liệu Module Báo Cáo

> **Phiên bản:** 1.0.0  
> **Module:** Reporting, Visualization & Data Export  
> **Nền tảng:** Phantoma — Hệ Sinh Thái An Ninh Mạng Tự Động Hóa  

---

## 📑 Mục Lục

- [1. Tổng Quan Kiến Trúc](#1-tổng-quan-kiến-trúc)
- [2. Quản Lý Workspace & Dữ Liệu](#2-quản-lý-workspace--dữ-liệu)
- [3. Tổng Hợp Dữ Liệu (Data Aggregation)](#3-tổng-hợp-dữ-liệu-data-aggregation)
- [4. Các Định Dạng Xuất Báo Cáo](#4-các-định-dạng-xuất-báo-cáo)
- [5. Visualizations & Dashboard](#5-visualizations--dashboard)
- [6. Evidence Management](#6-evidence-management)
- [7. Templates & Customization](#7-templates--customization)
- [8. Luồng Dữ Liệu & API](#8-luồng-dữ-liệu--api)
- [9. Hướng Dẫn Phát Triển](#9-hướng-dẫn-phát-triển)

---

## 1. Tổng Quan Kiến Trúc

Module **REPORT** đọc dữ liệu từ workspace (lưu bởi CORE), cho phép người dùng chọn các thành phần cần đưa vào báo cáo, sau đó xuất ra nhiều định dạng (PDF, HTML, JSON, CSV, DOCX). Nó cũng cung cấp các biểu đồ trực quan và bảng tổng hợp.

```
REPORT/
├── REPORT.md                    ← Tài liệu này
├── index.tsx                    ← Component chính
├── Workspace/                   ← Quản lý dữ liệu
│   ├── SessionBrowser.tsx
│   ├── DataViewer.tsx
│   ├── TagManager.tsx
│   └── ...
├── Aggregator/                  ← Tổng hợp dữ liệu
│   ├── SummaryStats.tsx
│   ├── VulnerabilityAggregator.tsx
│   ├── AssetInventory.tsx
│   ├── TimelineBuilder.tsx
│   └── ...
├── Export/                      ← Xuất báo cáo
│   ├── PDFExporter.tsx
│   ├── HTMLExporter.tsx
│   ├── JSONExporter.tsx
│   ├── CSVExporter.tsx
│   ├── DOCXExporter.tsx
│   └── ...
├── Visualizations/              ← Biểu đồ
│   ├── VulnerabilityChart.tsx
│   ├── NetworkMap.tsx
│   ├── TimelineView.tsx
│   ├── RiskMatrix.tsx
│   └── ...
├── Evidence/                    ← Quản lý bằng chứng
│   ├── ScreenshotManager.tsx
│   ├── LogAttacher.tsx
│   ├── PacketCaptureManager.tsx
│   └── ...
├── Templates/                   ← Mẫu báo cáo
│   ├── TemplateEditor.tsx
│   ├── DefaultTemplates.ts
│   └── ...
├── services/                    (puppeteer, jsPDF, docx, handlebars)
├── types/
└── utils/
```

### 🎯 Các chức năng chính

| # | Chức năng | Mô tả |
|---|-----------|-------|
| 1 | Workspace Management | Xem, lọc, tìm kiếm dữ liệu từ các module |
| 2 | Data Aggregation | Tổng hợp asset, vulnerability, credential, timeline |
| 3 | PDF Export | Báo cáo chuyên nghiệp (có mục lục, hình ảnh) |
| 4 | HTML Export | Dạng web, có thể tương tác |
| 5 | JSON/CSV | Dữ liệu thô để phân tích tiếp |
| 6 | Visualizations | Biểu đồ, network map, risk matrix |
| 7 | Evidence | Đính kèm screenshot, log, pcap |
| 8 | Templates | Tùy chỉnh bố cục báo cáo |

---

## 2. Quản Lý Workspace & Dữ Liệu

### 2.1 Cấu Trúc Workspace

Mỗi workspace tương ứng với một dự án (ví dụ tên công ty, target). Dữ liệu được lưu dưới dạng JSON với cấu trúc:

```json
{
  "workspaceId": "ws_20250607_001",
  "name": "Pentest Client ABC",
  "createdAt": "2025-06-07T10:00:00Z",
  "targets": ["example.com", "192.168.1.0/24"],
  "modules": {
    "INTEL": { ... },
    "SCAN": { ... },
    "ATTACK": { ... },
    "POST": { ... }
  },
  "evidence": {
    "screenshots": ["screenshot1.png"],
    "logs": ["scan.log"],
    "pcaps": ["capture.pcap"]
  }
}
```

**Component:** `Workspace/SessionBrowser.tsx` – hiển thị danh sách workspace, cho phép mở, xóa, merge.

### 2.2 Data Viewer

- Xem dữ liệu thô từ mỗi module dưới dạng JSON tree.
- Tìm kiếm, lọc theo severity, loại asset, CVE.

---

## 3. Tổng Hợp Dữ Liệu (Data Aggregation)

### 3.1 Summary Statistics

| Thống kê | Mô tả |
|----------|-------|
| Total targets | Số lượng target (domain, IP, v.v.) |
| Vulnerabilities | Tổng số lỗ hổng, phân loại theo severity |
| Open ports | Tổng số port mở phát hiện được |
| Compromised assets | Số asset đã bị khai thác thành công |
| Credentials harvested | Số lượng credential thu thập được |
| Lateral movements | Số lần di chuyển ngang |

**Component:** `Aggregator/SummaryStats.tsx` – hiển thị các stat box.

### 3.2 Asset Inventory

| Thông tin | Nguồn từ module |
|-----------|-----------------|
| Domain / Subdomain | INTEL, SCAN |
| IP Address | SCAN, INTEL |
| Open ports & services | SCAN |
| Web technologies | INTEL, SCAN |
| Screenshot (nếu có) | ATTACK, EMULATE |

**Output:** Bảng tài sản, có thể xuất CSV.

### 3.3 Vulnerability Aggregator

- Gom nhóm lỗ hổng từ INTEL (vulnerability surface) và ATTACK (exploited).
- Phân loại theo: CVE, severity, affected component, remediation.

**Component:** `Aggregator/VulnerabilityAggregator.tsx` – bảng lỗ hổng, có thể filter theo severity.

### 3.4 Timeline Builder

- Tạo timeline các sự kiện:
  - INTEL: phát hiện subdomain, email, v.v.
  - SCAN: quét port, phát hiện service.
  - ATTACK: thời điểm khai thác thành công.
  - POST: leo thang, credential dump, lateral move.

**Output:** Biểu đồ thời gian dạng Gantt (xem trong Visualizations).

---

## 4. Các Định Dạng Xuất Báo Cáo

### 4.1 PDF Export

**Tính năng:**
- Tự động sinh mục lục.
- Nhúng biểu đồ, hình ảnh (screenshot).
- Hỗ trợ nhiều trang, header/footer tùy chỉnh.
- Mã hóa (password protection) tùy chọn.

**Công cụ:** `puppeteer` (print to PDF) hoặc `jsPDF` + `html2canvas`.

**Component:** `Export/PDFExporter.tsx` – chọn template, nút "Generate PDF", xem trước.

### 4.2 HTML Export

- Xuất ra một file `.html` duy nhất (có CSS inline).
- Có thể mở bằng bất kỳ trình duyệt nào, không cần Internet.
- Hỗ trợ tương tác (filter, search) nếu dùng JavaScript.

### 4.3 JSON Export

- Dữ liệu thô, không qua xử lý.
- Dùng để import vào công cụ khác (Elasticsearch, Splunk).

### 4.4 CSV Export

- Xuất các bảng (asset, vulnerability, credential) riêng biệt.
- Mỗi bảng một file `.csv`.

### 4.5 DOCX Export (Microsoft Word)

- Dùng thư viện `docx` để tạo file Word.
- Phù hợp để chỉnh sửa thủ công sau đó.

---

## 5. Visualizations & Dashboard

### 5.1 Vulnerability Chart

| Loại biểu đồ | Mô tả |
|--------------|-------|
| Bar chart | Số lượng lỗ hổng theo severity |
| Pie chart | Tỷ lệ phần trăm |
| Treemap | Phân bố theo component |

**Component:** `Visualizations/VulnerabilityChart.tsx` – dùng `chart.js` hoặc `recharts`.

### 5.2 Network Map

- Hiển thị các asset dưới dạng nodes (domain, IP).
- Kết nối giữa các asset (ví dụ domain → IP → open port).
- Màu sắc theo severity (đỏ cho asset bị compromise).

**Công cụ:** `react-flow` hoặc `cytoscape.js`.

### 5.3 Timeline View

- Biểu đồ dạng Gantt, các sự kiện theo thời gian.
- Có thể zoom, click vào event để xem chi tiết.

### 5.4 Risk Matrix

| | Critical | High | Medium | Low |
|---|----------|------|--------|-----|
| **Likelihood** | (ô màu) | ... | ... | ... |
| **Impact** | ... | ... | ... | ... |

- Tự động tính toán dựa trên CVSS và khả năng khai thác.

---

## 6. Evidence Management

### 6.1 Screenshot Manager

- Upload screenshot từ ATTACK (ví dụ sqlmap output, shell access).
- Gắn nhãn (tag) với asset và vulnerability.
- Tự động chèn vào báo cáo.

### 6.2 Log Attacher

- Đính kèm file log (từ SCAN, ATTACK) vào báo cáo.
- Có thể trích xuất đoạn log quan trọng (highlight).

### 6.3 Packet Capture (PCAP)

- Nếu có file `.pcap` từ EMULATE hoặc FORENSIC, có thể đính kèm.
- Hiển thị metadata: số lượng gói, protocol, thời gian.

---

## 7. Templates & Customization

### 7.1 Mẫu Có Sẵn

| Template | Đối tượng sử dụng |
|----------|-------------------|
| Pentest Report (Standard) | Khách hàng doanh nghiệp |
| Executive Summary | Ban giám đốc (chỉ tóm tắt) |
| Red Team Report | Đội đỏ (chi tiết kỹ thuật) |
| Compliance Report (PCI, ISO) | Kiểm tra tuân thủ |

### 7.2 Template Editor

- Cho phép tùy chỉnh tiêu đề, màu sắc, logo công ty.
- Thêm/xóa các section (ví dụ bỏ phần "Lateral Movement" nếu không có).

**Component:** `Templates/TemplateEditor.tsx` – drag‑drop các block, preview trực tiếp.

---

## 8. Luồng Dữ Liệu & API

```
Workspace (JSON) → REPORT → (chọn template, export format)
   ↓
Backend: xử lý aggregation, generate file
   ↓
Download file / lưu vào workspace
```

### Endpoints dự kiến

| Method | Endpoint | Body | Mô tả |
|--------|----------|------|-------|
| POST | `/api/report/workspace/list` | - | Lấy danh sách workspace |
| POST | `/api/report/workspace/load` | `{ workspaceId }` | Load dữ liệu |
| POST | `/api/report/aggregate` | `{ workspaceId, types[] }` | Tổng hợp dữ liệu |
| POST | `/api/report/export/pdf` | `{ workspaceId, template, options }` | Xuất PDF |
| POST | `/api/report/export/html` | `{ workspaceId, template }` | Xuất HTML |
| POST | `/api/report/export/json` | `{ workspaceId, sections[] }` | Xuất JSON |
| POST | `/api/report/export/csv` | `{ workspaceId, table }` | Xuất CSV |
| POST | `/api/report/export/docx` | `{ workspaceId, template }` | Xuất DOCX |
| POST | `/api/report/template/save` | `{ name, content }` | Lưu template |

---

## 9. Hướng Dẫn Phát Triển

### 9.1 Thư Viện Cần Dùng

| Mục đích | Thư viện |
|----------|----------|
| PDF generation | `puppeteer` (headless Chrome) hoặc `jsPDF` |
| HTML→PDF | `html-pdf` |
| DOCX | `docx` |
| CSV | `csv-writer` |
| Chart | `recharts`, `chart.js` |
| Graph | `react-flow`, `cytoscape` |
| Template engine | `handlebars` |

### 9.2 Service Wrapper

| File | Mô tả |
|------|-------|
| `services/pdfGenerator.ts` | Dùng puppeteer, render HTML template, lưu PDF |
| `services/htmlGenerator.ts` | Render Handlebars template + data → HTML string |
| `services/docxGenerator.ts` | Tạo document từ template docx |
| `services/aggregator.ts` | Gom dữ liệu từ workspace JSON |

### 9.3 UI Components

- **DashboardView**: Hiển thị các stat boxes, biểu đồ, network map.
- **TemplateSelector**: Grid các template, xem trước thumbnail.
- **ExportOptions**: Radio/checkbox chọn định dạng, nút "Export".
- **PreviewPane**: Xem trước báo cáo (HTML iframe).

### 9.4 Tích Hợp Với Module Khác

- **CORE**: Đọc workspace data.
- **INTEL, SCAN, ATTACK, POST**: Lấy dữ liệu từ các module này.
- **EMULATE**: Có thể đính kèm HAR file.
- **FORENSIC**: Đính kèm kết quả phân tích memory.

---

## 📊 Tổng Kết

| Chỉ số | Giá trị |
|--------|---------|
| **Số định dạng xuất** | 5 (PDF, HTML, JSON, CSV, DOCX) |
| **Số loại biểu đồ** | 4+ (bar, pie, network, timeline, risk matrix) |
| **Hỗ trợ template** | Có (có sẵn + tùy chỉnh) |
| **Evidence attachment** | Screenshot, log, pcap |
| **Output** | File tải về, có thể lưu vào workspace |

> **Phantoma REPORT v1.0.0** — *"Biến dữ liệu thô thành câu chuyện bảo mật"* 📊