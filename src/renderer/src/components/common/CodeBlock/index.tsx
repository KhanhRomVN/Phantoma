import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useTheme } from '../../../theme/ThemeProvider';
import {
  lspClientManager,
  autoStartLanguageServer,
} from '../../../modules/Code/services/lsp-client.service';
import { useCodeStore } from '../../../modules/Code/hooks/useCodeStore';
import { lspManager } from '../../../modules/Code/services/lsp-manager.service';
import { documentManager } from '../../../modules/Code/services/document-manager.service';
import { fileWatcherService } from '../../../modules/Code/services/file-watcher.service';

// Define Window interface to include require for AMD loader
declare global {
  interface Window {
    require: any;
    monaco: any;
    monacoLoadingPromise?: Promise<void>;
    __monacoTsDefaultsConfigured?: boolean;
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
  color?: string;
  label?: string;
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
  /** Đường dẫn ảo của file, giúp TS worker resolve import tương đối đúng */
  filePath?: string;
  /** File ID for tracking unsaved changes */
  fileId?: string;
  /** Bật LSP integration (diagnostics, auto-complete, go-to-definition). Mặc định: false */
  enableLSP?: boolean;
  /** Project root path for LSP workspace. If not provided, will try to extract from filePath */
  projectRoot?: string;
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

/**
 * Đồng bộ TypeScript compiler options với tsconfig.json của project.
 * Chỉ chạy một lần duy nhất khi Monaco được load.
 */
function configureTypeScriptDefaults() {
  if (!window.monaco || window.__monacoTsDefaultsConfigured) return;
  window.__monacoTsDefaultsConfigured = true;

  const ts = window.monaco.languages.typescript;
  const ModuleResolutionKind = ts.ModuleResolutionKind;
  const ScriptTarget = ts.ScriptTarget;
  const JsxEmit = ts.JsxEmit;
  const ModuleKind = ts.ModuleKind;

  const compilerOptions: any = {
    target: ScriptTarget.ESNext,
    module: ModuleKind.ESNext,
    moduleResolution: ModuleResolutionKind.Bundler,
    jsx: JsxEmit.ReactJSX,
    allowNonTsExtensions: true,
    allowSyntheticDefaultImports: true,
    resolveJsonModule: true,
    strict: true,
    noImplicitAny: true,
    strictNullChecks: true,
    skipLibCheck: true,
    // Giảm false positives cho các file không nằm trong project
    noSemanticValidation: false,
    noSyntaxValidation: false,
  };

  ts.typescriptDefaults.setCompilerOptions(compilerOptions);
  ts.javascriptDefaults.setCompilerOptions(compilerOptions);

  // Disable Monaco's built-in TypeScript diagnostics completely
  // We use LSP diagnostics exclusively for accurate tsconfig.json support
  ts.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true, // Disable module resolution checks (use LSP instead)
    noSyntaxValidation: false, // Keep syntax validation (fast, no false positives)
    diagnosticCodesToIgnore: [],
  });

  // Disable Monaco's built-in JavaScript diagnostics too
  ts.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true, // Disable module resolution checks (use LSP instead)
    noSyntaxValidation: false, // Keep syntax validation (fast, no false positives)
    diagnosticCodesToIgnore: [],
  });
}

/**
 * Detect correct Monaco/LSP language ID based on file path
 * Handles JSX/TSX special cases that require different language IDs
 *
 * @param filePath - File path to detect language from
 * @param fallbackLanguage - Fallback language if detection fails
 * @returns Correct language ID for Monaco and LSP
 */
function detectLanguageId(
  filePath: string | undefined,
  fallbackLanguage: string = 'plaintext',
): string {
  if (!filePath) return fallbackLanguage;

  const ext = filePath.toLowerCase().split('.').pop();

  // Map file extensions to Monaco/LSP language IDs
  const languageMap: Record<string, string> = {
    // TypeScript/JavaScript with JSX
    tsx: 'typescriptreact',
    jsx: 'javascriptreact',
    // TypeScript/JavaScript
    ts: 'typescript',
    js: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    // Other languages
    json: 'json',
    html: 'html',
    css: 'css',
    scss: 'scss',
    less: 'less',
    md: 'markdown',
    py: 'python',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    cs: 'csharp',
    go: 'go',
    rs: 'rust',
    php: 'php',
    rb: 'ruby',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    sh: 'shell',
    bash: 'shell',
    sql: 'sql',
  };

  return languageMap[ext || ''] || fallbackLanguage;
}

const CodeBlock = forwardRef<CodeBlockRef, CodeBlockProps>((props, ref) => {
  const {
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
    filePath,
    fileId,
    enableLSP = false,
    projectRoot,
  } = props;

  const { currentPreset } = useTheme();
  const markFileAsUnsaved = useCodeStore((s) => s.markFileAsUnsaved);
  const markFileAsSaved = useCodeStore((s) => s.markFileAsSaved);
  const setOriginalContent = useCodeStore((s) => s.setOriginalContent);
  const editorRef = useRef<HTMLDivElement>(null);
  const editorInstance = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const isModelOwnerRef = useRef<boolean>(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const didAddReferenceRef = useRef<boolean>(false);
  const decorationsRef = useRef<string[]>([]);
  const lineDecorationsRef = useRef<string[]>([]);
  const rangeDecorationsRef = useRef<string[]>([]);
  const [isEditorReady, setIsEditorReady] = React.useState(false);
  const isExternalUpdateRef = useRef<boolean>(false); // Track if update is from external source
  const previousCodeRef = useRef<string>(code); // Track previous code value to detect external changes

  // Memoize themeConfig to prevent unnecessary re-renders
  const themeConfigStr = JSON.stringify(themeConfig);
  const stableThemeConfig = React.useMemo(() => {
    return themeConfig;
  }, [themeConfigStr]);

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

        // Temporarily disable readOnly if needed
        if (isReadOnly) {
          editor.updateOptions({ readOnly: false });
        }

        // Try to get and run the format action
        const action = editor.getAction('editor.action.formatDocument');

        if (action) {
          action
            .run()
            .then(() => {
              // Restore readOnly if it was set
              if (isReadOnly) {
                editor.updateOptions({ readOnly: true });
              }
            })
            .catch((error: Error) => {
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
        // Dispose old editor instance (but keep model alive)
        if (editorInstance.current) {
          editorInstance.current.dispose();
          editorInstance.current = null;
        }

        // Cấu hình TS compiler options một lần duy nhất
        configureTypeScriptDefaults();

        // Get the active theme from the theme system
        const activeThemeName = 'systema-active-theme';

        // Build the theme from the current preset
        let monacoTheme: any;

        // TEMPORARY FIX: Use pure VS Dark theme to test syntax highlighting
        monacoTheme = {
          base: 'vs-dark',
          inherit: true,
          rules: [],
          colors: {},
        };

        // Apply custom overrides from themeConfig
        const customRules =
          stableThemeConfig?.rules?.map((r) => ({
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
            ...(stableThemeConfig?.background
              ? { 'editor.background': stableThemeConfig.background }
              : {}),
            ...(stableThemeConfig?.foreground
              ? { 'editor.foreground': stableThemeConfig.foreground }
              : {}),
          },
        };

        // Register the theme
        window.monaco.editor.defineTheme(activeThemeName, finalTheme);

        // Detect correct language ID based on file extension
        const languageId = detectLanguageId(filePath, language);

        // Map to Monaco language ID
        const monacoLanguageId =
          languageId === 'typescriptreact'
            ? 'typescript'
            : languageId === 'javascriptreact'
              ? 'javascript'
              : languageId;

        // Determine if we need LSP integration
        const needsLSP = enableLSP && filePath && window.monaco.Uri;

        if (needsLSP) {
          const uri = window.monaco.Uri.file(filePath);
          // Check for existing model
          const existingModel = window.monaco.editor.getModel(uri);
          if (existingModel) {
            const existingValue = existingModel.getValue();
            const existingLanguage = existingModel.getLanguageId();

            // Update language if different
            if (existingLanguage !== monacoLanguageId) {
              window.monaco.editor.setModelLanguage(existingModel, monacoLanguageId);
            }

            // Update content if different and not empty
            if (existingValue !== code && code.length > 0) {
              existingModel.setValue(code);
            }

            modelRef.current = existingModel;
            if (!isModelOwnerRef.current) {
              isModelOwnerRef.current = false;
            }
          } else {
            modelRef.current = window.monaco.editor.createModel(code, monacoLanguageId, uri);
            isModelOwnerRef.current = true;
          }

          // Auto-start language server for this file
          // Extract project root from filePath if not provided
          const getProjectRoot = (): string => {
            if (projectRoot) return projectRoot;

            // Try to extract from filePath (assume project is the parent of src/ or root)
            if (filePath) {
              // Find /Documents/Coding/ProjectName/ pattern
              const match = filePath.match(/^(\/[^/]+\/[^/]+\/[^/]+\/[^/]+)/);
              if (match) return match[1];

              // Fallback: use directory containing the file
              const lastSlash = filePath.lastIndexOf('/');
              if (lastSlash > 0) return filePath.substring(0, lastSlash);
            }

            // Ultimate fallback
            return '/home/khanhromvn/Documents/Coding/Phantoma_code';
          };

          const workspaceRoot = getProjectRoot();

          // Initialize LSP client
          lspClientManager.initialize(window.monaco);

          autoStartLanguageServer(languageId, workspaceRoot)
            .then(async () => {
              // Subscribe to diagnostics via LSP Manager
              if (filePath) {
                const uri = window.monaco.Uri.file(filePath).toString();
                // Cleanup previous subscription if any (prevents listener leak on re-render)
                if (unsubscribeRef.current) {
                  unsubscribeRef.current();
                }
                unsubscribeRef.current = lspManager.subscribeToDiagnostics(uri, () => {});
              }

              // ✅ Document Manager: Register reference to this document
              if (modelRef.current && filePath) {
                const uri = window.monaco.Uri.file(filePath).toString();
                const text = modelRef.current.getValue();

                // Check if we should send didOpen (first reference)
                const shouldSendDidOpen = documentManager.addReference(
                  uri,
                  languageId,
                  modelRef.current,
                  text,
                );

                didAddReferenceRef.current = true;

                if (shouldSendDidOpen) {
                  try {
                    // Clean old document state in LSP server before re-opening.
                    // After Ctrl+R refresh, the LSP server still holds documents
                    // from the previous session — a duplicate didOpen won't trigger
                    // new diagnostics. didClose + didOpen forces re-analysis.
                    await lspClientManager.notifyDocumentClosed(languageId, uri);
                    await lspClientManager.notifyDocumentOpened(languageId, uri, languageId, text);
                  } catch (err) {
                    console.error('[CodeBlock] ❌ LSP document sync failed:', err);
                  }
                }

                // 🔍 Start file watcher to track external changes
                // This keeps running even when tab is closed
                if (filePath) {
                  fileWatcherService
                    .watchFile(filePath, languageId, text)
                    .then(() => {})
                    .catch((err) => {
                      console.error('[CodeBlock] ❌ File watcher failed:', err);
                    });
                }
              }
            })
            .catch((err) => {
              console.error('[CodeBlock] ❌ LSP server start failed:', err);
            });
        } else {
          // No LSP integration
          if (!modelRef.current) {
            modelRef.current = window.monaco.editor.createModel(code, monacoLanguageId);
            isModelOwnerRef.current = true;
          } else {
            if (modelRef.current.getValue() !== code) {
              modelRef.current.setValue(code);
            }
          }
        }

        // Create editor instance with the model
        editorInstance.current = window.monaco.editor.create(editorRef.current, {
          model: modelRef.current || undefined,
          value: modelRef.current ? undefined : code,
          language: modelRef.current ? undefined : monacoLanguageId,
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

        // Add Ctrl+S / Cmd+S handler for Save
        editorInstance.current.addCommand(
          window.monaco.KeyMod.CtrlCmd | window.monaco.KeyCode.KeyS,
          () => {
            // Notify LSP server
            if (enableLSP && filePath && modelRef.current) {
              const uri = window.monaco.Uri.file(filePath).toString();
              const text = modelRef.current.getValue();
              lspClientManager.notifyDocumentSaved(languageId, uri, text);
            }

            // Save file to disk
            if (fileId && filePath) {
              const content = editorInstance.current.getValue();
              window.api
                .invoke('fs:write-file', filePath, content)
                .then(() => {
                  markFileAsSaved(fileId);
                })
                .catch((err: Error) => {
                  console.error('[CodeBlock] ❌ Failed to save file:', err);
                });
            }
          },
        );

        // Handle content changes with LSP notification
        let changeVersion = 2; // Start from 2 (version 1 was didOpen)
        editorInstance.current.onDidChangeModelContent(() => {
          // Skip if this is an external update (from file watcher)
          if (isExternalUpdateRef.current) {
            isExternalUpdateRef.current = false;
            return;
          }

          const newContent = editorInstance.current.getValue();

          if (onChange) {
            onChange(newContent);
          }

          // Track unsaved changes
          if (fileId) {
            markFileAsUnsaved(fileId, newContent);
          }

          // Update file watcher's last known content
          if (filePath) {
            fileWatcherService.updateContent(filePath, newContent);
            // Also touch file to reset cleanup timer on user edit
          }

          // Notify LSP server about content changes (debounced automatically)
          if (enableLSP && filePath && modelRef.current) {
            const uri = window.monaco.Uri.file(filePath).toString();
            const text = modelRef.current.getValue();
            changeVersion++;
            lspClientManager.notifyDocumentChanged(languageId, uri, text, changeVersion);
          }
        });

        if (mounted) {
          setIsEditorReady(true);

          // Force layout after a short delay to ensure DOM is ready
          setTimeout(() => {
            if (editorInstance.current) {
              editorInstance.current.layout();
            }
          }, 150);
        }

        // Expose editor instance
        if (onEditorMounted) {
          onEditorMounted(editorInstance.current);
        }
      } catch (error) {
        console.error('[CodeBlock] ❌ Failed to create editor:', error);
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

      // ✅ Cleanup LSP subscriptions (prevents listener leak)
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      // ✅ Document Manager: Unregister reference only if file is actually closed
      // (not on tab switch — openFiles still contains the file)
      //
      // ⚠️ DISABLED: We no longer send didClose to LSP server when closing tabs
      // This keeps diagnostics visible in Problems panel even after tab is closed
      // LSP server will keep the document "open" until workspace is closed
      //
      // if (enableLSP && filePath && modelRef.current && didAddReferenceRef.current) {
      //   const state = useCodeStore.getState();
      //   const project = state.projects.find((p) => p.id === state.currentProjectId);
      //   const isStillOpen = project?.openFiles.some((fid) => {
      //     const node = project.fileNodeMap[fid];
      //     return node?.path === filePath;
      //   });

      //   if (!isStillOpen) {
      //     const uri = window.monaco.Uri.file(filePath).toString();
      //     const shouldSendDidClose = documentManager.removeReference(uri);

      //     if (shouldSendDidClose) {
      //       const languageId = detectLanguageId(filePath, language);
      //       lspClientManager.notifyDocumentClosed(languageId, uri);
      //     }
      //     didAddReferenceRef.current = false;
      //   }
      // }

      // Always dispose editor instance (but keep the model alive)
      if (editorInstance.current) {
        editorInstance.current.dispose();
        editorInstance.current = null;
      }
    };
  }, [filePath, enableLSP]);

  // Set original content when code first loads
  useEffect(() => {
    if (fileId && code) {
      setOriginalContent(fileId, code);
    }
  }, [fileId]); // Only run when fileId changes

  // Update value
  useEffect(() => {
    // Detect if this is an external change (code prop changed but not from our setValue)
    const isExternalChange = previousCodeRef.current !== code;
    if (modelRef.current && editorInstance.current && isExternalChange) {
      const currentValue = modelRef.current.getValue();
      if (currentValue !== code) {
        // Set flag to prevent onDidChangeModelContent from treating this as user edit
        isExternalUpdateRef.current = true;
        modelRef.current.setValue(code);
      }

      // ALWAYS notify LSP server about external content changes (even if model value is same)
      // This handles the case where user edited in app, then saved externally
      if (enableLSP && filePath) {
        const uri = window.monaco.Uri.file(filePath).toString();
        const languageId = language || 'plaintext';
        // Use notifyDocumentChanged to update LSP with new content
        lspClientManager.notifyDocumentChanged(languageId, uri, code, Date.now());
      }

      // Mark file as saved since this is coming from disk
      if (fileId) {
        markFileAsSaved(fileId);
        setOriginalContent(fileId, code);
      }

      // Update previous code ref
      previousCodeRef.current = code;
    }
  }, [code, fileId, enableLSP, filePath, language, markFileAsSaved, setOriginalContent]);

  // Update word wrap dynamically
  useEffect(() => {
    if (editorInstance.current) {
      editorInstance.current.updateOptions({ wordWrap });
    }
  }, [wordWrap]);

  // Update theme dynamically without re-initializing editor
  useEffect(() => {
    if (!isEditorReady || !editorInstance.current || !window.monaco) return;

    const updateTheme = async () => {
      const activeThemeName = 'systema-active-theme';

      let monacoTheme: any;
      if (currentPreset && currentPreset.monaco) {
        monacoTheme = convertThemeToMonaco(currentPreset);
      } else {
        try {
          const { MidnightBlue } = await import('../../../theme/themes/MidnightBlue');
          monacoTheme = convertThemeToMonaco(MidnightBlue);
        } catch (e) {
          console.warn('Failed to load MidnightBlue theme:', e);
          return;
        }
      }

      // Apply custom overrides from themeConfig
      const customRules =
        stableThemeConfig?.rules?.map((r) => ({
          token: r.token,
          foreground: r.foreground?.replace('#', ''),
          background: r.background?.replace('#', ''),
          fontStyle: r.fontStyle,
        })) || [];

      const finalTheme = {
        ...monacoTheme,
        rules: [...monacoTheme.rules, ...customRules],
        colors: {
          ...monacoTheme.colors,
          ...(stableThemeConfig?.background
            ? { 'editor.background': stableThemeConfig.background }
            : {}),
          ...(stableThemeConfig?.foreground
            ? { 'editor.foreground': stableThemeConfig.foreground }
            : {}),
        },
      };

      window.monaco.editor.defineTheme(activeThemeName, finalTheme);
      window.monaco.editor.setTheme(activeThemeName);

      // Debug: Check if tokenization is working
      if (editorInstance.current && modelRef.current) {
        // Try to tokenize first line — poll until Monaco language worker is ready
        let attempts = 0;
        const maxAttempts = 10;
        const pollInterval = 200;

        const tryTokenize = () => {
          if (!modelRef.current || modelRef.current.isDisposed()) return;
          try {
            const firstLine = modelRef.current.getLineContent(1);
            if (firstLine && window.monaco?.editor?.tokenize) {
              const monacoLang = modelRef.current.getLanguageId();
              const rawTokens = window.monaco.editor.tokenize(firstLine, monacoLang);
              const tokens = rawTokens[0]?.map((t: any) => ({ type: t.type, offset: t.offset }));
              const hasValidTokens = tokens?.length > 0 && tokens[0].type !== '';

              if (hasValidTokens || attempts >= maxAttempts) {
              } else {
                attempts++;
                setTimeout(tryTokenize, pollInterval);
              }
            }
          } catch (e) {
            console.warn('[CodeBlock] ⚠️ Tokenization check failed:', e);
          }
        };

        setTimeout(tryTokenize, 300);
      }
    };

    updateTheme();
  }, [themeConfigStr, currentPreset, stableThemeConfig, isEditorReady]);

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
      decorationsRef.current = editorInstance.current.deltaDecorations(decorationsRef.current, []);
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
      decorationsRef.current = editorInstance.current.deltaDecorations(decorationsRef.current, []);
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
      typeof stableThemeConfig?.highlightLine === 'number'
    ) {
      const line = stableThemeConfig.highlightLine;
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
  }, [stableThemeConfig?.highlightLine, showLineNumbers]);

  return <div ref={editorRef} className={`w-full h-full min-h-[200px] ${className || ''}`} />;
});

CodeBlock.displayName = 'CodeBlock';

export default CodeBlock;
