const PRICING_PAGE = `import { Check } from 'lucide-react';
import { SiteLayout } from './Layout';
import { ui } from './theme';

const PLANS = [
  { name: 'Starter', price: '$0', perks: ['1 workspace', 'Community support'] },
  { name: 'Pro', price: '$12', perks: ['Unlimited workspaces', 'Priority support'] },
];

export default function Pricing() {
  return (
    <SiteLayout current="/pricing">
      <main className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="text-4xl font-bold">
          Simple <span className={ui.gradientText}>pricing</span>
        </h1>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {PLANS.map((plan) => (
            <div key={plan.name} className={ui.card}>
              <h2 className="text-lg font-semibold">{plan.name}</h2>
              <p className="mt-2 text-3xl font-bold">{plan.price}</p>
              <ul className="mt-4 space-y-2 text-sm">
                {plan.perks.map((perk) => (
                  <li key={perk} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[color:var(--ph-accent)]" />
                    {perk}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>
    </SiteLayout>
  );
}
`;

interface Fmt {
  title: (text: string) => string;
  md: (text: string) => string;
  read: (path: string) => string;
  readRange: (path: string, start: number, end: number) => string;
  create: (path: string, content: string) => string;
  update: (path: string, oldContent: string, newContent: string) => string;
  list: () => string;
  grep: (term: string) => string;
}

const fence = (lang: string, body: string): string => '```' + lang + '\n' + body + '\n```';

const XML_FMT: Fmt = {
  title: (text) => '<conversation_title>' + text + '</conversation_title>',
  md: (text) => '<markdown>' + text + '</markdown>',
  read: (path) => fence('xml', '<read_file><file_path>' + path + '</file_path></read_file>'),
  readRange: (path, start, end) =>
    fence(
      'xml',
      '<read_file><file_path>' + path + '</file_path><start_line>' + start + '</start_line><end_line>' + end + '</end_line></read_file>',
    ),
  create: (path, content) =>
    fence('xml', '<create_file><file_path>' + path + '</file_path><content>' + content + '</content></create_file>'),
  update: (path, oldContent, newContent) =>
    fence(
      'xml',
      '<update_file><file_path>' + path + '</file_path>\n<old_content>' + oldContent + '</old_content>\n<new_content>' + newContent + '</new_content>\n</update_file>',
    ),
  list: () => fence('xml', '<list_files/>'),
  grep: (term) => fence('xml', '<grep><search_term>' + term + '</search_term></grep>'),
};

const JSON_FMT: Fmt = {
  title: (text) => fence('json', JSON.stringify({ tool: 'conversation_title', params: { title: text } })),
  md: (text) => fence('json', JSON.stringify({ type: 'markdown', content: text })),
  read: (path) => fence('json', JSON.stringify({ tool: 'read_file', params: { file_path: path } })),
  readRange: (path, start, end) =>
    fence('json', JSON.stringify({ tool: 'read_file', params: { file_path: path, start_line: start, end_line: end } })),
  create: (path, content) =>
    fence('json', JSON.stringify({ tool: 'create_file', params: { file_path: path, content } })),
  update: (path, oldContent, newContent) =>
    fence(
      'json',
      JSON.stringify({ tool: 'update_file', params: { file_path: path, old_content: oldContent, new_content: newContent } }),
    ),
  list: () => fence('json', JSON.stringify({ tool: 'list_files', params: {} })),
  grep: (term) => fence('json', JSON.stringify({ tool: 'grep', params: { search_term: term } })),
};

const NAV_OLD = "  { label: 'About', route: '/about' },\n];";
const NAV_NEW = "  { label: 'About', route: '/about' },\n  { label: 'Pricing', route: '/pricing' },\n];";

const buildExamples = (f: Fmt): string => `# EXAMPLES
These show how tools are sequenced across turns. Each "Turn N" is one assistant message; tool results arrive between turns and are never predicted (NO-PREDICTING-RESULTS). Prose in your real replies follows RESPONSE-LANGUAGE.

## Example 1 — Add a new page that matches the existing design
Turn 1 — you do not know which files exist, so orient first:
${f.title('Add Pricing page')}
${f.md('Listing the design files before creating the page.')}
${f.list()}
STOP. Wait for the file list.

Turn 2 — the result shows Home.tsx (155 lines), Features.tsx (64), About.tsx (79), Layout.tsx (145), site.ts (124), theme.tsx (111). Read the shared files plus one similar page: 145 + 111 + 124 + 64 = 444 lines, within the 1500-line budget:
${f.read('Layout.tsx')}
${f.read('theme.tsx')}
${f.read('site.ts')}
${f.read('Features.tsx')}
STOP. Wait for all four file contents.

Turn 3 — after the contents are returned, create the page (reusing SiteLayout and the ui presets) and register it in the nav in one batch:
${f.create('Pricing.tsx', PRICING_PAGE)}
${f.update('site.ts', NAV_OLD, NAV_NEW)}
${f.md('Added the Pricing page and a Pricing link in the nav. Please check the live preview.')}
Do NOT declare it finished without the user checking the preview.

## Example 2 — Small restyle: grep, read a slice, update
Turn 1 — find every place the pattern is used (PATTERN-REUSE):
${f.grep('ui\\.primaryBtn')}
STOP.

Turn 2 — the result shows Home.tsx (155 lines) matching at lines 61 and 118. Read only the slice around the first match:
${f.readRange('Home.tsx', 55, 70)}
STOP.

Turn 3 — after the slice is returned, apply a minimal edit whose old_content is copied byte-for-byte from it:
${f.update('Home.tsx', '<RouteLink route="/features" className={ui.primaryBtn}>', '<RouteLink route="/features" className={ui.primaryBtn + \' w-full justify-center sm:w-auto\'}>')}
${f.md('Made the hero button full-width on mobile. Please check the preview on a phone preset.')}

## Example 3 — Missing target: do not invent a dead link
The user asks: "link the hero button to the Pricing page".
${f.grep('/pricing')}
STOP. The result has no matches and list_files showed no Pricing.tsx, so the route does not exist. Do not add a link that leads nowhere and do not guess:
${f.md('There is no Pricing page yet, so I did not add a link that would lead nowhere. Do you want me to create the Pricing page first?')}`;

export const EXAMPLES = buildExamples(XML_FMT);
export const EXAMPLES_JSON = buildExamples(JSON_FMT);