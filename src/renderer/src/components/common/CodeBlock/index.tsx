import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useTheme } from '../../../theme/ThemeProvider';
import {
  vscodeClientManager,
  autoStartVSCodeLanguageClient,
} from '../../../modules/Code/services/vscode-lsp-client.service';
import { useCodeStore } from '../../../modules/Code/hooks/useCodeStore';

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

  console.log('[CodeBlock] TypeScript compiler options configured:', {
    moduleResolution: 'Bundler',
    jsx: 'ReactJSX',
    target: 'ESNext',
    diagnostics: 'LSP only (Monaco built-in semantic disabled)',
  });
}

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
      filePath,
      fileId,
      enableLSP = false,
      projectRoot,
    },
    ref,
  ) => {
    const { currentPreset } = useTheme();
    const markFileAsUnsaved = useCodeStore((s) => s.markFileAsUnsaved);
    const markFileAsSaved = useCodeStore((s) => s.markFileAsSaved);
    const setOriginalContent = useCodeStore((s) => s.setOriginalContent);
    const editorRef = useRef<HTMLDivElement>(null);
    const editorInstance = useRef<any>(null);
    const modelRef = useRef<any>(null);
    const isModelOwnerRef = useRef<boolean>(false); // Track if we created the model (true) or reused it (false)
    const decorationsRef = useRef<string[]>([]);
    const lineDecorationsRef = useRef<string[]>([]);
    const rangeDecorationsRef = useRef<string[]>([]);
    const [isEditorReady, setIsEditorReady] = React.useState(false);

    // Memoize themeConfig to prevent unnecessary re-renders
    const themeConfigStr = JSON.stringify(themeConfig);
    const stableThemeConfig = React.useMemo(() => themeConfig, [themeConfigStr]);

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
          console.log('[CodeBlock] 🔧 initMonaco called', {
            hasEditor: !!editorInstance.current,
            hasModel: !!modelRef.current,
            codeLength: code.length,
            filePath,
          });

          // Dispose old editor instance (but keep model alive)
          if (editorInstance.current) {
            console.log('[CodeBlock] 🗑️  Disposing old editor instance');
            editorInstance.current.dispose();
            editorInstance.current = null;
          }

          // ⚠️ DO NOT dispose model here - it should be reused
          // Model disposal logic is handled in cleanup only when truly needed

          // Cấu hình TS compiler options một lần duy nhất
          configureTypeScriptDefaults();

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

          const languageId = language;

          // Determine if we need LSP integration
          const needsLSP = enableLSP && filePath && window.monaco.Uri;

          if (needsLSP) {
            console.log('[CodeBlock] 🔍 Initializing LSP integration...');
            console.log('[CodeBlock] Language:', languageId);
            console.log('[CodeBlock] FilePath:', filePath);

            const uri = window.monaco.Uri.file(filePath);
            console.log('[CodeBlock] 📄 Checking for existing Monaco model:', uri.toString());

            // Always check Monaco's global model registry first
            const existingModel = window.monaco.editor.getModel(uri);

            if (existingModel) {
              console.log('[CodeBlock] ♻️  Model already exists, reusing...');

              const existingValue = existingModel.getValue();
              const existingLength = existingValue.length;
              const newLength = code.length;

              console.log('[CodeBlock] Model content comparison:', {
                existingLength,
                newLength,
                shouldUpdate: existingValue !== code && newLength > 0,
              });

              // Only update if:
              // 1. Content is different, AND
              // 2. New content is not empty (prevents race condition with async file loading)
              if (existingValue !== code && newLength > 0) {
                console.log('[CodeBlock] 📝 Updating existing model value');
                existingModel.setValue(code);
              } else if (newLength === 0 && existingLength > 0) {
                console.log(
                  '[CodeBlock] ⚠️  Skipping setValue - new content is empty but model has content (async race condition)',
                );
              }

              modelRef.current = existingModel;
              // Check if we're the owner by looking at our ref (not reset in cleanup anymore)
              if (!isModelOwnerRef.current) {
                // We didn't create it originally, so we're not the owner
                isModelOwnerRef.current = false;
              }
            } else {
              console.log('[CodeBlock] 🆕 Creating new model...');
              modelRef.current = window.monaco.editor.createModel(code, languageId, uri);
              isModelOwnerRef.current = true; // We created this model, we own it
              console.log('[CodeBlock] ✅ New model created, we are the owner');
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
            const isNewModel = isModelOwnerRef.current; // New model = we own it

            console.log('[CodeBlock] 🚀 Auto-starting VS Code language client...');
            console.log('[CodeBlock] Project root:', workspaceRoot);

            // Initialize VS Code LSP client with Monaco
            vscodeClientManager.initialize(window.monaco);
            console.log('[CodeBlock] ✅ VS Code LSP Client Manager initialized');

            autoStartVSCodeLanguageClient(languageId, workspaceRoot)
              .then(() => {
                console.log('[CodeBlock] ✅ VS Code language client started successfully');
                
                // monaco-languageclient automatically handles:
                // - textDocument/didOpen
                // - textDocument/didChange 
                // - textDocument/didSave
                // - textDocument/didClose
                // - Diagnostics are automatically synced to Monaco markers
                
                console.log('[CodeBlock] ✅ Document lifecycle managed by monaco-languageclient');
              })
              .catch((err) => {
                console.error('[CodeBlock] ❌ Failed to auto-start VS Code client:', err);
              });
          } else {
            // No LSP integration - create simple model without URI
            console.log('[CodeBlock] 📝 Creating model without LSP integration');

            // For non-LSP mode, always create a fresh model on each init
            // (no URI means no global registry lookup possible)
            if (!modelRef.current) {
              modelRef.current = window.monaco.editor.createModel(code, languageId);
              isModelOwnerRef.current = true;
              console.log('[CodeBlock] ✅ Created simple model');
            } else {
              // Update existing model value if different
              if (modelRef.current.getValue() !== code) {
                console.log('[CodeBlock] 📝 Updating simple model value');
                modelRef.current.setValue(code);
              }
            }
          }

          // Create editor instance with the model
          console.log('[CodeBlock] 🖥️  Creating editor instance...');
          console.log('[CodeBlock] Model exists:', !!modelRef.current);
          console.log('[CodeBlock] Model value length:', modelRef.current?.getValue()?.length || 0);

          editorInstance.current = window.monaco.editor.create(editorRef.current, {
            model: modelRef.current || undefined,
            value: modelRef.current ? undefined : code, // Fallback to value if no model
            language: modelRef.current ? undefined : languageId,
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

          console.log('[CodeBlock] ✅ Editor instance created');
          console.log(
            '[CodeBlock] Editor model:',
            editorInstance.current.getModel()?.uri?.toString() || 'no URI',
          );
          console.log('[CodeBlock] Editor DOM element:', {
            width: editorRef.current?.offsetWidth,
            height: editorRef.current?.offsetHeight,
            display: window.getComputedStyle(editorRef.current || document.body).display,
          });

          // Add Ctrl+S / Cmd+S handler for Save
          editorInstance.current.addCommand(
            window.monaco.KeyMod.CtrlCmd | window.monaco.KeyCode.KeyS,
            () => {
              console.log('[CodeBlock] 💾 Save triggered (Ctrl/Cmd+S)');

              // monaco-languageclient automatically sends textDocument/didSave
              // We only need to save to disk

              // Save file to disk
              if (fileId && filePath) {
                const content = editorInstance.current.getValue();
                window.api
                  .invoke('fs:write-file', filePath, content)
                  .then(() => {
                    console.log('[CodeBlock] ✅ File saved to disk');
                    // Clear unsaved marker
                    markFileAsSaved(fileId);
                  })
                  .catch((err: Error) => {
                    console.error('[CodeBlock] ❌ Failed to save file:', err);
                  });
              }
            },
          );

          // Handle content changes
          // monaco-languageclient automatically sends textDocument/didChange
          editorInstance.current.onDidChangeModelContent(() => {
            const newContent = editorInstance.current.getValue();

            if (onChange) {
              onChange(newContent);
            }

            // Track unsaved changes
            if (fileId) {
              markFileAsUnsaved(fileId, newContent);
            }
            
            // No need to manually notify LSP - monaco-languageclient handles it
          });

          if (mounted) {
            setIsEditorReady(true);

            // Force layout after a short delay to ensure DOM is ready
            setTimeout(() => {
              if (editorInstance.current) {
                console.log('[CodeBlock] 🔄 Forcing editor layout');
                editorInstance.current.layout();

                // Debug: Check if model is still attached
                const currentModel = editorInstance.current.getModel();
                console.log('[CodeBlock] 📊 Post-layout check:', {
                  hasModel: !!currentModel,
                  modelValue: currentModel?.getValue()?.slice(0, 50),
                  modelUri: currentModel?.uri?.toString(),
                  editorValue: editorInstance.current.getValue()?.slice(0, 50),
                });

                // Force a second layout if needed
                if (currentModel && currentModel.getValue().length > 0) {
                  setTimeout(() => {
                    if (editorInstance.current) {
                      editorInstance.current.layout();
                      console.log('[CodeBlock] 🔄 Second layout forced');
                    }
                  }, 200);
                }
              }
            }, 150);
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

        console.log(`[CodeBlock] 🧹 Cleanup called for ${filePath}`, {
          hasModel: !!modelRef.current,
          isOwner: isModelOwnerRef.current,
          enableLSP,
          reason: 'useEffect re-run (deps changed or unmount)',
        });

        // ⚠️ CRITICAL: Only dispose editor, NEVER dispose model
        // Model is shared across tab switches and must persist
        // Model will be reused when switching back to this file

        // Always dispose editor instance (but keep the model alive)
        if (editorInstance.current) {
          editorInstance.current.dispose();
          editorInstance.current = null;
          console.log('[CodeBlock] ✅ Editor instance disposed');
        }

        // ⚠️ DO NOT set modelRef.current = null - this breaks model reuse
        // ⚠️ DO NOT set isModelOwnerRef.current = false - we need to track ownership
        // Model reference persists so initMonaco can find and reuse it
        // Model will be cleaned up by Monaco when the URI is no longer referenced
      };

      console.log('[CodeBlock] 📦 useEffect triggered', {
        wordWrap,
        codeLength: code.length,
        filePath,
        enableLSP,
      });
    }, [wordWrap, filePath, enableLSP, language]); // Re-init only when these critical props change

    // Set original content when code first loads (for unsaved changes tracking)
    useEffect(() => {
      if (fileId && code) {
        setOriginalContent(fileId, code);
      }
    }, [fileId]); // Only run when fileId changes

    // Update value
    useEffect(() => {
      // No-op: Value updates are handled in initMonaco
      // This effect is kept for reference but does nothing
      // Model value is updated when:
      // 1. Tab switches (existingModel.setValue in initMonaco)
      // 2. Content changes (onDidChangeModelContent handler)
    }, [code]);

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
        console.log('[CodeBlock] 🎨 Theme updated dynamically');
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
  },
);

CodeBlock.displayName = 'CodeBlock';

export { CodeBlock };
