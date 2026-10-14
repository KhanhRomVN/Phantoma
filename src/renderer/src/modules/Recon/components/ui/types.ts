// --- ReconUI Lego Types ---

export type UiType =
  | 'kv'
  | 'table'
  | 'badges'
  | 'accordion'
  | 'stats'
  | 'timeline'
  | 'checklist'
  | 'graph'
  | 'code'
  | 'markdown'
  | 'callout'
  | 'sticky'
  | 'quote'
  | 'annotation'
  | 'files'
  | 'map'
  | 'donut'
  | 'barline'
  | 'stat'
  | 'tags'
  | 'pin'
  | 'heatmap'
  | 'diff';

export interface BoxConfig {
  w: number; // width in grid cells (1-10)
  maxH?: number; // chiều cao tối đa theo hàng grid (không áp dụng cho graph/map: h = w); bỏ trống = theo nội dung

  ui: UiType;
  x?: number; // cột bắt đầu (1-10); bỏ trống = tự xếp
  y?: number; // hàng bắt đầu (>= 1); bỏ trống = tự xếp
  id?: string;
  icon?: string; // tên icon lucide-react cho tiêu đề box
  desc?: string; // mô tả ngắn dưới tiêu đề box
  options?: Record<string, any>; // specific options like cols=2, sortable=true
}

export interface MetaData {
  type?: string; // [email], [date]...
  src?: string[]; // {src=S-001,S-002}
  conf?: number; // {conf=0.85}
  tone?: 'ok' | 'warn' | 'danger' | 'info' | 'neutral'; // {tone=...}
}

// Raw parsed data before UI-specific processing
export interface ParsedSection {
  label: string;
  box: BoxConfig;
  rawBody: string;
  warnings: string[];
}

// Specific Data Structures for each UI Type
export interface KvItem {
  key: string;
  value: string;
  meta: MetaData;
}

export interface TableData {
  headers: string[];
  rows: string[][];
  columnTypes: (string | undefined)[]; // from header suffix :type
  cellColors: (string | undefined)[][]; // id màu theo từng ô, từ {color=id}
  columnSortable: boolean[]; // cột có hậu tố :sort ở header
}

export interface BadgeItem {
  text: string;
  tone?: string;
}

export interface AccordionItem {
  title: string;
  content: ParsedSection[]; // Nested sections or raw text handled recursively/simply
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  url?: string; // tuỳ chọn: dùng để hiện favicon (getFaviconUrl)
}

export interface GraphEdge {
  from: string;
  to: string;
  label: string;
  confidence?: number;
}

export interface TimelineEvent {
  date: string;
  title: string;
  note?: string;
  tone?: string;
  current: boolean;
  color?: string; // id màu trong constants/colors.ts; ghi đè màu mặc định (cam/tím) của node
}

export interface ChecklistItem {
  checked: boolean;
  text: string;
  children?: ChecklistItem[]; // sub-checklist (1 cấp), viết thụt lề dưới mục cha
}

export interface LinkItem {
  label: string;
  url: string;
  note?: string;
}

// Union type for processed section data
export type SectionData =
  | { type: 'kv'; items: KvItem[] }
  | { type: 'table'; data: TableData }
  | { type: 'badges'; items: BadgeItem[] }
  | { type: 'accordion'; items: AccordionItem[] }
  | { type: 'text'; content: string }
  | { type: 'stats'; items: KvItem[] } // Reuse KvItem structure for simplicity
  | { type: 'timeline'; events: TimelineEvent[] }
  | { type: 'checklist'; items: ChecklistItem[] }
  | { type: 'links'; items: LinkItem[] }
  | { type: 'graph'; nodes: GraphNode[]; edges: GraphEdge[] }
  | { type: 'code'; content: string }
  | { type: 'markdown'; content: string }
  | { type: 'callout'; items: CalloutItem[] }
  | { type: 'sticky'; items: StickyItem[] }
  | { type: 'quote'; items: QuoteItem[] }
  | { type: 'annotation'; items: AnnotationItem[] }
  | { type: 'files' }
  | { type: 'map'; locations: MapLocation[]; regions?: MapRegion[] }
  | { type: 'donut'; items: DonutItem[] }
  | { type: 'barline'; items: BarLineItem[] }
  | { type: 'stat'; items: StatItem[] }
  | { type: 'tags'; groups: TagGroup[] }
  | { type: 'pin' }
  | { type: 'heatmap'; cells: HeatmapCell[] }
  | { type: 'diff'; items: DiffItem[] };

export interface StatItem {
  label: string;
  value: string;
  note?: string;
  spark?: number[]; // dãy số vẽ sparkline, phần thứ 4 của dòng
  color?: string; // id màu trong constants/colors.ts
  tone?: string; // ok | warn | danger | info | neutral
  icon?: string; // tên icon lucide-react
  src?: string[];
}

export interface TagItem {
  value: string;
  type?: string; // [phone], [email]...
  color?: string;
  src?: string[];
}

export interface TagGroup {
  title: string;
  items: TagItem[];
}

export interface HeatmapCell {
  row: string; // nhãn hàng, vd Mon
  col: number; // cột, vd giờ 0-23
  value: number;
}

export interface DiffItem {
  date: string;
  field: string;
  oldValue?: string; // bỏ trống = trường mới thêm
  newValue?: string; // bỏ trống = trường bị xoá
  src?: string[];
}

export interface DonutItem {
  label: string;
  value: number;
  note?: string; // chú thích căn phải dưới thanh tiến độ, vd "70 req · 86.2k"
  color?: string; // id màu trong constants/colors.ts; bỏ trống = màu mặc định theo thứ tự
}

export interface BarLineItem {
  label: string; // nhãn trục X
  bar: number; // giá trị cột (trục trái)
  line?: number; // giá trị đường (trục phải); không mục nào có = không vẽ đường
}

export interface CalloutItem {
  tone: string; // ok | warn | danger | info | neutral
  title: string;
  content: string;
  src?: string[];
  color?: string; // id màu trong constants/colors.ts; ghi đè màu theo tone cho border-left
}

export interface StickyItem {
  color?: string; // id màu trong constants/colors.ts
  text: string;
}

export interface QuoteItem {
  text: string;
  author?: string;
  src?: string[];
  color?: string; // id màu trong constants/colors.ts; bỏ trống = màu primary
}

export interface AnnotationItem {
  time: string;
  author: string;
  desc?: string; // mô tả ngắn 1 dòng dưới tên tác giả
  content: string;
  color?: string; // id màu trong constants/colors.ts
}

export interface MapLocation {
  name: string;
  latitude: number;
  longitude: number;
  meta?: MetaData;
}

export interface MapRegion {
  name: string;
  meta?: MetaData;
}

export interface RenderedBox extends ParsedSection {
  data: SectionData;
}

export interface ReconTab {
  name: string; // filename without ext
  title: string; // display name
  boxes: RenderedBox[];
}

export interface ReconTask {
  folder: string;
  title: string;
  targetType?: string; // person | website | domain | phone | company | other
  tags?: string[]; // badge ở dòng 2 của header ContentPanel
  updated?: string; // thời điểm sửa đổi gần nhất
  entityCount?: number;
  sourceCount?: number;
  status?: string;
  theme?: { preset?: string; mode?: string };
  tabs: ReconTab[];
  warnings: string[];
}
