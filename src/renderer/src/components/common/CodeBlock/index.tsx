import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useTheme } from '../../../theme/ThemeProvider';

// Define Window interface to include require for AMD loader
declare global {
  interface Window {
    require: any;
    monaco: any;
    monacoLoadingPromise?: Promise<void>;
  }
}

export interface CodeBlockThemeRule {
  token: string;
  foreground?: string;
  background?: string;
  fontStyle?: string;
}

export interface CodeBlockThemeConfig {
  background?: string;
  foreground?: string;
  rules?: CodeBlockThemeRule[];
  highlightLine?: number;
}

export interface CodeBlockRef {
  getMatchCount: () => number;
  goToMatch: (index: number) => void;
  format: () => void;
}

export interface HighlightRange {
  startLine: number;
  endLine: number;
  color?: string; // Optional custom color, defaults to a standard highlight
  label?: string; // e.g., 'Added', 'Removed'
}

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
  themeConfig?: CodeBlockThemeConfig;
  wordWrap?: 'off' | 'on' | 'wordWrapColumn' | 'bounded';
  showLineNumbers?: boolean;
  searchTerm?: string;
  highlightRanges?: HighlightRange[];
  onEditorMounted?: (editor: any) => void;
  editorOptions?: any;
  onChange?: (value: string) => void;
}

// Helper to convert theme to Monaco format
const convertThemeToMonaco = (theme: any) => {
  const monacoTheme = theme.monaco;
  // Type assertion to handle Monaco's base type requirements
  const base = (monacoTheme.base as 'vs' | 'vs-dark' | 'hc-black') || 'vs-dark';
  return {
    base,
    inherit: monacoTheme.inherit !== undefined ? monacoTheme.inherit : true,
    rules: monacoTheme.rules.map((rule: any) => ({
      token: rule.token,
      foreground: rule.foreground,
      background: rule.background,
      fontStyle: rule.fontStyle,
    })),
    colors: monacoTheme.colors || {},
  };
};

const CodeBlock = forwardRef<CodeBlockRef, CodeBlockProps>(
  (
    {
      code,
      language = 'json',
      className,
      themeConfig,
      wordWrap = 'on',
      showLineNumbers = false,
      searchTerm,
      highlightRanges = [],
      onEditorMounted,
      editorOptions,
      onChange,
    },
    ref,
  ) => {
    const { currentPreset } = useTheme();
    const editorRef = useRef<HTMLDivElement>(null);
    const editorInstance = useRef<any>(null);
    const decorationsRef = useRef<string[]>([]);
    const lineDecorationsRef = useRef<string[]>([]);
    const rangeDecorationsRef = useRef<string[]>([]);
    const [isEditorReady, setIsEditorReady] = React.useState(false);

    useImperativeHandle(ref, () => ({
      getMatchCount: () => {
        if (!editorInstance.current || !searchTerm) return 0;
        const model = editorInstance.current.getModel();
        if (!model) return 0;
        try {
          return model.findMatches(searchTerm, false, true, false, null, true).length;
        } catch {
          return model.findMatches(searchTerm, false, false, false, null, true).length;
        }
      },
      goToMatch: (index: number) => {
        if (!editorInstance.current || !searchTerm) return;
        const model = editorInstance.current.getModel();
        if (!model) return;

        let matches: any[] = [];
        try {
          matches = model.findMatches(searchTerm, false, true, false, null, true);
        } catch {
          matches = model.findMatches(searchTerm, false, false, false, null, true);
        }

        if (matches.length === 0) return;

        // Ensure index is within bounds
        const safeIndex = ((index % matches.length) + matches.length) % matches.length;
        const match = matches[safeIndex];

        editorInstance.current.revealRangeInCenter(match.range);
      },
      format: () => {
        console.log('[CodeBlock] format() called');
        console.log('[CodeBlock] editorInstance exists:', !!editorInstance.current);
        
        if (!editorInstance.current) {
          console.warn('[CodeBlock] Editor instance is null');
          return;
        }
        
        try {
          const editor = editorInstance.current;
          const model = editor.getModel();
          
          if (!model) {
            console.error('[CodeBlock] Editor model is null');
            return;
          }
          
          // Check if readOnly mode is on
          const isReadOnly = editor.getOption(window.monaco.editor.EditorOption.readOnly);
          console.log('[CodeBlock] Editor is readOnly:', isReadOnly);
          
          // Temporarily disable readOnly if needed
          if (isReadOnly) {
            console.log('[CodeBlock] Temporarily disabling readOnly for formatting');
            editor.updateOptions({ readOnly: false });
          }
          
          // Try to get and run the format action
          const action = editor.getAction('editor.action.formatDocument');
          console.log('[CodeBlock] Format action available:', !!action);
          
          if (action) {
            console.log('[CodeBlock] Running format action...');
            action.run().then(() => {
              console.log('[CodeBlock] Format action completed successfully');
              // Restore readOnly if it was set
              if (isReadOnly) {
                console.log('[CodeBlock] Restoring readOnly mode');
                editor.updateOptions({ readOnly: true });
              }
            }).catch((error: Error) => {
              console.error('[CodeBlock] Format action failed:', error);
              // Restore readOnly even on error
              if (isReadOnly) {
                editor.updateOptions({ readOnly: true });
              }
            });
          } else {
            console.error('[CodeBlock] Format action not available - this may happen if:');
            console.error('  1. Language server not loaded for:', model.getLanguageId());
            console.error('  2. Monaco editor modules not fully initialized');
            console.error('  3. No formatter registered for this language');
            
            // Restore readOnly
            if (isReadOnly) {
              editor.updateOptions({ readOnly: true });
            }
          }
        } catch (error) {
          console.error('[CodeBlock] Error during format:', error);
        }
      },
    }));

    useEffect(() => {
      let mounted = true;

      const initMonaco = async () => {
        if (!editorRef.current) return;

        try {
          if (editorInstance.current) {
            editorInstance.current.dispose();
          }

          // Get the active theme from the theme system
          const activeThemeName = 'systema-active-theme';

          // Build the theme from the current preset
          let monacoTheme: any;

          if (currentPreset && currentPreset.monaco) {
            // Convert the theme to Monaco format
            monacoTheme = convertThemeToMonaco(currentPreset);
          } else {
            // Fallback: Use MidnightBlue theme as default
            try {
              const { MidnightBlue } = await import('../../../theme/themes/MidnightBlue');
              monacoTheme = convertThemeToMonaco(MidnightBlue);
            } catch (e) {
              console.warn('Failed to load MidnightBlue theme, using fallback:', e);
              // Hardcoded fallback
              monacoTheme = {
                base: 'vs-dark',
                inherit: true,
                rules: [
                  { token: 'string.key.json', foreground: 'e06c75' },
                  { token: 'string.value.json', foreground: '98c379' },
                  { token: 'number', foreground: 'd19a66' },
                  { token: 'keyword.json', foreground: '56b6c2' },
                  { token: 'delimiter', foreground: 'abb2bf' },
                ],
                colors: {
                  'editor.foreground': '#abb2bf',
                  'editor.background': '#1e1e1e',
                },
              };
            }
          }

          // Apply custom overrides from themeConfig
          const customRules =
            themeConfig?.rules?.map((r) => ({
              token: r.token,
              foreground: r.foreground?.replace('#', ''),
              background: r.background?.replace('#', ''),
              fontStyle: r.fontStyle,
            })) || [];

          // Merge with themeConfig overrides
          const finalTheme = {
            ...monacoTheme,
            rules: [...monacoTheme.rules, ...customRules],
            colors: {
              ...monacoTheme.colors,
              ...(themeConfig?.background ? { 'editor.background': themeConfig.background } : {}),
              ...(themeConfig?.foreground ? { 'editor.foreground': themeConfig.foreground } : {}),
            },
          };

          // Register the theme
          window.monaco.editor.defineTheme(activeThemeName, finalTheme);

          editorInstance.current = window.monaco.editor.create(editorRef.current, {
            value: code,
            language: language,
            theme: activeThemeName,
            readOnly: editorOptions?.readOnly ?? false,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 12,
            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
            automaticLayout: true,
            padding: { top: 16, bottom: 16 },
            wordWrap: wordWrap,
            lineNumbers: showLineNumbers ? 'on' : 'off',
            ...editorOptions,
          });

          // Handle content changes
          editorInstance.current.onDidChangeModelContent(() => {
            if (onChange) {
              onChange(editorInstance.current.getValue());
            }
          });

          if (mounted) {
            setIsEditorReady(true);
          }

          // Expose editor instance
          if (onEditorMounted) {
            onEditorMounted(editorInstance.current);
          }
        } catch (error) {
          console.error('Failed to create monaco editor instance:', error);
        }
      };

      const loadMonaco = () => {
        if (window.monaco) {
          initMonaco();
          return;
        }

        // Check global loading state to prevent race conditions
        if (!window.monacoLoadingPromise) {
          window.monacoLoadingPromise = new Promise((resolve) => {
            // If loader script is already in DOM but we don't have the promise (e.g. from server-side or previous run), find it
            const existingScript = document.querySelector('script[src*="vscode/loader.js"]');
            if (existingScript || window.require) {
              // Wait for window.require if it's not ready, then config
              const waitForRequire = setInterval(() => {
                if (window.require) {
                  clearInterval(waitForRequire);
                  resolve();
                }
              }, 50);
              return;
            }

            const script = document.createElement('script');
            script.src = '/monaco/vs/loader.js';
            script.async = true;
            script.onload = () => resolve();
            document.body.appendChild(script);
          });
        }

        // Wait for loader to be ready
        window.monacoLoadingPromise
          .then(() => {
            if (window.require) {
              window.require.config({ paths: { vs: '/monaco/vs' } });
              window.require(
                ['vs/editor/editor.main'],
                () => {
                  if (mounted) initMonaco();
                },
                (err: any) => {
                  console.error('Failed to load monaco editor modules:', err);
                },
              );
            }
          })
          .catch((err) => {
            console.warn('Monaco loading promise failed or cancelled:', err);
          });
      };

      loadMonaco();

      return () => {
        mounted = false;
        if (editorInstance.current) {
          editorInstance.current.dispose();
        }
      };
      // Use JSON.stringify for deep comparison of themeConfig to avoid re-init on every render if object reference changes but content doesn't
    }, [JSON.stringify(themeConfig), wordWrap]); // Re-init if config/wrap changes

    // Update value
    useEffect(() => {
      if (editorInstance.current && editorInstance.current.getValue() !== code) {
        editorInstance.current.setValue(code);
      }
    }, [code]);

    // Update word wrap dynamically
    useEffect(() => {
      if (editorInstance.current) {
        editorInstance.current.updateOptions({ wordWrap });
      }
    }, [wordWrap]);

    // Handle search highlighting
    useEffect(() => {
      if (!isEditorReady || !editorInstance.current || !window.monaco) return;

      // Ensure style exists
      const styleId = 'monaco-custom-highlight-style';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        // Define a simpler class name without '/' which can be improved
        style.innerHTML = `
        .monaco-highlight-match {
          background-color: rgba(234, 179, 8, 0.4) !important;
          color: black !important;
        }
        .monaco-highlight-match-inline {
          font-weight: bold;
          color: #eab308 !important;
        }
        .monaco-range-highlight-green {
           background-color: rgba(34, 197, 94, 0.2) !important;
        }
        .monaco-range-highlight-red {
           background-color: rgba(239, 68, 68, 0.2) !important;
        }
      `;
        document.head.appendChild(style);
      }

      if (!searchTerm) {
        decorationsRef.current = editorInstance.current.deltaDecorations(
          decorationsRef.current,
          [],
        );
        return;
      }

      const model = editorInstance.current.getModel();
      if (!model) return;

      let matches: any[] = [];
      try {
        // Try regex first
        matches = model.findMatches(searchTerm, false, true, false, null, true);
      } catch {
        // Fallback to literal search if regex fails
        matches = model.findMatches(searchTerm, false, false, false, null, true);
      }

      if (matches.length > 0) {
        const newDecorations = matches.map((match: any) => ({
          range: match.range,
          options: {
            isWholeLine: false,
            className: 'monaco-highlight-match',
            inlineClassName: 'monaco-highlight-match-inline',
            overviewRuler: {
              color: '#eab308',
              position: window.monaco.editor.OverviewRulerLane.Right,
            },
          },
        }));

        decorationsRef.current = editorInstance.current.deltaDecorations(
          decorationsRef.current,
          newDecorations,
        );

        // Scroll to first match
        editorInstance.current.revealRangeInCenter(matches[0].range);
      } else {
        decorationsRef.current = editorInstance.current.deltaDecorations(
          decorationsRef.current,
          [],
        );
      }
    }, [searchTerm, code, isEditorReady]); // Re-run when search term or code changes or editor becomes ready

    // Handle Range Highlighting
    useEffect(() => {
      if (!isEditorReady || !editorInstance.current || !window.monaco) return;

      if (highlightRanges.length === 0) {
        rangeDecorationsRef.current = editorInstance.current.deltaDecorations(
          rangeDecorationsRef.current,
          [],
        );
        return;
      }

      const newDecorations = highlightRanges.map((range) => ({
        range: new window.monaco.Range(range.startLine, 1, range.endLine, 1),
        options: {
          isWholeLine: true,
          className: range.color || 'monaco-range-highlight-green', // Fallback
          linesDecorationsClassName: range.color ? undefined : 'my-line-decoration', // Optional gutter
        },
      }));

      rangeDecorationsRef.current = editorInstance.current.deltaDecorations(
        rangeDecorationsRef.current,
        newDecorations,
      );
    }, [highlightRanges, isEditorReady]);

    // Handle line highlighting
    useEffect(() => {
      if (
        editorInstance.current &&
        showLineNumbers &&
        typeof themeConfig?.highlightLine === 'number'
      ) {
        const line = themeConfig.highlightLine;
        const editor = editorInstance.current;

        // Clear previous decorations/collections if we stored them (simple version: just overwrite)
        lineDecorationsRef.current = editor.deltaDecorations(lineDecorationsRef.current, [
          {
            range: new window.monaco.Range(line, 1, line, 1),
            options: {
              isWholeLine: true,
              className: 'monaco-highlight-line bg-yellow-500/20', // Tailwind class might not work inside shadow DOM/iframe if Monaco isolates, but usually works in DOM mode
              inlineClassName: 'font-bold',
            },
          },
        ]);

        editor.revealLineInCenter(line);
      }
    }, [themeConfig?.highlightLine, showLineNumbers]);

    return <div ref={editorRef} className={`w-full h-full min-h-[200px] ${className || ''}`} />;
  },
);

CodeBlock.displayName = 'CodeBlock';

export { CodeBlock };
