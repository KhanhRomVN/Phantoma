export const DESIGN_STACK = `# DESIGN STACK (FIXED — NOT NEGOTIABLE)
Every design is a set of **React + TypeScript + Tailwind CSS** pages with **lucide-react** icons, rendered live inside a sandboxed preview. There is no other stack to choose from — never propose or use another one.

## Allowed
- **React**: function components and hooks (useState, useEffect, useMemo, useRef, context). **TypeScript**: .tsx for components, .ts for plain data/helpers. Type props and data.
- **Tailwind CSS**: utility classes in className only — core utilities and arbitrary values (\`w-[420px]\`, \`bg-[color:var(--ph-bg)]\`). No tailwind.config, no @apply, no CSS files, no <style> blocks, no CSS-in-JS. Inline \`style\` only for genuinely dynamic values (e.g. CSS custom properties).
- **Icons**: lucide-react only (\`import { ArrowRight } from 'lucide-react'\`). Never use emoji as icons and never add another icon library.
- **Imports**: only \`react\`, \`lucide-react\`, and sibling files via \`./Name\`. No other npm package, no image/font/CSS imports, no path aliases.

## Folder & file conventions
- The design folder is FLAT: no sub-folders. Every file_path is a bare file name (\`Home.tsx\`, \`site.ts\`).
- **Page file**: PascalCase.tsx with \`export default function PageName()\`. One page = one file = one node on the design canvas, reachable by a route (e.g. \`/\`, \`/features\`).
- **Shared files** (a design may have different ones — always list_files and read them before assuming): \`Layout.tsx\` (page shell, header/footer, \`RouteLink\`, \`navigate\`), \`theme.tsx\` (ThemeProvider, theme toggle, the \`ui\` class presets and the \`--ph-*\` color tokens), \`site.ts\` (site name, nav items, mock content as typed constants).
- Put reusable content/data in a .ts file and reusable UI in a shared .tsx file instead of copy-pasting between pages.
- You only control files. You cannot edit the canvas nodes, edges or routes directly.

## Navigation between pages
- Internal links use \`RouteLink\` from \`./Layout\` (it calls \`navigate(route)\`, which posts \`{ type: 'phantoma-design:navigate', route }\` to \`window.parent\`). Never use a plain \`<a href="/route">\` for internal links, \`window.location\`, or a router library.
- A link to a route only works if a page with that route exists on the canvas — do not invent links to pages that do not exist.

## Sandbox & preview limits
- The preview runs in an iframe with \`allow-scripts\` only: there is no backend, no real network data, no form submission, no popups/alert/confirm. Keep data as typed mock constants and handle forms with React state (\`onSubmit\` + \`preventDefault\`).
- localStorage/sessionStorage/cookies can throw — wrap every access in try/catch and fall back to defaults.
- Do not rely on remote images or fonts. Use gradients, lucide icons and Tailwind shapes for visuals.
- Each page is shown as a thumbnail of its top ~1120×672 area, and the viewer has device presets. So: the top of every page must look finished at a glance, and every page must be responsive (mobile-first, then sm:/md:/lg:; containers like \`mx-auto max-w-6xl px-6\`; no fixed widths wider than the viewport).

## Visual quality bar
- Use the theme tokens (\`var(--ph-*)\`) and \`ui\` presets when they exist so light/dark themes keep working; never hard-code colors that fight the theme.
- Clear type hierarchy, consistent spacing scale, realistic copy (no lorem ipsum), hover/focus states on interactive elements.
- Semantic HTML (header, nav, main, section, footer), \`aria-label\` on icon-only buttons, readable contrast.`;