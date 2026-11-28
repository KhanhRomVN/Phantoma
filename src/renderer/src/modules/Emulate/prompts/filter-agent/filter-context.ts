export const buildFilterContext = (filterText: string): string => {
  return [
    '<filter_context>',
    filterText,
    'Note: only values listed above are visible in the request table. Use them when filtering list_https or list_sources.',
    '</filter_context>',
  ].join('\n');
};

/**
 * Build empty filter context (khi không có filter hoặc requests).
 */
export const buildEmptyFilterContext = (): string => {
  return ['<filter_context>', 'No request filters applied.', '</filter_context>'].join('\n');
};
