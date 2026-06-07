# ☁️ Phantoma CLOUD — Tài Liệu Module Đám Mây

> **Phiên bản:** 1.0.0  
> **Module:** Cloud Security Assessment & Exploitation  
> **Nền tảng:** Phantoma — Hệ Sinh Thái An Ninh Mạng Tự Động Hóa  

---

## 📑 Mục Lục

- [1. Tổng Quan Kiến Trúc](#1-tổng-quan-kiến-trúc)
- [2. AWS — Amazon Web Services](#2-aws--amazon-web-services)
- [3. Azure — Microsoft Azure](#3-azure--microsoft-azure)
- [4. GCP — Google Cloud Platform](#4-gcp--google-cloud-platform)
- [5. Kubernetes — K8s Security](#5-kubernetes--k8s-security)
- [6. Multi‑Cloud & Cross‑Cloud](#6-multi-cloud--cross-cloud)
- [7. Cơ Chế An Toàn & Giới Hạn](#7-cơ-chế-an-toàn--giới-hạn)
- [8. Luồng Dữ Liệu & API](#8-luồng-dữ-liệu--api)
- [9. Hướng Dẫn Phát Triển](#9-hướng-dẫn-phát-triển)

---

## 1. Tổng Quan Kiến Trúc

Module **CLOUD** kết hợp các kỹ thuật **thụ động** (OSINT, bucket enumeration) và **chủ động** (khai thác lỗ hổng cloud, leo thang đặc quyền). Yêu cầu có API keys (với quyền read‑only để scan, hoặc higher để khai thác).

```
CLOUD/
├── CLOUD.md                     ← Tài liệu này
├── index.tsx                    ← Component chính
├── AWS/                         ← AWS‑specific
│   ├── S3Scanner.tsx
│   ├── EC2Enum.tsx
│   ├── IAMAnalyzer.tsx
│   ├── LambdaExploit.tsx
│   └── ...
├── Azure/                       ← Azure‑specific
│   ├── BlobScanner.tsx
│   ├── AADEnum.tsx
│   ├── KeyVaultChecker.tsx
│   └── ...
├── GCP/                         ← GCP‑specific
│   ├── BucketScanner.tsx
│   ├── ComputeEngineEnum.tsx
│   └── ...
├── K8s/                         ← Kubernetes
│   ├── PodSecurity.tsx
│   ├── RBACChecker.tsx
│   ├── ContainerBreakout.tsx
│   └── ...
├── services/                    (aws-sdk, azure-sdk, google-cloud-sdk, kubectl wrapper)
├── types/
└── utils/
```

### 🎯 Các nhóm kỹ thuật chính

| # | Nền tảng | Kỹ thuật |
|---|----------|----------|
| 1 | AWS | S3 bucket enumeration & dumping, EC2 metadata SSRF, IAM privilege escalation, Lambda RCE |
| 2 | Azure | Blob container enumeration, Azure AD reconnaissance, Key Vault secret extraction, Managed Identity abuse |
| 3 | GCP | Cloud Storage bucket enumeration, Compute Engine metadata, IAM exploitation |
| 4 | Kubernetes | Pod security check, RBAC misconfiguration, container breakout, kubelet API abuse |
| 5 | Multi‑cloud | Cross‑cloud token exchange, workload scanning |

---

## 2. AWS — Amazon Web Services

### 2.1 S3 Bucket OSINT & Enumeration

| Kỹ thuật | Mô tả |
|----------|-------|
| Bucket wordlist brute‑force | Thử tên bucket dạng `{keyword}-{company}` |
| Public bucket detection | `aws s3 ls s3://bucket --no-sign-request` |
| Bucket dumping | Tải toàn bộ nội dung public |
| Bucket policy analysis | Kiểm tra xem ai có quyền `ListBucket`, `GetObject` |

**Công cụ:** `s3scanner`, `bucket_finder`, AWS CLI.

**Kết quả trả về:**
- `bucketName`
- `region`
- `isPublic`
- `objects` (danh sách file)
- `policy` (nếu public)

### 2.2 EC2 Metadata & SSRF

- **SSRF dẫn đến metadata**: `http://169.254.169.254/latest/meta-data/`
- Lấy IAM role credentials: `http://169.254.169.254/latest/meta-data/iam/security-credentials/<role>`
- Dùng credentials đó để truy cập các dịch vụ AWS khác.

**Component:** `AWS/EC2Metadata.tsx` – hướng dẫn khai thác SSRF, hiển thị credentials nếu có.

### 2.3 IAM Privilege Escalation

Phát hiện các chính sách cho phép leo thang:

| Hành động nguy hiểm | Mô tả |
|---------------------|-------|
| `iam:CreatePolicyVersion` | Tạo phiên bản policy mới (có thể gắn quyền admin) |
| `iam:AttachUserPolicy` | Gắn policy trực tiếp vào user |
| `iam:PutUserPolicy` | Gắn inline policy |
| `sts:AssumeRole` | Nhận role có quyền cao hơn |

**Công cụ:** `PMapper`, `SkyArk`, `CloudTrail` logs.

**Output:** `{ vulnerablePolicy, suggestedAction, canEscalate }`.

### 2.4 Lambda Functions Exploitation

- **RCE qua event payload** (nếu function chạy lệnh từ input không an toàn).
- **Thay đổi code Lambda** nếu có quyền `lambda:UpdateFunctionCode`.
- **Exfiltrate environment variables** (chứa secrets).

### 2.5 RDS Snapshot Sharing

- Phát hiện snapshots RDS được chia sẻ công khai hoặc với tài khoản ngoài.
- Khôi phục snapshot để lấy dữ liệu.

---

## 3. Azure — Microsoft Azure

### 3.1 Blob Storage OSINT

| Kỹ thuật | Mô tả |
|----------|-------|
| Brute‑force container name | `https://<account>.blob.core.windows.net/<container>` |
| Kiểm tra public access | `az storage container list --account-name <account> --auth-mode login` (nếu có quyền) |
| Dump container | `az storage blob download-batch` |

**Công cụ:** `MicroBurst`, `Azure Storage Explorer`.

### 3.2 Azure Active Directory Recon

- Liệt kê users, groups, service principals (không cần đăng nhập nếu có dữ liệu công khai).
- Phát hiện guest users, OAuth apps có quyền cao.

**Công cụ:** `AADInternals`, `MSOLSpray`.

### 3.3 Key Vault Secret Extraction

- Nếu có quyền `Key Vault Reader` hoặc `Secrets Get`, có thể đọc secret.
- Khai thác qua Managed Identity (VM, App Service) để lấy token và truy cập Key Vault.

### 3.4 Managed Identity Abuse

- Từ VM/App service bị chiếm, lấy token từ endpoint `http://169.254.169.254/metadata/identity/oauth2/token`.
- Dùng token để gọi Azure Resource Manager, Graph API.

---

## 4. GCP — Google Cloud Platform

### 4.1 Cloud Storage Bucket Enumeration

- Tương tự AWS S3: `https://storage.googleapis.com/<bucket>`
- Dùng `gsutil ls -r gs://<bucket>` (nếu public).
- Brute‑force bucket name với từ điển.

**Công cụ:** `gcloud CLI`, `BucketStream`.

### 4.2 Compute Engine Metadata

- SSRF đến `http://metadata.google.internal/computeMetadata/v1/`.
- Lấy service account token: `.../instance/service-accounts/default/token`.
- Dùng token để truy cập các API GCP.

### 4.3 IAM & Service Account Exploitation

- Phát hiện service account có quyền `roles/iam.serviceAccountTokenCreator` → có thể tạo token mới.
- Sử dụng `gcloud auth activate-service-account` với key file lấy được.

**Công cụ:** `gcp_scanner`, `ScoutSuite`.

---

## 5. Kubernetes — K8s Security

### 5.1 Pod Security & RBAC

| Kiểm tra | Mô tả |
|----------|-------|
| Pod có hostPath mount | Truy cập host filesystem |
| Pod chạy privileged | Escalate ra host |
| Pod có hostNetwork | Bỏ qua network policies |
| RBAC có cluster-admin | Toàn quyền trên cluster |

**Công cụ:** `kube-hunter`, `kube-bench`, `kubectl auth can-i`.

### 5.2 Kubelet API Abuse

- Kubelet API (port 10250, 10255) không xác thực có thể cho phép chạy lệnh trong pod.
- `curl -k https://node:10250/run/<namespace>/<pod>/<container> -d "cmd=id"`.

### 5.3 Container Breakout

- Khai thác CVE như CVE-2019-5736 (runc) để thoát container.
- Dùng `docker.sock` mount để tạo container privileged mới.

### 5.4 Secrets Extraction

- Trong pod, đọc `/var/run/secrets/kubernetes.io/serviceaccount/token`.
- Dùng token để gọi API server, truy cập secrets toàn cluster.

---

## 6. Multi‑Cloud & Cross‑Cloud

### 6.1 Token Exchange (Assume Role & Federation)

- Chuyển từ AWS token sang Azure bằng cách giả mạo OIDC federation.
- Dùng `aws sts assume-role-with-web-identity`.

### 6.2 Workload Scanning

- Quét các container images, serverless functions để tìm secret, lỗ hổng (Trivy, Grype).

---

## 7. Cơ Chế An Toàn & Giới Hạn

### 7.1 Yêu cầu ủy quyền

- Mỗi hành động đọc/ghi tài nguyên cloud cần xác nhận "Tôi là chủ sở hữu hoặc được ủy quyền".
- Các thao tác nguy hiểm (xóa, sửa policy, nâng quyền) yêu cầu xác thực 2 yếu tố.

### 7.2 Rate Limiting & Chi phí

- Hạn chế số lần gọi API để tránh phát sinh chi phí bất ngờ (đặc biệt với enumeration).
- Có cảnh báo trước khi thực hiện hành động có thể gây tốn tiền (tạo instance, dump nhiều dữ liệu).

### 7.3 API Keys Management

- Không lưu trữ API keys dạng plaintext. Dùng `CORE` vault (mã hóa).
- Keys chỉ dùng trong phiên, có thể xóa sau khi kết thúc.

### 7.4 Logging

- Ghi lại tất cả API calls, object truy cập, bucket đã liệt kê.
- Log được lưu ít nhất 30 ngày.

---

## 8. Luồng Dữ Liệu & API

```
User → (chọn cloud provider, nhập API key) → chọn kỹ thuật
   ↓
Backend: gọi SDK hoặc CLI → parse JSON → hiển thị
   ↓
Có thể export kết quả sang REPORT
```

### Endpoints dự kiến (AWS)

| Method | Endpoint | Body | Mô tả |
|--------|----------|------|-------|
| POST | `/api/cloud/aws/s3/enumerate` | `{ pattern, region, publicOnly }` | Tìm bucket |
| POST | `/api/cloud/aws/s3/dump` | `{ bucketName, prefix }` | Dump nội dung |
| POST | `/api/cloud/aws/iam/analyze` | `{ accessKey, secretKey, region }` | Phân tích quyền |
| POST | `/api/cloud/aws/ec2/metadata` | `{ targetUrl }` | SSRF → metadata |

Tương tự cho Azure, GCP, K8s.

---

## 9. Hướng Dẫn Phát Triển

### 9.1 SDK chính thức

| Nền tảng | SDK |
|----------|-----|
| AWS | `aws-sdk-js` v3 |
| Azure | `@azure/identity`, `@azure/storage-blob`, `@azure/arm-*` |
| GCP | `@google-cloud/storage`, `@google-cloud/compute` |
| K8s | `@kubernetes/client-node` |

### 9.2 Các service cần viết

| File | Mô tả |
|------|-------|
| `services/aws/s3.ts` | Wrapper cho S3 operations |
| `services/aws/iam.ts` | Phân tích policy, kiểm tra leo thang |
| `services/azure/blob.ts` | Liệt kê container, blob |
| `services/k8s/kubeclient.ts` | Gọi Kubernetes API |

### 9.3 UI Components

- **BucketScanner**: nhập pattern, chạy, hiển thị kết quả với trạng thái public/private.
- **PolicyAnalyzer**: hiển thị JSON policy, highlight các quyền nguy hiểm.
- **K8sPodExplorer**: duyệt pod, xem secret, chạy tạm lệnh (kubectl exec).

---

## 📊 Tổng Kết

| Chỉ số | Giá trị |
|--------|---------|
| **Số nền tảng** | 4 (AWS, Azure, GCP, K8s) |
| **Số kỹ thuật** | 12+ (S3 dump, IAM escalation, metadata SSRF, K8s breakout, blob enumeration, Key Vault, …) |
| **Công cụ tích hợp** | AWS CLI, Azure CLI, gcloud, kubectl, S3Scanner, MicroBurst, kube-hunter |
| **Rủi ro pháp lý** | Rất cao nếu dùng sai mục đích → cần kiểm soát chặt |

> **Phantoma CLOUD v1.0.0** — *"Mây mù hay vũ bão, đều có thể dò tìm"* 🌩️