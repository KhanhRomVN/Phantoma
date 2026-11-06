import * as React from 'react';
import {
  buildMatcher,
  getMentionContext,
  insertBadgeAt,
  insertBadgesAtCaret,
  placeCaretAtEnd,
  readDraggedItems,
  ZEN_MENTION_DROP_EVENT,
  ZEN_INSERT_TEXT_EVENT,
  removeMentionBadge,
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
  const undoStackRef = React.useRef<Node[][]>([]);
  const isOpen = query !== null;

  React.useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data;
      const root = editorRef.current;
      if (data?.command !== 'addMention' || !root) return;
      if (!Array.isArray(data.items) || data.items.length === 0) return;
      const inserted = insertBadgesAtCaret(root, data.items as MentionItem[]);
      if (inserted.length > 0) undoStackRef.current.push(inserted);
      onContentChange();
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [editorRef, onContentChange]);

  React.useEffect(() => {
    const root = editorRef.current;
    if (!root) return;
    const handler = (event: MouseEvent) => {
      if (!removeMentionBadge(event.target)) return;
      event.preventDefault();
      onContentChange();
    };
    root.addEventListener('click', handler);
    return () => root.removeEventListener('click', handler);
  }, [editorRef, onContentChange]);

  React.useEffect(() => {
    const root = editorRef.current;
    if (!root) return;
    const onInput = () => {
      undoStackRef.current = [];
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const isUndo =
        (event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'z';
      if (!isUndo) return;
      const last = undoStackRef.current.pop();
      if (!last) return;
      event.preventDefault();
      last.forEach((node) => {
        if (root.contains(node)) node.parentNode?.removeChild(node);
      });
      onContentChange();
    };
    root.addEventListener('input', onInput);
    root.addEventListener('keydown', onKeyDown);
    return () => {
      root.removeEventListener('input', onInput);
      root.removeEventListener('keydown', onKeyDown);
    };
  }, [editorRef, onContentChange]);

  const toRelativeItem = React.useCallback(
    (item: MentionItem): MentionItem => {
      const base = rootPath ? rootPath.replace(/\/+$/, '') + '/' : null;
      return base && item.path.startsWith(base)
        ? { ...item, path: item.path.slice(base.length) }
        : item;
    },
    [rootPath],
  );

  const addItems = React.useCallback(
    (dropped: MentionItem[]) => {
      const root = editorRef.current;
      if (!root || dropped.length === 0) return;
      const inserted = insertBadgesAtCaret(root, dropped.map(toRelativeItem));
      if (inserted.length > 0) undoStackRef.current.push(inserted);
      onContentChange();
    },
    [editorRef, onContentChange, toRelativeItem],
  );

  const handleDropMention = React.useCallback(
    (e: React.DragEvent): boolean => {
      const root = editorRef.current;
      const dropped = readDraggedItems(e.dataTransfer);
      if (!root || dropped.length === 0) return false;
      e.preventDefault();
      e.stopPropagation();
      root.focus();
      placeCaretAtEnd(root);
      addItems(dropped);
      return true;
    },
    [editorRef, addItems],
  );

  React.useEffect(() => {
    const root = editorRef.current;
    if (!root) return;
    const handler = (event: Event) => {
      root.focus();
      placeCaretAtEnd(root);
      addItems((event as CustomEvent<MentionItem[]>).detail);
    };
    root.addEventListener(ZEN_MENTION_DROP_EVENT, handler);
    return () => root.removeEventListener(ZEN_MENTION_DROP_EVENT, handler);
  }, [editorRef, addItems]);

  React.useEffect(() => {
    const root = editorRef.current;
    if (!root) return;
    const handler = (event: Event) => {
      const text = (event as CustomEvent<string>).detail;
      if (!text) return;
      root.focus();
      placeCaretAtEnd(root);
      const inserted =
        document.activeElement === root && document.execCommand('insertText', false, text);
      if (!inserted) root.appendChild(document.createTextNode(text));
      onContentChange();
    };
    root.addEventListener(ZEN_INSERT_TEXT_EVENT, handler);
    return () => root.removeEventListener(ZEN_INSERT_TEXT_EVENT, handler);
  }, [editorRef, onContentChange]);

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
    handleDropMention,
  };
};
