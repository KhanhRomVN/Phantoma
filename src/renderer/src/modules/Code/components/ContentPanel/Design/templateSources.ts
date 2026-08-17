/**
 * ------------------------------------------------------------------
 * Template Sources
 * ------------------------------------------------------------------
 * Load raw source code of all design template files at build time.
 * Used to snapshot source code into a design so it becomes fully
 * independent from the original template folder.
 * ------------------------------------------------------------------
 */

const rawSources = import.meta.glob('./templates/**/*.tsx', { as: 'raw', eager: true });

export function getTemplateSources(
  platform: 'website' | 'desktop' | 'mobile',
): Record<string, string> {
  const prefix = `./templates/${platform}/`;
  const result: Record<string, string> = {};

  for (const [path, content] of Object.entries(rawSources)) {
    if (!path.startsWith(prefix)) continue;

    const key = path.slice('./templates/'.length).replace(/\.tsx$/, '');
    result[key] = content as string;
  }

  return result;
}