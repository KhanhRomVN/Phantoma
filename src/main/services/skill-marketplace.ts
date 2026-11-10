/**
 * ------------------------------------------------------------------
 * Skill Marketplace API
 * ------------------------------------------------------------------
 * Fetch leaderboard / search / detail từ mcp.directory (RSC + JSON).
 * Chạy ở main process để tránh CORS.
 * ------------------------------------------------------------------
 */

const BASE_URL = 'https://mcp.directory';

export interface MarketplaceSkillSummary {
  id: number;
  slug: string;
  name: string;
  author: string;
  description: string;
  sourceUrl?: string;
  category?: string;
  views: number;
  installs: number;
}

export interface MarketplaceSkillDetail {
  id?: number;
  slug?: string;
  name: string;
  author?: string;
  description: string;
  seoDescription?: string;
  sourceUrl?: string;
  category?: string;
  views?: number;
  installs?: number;
  content: string;
}

const normalizeRSCValue = (value: any) =>
  value === '$undefined' || value === '$null' ? undefined : value;

function parseLeaderboardRSC(text: string): MarketplaceSkillSummary[] {
  const match = text.match(/"initialSkills"\s*:\s*(\[[\s\S]*?\])(?=\s*[,}])/);
  if (!match) return [];
  const parsed = JSON.parse(match[1]);
  if (!Array.isArray(parsed)) return [];
  return parsed.map((s: any) => ({
    ...s,
    description: normalizeRSCValue(s.description) ?? '',
  }));
}

function extractContentByRef(text: string, ref: string): string {
  const refMatch = ref.match(/^\$([0-9a-f]+)$/i);
  if (!refMatch) {
    return '';
  }
  const headerRe = new RegExp('(?:^|[^0-9a-f])' + refMatch[1] + ':T[0-9a-f]+,---\r?\n', 'i');
  const headerMatch = text.match(headerRe);
  if (!headerMatch || headerMatch.index === undefined) {
    const looseRe = new RegExp('(?:^|[^0-9a-f])' + refMatch[1] + ':', 'ig');
    let looseMatch: RegExpExecArray | null;
    let looseCount = 0;
    while ((looseMatch = looseRe.exec(text)) !== null && looseCount < 5) {
      looseCount++;
    }
    return '';
  }

  const bodyStart = headerMatch.index + headerMatch[0].length;
  const closeMatch = /\r?\n---\r?\n/.exec(text.substring(bodyStart));
  const frontmatterClose = closeMatch ? bodyStart + closeMatch.index : -1;
  if (frontmatterClose === -1) {
    return '';
  }

  const contentStart = frontmatterClose + (closeMatch ? closeMatch[0].length : 5);
  const nextBlock = text.substring(contentStart).match(/\n[0-9a-f]+:[A-Za-z{["$]/i);
  const contentEnd =
    nextBlock && nextBlock.index !== undefined ? contentStart + nextBlock.index : text.length;

  return text.substring(contentStart, contentEnd).trim();
}

function parseSkillDetailRSC(text: string): MarketplaceSkillDetail | null {
  const skillMatch = text.match(/"skill":(\{"id":[\s\S]*?\}),"relatedSkills"/);
  if (!skillMatch) return null;
  const skill = JSON.parse(skillMatch[1]);
  const content = typeof skill.content === 'string' ? extractContentByRef(text, skill.content) : '';
  return {
    id: skill.id,
    slug: skill.slug,
    name: skill.name || skill.slug || 'Unknown',
    author: skill.author,
    description: skill.description || '',
    seoDescription: normalizeRSCValue(skill.seoDescription),
    sourceUrl: skill.sourceUrl,
    category: skill.category || undefined,
    views: typeof skill.views === 'number' ? skill.views : undefined,
    installs: typeof skill.installs === 'number' ? skill.installs : undefined,
    content,
  };
}

async function fetchRsc(url: string): Promise<string> {
  const res = await fetch(url, { headers: { rsc: '1' } });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.text();
}

export async function fetchLeaderboard(): Promise<MarketplaceSkillSummary[]> {
  const skills = parseLeaderboardRSC(await fetchRsc(`${BASE_URL}/skills`));
  if (skills.length === 0) throw new Error('Failed to parse leaderboard response');
  return skills;
}

export async function searchSkills(query: string, limit = 24, offset = 0): Promise<unknown> {
  const params = new URLSearchParams({ q: query, limit: String(limit), offset: String(offset) });
  const res = await fetch(`${BASE_URL}/api/v1/skills?${params}`);
  if (!res.ok) throw new Error(`Search request failed: ${res.status}`);
  return res.json();
}

export async function fetchSkillDetailBySlug(slug: string): Promise<MarketplaceSkillDetail> {
  const detail = parseSkillDetailRSC(
    await fetchRsc(`${BASE_URL}/skills/${encodeURIComponent(slug)}`),
  );
  if (!detail) throw new Error(`Failed to parse detail for "${slug}"`);
  return detail;
}
