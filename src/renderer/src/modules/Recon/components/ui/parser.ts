import type {
  BoxConfig,
  MetaData,
  ParsedSection,
  UiType,
  ReconTab,
  ReconTask,
  SectionData,
  KvItem,
  TableData,
  BadgeItem,
  AccordionItem,
  GraphNode,
  GraphEdge,
  TimelineEvent,
  ChecklistItem,
  DonutItem,
  BarLineItem,
} from './types';
import {
  parseCallout,
  parseSticky,
  parseQuote,
  parseAnnotation,
  parseMap,
  parseMapRegions,
} from './noteParsers';
import { parseStat, parseTags, parseHeatmap, parseDiff } from './insightParsers';

const KNOWN_UI_TYPES: UiType[] = [
  'kv',
  'table',
  'timeline',
  'checklist',
  'graph',
  'code',
  'markdown',
  'callout',
  'quote',
  'annotation',
  'files',
  'map',
  'donut',
  'barline',
  'stat',
  'tags',
  'pin',
  'heatmap',
  'diff',
];

/**
 * Parses a single .recon file content into structured tabs/tasks.
 * In v1, we assume one file = one tab (except _index.recon which is header/meta).
 */
export function parseReconFile(
  filename: string,
  content: string,
): { tab?: ReconTab; taskMeta?: Partial<ReconTask>; warnings: string[] } {
  const warnings: string[] = [];

  // 1. Split Frontmatter and Body
  const lines = content.split('\n');
  let fmEndIndex = -1;
  if (lines[0].trim() === '---') {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        fmEndIndex = i;
        break;
      }
    }
  }

  const frontmatterStr = fmEndIndex > 0 ? lines.slice(1, fmEndIndex).join('\n') : '';
  const bodyLines = fmEndIndex >= 0 ? lines.slice(fmEndIndex + 1) : lines;

  const frontmatter = parseSimpleYaml(frontmatterStr);

  // Check if this is the Index file (_index.recon)
  if (filename === '_index.recon') {
    // Số liệu tổng quan: đọc các dòng `entities` / `sources_used` trong body (khối kv)
    const kv = parseKv(bodyLines.join('\n'));
    const num = (key: string): number | undefined => {
      const raw = kv.find((i) => i.key === key)?.value;
      return raw && /^\d+$/.test(raw) ? parseInt(raw, 10) : undefined;
    };
    return {
      taskMeta: {
        tags:
          typeof frontmatter.tags === 'string'
            ? frontmatter.tags
                .replace(/^\[|\]$/g, '')
                .split(',')
                .map((s: string) => s.trim())
                .filter(Boolean)
            : undefined,
        updated: frontmatter.updated ? String(frontmatter.updated) : undefined,
        entityCount: num('entities'),
        sourceCount: num('sources_used'),
        title: String(frontmatter.title || ''),
        targetType: frontmatter.target_type ? String(frontmatter.target_type) : undefined,
        status: String(frontmatter.status || ''),
        theme: typeof frontmatter.theme === 'object' ? (frontmatter.theme as any) : undefined,
      },
      warnings,
    };
  }

  // Validate Tab Filename Rules (Section 2.1)
  if (!filename.startsWith('_') || !filename.endsWith('.recon')) {
    // Not a tab file, ignore or treat as entity data (handled elsewhere potentially)
    return { warnings: [`Skipped non-tab file: ${filename}`] };
  }

  const baseName = filename.replace(/^_/, '').replace(/\.recon$/, '');
  if (baseName.includes('-') || /[A-Z]/.test(baseName) || /\d/.test(baseName)) {
    warnings.push(`W-NAME: Invalid characters in tab name '${baseName}'. Skipping.`);
    return { warnings };
  }
  if (baseName.toLowerCase() === 'index') {
    warnings.push(`W-RESERVED: Tab name cannot be 'index'. Skipping.`);
    return { warnings };
  }

  // Generate Tab Title (Section 2.3)
  const generatedTitle = baseName
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  const tabTitle = String(frontmatter.title || generatedTitle);

  // 2. Parse Sections
  const sections: ParsedSection[] = [];
  let currentSection: { label: string; lines: string[] } | null = null;
  let inCodeBlock = false;

  for (const line of bodyLines) {
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
    }

    // Heading detection (# Label) - only if not in code block
    if (!inCodeBlock && /^#\s+(.+)$/.test(line)) {
      if (currentSection) {
        sections.push(
          processSection(currentSection.label, currentSection.lines.join('\n'), warnings),
        );
      }
      currentSection = { label: line.replace(/^#\s+/, '').trim(), lines: [] };
    } else if (currentSection) {
      currentSection.lines.push(line);
    }
  }

  if (currentSection) {
    sections.push(processSection(currentSection.label, currentSection.lines.join('\n'), warnings));
  }

  // Convert ParsedSections to RenderedBoxes with Data
  const boxes = sections.map((sec) => ({
    ...sec,
    data: inferAndParseUi(sec.box.ui, sec.rawBody, sec.box.options || {}),
  }));

  return {
    tab: {
      name: baseName,
      title: tabTitle,
      boxes,
    },
    warnings,
  };
}

function processSection(label: string, body: string, globalWarnings: string[]): ParsedSection {
  const lines = body.split('\n');
  let boxConfig: BoxConfig = { w: 10, ui: 'markdown' }; // Defaults

  // Find @box line
  let bodyStartIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('@box')) {
      boxConfig = parseBoxLine(trimmed, globalWarnings);
      bodyStartIdx = i + 1;
      break;
    }
    // If first non-empty line isn't @box, assume defaults but check if it's empty
    if (trimmed !== '' && !trimmed.startsWith('#')) {
      // No explicit @box found before content starts?
      // Spec says: "First non-empty line MUST be config".
      // But also "Section without @box is valid: use defaults".
      // So we just break here and keep defaults.
      break;
    }
  }

  const rawBody = lines.slice(bodyStartIdx).join('\n').trim();

  // Infer UI if not specified (or if default 'text' was used but data suggests otherwise?)
  // Actually spec says: if missing, infer. Here we defaulted to 'text'.
  // We should re-evaluate inference if the user didn't explicitly provide @box with ui=.
  // However, our parseBoxLine sets ui='text' by default.
  // Let's refine: If no @box line existed at all, we should run inference on rawBody.

  // Simplified approach for MVP:
  // If @box was present, use its ui. If not, infer based on rawBody.
  // The loop above breaks early if content starts.
  // To detect "No @box", we'd need a flag.
  // For now, assuming standard usage includes @box or relies on strict defaults.
  // Let's implement proper inference if ui is strictly default AND no @box was found?
  // Easier: Just pass through. The `inferAndParseUi` handles the parsing logic.
  // But wait, if I default to 'text', I lose the chance to auto-detect 'kv'.

  // Correction: Check if @box line was actually found.
  // Refactored logic would track `hasExplicitBox`.
  // For brevity in this step, we'll rely on explicit @box for complex types,
  // or improve `processSection` later.
  // Let's add a quick heuristic here if no @box was found (bodyStartIdx == 0 and first line wasn't @box):

  // Actually, let's just stick to: if @box exists -> use it. Else -> Default Text/KV heuristics in renderer?
  // No, Parser should resolve.

  // Let's assume for now authors WILL use @box for anything other than simple text/kv.

  return {
    label,
    box: boxConfig,
    rawBody,
    warnings: [], // Local warnings could go here
  };
}

function parseBoxLine(line: string, warnings: string[]): BoxConfig {
  const parts = ['@box', ...(line.match(/\w+=(?:"[^"]*"|\S+)/g) ?? [])];
  const config: BoxConfig = { w: 10, ui: 'markdown' };

  for (let i = 1; i < parts.length; i++) {
    const [key, valStr] = parts[i].split('=');
    if (!valStr) continue;

    switch (key) {
      case 'w':
        const w = parseInt(valStr, 10);
        if (isNaN(w) || w < 1 || w > 10) {
          warnings.push(`W-BOX-W: Width ${valStr} invalid. Clamping.`);
          config.w = Math.max(1, Math.min(10, isNaN(w) ? 10 : w));
        } else {
          config.w = w;
        }
        break;
      case 'maxh': {
        const mh = parseInt(valStr, 10);
        if (!isNaN(mh) && mh >= 1) config.maxH = mh;
        break;
      }
      case 'h':
      case 'minh':
        break;
      case 'x': {
        const x = parseInt(valStr, 10);
        if (!isNaN(x) && x >= 1 && x <= 10) config.x = x;
        break;
      }
      case 'y': {
        const y = parseInt(valStr, 10);
        if (!isNaN(y) && y >= 1) config.y = y;
        break;
      }
      case 'ui':
        if (KNOWN_UI_TYPES.includes(valStr as UiType)) {
          config.ui = valStr as UiType;
        } else {
          warnings.push(`W-UI: Unknown UI type '${valStr}'. Falling back to markdown.`);
          config.ui = 'markdown';
        }
        break;
      case 'id':
        config.id = valStr;
        break;
      case 'icon':
        config.icon = valStr;
        break;
      case 'desc':
        config.desc = valStr.replace(/^"|"$/g, '');
        break;
      default:
        // Store unknown params in options
        if (!config.options) config.options = {};
        config.options[key] = valStr;
    }
  }
  return config;
}

function parseSimpleYaml(str: string): Record<string, any> {
  const result: Record<string, any> = {};
  const lines = str.split('\n');
  let currentKey: string | null = null;
  let currentValueObj: any = null;

  for (const line of lines) {
    if (!line.trim()) continue;

    // Simple Key: Value
    const match = line.match(/^(\w[\w_]*)\s*:\s*(.*)$/);
    if (match) {
      currentKey = match[1];
      const val = match[2].trim();

      if (val === '') {
        // Might be start of object/array nesting
        currentValueObj = {};
        result[currentKey] = currentValueObj;
      } else {
        // Try parsing primitive
        if (val === 'true') result[currentKey] = true;
        else if (val === 'false') result[currentKey] = false;
        else if (/^\d+$/.test(val)) result[currentKey] = parseInt(val, 10);
        else if (/^\d+\.\d+$/.test(val)) result[currentKey] = parseFloat(val);
        else result[currentKey] = val;

        currentKey = null; // Reset
      }
    } else if (currentKey && /^\s{2,}/.test(line)) {
      // Indented continuation for objects (very basic support)
      // Assuming flat structure mostly for v1 except theme
      const subMatch = line.trim().match(/^(\w+)\s*:\s*(.*)$/);
      if (subMatch && typeof result[currentKey] === 'object') {
        (result[currentKey] as any)[subMatch[1]] = subMatch[2].trim();
      }
    }
  }
  return result;
}

// --- UI Specific Parsers ---

function inferAndParseUi(ui: UiType, body: string, _options: Record<string, any>): SectionData {
  if (!body.trim()) {
    return {
      type: ui,
      items: [],
      content: '',
      data: { headers: [], rows: [] },
      events: [],
      nodes: [],
      edges: [],
    } as any;
  }

  switch (ui) {
    case 'kv':
      return { type: 'kv', items: parseKv(body) };
    case 'table':
      return { type: 'table', data: parseTable(body) };
    case 'badges':
      return { type: 'badges', items: parseBadges(body) };
    case 'accordion':
      return { type: 'accordion', items: parseAccordion(body) };
    case 'stats':
      return { type: 'stats', items: parseKv(body) }; // Stats uses KV format internally
    case 'timeline':
      return { type: 'timeline', events: parseTimeline(body) };
    case 'checklist':
      return { type: 'checklist', items: parseChecklist(body) };

    case 'graph':
      return { type: 'graph', ...parseGraph(body) };
    case 'code':
      return { type: 'code', content: body };
    case 'markdown':
      return { type: 'markdown', content: body };

    case 'callout':
      return { type: 'callout', items: parseCallout(body) };
    case 'sticky':
      return { type: 'sticky', items: parseSticky(body) };
    case 'quote':
      return { type: 'quote', items: parseQuote(body) };
    case 'annotation':
      return { type: 'annotation', items: parseAnnotation(body) };
    case 'files':
      // Không có nội dung riêng: cấu hình đọc từ options của @box (xem configFromOptions)
      return { type: 'files' };
    case 'map':
      return { type: 'map', locations: parseMap(body), regions: parseMapRegions(body) };
    case 'donut':
      return { type: 'donut', items: parseDonut(body) };
    case 'barline':
      return { type: 'barline', items: parseBarLine(body) };
    case 'stat':
      return { type: 'stat', items: parseStat(body) };
    case 'tags':
      return { type: 'tags', groups: parseTags(body) };
    case 'pin':
      return { type: 'pin' };
    case 'heatmap':
      return { type: 'heatmap', cells: parseHeatmap(body) };
    case 'diff':
      return { type: 'diff', items: parseDiff(body) };
    default:
      return { type: 'text', content: body };
  }
}

function extractMetaData(valueStr: string): { cleanValue: string; meta: MetaData } {
  let meta: MetaData = {};
  let clean = valueStr;

  // Extract [type]
  const typeMatch = clean.match(/\[(\w+)\]/);
  if (typeMatch) {
    meta.type = typeMatch[1];
    clean = clean.replace(typeMatch[0], '').trim();
  }

  // Extract {...} blocks
  const braceMatches = [...clean.matchAll(/\{([^}]+)\}/g)];
  for (const m of braceMatches) {
    const inner = m[1];
    for (const p of inner.matchAll(/(\w+)=(?:"([^"]*)"|(\S+))/g)) {
      const k = p[1];
      const v = p[2] ?? p[3];
      if (k === 'src') meta.src = v.split(',');
      if (k === 'conf') meta.conf = parseFloat(v);
      if (k === 'tone') meta.tone = v as any;
    }
    clean = clean.replace(m[0], '').trim();
  }

  return { cleanValue: clean, meta };
}

function parseKv(body: string): KvItem[] {
  const lines = body.split('\n');
  const items: KvItem[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const key = line.substring(0, colonIdx).trim();
    const rawVal = line.substring(colonIdx + 1).trim();
    const { cleanValue, meta } = extractMetaData(rawVal);

    items.push({ key, value: cleanValue, meta });
  }
  return items;
}

function parseTable(body: string): TableData {
  const lines = body.split('\n').filter((l) => l.trim());
  if (lines.length < 2)
    return { headers: [], rows: [], columnTypes: [], cellColors: [], columnSortable: [] };

  // Header row
  const headerLine = lines[0];
  const headersRaw = headerLine
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);

  // Separator check (optional strictness)
  // lines[1] should be |---|...

  const headers: string[] = [];
  const columnTypes: (string | undefined)[] = [];
  const columnSortable: boolean[] = [];

  for (const h of headersRaw) {
    // Hậu tố cấu hình theo cột: `Tên`, `Mã:sort`, `Tin cậy:percent:sort`
    const [name, ...suffixes] = h.split(':').map((s) => s.trim());
    const sortable = suffixes.includes('sort');
    const type = suffixes.find((s) => s && s !== 'sort');
    headers.push(name);
    columnTypes.push(type);
    columnSortable.push(sortable);
  }

  const rows: string[][] = [];
  const cellColors: (string | undefined)[][] = [];
  for (let i = 2; i < lines.length; i++) {
    // Skip header and separator
    const cells = lines[i]
      .split('|')
      .map((s) => s.trim())
      .filter((_, idx, arr) => {
        // Remove leading/trailing empty strings caused by split on |...|
        if (idx === 0 && arr[idx] === '') return false;
        if (idx === arr.length - 1 && arr[idx] === '') return false;
        return true;
      });
    if (cells.length > 0) {
      const colors: (string | undefined)[] = [];
      rows.push(
        cells.map((c, i) => {
          const m = c.match(/\{color=(\w+)\}/);
          colors[i] = m?.[1];
          return m ? c.replace(m[0], '').trim() : c;
        }),
      );
      cellColors.push(colors);
    }
  }

  return { headers, rows, columnTypes, cellColors, columnSortable };
}

function parseBadges(body: string): BadgeItem[] {
  const lines = body.split('\n');
  const items: BadgeItem[] = [];
  for (const line of lines) {
    const match = line.match(/^\-\s+(.+)$/);
    if (match) {
      const { cleanValue, meta } = extractMetaData(match[1]);
      items.push({ text: cleanValue, tone: meta.tone });
    }
  }
  return items;
}

function parseAccordion(body: string): AccordionItem[] {
  // Very simplified: splits by ## headings
  const lines = body.split('\n');
  const items: AccordionItem[] = [];
  let currentItem: AccordionItem | null = null;
  let contentBuffer: string[] = [];

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (currentItem) {
        currentItem.content = [
          {
            label: '',
            box: { w: 10, ui: 'text' },
            rawBody: contentBuffer.join('\n'),
            warnings: [],
          },
        ] as any; // Hacky wrap
        items.push(currentItem);
      }
      currentItem = { title: line.substring(3).trim(), content: [] };
      contentBuffer = [];
    } else if (currentItem) {
      contentBuffer.push(line);
    }
  }
  if (currentItem) {
    currentItem.content = [
      {
        label: '',
        box: { w: 10, ui: 'text' },
        rawBody: contentBuffer.join('\n'),
        warnings: [],
      },
    ] as any;
    items.push(currentItem);
  }
  return items;
}

function parseTimeline(body: string): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  for (const line of body.split('\n')) {
    const match = line.match(/^\-\s+(.+)$/);
    if (!match) continue;
    // Tách {color=...} ở cuối dòng trước khi chia theo '|'
    const colorMatch = match[1].match(/\{color=([^}\s]+)\}/);
    const text = colorMatch ? match[1].replace(colorMatch[0], '').trim() : match[1];
    const { cleanValue, meta } = extractMetaData(text);
    const parts = cleanValue.split('|').map((s) => s.trim());
    if (parts.length < 2) continue;
    events.push({
      date: parts[0],
      title: parts[1],
      note: parts[2],
      tone: meta.tone,
      current: /\bnay\b/i.test(parts[0]),
      color: colorMatch?.[1],
    });
  }
  return events;
}

function parseChecklist(body: string): ChecklistItem[] {
  const lines = body.split('\n');
  const items: ChecklistItem[] = [];
  for (const line of lines) {
    const match = line.match(/^(\s*)-\s+\[( |x|X)\]\s+(.+)$/);
    if (!match) continue;
    const item: ChecklistItem = { checked: match[2].toLowerCase() === 'x', text: match[3].trim() };
    const parent = items[items.length - 1];
    // Dòng thụt lề đi sau một mục cha => mục con (chỉ hỗ trợ 1 cấp)
    if (match[1].length > 0 && parent) {
      (parent.children ??= []).push(item);
    } else {
      items.push(item);
    }
  }
  return items;
}

function parseDonut(body: string): DonutItem[] {
  const items: DonutItem[] = [];
  for (const line of body.split('\n')) {
    const match = line.match(/^\-\s+(.+)$/);
    if (!match) continue;
    const colorMatch = match[1].match(/\{color=([^}\s]+)\}/);
    const text = colorMatch ? match[1].replace(colorMatch[0], '').trim() : match[1];
    const parts = text.split('|').map((s) => s.trim());
    const value = parseFloat(parts[1]);
    if (parts.length < 2 || isNaN(value)) continue;
    items.push({ label: parts[0], value, note: parts[2], color: colorMatch?.[1] });
  }
  return items;
}

function parseBarLine(body: string): BarLineItem[] {
  const items: BarLineItem[] = [];
  for (const line of body.split('\n')) {
    const match = line.match(/^\-\s+(.+)$/);
    if (!match) continue;
    const parts = match[1].split('|').map((s) => s.trim());
    const bar = parseFloat(parts[1]);
    if (parts.length < 2 || isNaN(bar)) continue;
    const line2 = parseFloat(parts[2]);
    items.push({ label: parts[0], bar, line: isNaN(line2) ? undefined : line2 });
  }
  return items;
}

function parseGraph(body: string): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const lines = body.split('\n');
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  for (const line of lines) {
    if (line.startsWith('node:')) {
      const parts = line
        .substring(5)
        .split('|')
        .map((s) => s.trim());
      if (parts.length >= 3) {
        nodes.push({ id: parts[0], label: parts[1], type: parts[2] });
      }
    } else if (line.startsWith('edge:')) {
      const parts = line
        .substring(5)
        .split('|')
        .map((s) => s.trim());
      if (parts.length >= 2) {
        const connParts = parts[0].split('->').map((s) => s.trim());
        if (connParts.length === 2) {
          edges.push({
            from: connParts[0],
            to: connParts[1],
            label: parts[1] || '',
            confidence: parts[2] ? parseFloat(parts[2]) : undefined,
          });
        }
      }
    }
  }
  return { nodes, edges };
}
