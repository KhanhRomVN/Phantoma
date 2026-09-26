CREATE TABLE recon_entities (
  entity_id      TEXT PRIMARY KEY,
  entity_kind    TEXT NOT NULL,          -- "email", "phone", "social_profile"...
  primary_value  TEXT NOT NULL,
  display_label  TEXT NOT NULL,
  attributes     JSONB NOT NULL DEFAULT '{}',
  confidence     INT NOT NULL,
  tags           TEXT[] DEFAULT '{}',
  flagged        BOOLEAN DEFAULT false,
  hidden         BOOLEAN DEFAULT false,
  first_seen     TIMESTAMPTZ,
  last_seen      TIMESTAMPTZ
);
CREATE UNIQUE INDEX idx_entity_identity ON recon_entities (entity_kind, primary_value);

CREATE TABLE recon_links (
  link_id        TEXT PRIMARY KEY,
  from_entity_id TEXT REFERENCES recon_entities(entity_id),
  to_entity_id   TEXT REFERENCES recon_entities(entity_id),
  link_kind      TEXT NOT NULL,          -- "uses", "same_person_as", "authored"...
  confidence     INT NOT NULL,
  status         TEXT NOT NULL,
  evidence       TEXT,
  created_at     TIMESTAMPTZ
);
CREATE INDEX idx_link_from ON recon_links (from_entity_id);
CREATE INDEX idx_link_to   ON recon_links (to_entity_id);

CREATE TABLE recon_sessions (
  session_id       TEXT PRIMARY KEY,
  query_kind       TEXT NOT NULL,
  query_text       TEXT NOT NULL,
  status           TEXT NOT NULL,
  origin           TEXT NOT NULL,        -- 'cache' | 'search'
  pivot_from_entity_id TEXT REFERENCES recon_entities(entity_id),
  pivot_from_field TEXT,
  summary          TEXT,
  created_at       TIMESTAMPTZ
);

CREATE TABLE recon_sources (
  source_id     TEXT PRIMARY KEY,
  entity_id     TEXT REFERENCES recon_entities(entity_id),
  name          TEXT,
  url           TEXT,
  reliability   INT,
  collected_at  TIMESTAMPTZ
);

// ---- 1. node khởi điểm ----
const email = {
  id: uid('n'), kind: 'email', primaryValue: 'thao.nguyen.pr@gmail.com',
  displayLabel: 'thao.nguyen.pr@gmail.com',
  attributes: { 'Nhà cung cấp': attr('Gmail', 'text', 95) },
  confidence: 90, tags: ['điểm khởi đầu'],
  provenance: { discoveredInSessions: ['s10'], sources: [src('Reverse email lookup', 80, 0)], firstSeen: daysAgo(0), lastSeen: daysAgo(0) },
  flags: { flagged: false, hidden: false },
};

// ---- 2. hai tài khoản Facebook — kind mới "social_profile", KHÔNG có trong registry ----
// => UI tự fallback icon/màu mặc định, không cần sửa code, đúng cái schema hứa hẹn
const fbAccount1 = {
  id: uid('n'), kind: 'social_profile', primaryValue: 'facebook.com/thao.nguyen.pr',
  displayLabel: 'Thao Nguyen · Facebook (chính)',
  attributes: {
    'Nền tảng': attr('Facebook', 'text', 90),
    'URL hồ sơ': attr('https://facebook.com/thao.nguyen.pr', 'url', 90),
    'Email khôi phục (công khai)': attr('thao.nguyen.pr@gmail.com', 'email', 85),
  },
  confidence: 87, tags: [],
  provenance: { discoveredInSessions: ['s10'], sources: [src('Facebook — trang công khai', 85, 0)], firstSeen: daysAgo(0), lastSeen: daysAgo(0) },
  flags: { flagged: false, hidden: false },
};

const fbAccount2 = {
  id: uid('n'), kind: 'social_profile', primaryValue: 'facebook.com/t.nguyen.travels',
  displayLabel: 'T. Nguyen Travels · Facebook (nghi là phụ)',
  attributes: {
    'Nền tảng': attr('Facebook', 'text', 90),
    'URL hồ sơ': attr('https://facebook.com/t.nguyen.travels', 'url', 90),
    'Ghi chú': attr('Ảnh đại diện trùng khớp với tài khoản chính, tên hiển thị khác', 'text', 60),
  },
  confidence: 64, tags: ['chưa xác minh'],
  provenance: { discoveredInSessions: ['s10'], sources: [src('Cross-match ảnh đại diện', 58, 0)], firstSeen: daysAgo(0), lastSeen: daysAgo(0) },
  flags: { flagged: false, hidden: false },
};

// ---- 3. bài đăng thuộc tài khoản phụ — kind mới "post" ----
const post = {
  id: uid('n'), kind: 'post', primaryValue: 'fb-post-2024-08-12-t-nguyen-travels',
  displayLabel: 'Bài đăng 12/08/2024 — "Hoàng hôn ở Nha Trang"',
  attributes: {
    'Nội dung': attr('Hoàng hôn ở Nha Trang đẹp quá mọi người ơi 🌇', 'text', 95),
    'Ngày đăng': attr('2024-08-12', 'date', 95),
    'URL bài đăng': attr('https://facebook.com/t.nguyen.travels/posts/998877', 'url', 90),
    'Chế độ riêng tư': attr('Công khai', 'text', 90),
  },
  confidence: 90, tags: [],
  provenance: { discoveredInSessions: ['s10'], sources: [src('Facebook — bài đăng công khai', 88, 0)], firstSeen: daysAgo(0), lastSeen: daysAgo(0) },
  flags: { flagged: false, hidden: false },
};

// ---- 4. ảnh đính kèm bài đăng — kind "image" đã có sẵn trong registry ----
const postImage = {
  id: uid('n'), kind: 'image', primaryValue: 'fb-post-998877-img1',
  displayLabel: 'Ảnh hoàng hôn đính kèm bài đăng',
  attributes: {
    'Xuất hiện tại': attr('https://facebook.com/t.nguyen.travels/posts/998877', 'url', 90),
    'Toạ độ EXIF': attr('12.2388, 109.1967', 'coordinate', 70),
    'Kích thước': attr('1920×1080', 'text', 90),
  },
  confidence: 82, tags: ['có EXIF'],
  provenance: { discoveredInSessions: ['s10'], sources: [src('Tải ảnh gốc từ bài đăng', 82, 0)], firstSeen: daysAgo(0), lastSeen: daysAgo(0) },
  flags: { flagged: false, hidden: false },
};

// ---- 5. edges — đây là phần thể hiện "1 email ra 2 FB, 1 FB ra 1 post kèm ảnh" ----
const newEdges = [
  { id: uid('e'), fromId: email.id, toId: fbAccount1.id, kind: 'uses',
    confidence: 88, status: 'confirmed',
    evidence: 'Email trùng khớp với email khôi phục công khai trên hồ sơ',
    sources: [], createdAt: daysAgo(0) },

  { id: uid('e'), fromId: email.id, toId: fbAccount2.id, kind: 'uses',
    confidence: 60, status: 'suspected',
    evidence: 'Suy luận gián tiếp qua trùng khớp ảnh đại diện với tài khoản 1, chưa có bằng chứng trực tiếp',
    sources: [], createdAt: daysAgo(0) },

  { id: uid('e'), fromId: fbAccount1.id, toId: fbAccount2.id, kind: 'same_person_as',
    confidence: 60, status: 'suspected',
    evidence: 'Cùng ảnh đại diện, khác tên hiển thị — nghi là tài khoản phụ/tài khoản du lịch',
    sources: [], createdAt: daysAgo(0) },

  { id: uid('e'), fromId: fbAccount2.id, toId: post.id, kind: 'authored',
    confidence: 90, status: 'confirmed',
    evidence: 'Bài đăng thuộc trực tiếp về tài khoản này, lấy từ timeline công khai',
    sources: [], createdAt: daysAgo(0) },

  { id: uid('e'), fromId: post.id, toId: postImage.id, kind: 'contains_media',
    confidence: 95, status: 'confirmed',
    evidence: 'Ảnh được đính kèm trực tiếp trong bài đăng',
    sources: [], createdAt: daysAgo(0) },
];