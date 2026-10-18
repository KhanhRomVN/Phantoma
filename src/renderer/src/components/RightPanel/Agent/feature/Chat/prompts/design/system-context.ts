export interface DesignPageInfo {
  name: string;
  route: string;
  file: string;
}

export interface SystemInfo {
  language: string;
  designName?: string;
  designDescription?: string;
  pages?: DesignPageInfo[];
  /** Accepted for compatibility with the shared PromptBuilder; not shown in the design prompt. */
  os?: string;
  ide?: string;
  shell?: string;
  homeDir?: string;
  cwd?: string;
}

export const buildSystemContext = (info: SystemInfo): string => {
  const pages = info.pages ?? [];
  const pageLines =
    pages.length > 0
      ? pages.map((p) => `- ${p.name} — route ${p.route} — ${p.file}`).join('\n')
      : '- (no pages reported — call list_files to see what exists)';
  const description = info.designDescription ? ` — ${info.designDescription}` : '';

  return `# DESIGN CONTEXT
Design: ${info.designName ?? '(unnamed)'}${description}
Language: ${info.language}

## Pages on the canvas (snapshot — list_files is the source of truth for which files exist)
${pageLines}

## Limits
- The design folder is flat: file_path is always a bare file name.
- **READ-LINE-BUDGET**: read_file has NO limit on the number of files per turn. Sum the line counts returned by list_files/grep and keep the total at or under 1500 lines per turn — an exact count, not an estimate (see READ-LINE-BUDGET in CONSTRAINTS).
- **MAX-WRITE-FILES-PER-REQUEST**: up to 5 create_file / update_file calls per turn without asking for confirmation (same number as WRITE-BATCH-LIMIT).
`;
};