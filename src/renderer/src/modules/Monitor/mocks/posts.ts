import type {
  Post,
  Priority,
  SnapshotDiff,
  TagDef,
  PostStage,
} from '../types/monitor.types';
import { MEDIA_KINDS, SRC, SRC_META, TAG_NAMES } from '../constants/meta';
import { ago, chance, int, pick, uid } from '../utils/random';
import { MOCK_MONITORS } from './monitors';

const TITLES = [
  'Mẫu credential dump mới xuất hiện',
  'Thread thảo luận bypass WAF qua chunked encoding',
  'PoC SSRF trên API gateway phổ biến',
  'Bản cập nhật ứng dụng mobile bị lộ API key',
  'Thông báo từ nhóm nghiên cứu về lỗ hổng 0day',
  'Rao bán database khách hàng khu vực SEA',
  'Cảnh báo CVE mới ảnh hưởng thư viện phổ biến',
  'Trang đăng nhập client thay đổi form',
];

const BODIES = [
  'Thành viên mới đăng mẫu dump gồm email/hash, kèm lời mời liên hệ qua kênh riêng. Cần đối chiếu với danh sách domain của client.',
  'Phân tích kỹ thuật cho thấy cách chia nhỏ payload khiến rule WAF mặc định bỏ sót. Có kèm vài ví dụ request đã được ẩn bớt.',
  'Tác giả công bố bản mô tả luồng khai thác SSRF qua tham số callback, ghi nhận trên nhiều phiên bản gateway.',
  'Bản build mới chứa chuỗi cấu hình nhạy cảm trong tài nguyên ứng dụng. Nhóm mobile cần xác minh và thu hồi khóa.',
  'Kênh nghiên cứu công bố tóm tắt lỗ hổng chưa có bản vá, kèm nhận định về mức độ ảnh hưởng đối với hệ thống doanh nghiệp.',
  'Bài đăng rao bán dữ liệu với số lượng bản ghi lớn, đề cập tên một sàn thương mại điện tử quen thuộc.',
  'Advisory mới mô tả lỗi thực thi mã từ xa, điểm CVSS cao. Đã có patch từ nhà cung cấp.',
  'Snapshot mới phát hiện trường nhập liệu và đường dẫn script thay đổi so với lần crawl trước.',
];

const DIFFS: [string[], string[]][] = [
  [
    ['<title>Đăng nhập</title>', '<form action="/login">', '<input name="user">', '<input name="pass">', '<script src="/js/app.v12.js">'],
    ['<title>Đăng nhập</title>', '<form action="/auth/login">', '<input name="user">', '<input name="pass">', '<input name="otp">', '<script src="/js/app.v13.js">'],
  ],
  [
    ['Giá: 199.000đ', 'Tồn kho: 120', 'Banner: Flash sale 11.11', 'Footer: © 2025'],
    ['Giá: 179.000đ', 'Tồn kho: 85', 'Banner: Flash sale 12.12', 'Footer: © 2026', 'Ghi chú: Miễn phí vận chuyển'],
  ],
  [
    ['Server: nginx/1.18.0', 'X-Powered-By: PHP/7.4', 'Disallow: /admin', 'Disallow: /backup'],
    ['Server: nginx/1.24.0', 'Disallow: /admin', 'Disallow: /backup', 'Disallow: /staging'],
  ],
];

const LINKS: { title: string; description: string; domain: string }[] = [
  { title: 'Phân tích chuỗi khai thác SSRF-to-RCE', description: 'Bài viết chi tiết về cách kết hợp SSRF với metadata service để leo thang đặc quyền.', domain: 'blog.secresearch.io' },
  { title: 'Báo cáo quý: xu hướng leak dữ liệu SEA', description: 'Tổng hợp số liệu các vụ rò rỉ dữ liệu theo ngành và loại dữ liệu bị lộ.', domain: 'threatintel.example.org' },
  { title: 'Cập nhật bảo mật tháng này', description: 'Danh sách bản vá và CVE quan trọng cần ưu tiên triển khai.', domain: 'vendor-advisory.com' },
];

const NOTE_AUTHORS = ['minh.nguyen', 'lan.tran', 'hung.le'];
const NOTE_TEXTS = [
  'Đã chuyển cho team xác minh.',
  'Cần đối chiếu với asset của client.',
  'Theo dõi thêm 24h trước khi báo cáo.',
];

function makeDiff(i: number): SnapshotDiff {
  const [before, after] = DIFFS[i % DIFFS.length];
  return {
    before,
    after,
    addedCount: after.filter((x) => !before.includes(x)).length,
    removedCount: before.filter((x) => !after.includes(x)).length,
  };
}

export function buildPost(i: number, ageH: number): Post {
  const mediaType = MEDIA_KINDS[i % 7];
  const sourceType = SRC[(i + Math.floor(i / 7)) % SRC.length];
  const mon = MOCK_MONITORS.find((m) => m.sourceType === sourceType)!;
  const base: Post = {
    id: uid('post'),
    monitorId: mon.id,
    sourceName: mon.name,
    sourceType,
    sourceDomain: SRC_META[sourceType].domain,
    author: pick(['anon_0x7f', 'sec_lead', 'redteam_vn', 'admin', 'newsbot']),
    title: TITLES[i % TITLES.length],
    body: BODIES[i % BODIES.length],
    mediaType,
    tags: Array.from(new Set([pick(TAG_NAMES), pick(TAG_NAMES)])).slice(0, int(1, 2)),
    priority: pick<Priority>(['high', 'medium', 'low', 'medium']),
    createdAt: ago(ageH),
    isRecommended: chance(0.6),
    archived: i === 2 || i === 9 || chance(0.15),
    notes: [],
    viewedCount: int(0, 12),
    confidence: 38 + ((i * 29) % 60),
    stage: (['new', 'reading', 'saved', 'done'] as const)[i % 4] as PostStage,
  };

  if (i % 5 === 1) {
    base.notes = Array.from({ length: int(1, 2) }, (_, k) => ({
      id: uid('note'),
      author: NOTE_AUTHORS[k % 3],
      text: NOTE_TEXTS[(i + k) % 3],
      at: ago(ageH / 2),
    }));
  }
  const seed = `mn${i}`;
  if (mediaType === 'image') {
    base.mediaItems = [{ type: 'image', url: `https://picsum.photos/seed/${seed}/800/450`, alt: 'Ảnh chụp màn hình' }];
  } else if (mediaType === 'gallery') {
    base.mediaItems = Array.from({ length: int(3, 7) }, (_, k) => ({
      type: 'image' as const,
      url: `https://picsum.photos/seed/${seed}-${k}/800/450`,
      alt: `Ảnh ${k + 1}`,
    }));
  } else if (mediaType === 'audio') {
    base.mediaItems = [{ type: 'audio', url: '', durationSec: int(45, 600) }];
  } else if (mediaType === 'video') {
    base.mediaItems = [{ type: 'video', url: '', thumb: `https://picsum.photos/seed/${seed}/800/450`, durationSec: int(20, 420) }];
  } else if (mediaType === 'diff') {
    base.diff = makeDiff(i);
    base.title = `Thay đổi nội dung: ${mon.name}`;
  } else if (mediaType === 'link') {
    const l = LINKS[i % LINKS.length];
    base.linkPreview = { ...l, thumb: `https://picsum.photos/seed/${seed}/200/200` };
  }
  return base;
}

export const MOCK_POSTS: Post[] = Array.from({ length: 24 }, (_, i) =>
  buildPost(i, i === 0 ? 0.08 : 0.4 + i * 3.1),
);

export const MOCK_TAGS: TagDef[] = TAG_NAMES.map((name) => ({
  name,
  count: MOCK_POSTS.filter((p) => p.tags.includes(name)).length,
}));