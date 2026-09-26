import { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  User,
  Mail,
  Phone,
  AtSign,
  MapPin,
  Building2,
  Smartphone,
  Image as ImageIcon,
  ShieldAlert,
  Globe,
  FileText,
  Network,
  Table2,
  LayoutGrid,
  Filter,
  X,
  Link2,
  Flag,
  EyeOff,
  ChevronRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Copy,
  Trash2,
  ArrowUpDown,
  History,
  ClipboardList,
  Loader2,
} from 'lucide-react';

/* ============================================================================
   1. DATA MODEL
   -------------------------------------------------------------------------
   Nguyên tắc: mỗi điểm dữ liệu (email, phone, username, địa chỉ...) là MỘT
   entity độc lập, không gắn cứng vào một Person. Việc "ai sở hữu cái gì" là
   một Relationship riêng, có confidence + status + evidence + sources của
   chính nó — vì recon không bao giờ chắc chắn 100%.
============================================================================ */

type EntityType =
  | 'person'
  | 'email'
  | 'phone'
  | 'username'
  | 'address'
  | 'organization'
  | 'device'
  | 'image'
  | 'breach'
  | 'ip'
  | 'domain'
  | 'document';

type RelationType =
  | 'owns'
  | 'uses'
  | 'same_person_as'
  | 'family_of'
  | 'colleague_of'
  | 'located_at'
  | 'employed_by'
  | 'registered_to'
  | 'appears_in'
  | 'linked_device'
  | 'associated_with'
  | 'breached_in';

type RelationStatus = 'confirmed' | 'suspected' | 'rejected';
type QueryType = 'person' | 'email' | 'phone' | 'username' | 'image' | 'ip' | 'domain' | 'generic';
type SessionStatus = 'completed' | 'running' | 'queued';
type ViewId = 'overview' | 'graph' | 'table' | 'relationships' | 'report';

interface SourceRef {
  id: string;
  name: string;
  url?: string;
  collectedAt: string;
  reliability: number; // 0-100, độ tin cậy của NGUỒN (không phải của dữ liệu)
}

interface ReconEntity {
  id: string;
  type: EntityType;
  label: string;
  fields: Record<string, string>;
  tags: string[];
  confidence: number; // độ tin cậy rằng bản thân điểm dữ liệu này là thật/hợp lệ
  sources: SourceRef[];
  sessionId: string; // phiên đã phát hiện ra entity này
  firstSeen: string;
  lastSeen: string;
  flagged: boolean;
  hidden: boolean;
}

interface ReconRelationship {
  id: string;
  fromId: string;
  toId: string;
  type: RelationType;
  confidence: number; // độ tin cậy của MỐI QUAN HỆ — độc lập với confidence 2 đầu
  status: RelationStatus;
  evidence: string;
  sources: SourceRef[];
  createdAt: string;
}

interface ReconSession {
  id: string;
  query: string;
  queryType: QueryType;
  createdAt: string;
  status: SessionStatus;
  entityIds: string[];
  summary: string;
}

/* ============================================================================
   2. MOCK DATA — sinh có kiểm soát, không phải số liệu ảo cho đẹp
============================================================================ */

let uidSeq = 1;
const uid = (p: string) => `${p}_${uidSeq++}`;
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};
const src = (name: string, reliability: number, daysBack: number, url?: string): SourceRef => ({
  id: uid('src'),
  name,
  reliability,
  collectedAt: daysAgo(daysBack),
  url,
});
const mkEntity = (
  type: EntityType,
  label: string,
  fields: Record<string, string>,
  confidence: number,
  sessionId: string,
  sources: SourceRef[],
  tags: string[] = [],
  daysBack = 5,
): ReconEntity => ({
  id: uid('e'),
  type,
  label,
  fields,
  confidence,
  sessionId,
  sources,
  tags,
  firstSeen: daysAgo(daysBack + 10),
  lastSeen: daysAgo(daysBack),
  flagged: false,
  hidden: false,
});
const mkRel = (
  fromId: string,
  toId: string,
  type: RelationType,
  confidence: number,
  status: RelationStatus,
  evidence: string,
  sources: SourceRef[] = [],
): ReconRelationship => ({
  id: uid('rel'),
  fromId,
  toId,
  type,
  confidence,
  status,
  evidence,
  sources,
  createdAt: daysAgo(1),
});

const S1 = 's1'; // tra cứu theo tên người
const S2 = 's2'; // reverse email lookup
const S3 = 's3'; // reverse image search
const S4 = 's4'; // reverse phone lookup

const personAlex = mkEntity(
  'person',
  'Alex Mercer Whitfield',
  { 'Ngày sinh (ước tính)': '03/1991', 'Quốc tịch': 'Hoa Kỳ', 'Giới tính': 'Nam (suy luận)' },
  78,
  S1,
  [
    src('LinkedIn', 88, 6, 'https://linkedin.com/in/alex-whitfield-91'),
    src('Kỷ yếu đại học', 70, 200),
  ],
  ['danh tính chính'],
  6,
);

const personDana = mkEntity(
  'person',
  'Dana R. Whitfield',
  { 'Ghi chú': 'Chưa xác minh — chỉ nghi vấn qua địa chỉ và ảnh gắn thẻ chung' },
  55,
  S1,
  [src('Instagram tag scan', 54, 40)],
  ['chưa xác minh'],
  40,
);

const personJordan = mkEntity(
  'person',
  'Jordan Whitfield',
  { 'Ghi chú': 'Cùng họ, từng chung địa chỉ theo hồ sơ 2016' },
  60,
  S1,
  [src('Hồ sơ công khai', 62, 300)],
  ['chưa xác minh'],
  300,
);

const emailGmail = mkEntity(
  'email',
  'alex.whitfield@gmail.com',
  { 'Nhà cung cấp': 'Gmail', Loại: 'Cá nhân (nghi vấn chính)' },
  91,
  S2,
  [src('Reverse email lookup', 85, 3), src('Breach DB', 80, 900)],
  ['rò rỉ'],
  3,
);

const emailWork = mkEntity(
  'email',
  'a.whitfield@northwindsys.com',
  { 'Nhà cung cấp': 'Google Workspace', Loại: 'Công việc' },
  95,
  S1,
  [src('Company Directory', 93, 6)],
  [],
  6,
);

const emailOld = mkEntity(
  'email',
  'ghostpanel91@yahoo.com',
  { 'Nhà cung cấp': 'Yahoo', Loại: 'Diễn đàn / cũ' },
  70,
  S2,
  [src('Forum archive', 60, 900), src('Breach DB', 80, 900)],
  ['rò rỉ', 'cũ'],
  900,
);

const phoneMain = mkEntity(
  'phone',
  '+1 (512) 555-0148',
  { 'Nhà mạng': 'AT&T Mobility', Loại: 'Di động' },
  82,
  S4,
  [src('Reverse phone lookup', 75, 0)],
  [],
  0,
);

const phoneOld = mkEntity(
  'phone',
  '+1 (720) 555-0199',
  { 'Nhà mạng': 'Verizon', Loại: 'Di động (cũ)' },
  60,
  S4,
  [src('Whitepages cache', 58, 700)],
  ['cũ'],
  700,
);

const userLinkedIn = mkEntity(
  'username',
  'amwhitfield · LinkedIn',
  { 'Nền tảng': 'LinkedIn', 'Trạng thái': 'Hoạt động' },
  90,
  S1,
  [src('LinkedIn', 88, 6)],
  [],
  6,
);

const userReddit = mkEntity(
  'username',
  'ghostpanel91 · Reddit / X',
  { 'Nền tảng': 'Reddit, X/Twitter', 'Trạng thái': 'Hoạt động' },
  68,
  S2,
  [src('Cross-match username', 60, 10)],
  ['chưa xác minh'],
  10,
);

const userGithub = mkEntity(
  'username',
  'amw-dev · GitHub',
  { 'Nền tảng': 'GitHub', 'Trạng thái': 'Hoạt động' },
  90,
  S1,
  [src('GitHub', 90, 1)],
  [],
  1,
);

const addrAustin = mkEntity(
  'address',
  '2140 Rainey St, Austin, TX 78701',
  { Loại: 'Nơi ở hiện tại (nghi vấn)', 'Khoảng thời gian': '2023 – nay' },
  74,
  S4,
  [src('WHOIS domain', 70, 60), src('Giao hàng công khai', 60, 20)],
  ['chưa xác minh nguồn cấp 1'],
  20,
);

const addrDenver = mkEntity(
  'address',
  'Denver, CO (khu vực)',
  { Loại: 'Nơi ở trước đây', 'Khoảng thời gian': '2018 – 2022' },
  66,
  S1,
  [src('LinkedIn', 80, 900)],
  [],
  900,
);

const orgNorthwind = mkEntity(
  'organization',
  'Northwind Systems',
  { Ngành: 'Hạ tầng / Cloud', 'Vai trò': 'Nhà tuyển dụng hiện tại' },
  96,
  S1,
  [src('LinkedIn', 88, 6), src('Company Directory', 93, 6)],
  [],
  6,
);

const orgAMW = mkEntity(
  'organization',
  'AMW Labs LLC',
  { Ngành: 'Tư vấn công nghệ', Bang: 'Texas', 'Thành lập': '2021' },
  89,
  S1,
  [src('Texas Secretary of State', 92, 30)],
  [],
  30,
);

const deviceIphone = mkEntity(
  'device',
  'iPhone 14 Pro (theo EXIF)',
  { 'Nguồn suy luận': 'Metadata ảnh', 'Hệ điều hành': 'iOS' },
  82,
  S3,
  [src('EXIF metadata', 82, 1)],
  [],
  1,
);

const imageReddit = mkEntity(
  'image',
  'IMG_0421.jpg — ảnh đính kèm bài đăng Reddit',
  {
    'Kích thước': '4032×3024',
    'Ngày chụp (EXIF)': '2025-03-11',
    'Vị trí GPS (EXIF)': '30.2599, -97.7407',
  },
  100,
  S3,
  [src('Reddit r/homelab', 95, 1)],
  ['ảnh gốc'],
  1,
);

const breach1 = mkEntity(
  'breach',
  'Collection #4 Combolist (2023)',
  { 'Loại dữ liệu lộ': 'Email + mật khẩu băm (SHA-1)' },
  88,
  S2,
  [src('Breach DB', 88, 900)],
  [],
  900,
);

const breach2 = mkEntity(
  'breach',
  'CloudNote SaaS Breach (2022)',
  { 'Loại dữ liệu lộ': 'Tên, email, IP đăng ký' },
  81,
  S2,
  [src('Breach DB', 81, 1200)],
  [],
  1200,
);

const ipAustin = mkEntity(
  'ip',
  '72.xx.xx.xx (dân dụng, Austin TX)',
  { ISP: 'Spectrum / Charter', Loại: 'Dân dụng, một phần bị che' },
  50,
  S4,
  [src('Log bình luận forum công khai', 45, 25)],
  ['một phần bị che'],
  25,
);

const domainAmw = mkEntity(
  'domain',
  'amwlabs.dev',
  { 'Đăng ký': 'Cloudflare (privacy-protected)', 'Trạng thái': 'Đang hoạt động' },
  93,
  S1,
  [src('WHOIS', 90, 30)],
  [],
  30,
);

const docPdf = mkEntity(
  'document',
  'Slide DevOpsDays Austin 2024.pdf',
  { 'Định dạng': 'PDF', 'Số trang': '18' },
  70,
  S1,
  [src('Slideshare cache', 65, 400)],
  [],
  400,
);

const INITIAL_ENTITIES: ReconEntity[] = [
  personAlex,
  personDana,
  personJordan,
  emailGmail,
  emailWork,
  emailOld,
  phoneMain,
  phoneOld,
  userLinkedIn,
  userReddit,
  userGithub,
  addrAustin,
  addrDenver,
  orgNorthwind,
  orgAMW,
  deviceIphone,
  imageReddit,
  breach1,
  breach2,
  ipAustin,
  domainAmw,
  docPdf,
];

const INITIAL_RELATIONSHIPS: ReconRelationship[] = [
  mkRel(
    personAlex.id,
    emailGmail.id,
    'uses',
    88,
    'confirmed',
    'Email tự khai trên hồ sơ GitHub công khai',
  ),
  mkRel(
    personAlex.id,
    emailWork.id,
    'uses',
    95,
    'confirmed',
    'Trùng domain công ty nơi làm việc đã xác nhận',
  ),
  mkRel(
    personAlex.id,
    userLinkedIn.id,
    'uses',
    92,
    'confirmed',
    'Tài khoản chính chủ, ảnh và tên khớp hồ sơ',
  ),
  mkRel(
    userReddit.id,
    personAlex.id,
    'same_person_as',
    64,
    'suspected',
    'Trùng văn phong viết và khung giờ hoạt động với GitHub',
  ),
  mkRel(
    personAlex.id,
    emailOld.id,
    'uses',
    58,
    'suspected',
    'Chỉ trùng khớp qua dữ liệu breach, chưa xác minh chéo nguồn khác',
  ),
  mkRel(
    personAlex.id,
    phoneMain.id,
    'uses',
    79,
    'confirmed',
    'Trùng số điện thoại trên hồ sơ giao hàng công khai',
  ),
  mkRel(
    personDana.id,
    phoneMain.id,
    'uses',
    41,
    'suspected',
    'Có thể là số dùng chung hộ gia đình, chưa tách được chủ thuê bao',
  ),
  mkRel(
    personAlex.id,
    orgNorthwind.id,
    'employed_by',
    96,
    'confirmed',
    'LinkedIn và email công ty đã xác minh',
  ),
  mkRel(
    personAlex.id,
    orgAMW.id,
    'owns',
    89,
    'confirmed',
    'Đứng tên người quản lý duy nhất trên hồ sơ bang Texas',
  ),
  mkRel(
    orgAMW.id,
    domainAmw.id,
    'owns',
    90,
    'confirmed',
    'Domain đăng ký cùng thời điểm thành lập công ty',
  ),
  mkRel(
    personAlex.id,
    addrAustin.id,
    'located_at',
    74,
    'suspected',
    'Chưa xác minh chéo với nguồn cấp 1 (hộ khẩu / hoá đơn)',
  ),
  mkRel(
    personDana.id,
    addrAustin.id,
    'located_at',
    45,
    'suspected',
    'Chỉ đúng nếu quan hệ gia đình với Alex được xác nhận',
  ),
  mkRel(
    personAlex.id,
    addrDenver.id,
    'located_at',
    66,
    'confirmed',
    'Khớp thời gian làm việc tại Cascade Cloud Labs, Denver',
  ),
  mkRel(
    personAlex.id,
    personJordan.id,
    'family_of',
    60,
    'suspected',
    'Cùng họ, từng chung địa chỉ theo hồ sơ 2016',
  ),
  mkRel(
    personAlex.id,
    personDana.id,
    'family_of',
    57,
    'suspected',
    'Tag ảnh chung và cùng địa chỉ hiện tại (nghi vấn)',
  ),
  mkRel(
    emailGmail.id,
    breach1.id,
    'breached_in',
    88,
    'confirmed',
    'Email xuất hiện trực tiếp trong dump combolist',
  ),
  mkRel(
    emailGmail.id,
    breach2.id,
    'breached_in',
    75,
    'confirmed',
    'Email trùng khớp trong dump CloudNote',
  ),
  mkRel(
    emailOld.id,
    breach2.id,
    'breached_in',
    60,
    'suspected',
    'Trùng một phần, chưa xác minh dump gốc còn nguyên vẹn',
  ),
  mkRel(
    imageReddit.id,
    deviceIphone.id,
    'linked_device',
    82,
    'confirmed',
    'Trích xuất trực tiếp từ EXIF của ảnh',
  ),
  mkRel(
    imageReddit.id,
    personAlex.id,
    'associated_with',
    66,
    'suspected',
    'So khớp khuôn mặt sơ bộ, cần xác minh chuyên sâu hơn',
  ),
  mkRel(
    docPdf.id,
    personAlex.id,
    'appears_in',
    72,
    'suspected',
    'Tên xuất hiện trong danh sách diễn giả phụ sự kiện',
  ),
  mkRel(
    personAlex.id,
    userGithub.id,
    'uses',
    90,
    'confirmed',
    'Bio GitHub liên kết trực tiếp tới LinkedIn cá nhân',
  ),
  mkRel(
    ipAustin.id,
    addrAustin.id,
    'associated_with',
    50,
    'suspected',
    'IP dân dụng cùng khu vực địa lý với địa chỉ nghi vấn',
  ),
];

const idsForSession = (sid: string) =>
  INITIAL_ENTITIES.filter((e) => e.sessionId === sid).map((e) => e.id);

const INITIAL_SESSIONS: ReconSession[] = [
  {
    id: S1,
    query: 'Alex Mercer Whitfield',
    queryType: 'person',
    createdAt: daysAgo(6),
    status: 'completed',
    entityIds: idsForSession(S1),
    summary: 'Tra cứu danh tính, việc làm, học vấn và doanh nghiệp liên quan.',
  },
  {
    id: S2,
    query: 'alex.whitfield@gmail.com',
    queryType: 'email',
    createdAt: daysAgo(3),
    status: 'completed',
    entityIds: idsForSession(S2),
    summary: 'Reverse email lookup và đối chiếu breach database.',
  },
  {
    id: S3,
    query: 'IMG_0421.jpg',
    queryType: 'image',
    createdAt: daysAgo(1),
    status: 'completed',
    entityIds: idsForSession(S3),
    summary: 'Reverse image search và trích xuất EXIF metadata.',
  },
  {
    id: S4,
    query: '+1 (512) 555-0148',
    queryType: 'phone',
    createdAt: daysAgo(0),
    status: 'running',
    entityIds: idsForSession(S4),
    summary: 'Reverse phone lookup, đang xác minh chủ thuê bao và địa chỉ liên kết.',
  },
];

/* ============================================================================
   3. METADATA / LOOKUP MAPS
============================================================================ */

const ENTITY_META: Record<EntityType, { label: string; color: string; icon: any }> = {
  person: { label: 'Người', color: '#f472b6', icon: User },
  email: { label: 'Email', color: '#22d3ee', icon: Mail },
  phone: { label: 'Điện thoại', color: '#22d3ee', icon: Phone },
  username: { label: 'Username', color: '#a78bfa', icon: AtSign },
  address: { label: 'Địa chỉ', color: '#f5a524', icon: MapPin },
  organization: { label: 'Tổ chức', color: '#2fd66d', icon: Building2 },
  device: { label: 'Thiết bị', color: '#4c8dff', icon: Smartphone },
  image: { label: 'Hình ảnh', color: '#4c8dff', icon: ImageIcon },
  breach: { label: 'Rò rỉ', color: '#f5455c', icon: ShieldAlert },
  ip: { label: 'Địa chỉ IP', color: '#a78bfa', icon: Globe },
  domain: { label: 'Domain', color: '#2fd66d', icon: Globe },
  document: { label: 'Tài liệu', color: '#4c8dff', icon: FileText },
};

const RELATION_LABEL: Record<RelationType, string> = {
  owns: 'sở hữu',
  uses: 'sử dụng',
  same_person_as: 'nghi là cùng một người',
  family_of: 'quan hệ gia đình (suy luận)',
  colleague_of: 'đồng nghiệp',
  located_at: 'từng/đang ở tại',
  employed_by: 'làm việc tại',
  registered_to: 'đăng ký bởi',
  appears_in: 'xuất hiện trong',
  linked_device: 'liên kết thiết bị',
  associated_with: 'liên quan đến',
  breached_in: 'bị lộ trong',
};

const STATUS_META: Record<RelationStatus, { label: string; color: string }> = {
  confirmed: { label: 'Đã xác nhận', color: '#2fd66d' },
  suspected: { label: 'Nghi vấn', color: '#f5a524' },
  rejected: { label: 'Đã loại bỏ', color: '#f5455c' },
};

const QUERY_TYPE_META: Record<QueryType, { label: string; icon: any }> = {
  person: { label: 'Người (tên)', icon: User },
  email: { label: 'Email', icon: Mail },
  phone: { label: 'Điện thoại', icon: Phone },
  username: { label: 'Username', icon: AtSign },
  image: { label: 'Hình ảnh', icon: ImageIcon },
  ip: { label: 'Địa chỉ IP', icon: Globe },
  domain: { label: 'Domain', icon: Globe },
  generic: { label: 'Khác / tự do', icon: Search },
};

const confColor = (c: number) => (c >= 75 ? '#2fd66d' : c >= 45 ? '#f5a524' : '#f5455c');

/* ============================================================================
   4. SMALL SHARED UI PIECES
============================================================================ */

function ConfBar({ value }: { value: number }) {
  return (
    <span
      className="inline-flex items-center gap-2 font-mono text-[11px]"
      style={{ color: '#8b93a3' }}
    >
      <span
        className="inline-block w-14 h-1.5 rounded-full overflow-hidden"
        style={{ background: '#1c2330' }}
      >
        <span
          className="block h-full rounded-full"
          style={{ width: `${value}%`, background: confColor(value) }}
        />
      </span>
      <span style={{ color: confColor(value), fontWeight: 700 }}>{value}%</span>
    </span>
  );
}

function EntityTag({ type }: { type: EntityType }) {
  const m = ENTITY_META[type];
  const Icon = m.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10.5px] font-semibold whitespace-nowrap"
      style={{ color: m.color, background: `${m.color}1f`, border: `1px solid ${m.color}40` }}
    >
      <Icon size={11} /> {m.label}
    </span>
  );
}

function StatusPill({ status }: { status: RelationStatus }) {
  const m = STATUS_META[status];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ color: m.color, background: `${m.color}1f` }}
    >
      {status === 'confirmed' ? (
        <CheckCircle2 size={11} />
      ) : status === 'rejected' ? (
        <XCircle size={11} />
      ) : (
        <HelpCircle size={11} />
      )}
      {m.label}
    </span>
  );
}

function Toast({ msg, kind }: { msg: string; kind?: string }) {
  const border = kind === 'ok' ? '#2fd66d' : kind === 'warn' ? '#f5a524' : '#4c8dff';
  return (
    <div
      className="rounded-lg px-3.5 py-2.5 text-[11.5px] shadow-2xl min-w-[220px]"
      style={{
        background: '#131824',
        border: '1px solid #1c2330',
        borderLeft: `3px solid ${border}`,
        color: '#e8ecf3',
      }}
    >
      {msg}
    </div>
  );
}

/* ============================================================================
   5. FORCE-DIRECTED GRAPH LAYOUT (đơn giản, không phụ thuộc thư viện ngoài)
============================================================================ */

function useGraphLayout(
  nodeIds: string[],
  edges: { fromId: string; toId: string }[],
  w: number,
  h: number,
) {
  return useMemo(() => {
    const pos: Record<string, { x: number; y: number; vx: number; vy: number }> = {};
    nodeIds.forEach((id, i) => {
      const angle = (i / Math.max(1, nodeIds.length)) * Math.PI * 2;
      pos[id] = {
        x: w / 2 + Math.cos(angle) * Math.min(w, h) * 0.32,
        y: h / 2 + Math.sin(angle) * Math.min(w, h) * 0.32,
        vx: 0,
        vy: 0,
      };
    });
    const validEdges = edges.filter((e) => pos[e.fromId] && pos[e.toId]);
    for (let it = 0; it < 140; it++) {
      for (let i = 0; i < nodeIds.length; i++) {
        for (let j = i + 1; j < nodeIds.length; j++) {
          const a = pos[nodeIds[i]],
            b = pos[nodeIds[j]];
          let dx = a.x - b.x,
            dy = a.y - b.y;
          const distSq = Math.max(dx * dx + dy * dy, 1);
          const dist = Math.sqrt(distSq);
          const force = 2400 / distSq;
          dx /= dist;
          dy /= dist;
          a.vx += dx * force;
          a.vy += dy * force;
          b.vx -= dx * force;
          b.vy -= dy * force;
        }
      }
      validEdges.forEach((e) => {
        const a = pos[e.fromId],
          b = pos[e.toId];
        let dx = b.x - a.x,
          dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 130) * 0.02;
        dx /= dist;
        dy /= dist;
        a.vx += dx * force;
        a.vy += dy * force;
        b.vx -= dx * force;
        b.vy -= dy * force;
      });
      nodeIds.forEach((id) => {
        const p = pos[id];
        p.vx += (w / 2 - p.x) * 0.0012;
        p.vy += (h / 2 - p.y) * 0.0012;
        p.vx *= 0.82;
        p.vy *= 0.82;
        p.x += p.vx;
        p.y += p.vy;
        p.x = Math.max(36, Math.min(w - 36, p.x));
        p.y = Math.max(36, Math.min(h - 36, p.y));
      });
    }
    return pos;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeIds.join(','), edges.map((e) => e.fromId + '>' + e.toId).join(','), w, h]);
}

/* ============================================================================
   6. MAIN APP
============================================================================ */

export default function PhantomaPersonRecon() {
  const [entities, setEntities] = useState<ReconEntity[]>(INITIAL_ENTITIES);
  const [relationships, setRelationships] = useState<ReconRelationship[]>(INITIAL_RELATIONSHIPS);
  const [sessions, setSessions] = useState<ReconSession[]>(INITIAL_SESSIONS);

  const [activeSessionId, setActiveSessionId] = useState<string>('all');
  const [activeView, setActiveView] = useState<ViewId>('overview');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [reportSet, setReportSet] = useState<Set<string>>(new Set());

  const [typeFilter, setTypeFilter] = useState<EntityType | 'all'>('all');
  const [minConfidence, setMinConfidence] = useState(0);
  const [query, setQuery] = useState('');
  const [relStatusFilter, setRelStatusFilter] = useState<RelationStatus | 'all'>('all');
  const [sortKey, setSortKey] = useState<'type' | 'label' | 'confidence'>('confidence');
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  const [newQueryType, setNewQueryType] = useState<QueryType>('person');
  const [newQueryText, setNewQueryText] = useState('');
  const [toasts, setToasts] = useState<{ id: number; msg: string; kind?: string }[]>([]);

  const pushToast = (msg: string, kind?: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  };

  /* ---------- derived data ---------- */
  const visibleEntities = useMemo(() => {
    return entities.filter((e) => {
      if (e.hidden) return false;
      if (activeSessionId !== 'all' && e.sessionId !== activeSessionId) return false;
      if (typeFilter !== 'all' && e.type !== typeFilter) return false;
      if (e.confidence < minConfidence) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        const hay = (
          e.label +
          ' ' +
          Object.values(e.fields).join(' ') +
          ' ' +
          e.tags.join(' ')
        ).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [entities, activeSessionId, typeFilter, minConfidence, query]);

  const visibleIds = useMemo(() => new Set(visibleEntities.map((e) => e.id)), [visibleEntities]);

  const visibleRelationships = useMemo(() => {
    return relationships.filter((r) => {
      if (!visibleIds.has(r.fromId) || !visibleIds.has(r.toId)) return false;
      if (relStatusFilter !== 'all' && r.status !== relStatusFilter) return false;
      return true;
    });
  }, [relationships, visibleIds, relStatusFilter]);

  const sortedTableRows = useMemo(() => {
    const rows = [...visibleEntities];
    rows.sort((a, b) => {
      let r = 0;
      if (sortKey === 'type') r = a.type.localeCompare(b.type);
      else if (sortKey === 'label') r = a.label.localeCompare(b.label);
      else r = a.confidence - b.confidence;
      return r * sortDir;
    });
    return rows;
  }, [visibleEntities, sortKey, sortDir]);

  const entityById = useMemo(() => Object.fromEntries(entities.map((e) => [e.id, e])), [entities]);

  const stats = useMemo(() => {
    const totalSources = entities.reduce((s, e) => s + e.sources.length, 0);
    const avgConf = entities.length
      ? Math.round(entities.reduce((s, e) => s + e.confidence, 0) / entities.length)
      : 0;
    const suspected = relationships.filter((r) => r.status === 'suspected').length;
    const breaches = entities.filter((e) => e.type === 'breach').length;
    const flagged = entities.filter((e) => e.flagged).length;
    return {
      totalEntities: entities.length,
      totalSources,
      avgConf,
      suspected,
      breaches,
      flagged,
      totalRels: relationships.length,
    };
  }, [entities, relationships]);

  const typeBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    entities
      .filter((e) => !e.hidden)
      .forEach((e) => {
        map[e.type] = (map[e.type] || 0) + 1;
      });
    return map;
  }, [entities]);

  /* ---------- actions ---------- */
  const toggleReport = (id: string) => {
    setReportSet((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleFlag = (id: string) => {
    setEntities((es) => es.map((e) => (e.id === id ? { ...e, flagged: !e.flagged } : e)));
  };

  const hideEntity = (id: string) => {
    setEntities((es) => es.map((e) => (e.id === id ? { ...e, hidden: true } : e)));
    pushToast('Đã ẩn khỏi hồ sơ. Có thể khôi phục trong danh sách entity đã ẩn.', 'warn');
  };

  const setRelStatus = (relId: string, status: RelationStatus) => {
    setRelationships((rs) => rs.map((r) => (r.id === relId ? { ...r, status } : r)));
    pushToast(
      status === 'confirmed'
        ? 'Đã xác nhận mối quan hệ.'
        : status === 'rejected'
          ? 'Đã loại bỏ mối quan hệ.'
          : 'Đã cập nhật trạng thái.',
      'ok',
    );
  };

  const setRelConfidence = (relId: string, conf: number) => {
    setRelationships((rs) => rs.map((r) => (r.id === relId ? { ...r, confidence: conf } : r)));
  };

  const deleteRel = (relId: string) => {
    setRelationships((rs) => rs.filter((r) => r.id !== relId));
    pushToast('Đã xoá mối quan hệ.', 'warn');
  };

  const runNewSession = () => {
    if (!newQueryText.trim()) {
      pushToast('Nhập nội dung cần tra cứu trước đã.', 'warn');
      return;
    }
    const sid = uid('s');
    const session: ReconSession = {
      id: sid,
      query: newQueryText.trim(),
      queryType: newQueryType,
      createdAt: daysAgo(0),
      status: 'running',
      entityIds: [],
      summary: 'Đang thu thập dữ liệu từ các nguồn công khai...',
    };
    setSessions((ss) => [session, ...ss]);
    setActiveSessionId(sid);
    pushToast(`Đã khởi tạo phiên quét: "${newQueryText.trim()}"`, 'ok');
    setNewQueryText('');
    setTimeout(() => {
      const found = mkEntity(
        newQueryType === 'person'
          ? 'person'
          : newQueryType === 'email'
            ? 'email'
            : newQueryType === 'phone'
              ? 'phone'
              : newQueryType === 'username'
                ? 'username'
                : newQueryType === 'image'
                  ? 'image'
                  : newQueryType === 'ip'
                    ? 'ip'
                    : newQueryType === 'domain'
                      ? 'domain'
                      : 'document',
        session.query,
        { 'Ghi chú': 'Kết quả sơ bộ, cần đối chiếu thêm nguồn' },
        55,
        sid,
        [src('Tìm kiếm tự động (mock)', 55, 0)],
        ['kết quả sơ bộ'],
        0,
      );
      setEntities((es) => [found, ...es]);
      setSessions((ss) =>
        ss.map((s) =>
          s.id === sid
            ? {
                ...s,
                status: 'completed',
                entityIds: [found.id],
                summary:
                  'Hoàn tất — tìm thấy 1 điểm dữ liệu sơ bộ, cần điều tra viên xác minh thêm.',
              }
            : s,
        ),
      );
      pushToast('Phiên quét hoàn tất — có 1 phát hiện mới cần xác minh.', 'ok');
    }, 1600);
  };

  const reportEntities = useMemo(
    () => entities.filter((e) => reportSet.has(e.id)),
    [entities, reportSet],
  );
  const reportRelationships = useMemo(
    () => relationships.filter((r) => reportSet.has(r.fromId) && reportSet.has(r.toId)),
    [relationships, reportSet],
  );
  const reportText = useMemo(() => {
    if (!reportEntities.length) return '(Chưa có entity nào trong giỏ báo cáo)';
    const lines: string[] = ['# BÁO CÁO RECON', `Xuất lúc: ${daysAgo(0)}`, ''];
    (Object.keys(ENTITY_META) as EntityType[]).forEach((t) => {
      const items = reportEntities.filter((e) => e.type === t);
      if (!items.length) return;
      lines.push(`## ${ENTITY_META[t].label} (${items.length})`);
      items.forEach((e) => {
        lines.push(`- ${e.label} — tin cậy ${e.confidence}% — ${e.sources.length} nguồn`);
        Object.entries(e.fields).forEach(([k, v]) => lines.push(`   · ${k}: ${v}`));
      });
      lines.push('');
    });
    if (reportRelationships.length) {
      lines.push(`## Mối quan hệ liên quan (${reportRelationships.length})`);
      reportRelationships.forEach((r) => {
        lines.push(
          `- ${entityById[r.fromId]?.label} —[${RELATION_LABEL[r.type]}, ${r.confidence}%, ${STATUS_META[r.status].label}]→ ${entityById[r.toId]?.label}`,
        );
        lines.push(`   · Bằng chứng: ${r.evidence}`);
      });
    }
    return lines.join('\n');
  }, [reportEntities, reportRelationships, entityById]);

  const copyReport = () => {
    if (navigator?.clipboard) navigator.clipboard.writeText(reportText).catch(() => {});
    pushToast('Đã sao chép nội dung báo cáo.', 'ok');
  };

  /* ---------- graph layout ---------- */
  const graphW = 760,
    graphH = 440;
  const graphNodeIds = visibleEntities.map((e) => e.id);
  const graphLayout = useGraphLayout(
    graphNodeIds,
    visibleRelationships.map((r) => ({ fromId: r.fromId, toId: r.toId })),
    graphW,
    graphH,
  );

  const tabs: { id: ViewId; label: string; icon: any }[] = [
    { id: 'overview', label: 'Tổng quan', icon: LayoutGrid },
    { id: 'graph', label: 'Sơ đồ liên kết', icon: Network },
    { id: 'table', label: 'Bảng dữ liệu', icon: Table2 },
    { id: 'relationships', label: 'Quan hệ', icon: Link2 },
    { id: 'report', label: 'Báo cáo', icon: ClipboardList },
  ];

  /* ============================== RENDER ============================== */
  return (
    <div
      className="h-screen w-full flex flex-col overflow-hidden"
      style={{
        background: '#080a0f',
        color: '#e8ecf3',
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: 13,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        ::-webkit-scrollbar{width:8px;height:8px}
        ::-webkit-scrollbar-thumb{background:#232b3a;border-radius:8px}
        .disp{font-family:'Syne',sans-serif}
      `}</style>

      {/* TOP BAR */}
      <div
        className="flex items-center gap-4 px-4 h-14 shrink-0"
        style={{ background: '#0c0f16', borderBottom: '1px solid #1c2330' }}
      >
        <div className="disp font-extrabold text-[14px] tracking-wide flex items-center gap-2">
          <span
            className="w-[18px] h-[18px] rounded-[4px] flex items-center justify-center text-[10px] text-white"
            style={{ background: 'linear-gradient(135deg,#4c8dff,#a78bfa)' }}
          >
            ◆
          </span>
          PHANTOMA{' '}
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded"
            style={{ color: '#4d5566', background: '#131824', border: '1px solid #1c2330' }}
          >
            RECON · 3.0
          </span>
        </div>
        <div className="flex items-center gap-2 text-[12px]" style={{ color: '#8b93a3' }}>
          <span>Universal Recon</span>
          <ChevronRight size={12} className="opacity-50" />
          <b style={{ color: '#e8ecf3' }}>Entity Graph</b>
        </div>

        <div
          className="flex-1 flex items-center gap-2 max-w-xl rounded-lg px-2.5 py-1.5"
          style={{ background: '#0f131b', border: '1px solid #1c2330' }}
        >
          <Search size={13} style={{ color: '#4d5566' }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Lọc entity theo giá trị / trường / tag..."
            className="flex-1 bg-transparent outline-none text-[12px]"
            style={{ color: '#e8ecf3' }}
          />
          {query && (
            <X
              size={13}
              className="cursor-pointer"
              style={{ color: '#4d5566' }}
              onClick={() => setQuery('')}
            />
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <select
            value={newQueryType}
            onChange={(e) => setNewQueryType(e.target.value as QueryType)}
            className="text-[11.5px] rounded-md px-2 py-1.5 outline-none"
            style={{ background: '#0f131b', border: '1px solid #1c2330', color: '#e8ecf3' }}
          >
            {(Object.keys(QUERY_TYPE_META) as QueryType[]).map((k) => (
              <option key={k} value={k}>
                {QUERY_TYPE_META[k].label}
              </option>
            ))}
          </select>
          <input
            value={newQueryText}
            onChange={(e) => setNewQueryText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runNewSession()}
            placeholder="VD: email, SĐT, tên, IP, link ảnh..."
            style={{
              background: '#0f131b',
              border: '1px solid #1c2330',
              color: '#e8ecf3',
              width: 220,
            }}
            className="text-[11.5px] rounded-md px-2.5 py-1.5 outline-none"
          />
          <button
            onClick={runNewSession}
            className="flex items-center gap-1.5 text-[11.5px] font-semibold rounded-md px-3 py-1.5 text-white"
            style={{ background: '#4c8dff' }}
          >
            <Plus size={13} /> Bắt đầu quét
          </button>
        </div>
      </div>

      <div
        className="flex-1 grid overflow-hidden"
        style={{ gridTemplateColumns: '260px 1fr' }}
      >
        {/* SIDEBAR: SESSION HISTORY */}
        <div
          className="flex flex-col overflow-hidden"
          style={{ background: '#0c0f16', borderRight: '1px solid #1c2330' }}
        >
          <div className="px-3.5 pt-3.5 pb-2 flex items-center justify-between">
            <div
              className="disp font-bold text-[11.5px] tracking-wide uppercase flex items-center gap-1.5"
              style={{ color: '#e8ecf3' }}
            >
              <History size={13} /> Lịch sử phiên
            </div>
          </div>
          <div className="px-3.5 pb-2">
            <div
              onClick={() => setActiveSessionId('all')}
              className="rounded-md px-2.5 py-2 mb-1.5 cursor-pointer text-[11.5px] font-semibold"
              style={{
                background: activeSessionId === 'all' ? '#131824' : 'transparent',
                color: activeSessionId === 'all' ? '#4c8dff' : '#8b93a3',
                border: activeSessionId === 'all' ? '1px solid #2c3f66' : '1px solid transparent',
              }}
            >
              Tất cả phiên ({entities.filter((e) => !e.hidden).length} entity)
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-2.5 pb-3">
            {sessions.map((s) => {
              const M = QUERY_TYPE_META[s.queryType];
              const active = activeSessionId === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => setActiveSessionId(s.id)}
                  className="rounded-lg px-2.5 py-2.5 mb-1.5 cursor-pointer"
                  style={{
                    background: active ? '#131824' : 'transparent',
                    borderLeft: active ? '2px solid #4c8dff' : '2px solid transparent',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                      style={{
                        background: '#161d2b',
                        border: '1px solid #1c2330',
                        color: '#8b93a3',
                      }}
                    >
                      <M.icon size={13} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div
                        className="text-[11.5px] font-semibold truncate"
                        style={{ color: '#e8ecf3' }}
                      >
                        {s.query}
                      </div>
                      <div className="text-[10px] truncate" style={{ color: '#4d5566' }}>
                        {M.label} · {s.createdAt}
                      </div>
                    </div>
                    {s.status === 'running' ? (
                      <Loader2
                        size={12}
                        className="animate-spin shrink-0"
                        style={{ color: '#f5a524' }}
                      />
                    ) : (
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
                        style={{ color: '#2fd66d', background: 'rgba(47,214,109,0.12)' }}
                      >
                        {s.entityIds.length}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div
            className="px-3.5 py-2.5 text-[10px] flex justify-between"
            style={{ borderTop: '1px solid #1c2330', color: '#4d5566' }}
          >
            <span>{sessions.length} phiên</span>
            <span>{sessions.filter((s) => s.status === 'running').length} đang chạy</span>
          </div>
        </div>

        {/* MAIN */}
        <div className="flex flex-col overflow-hidden">
          <div
            className="flex items-center gap-1 px-4 pt-3"
            style={{ borderBottom: '1px solid #1c2330' }}
          >
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = activeView === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => setActiveView(t.id)}
                  className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium cursor-pointer"
                  style={{
                    color: active ? '#e8ecf3' : '#8b93a3',
                    borderBottom: active ? '2px solid #4c8dff' : '2px solid transparent',
                  }}
                >
                  <Icon size={13} /> {t.label}
                </div>
              );
            })}
          </div>

          {/* filter row (shared by graph/table/relationships) */}
          {activeView !== 'overview' && activeView !== 'report' && (
            <div
              className="flex items-center gap-2 px-4 py-2.5 flex-wrap"
              style={{ background: '#0c0f16', borderBottom: '1px solid #161c27' }}
            >
              <div
                onClick={() => setTypeFilter('all')}
                className="text-[11px] px-2.5 py-1 rounded-md cursor-pointer font-medium"
                style={{
                  background: typeFilter === 'all' ? 'rgba(76,141,255,0.12)' : '#0f131b',
                  color: typeFilter === 'all' ? '#4c8dff' : '#8b93a3',
                  border: '1px solid #1c2330',
                }}
              >
                Tất cả loại
              </div>
              {(Object.keys(ENTITY_META) as EntityType[]).map((t) => (
                <div
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className="text-[11px] px-2.5 py-1 rounded-md cursor-pointer font-medium"
                  style={{
                    background: typeFilter === t ? `${ENTITY_META[t].color}1f` : '#0f131b',
                    color: typeFilter === t ? ENTITY_META[t].color : '#8b93a3',
                    border: '1px solid #1c2330',
                  }}
                >
                  {ENTITY_META[t].label}{' '}
                  <span style={{ opacity: 0.6 }}>{typeBreakdown[t] || 0}</span>
                </div>
              ))}
              <div
                className="flex items-center gap-2 ml-auto text-[10.5px]"
                style={{ color: '#4d5566' }}
              >
                <Filter size={12} /> Tin cậy tối thiểu
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(Number(e.target.value))}
                />
                <span style={{ color: '#8b93a3' }}>{minConfidence}%</span>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-5">
            {/* ============ OVERVIEW ============ */}
            {activeView === 'overview' && (
              <div>
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[
                    {
                      label: 'Entity',
                      value: stats.totalEntities,
                      color: '#4c8dff',
                      sub: `từ ${stats.totalSources} nguồn`,
                    },
                    {
                      label: 'Mối quan hệ',
                      value: stats.totalRels,
                      color: '#a78bfa',
                      sub: `${stats.suspected} đang nghi vấn`,
                    },
                    {
                      label: 'Độ tin cậy TB',
                      value: stats.avgConf + '%',
                      color: confColor(stats.avgConf),
                      sub: 'trên toàn bộ entity',
                    },
                    {
                      label: 'Rò rỉ / cờ đỏ',
                      value: stats.breaches + stats.flagged,
                      color: '#f5455c',
                      sub: `${stats.breaches} breach · ${stats.flagged} đã đánh dấu`,
                    },
                  ].map((c) => (
                    <div
                      key={c.label}
                      className="rounded-lg p-4"
                      style={{ background: '#0f131b', border: '1px solid #1c2330' }}
                    >
                      <div
                        className="text-[10px] uppercase tracking-wide font-semibold mb-2"
                        style={{ color: '#4d5566' }}
                      >
                        {c.label}
                      </div>
                      <div className="disp text-[24px] font-bold" style={{ color: c.color }}>
                        {c.value}
                      </div>
                      <div className="text-[10.5px] mt-1.5" style={{ color: '#4d5566' }}>
                        {c.sub}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div
                    className="rounded-lg p-4"
                    style={{ background: '#0f131b', border: '1px solid #1c2330' }}
                  >
                    <div className="disp font-bold text-[11px] uppercase tracking-wide mb-3">
                      Phân bổ theo loại entity
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(Object.keys(ENTITY_META) as EntityType[]).map((t) =>
                        typeBreakdown[t] ? (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold"
                            style={{
                              color: ENTITY_META[t].color,
                              background: `${ENTITY_META[t].color}1f`,
                            }}
                          >
                            {ENTITY_META[t].label}{' '}
                            <span style={{ opacity: 0.6, fontWeight: 500 }}>
                              {typeBreakdown[t]}
                            </span>
                          </span>
                        ) : null,
                      )}
                    </div>
                  </div>
                  <div
                    className="rounded-lg p-4"
                    style={{ background: '#0f131b', border: '1px solid #1c2330' }}
                  >
                    <div className="disp font-bold text-[11px] uppercase tracking-wide mb-3">
                      Quan hệ cần xem xét (nghi vấn)
                    </div>
                    <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto">
                      {relationships
                        .filter((r) => r.status === 'suspected')
                        .slice(0, 8)
                        .map((r) => (
                          <div
                            key={r.id}
                            className="flex items-center gap-2 text-[11.5px] py-1.5"
                            style={{ borderBottom: '1px solid #161c27' }}
                          >
                            <HelpCircle
                              size={13}
                              style={{ color: '#f5a524' }}
                              className="shrink-0"
                            />
                            <span className="truncate" style={{ color: '#8b93a3' }}>
                              <b style={{ color: '#e8ecf3' }}>{entityById[r.fromId]?.label}</b>{' '}
                              {RELATION_LABEL[r.type]}{' '}
                              <b style={{ color: '#e8ecf3' }}>{entityById[r.toId]?.label}</b>
                            </span>
                            <span className="ml-auto shrink-0">
                              <ConfBar value={r.confidence} />
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                <div
                  className="rounded-lg p-4 mt-4"
                  style={{ background: '#0f131b', border: '1px solid #1c2330' }}
                >
                  <div className="disp font-bold text-[11px] uppercase tracking-wide mb-3">
                    Phiên gần đây
                  </div>
                  {sessions.map((s) => {
                    const M = QUERY_TYPE_META[s.queryType];
                    return (
                      <div
                        key={s.id}
                        className="flex items-center gap-3 py-2"
                        style={{ borderBottom: '1px solid #161c27' }}
                      >
                        <M.icon size={14} style={{ color: '#8b93a3' }} />
                        <span className="text-[12px] font-semibold" style={{ color: '#e8ecf3' }}>
                          {s.query}
                        </span>
                        <span className="text-[10.5px]" style={{ color: '#4d5566' }}>
                          {s.summary}
                        </span>
                        <span className="ml-auto text-[10px]" style={{ color: '#4d5566' }}>
                          {s.createdAt}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ============ GRAPH ============ */}
            {activeView === 'graph' && (
              <div
                className="rounded-lg p-3"
                style={{ background: '#0f131b', border: '1px solid #1c2330' }}
              >
                <svg viewBox={`0 0 ${graphW} ${graphH}`} width="100%" height={440}>
                  {visibleRelationships.map((r) => {
                    const a = graphLayout[r.fromId],
                      b = graphLayout[r.toId];
                    if (!a || !b) return null;
                    const dashed = r.status !== 'confirmed';
                    return (
                      <line
                        key={r.id}
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        stroke={r.status === 'rejected' ? '#3a2530' : STATUS_META[r.status].color}
                        strokeOpacity={0.15 + (r.confidence / 100) * 0.5}
                        strokeWidth={1 + r.confidence / 40}
                        strokeDasharray={dashed ? '4,3' : undefined}
                      />
                    );
                  })}
                  {visibleEntities.map((e) => {
                    const p = graphLayout[e.id];
                    if (!p) return null;
                    const m = ENTITY_META[e.type];
                    const r = e.type === 'person' ? 12 : 8;
                    return (
                      <g
                        key={e.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedEntityId(e.id)}
                      >
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={r}
                          fill={m.color}
                          fillOpacity={0.9}
                          stroke={selectedEntityId === e.id ? '#fff' : 'none'}
                          strokeWidth={1.5}
                        />
                        <text
                          x={p.x}
                          y={p.y + r + 11}
                          textAnchor="middle"
                          fontSize={9}
                          fontFamily="JetBrains Mono"
                          fill="#8b93a3"
                        >
                          {e.label.length > 22 ? e.label.slice(0, 20) + '…' : e.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
                <div
                  className="flex items-center gap-4 px-2 pb-1 flex-wrap text-[10.5px]"
                  style={{ color: '#4d5566' }}
                >
                  {(Object.keys(ENTITY_META) as EntityType[]).map((t) => (
                    <span key={t} className="flex items-center gap-1.5">
                      <i
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ background: ENTITY_META[t].color }}
                      />
                      {ENTITY_META[t].label}
                    </span>
                  ))}
                  <span className="ml-auto">
                    nét liền = đã xác nhận · nét đứt = nghi vấn/loại bỏ
                  </span>
                </div>
              </div>
            )}

            {/* ============ TABLE ============ */}
            {activeView === 'table' && (
              <div
                className="rounded-lg overflow-hidden"
                style={{ background: '#0f131b', border: '1px solid #1c2330' }}
              >
                <table className="w-full text-[11.5px]" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#131824' }}>
                      {[
                        ['type', 'Loại'],
                        ['label', 'Nhãn / giá trị'],
                        ['confidence', 'Tin cậy'],
                      ].map(([key, label]) => (
                        <th
                          key={key}
                          onClick={() => {
                            setSortKey(key as any);
                            setSortDir((d) => (sortKey === key ? ((d * -1) as 1 | -1) : -1));
                          }}
                          className="text-left px-3 py-2.5 font-semibold uppercase text-[10px] cursor-pointer select-none"
                          style={{ color: '#4d5566' }}
                        >
                          {label} <ArrowUpDown size={9} className="inline ml-1 opacity-50" />
                        </th>
                      ))}
                      <th
                        className="text-left px-3 py-2.5 font-semibold uppercase text-[10px]"
                        style={{ color: '#4d5566' }}
                      >
                        Nguồn
                      </th>
                      <th
                        className="text-left px-3 py-2.5 font-semibold uppercase text-[10px]"
                        style={{ color: '#4d5566' }}
                      >
                        Phiên
                      </th>
                      <th
                        className="text-left px-3 py-2.5 font-semibold uppercase text-[10px]"
                        style={{ color: '#4d5566' }}
                      >
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTableRows.map((e) => {
                      const sess = sessions.find((s) => s.id === e.sessionId);
                      const inReport = reportSet.has(e.id);
                      return (
                        <tr key={e.id} style={{ borderTop: '1px solid #161c27' }}>
                          <td className="px-3 py-2.5">
                            <EntityTag type={e.type} />
                          </td>
                          <td
                            className="px-3 py-2.5 cursor-pointer"
                            onClick={() => setSelectedEntityId(e.id)}
                          >
                            <div className="font-semibold" style={{ color: '#e8ecf3' }}>
                              {e.label}
                              {e.flagged && (
                                <Flag
                                  size={11}
                                  className="inline ml-1.5"
                                  style={{ color: '#f5455c' }}
                                />
                              )}
                            </div>
                            {e.tags.length > 0 && (
                              <div className="text-[10px] mt-0.5" style={{ color: '#4d5566' }}>
                                {e.tags.join(' · ')}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <ConfBar value={e.confidence} />
                          </td>
                          <td className="px-3 py-2.5" style={{ color: '#8b93a3' }}>
                            {e.sources.length} nguồn
                          </td>
                          <td className="px-3 py-2.5" style={{ color: '#8b93a3' }}>
                            {sess?.query || '—'}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => toggleReport(e.id)}
                                className="text-[10px] font-semibold px-2 py-1 rounded"
                                style={{
                                  background: inReport ? 'rgba(47,214,109,0.15)' : '#161d2b',
                                  color: inReport ? '#2fd66d' : '#8b93a3',
                                }}
                              >
                                {inReport ? '✓ Trong báo cáo' : '+ Báo cáo'}
                              </button>
                              <Flag
                                size={13}
                                className="cursor-pointer"
                                style={{ color: e.flagged ? '#f5455c' : '#4d5566' }}
                                onClick={() => toggleFlag(e.id)}
                              />
                              <EyeOff
                                size={13}
                                className="cursor-pointer"
                                style={{ color: '#4d5566' }}
                                onClick={() => hideEntity(e.id)}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {sortedTableRows.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-8" style={{ color: '#4d5566' }}>
                          Không có entity khớp bộ lọc hiện tại.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* ============ RELATIONSHIPS ============ */}
            {activeView === 'relationships' && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  {(['all', 'confirmed', 'suspected', 'rejected'] as const).map((s) => (
                    <div
                      key={s}
                      onClick={() => setRelStatusFilter(s)}
                      className="text-[11px] px-2.5 py-1 rounded-md cursor-pointer font-medium"
                      style={{
                        background: relStatusFilter === s ? '#131824' : '#0f131b',
                        color: relStatusFilter === s ? '#e8ecf3' : '#8b93a3',
                        border: '1px solid #1c2330',
                      }}
                    >
                      {s === 'all' ? 'Tất cả trạng thái' : STATUS_META[s].label}
                    </div>
                  ))}
                </div>
                <div
                  className="rounded-lg overflow-hidden"
                  style={{ background: '#0f131b', border: '1px solid #1c2330' }}
                >
                  {visibleRelationships.map((r) => (
                    <div
                      key={r.id}
                      className="px-4 py-3 flex items-start gap-3"
                      style={{ borderBottom: '1px solid #161c27' }}
                    >
                      <Link2 size={14} className="mt-0.5 shrink-0" style={{ color: '#4d5566' }} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px]" style={{ color: '#8b93a3' }}>
                          <b
                            style={{ color: '#e8ecf3', cursor: 'pointer' }}
                            onClick={() => setSelectedEntityId(r.fromId)}
                          >
                            {entityById[r.fromId]?.label}
                          </b>{' '}
                          <span style={{ color: '#a78bfa' }}>{RELATION_LABEL[r.type]}</span>{' '}
                          <b
                            style={{ color: '#e8ecf3', cursor: 'pointer' }}
                            onClick={() => setSelectedEntityId(r.toId)}
                          >
                            {entityById[r.toId]?.label}
                          </b>
                        </div>
                        <div className="text-[10.5px] mt-1" style={{ color: '#4d5566' }}>
                          {r.evidence}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <StatusPill status={r.status} />
                          <ConfBar value={r.confidence} />
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={r.confidence}
                            onChange={(e) => setRelConfidence(r.id, Number(e.target.value))}
                            className="w-20"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {r.status !== 'confirmed' && (
                          <button
                            onClick={() => setRelStatus(r.id, 'confirmed')}
                            className="text-[10px] font-semibold px-2 py-1 rounded"
                            style={{ background: 'rgba(47,214,109,0.15)', color: '#2fd66d' }}
                          >
                            Xác nhận
                          </button>
                        )}
                        {r.status !== 'rejected' && (
                          <button
                            onClick={() => setRelStatus(r.id, 'rejected')}
                            className="text-[10px] font-semibold px-2 py-1 rounded"
                            style={{ background: 'rgba(245,69,92,0.15)', color: '#f5455c' }}
                          >
                            Loại bỏ
                          </button>
                        )}
                        <Trash2
                          size={13}
                          className="cursor-pointer"
                          style={{ color: '#4d5566' }}
                          onClick={() => deleteRel(r.id)}
                        />
                      </div>
                    </div>
                  ))}
                  {visibleRelationships.length === 0 && (
                    <div className="text-center py-8" style={{ color: '#4d5566' }}>
                      Không có mối quan hệ nào khớp bộ lọc.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============ REPORT BUILDER ============ */}
            {activeView === 'report' && (
              <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1.2fr' }}>
                <div>
                  <div className="disp font-bold text-[11px] uppercase tracking-wide mb-2">
                    Entity đã chọn ({reportEntities.length})
                  </div>
                  <div
                    className="rounded-lg overflow-hidden"
                    style={{ background: '#0f131b', border: '1px solid #1c2330' }}
                  >
                    {reportEntities.length === 0 && (
                      <div className="text-center py-8 text-[11.5px]" style={{ color: '#4d5566' }}>
                        Chưa chọn entity nào. Vào tab Bảng dữ liệu và bấm "+ Báo cáo" trên từng
                        dòng.
                      </div>
                    )}
                    {reportEntities.map((e) => (
                      <div
                        key={e.id}
                        className="flex items-center gap-2.5 px-3.5 py-2.5"
                        style={{ borderBottom: '1px solid #161c27' }}
                      >
                        <EntityTag type={e.type} />
                        <span
                          className="text-[11.5px] font-medium truncate flex-1"
                          style={{ color: '#e8ecf3' }}
                        >
                          {e.label}
                        </span>
                        <ConfBar value={e.confidence} />
                        <X
                          size={13}
                          className="cursor-pointer shrink-0"
                          style={{ color: '#4d5566' }}
                          onClick={() => toggleReport(e.id)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="disp font-bold text-[11px] uppercase tracking-wide">
                      Xem trước báo cáo
                    </div>
                    <button
                      onClick={copyReport}
                      className="flex items-center gap-1.5 text-[10.5px] font-semibold px-2.5 py-1.5 rounded"
                      style={{
                        background: '#161d2b',
                        color: '#e8ecf3',
                        border: '1px solid #1c2330',
                      }}
                    >
                      <Copy size={12} /> Sao chép
                    </button>
                  </div>
                  <pre
                    className="rounded-lg p-4 text-[11px] whitespace-pre-wrap overflow-y-auto"
                    style={{
                      background: '#0f131b',
                      border: '1px solid #1c2330',
                      color: '#8b93a3',
                      maxHeight: 460,
                    }}
                  >
                    {reportText}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
        {toasts.map((t) => (
          <Toast key={t.id} msg={t.msg} kind={t.kind} />
        ))}
      </div>
    </div>
  );
}

/* AddRelInline đã được xóa cùng panel "Chi tiết Entity". */
