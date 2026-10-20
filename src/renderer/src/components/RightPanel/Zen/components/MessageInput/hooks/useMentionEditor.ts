import * as React from 'react';
import {
  buildMatcher,
  getMentionContext,
  insertBadgeAt,
} from '../mentionEditor';
import type { MentionContext, MentionItem } from '../mentionEditor';

const MAX_RESULTS = 200;

export const useMentionEditor = (
  editorRef: React.RefObject<HTMLDivElement | null>,
  onContentChange: () => void,
  rootPath: string | null | undefined,
) => {
  const [query, setQuery] = React.useState<string | null>(null);
  const [allItems, setAllItems] = React.useState<MentionItem[]>([]);
  const fetchedRef = React.useRef(false);
  const contextRef = React.useRef<MentionContext | null>(null);
  const isOpen = query !== null;

  React.useEffect(() => {
    fetchedRef.current = false;
    setAllItems([]);
  }, [rootPath]);

  React.useEffect(() => {
    if (!isOpen) return;
    if (fetchedRef.current) return;
    if (!rootPath) return;
    fetchedRef.current = true;
    (async () => {
      try {
        const api = (window as any).api;
        if (!api?.invoke) return;
        const res = await api.invoke('workspace:get-files', rootPath);
        if (!res?.success) fetchedRef.current = false;
        if (res?.success) {
          const items: MentionItem[] = [
            ...((res.folders ?? []) as MentionItem[]),
            ...((res.files ?? []) as MentionItem[]),
          ];
          setAllItems(items);
        }
      } catch {
        fetchedRef.current = false;
      }
    })();
  }, [isOpen, rootPath]);

  const items = React.useMemo<MentionItem[]>(() => {
    if (query === null) return [];
    const matcher = buildMatcher(query);
    const result: MentionItem[] = [];
    for (const item of allItems) {
      if (!matcher.test(item.path)) continue;
      result.push(item);
      if (result.length >= MAX_RESULTS) break;
    }
    return result;
  }, [query, allItems]);

  const updateFromSelection = React.useCallback(() => {
    const root = editorRef.current;
    if (!root) return;
    const context = getMentionContext(root);
    contextRef.current = context;
    setQuery(context ? context.query : null);
  }, [editorRef]);

  const closePopup = React.useCallback(() => {
    contextRef.current = null;
    setQuery(null);
  }, []);

  const selectItem = React.useCallback(
    (item: MentionItem) => {
      const root = editorRef.current;
      const context = contextRef.current;
      if (!root || !context) return;
      insertBadgeAt(context, item);
      closePopup();
      root.focus();
      onContentChange();
    },
    [editorRef, closePopup, onContentChange],
  );

  return {
    query,
    isOpen,
    items,
    updateFromSelection,
    closePopup,
    selectItem,
  };
};