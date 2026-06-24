import { useState, useRef, useEffect } from 'react';
import { X, Plus, Play, Copy, FileText, Trash2 } from 'lucide-react';
import { cn } from '../../../../shared/lib/utils';
import { CodeBlock, CodeBlockRef } from '../../../../components/common/CodeBlock';

interface PayloadValueModalProps {
  isOpen: boolean;
  onClose: () => void;
  payloadName: string;
  currentValues: string[];
  onSave: (values: string[]) => void;
  targetId?: string | null;
}

type SourceType = 'template' | 'file' | 'script';

interface SourceFile {
  id: string;
  name: string;
  type: SourceType;
  content: string;
  filePath?: string; // Absolute path for files
  language?: 'javascript' | 'text';
  output?: string[];
}

const defaultTemplates = [
  {
    id: 'integers',
    name: 'Integers (1-100)',
    values: Array.from({ length: 100 }, (_, i) => String(i + 1)),
  },
  {
    id: 'lowercase',
    name: 'Lowercase a-z',
    values: Array.from({ length: 26 }, (_, i) => String.fromCharCode(97 + i)),
  },
  {
    id: 'uppercase',
    name: 'Uppercase A-Z',
    values: Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)),
  },
  { id: 'digits', name: 'Digits 0-9', values: Array.from({ length: 10 }, (_, i) => String(i)) },
];

export function PayloadValueModal({
  isOpen,
  onClose,
  payloadName,
  currentValues,
  onSave,
  targetId,
}: PayloadValueModalProps) {
  const [files, setFiles] = useState<SourceFile[]>([]);
  const [scripts, setScripts] = useState<SourceFile[]>([]);
  const [selectedSource, setSelectedSource] = useState<{
    type: 'template' | 'file' | 'script' | 'current';
    id: string;
  } | null>(null);
  const [currentPreviewValues, setCurrentPreviewValues] = useState<string[]>(currentValues);
  const [templatePreviewValues, setTemplatePreviewValues] = useState<string[]>(currentValues);
  const [rawText, setRawText] = useState<string>(currentValues.join('\n'));
  const [editingContent, setEditingContent] = useState('');
  const [, setOutputText] = useState('');
  const [isAddingScript, setIsAddingScript] = useState(false);
  const [newScriptName, setNewScriptName] = useState('');
  const codeBlockRef = useRef<CodeBlockRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persistence helpers
  const getStorageKey = (type: 'files' | 'scripts') => {
    const base = targetId ? `repeater-${targetId}` : 'repeater-default';
    return `${base}-${payloadName}-${type}`;
  };

  const loadFromStorage = () => {
    try {
      const filesData = localStorage.getItem(getStorageKey('files'));
      if (filesData) setFiles(JSON.parse(filesData));

      const scriptsData = localStorage.getItem(getStorageKey('scripts'));
      if (scriptsData) setScripts(JSON.parse(scriptsData));
    } catch (error) {
      console.error('Failed to load persisted data:', error);
    }
  };

  const saveToStorage = (type: 'files' | 'scripts', data: SourceFile[]) => {
    try {
      localStorage.setItem(getStorageKey(type), JSON.stringify(data));
    } catch (error) {
      console.error(`Failed to save ${type} to storage:`, error);
    }
  };

  // Load persisted data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadFromStorage();
    }
  }, [isOpen, payloadName]);

  // Auto-save when files or scripts change
  useEffect(() => {
    if (isOpen) {
      saveToStorage('files', files);
    }
  }, [files, isOpen]);

  useEffect(() => {
    if (isOpen) {
      saveToStorage('scripts', scripts);
    }
  }, [scripts, isOpen]);

  if (!isOpen) return null;

  // Validate and auto-complete script name
  const getValidScriptName = (name: string): { valid: boolean; finalName: string } => {
    if (!name) return { valid: false, finalName: '' };

    // Check if it has an extension
    const parts = name.split('.');
    if (parts.length > 1) {
      // Has extension - must be .js
      const ext = parts.pop()?.toLowerCase();
      return { valid: ext === 'js', finalName: name };
    } else {
      // No extension - auto-add .js
      return { valid: true, finalName: `${name}.js` };
    }
  };

  const scriptValidation = getValidScriptName(newScriptName);
  const isValidScriptName = scriptValidation.valid;
  const finalScriptName = scriptValidation.finalName;

  // Handle template click - show preview only, doesn't affect current values
  const handleTemplateClick = (template: (typeof defaultTemplates)[0]) => {
    console.log(
      '[DEBUG] handleTemplateClick:',
      template.name,
      'values length:',
      template.values.length,
    );
    console.log('[DEBUG] currentPreviewValues before:', currentPreviewValues);
    setSelectedSource({ type: 'template', id: template.id });
    setTemplatePreviewValues(template.values);
    setEditingContent(template.values.join('\n'));
    setOutputText('');
    console.log('[DEBUG] templatePreviewValues set to:', template.values.length, 'values');
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;

      // Get file path (works in Electron)
      const filePath = (file as any).path || undefined;

      const newFile: SourceFile = {
        id: crypto.randomUUID(),
        name: file.name,
        type: 'file',
        content,
        filePath,
        language: 'text',
      };
      console.log('[DEBUG] handleFileUpload - new file:', file.name);
      setFiles((prev) => [...prev, newFile]);
      setSelectedSource({ type: 'file', id: newFile.id });
      setEditingContent(content);
      console.log('[DEBUG] File upload - setting currentPreviewValues to []');
      setCurrentPreviewValues([]);
      setTemplatePreviewValues([]);
      setOutputText(filePath ? `📁 ${filePath}` : '');
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  // Handle add new script
  const handleAddScript = () => {
    setIsAddingScript(true);
    setNewScriptName('');
  };

  const handleCreateScript = () => {
    if (!isValidScriptName) return;

    const defaultCode =
      '// Generate payload values\nconst values = [];\nfor (let i = 1; i <= 10; i++) {\n  values.push(`value_${i}`);\n}\nreturn values;';

    const newScript: SourceFile = {
      id: crypto.randomUUID(),
      name: finalScriptName,
      type: 'script',
      content: defaultCode,
      language: 'javascript',
    };

    console.log('[DEBUG] handleCreateScript - new script:', finalScriptName);
    setScripts((prev) => [...prev, newScript]);
    setSelectedSource({ type: 'script', id: newScript.id });
    setEditingContent(defaultCode);
    console.log('[DEBUG] Script created - setting currentPreviewValues to []');
    setCurrentPreviewValues([]);
    setTemplatePreviewValues([]);
    setOutputText('');
    setIsAddingScript(false);
    setNewScriptName('');
  };

  const handleCancelAddScript = () => {
    setIsAddingScript(false);
    setNewScriptName('');
  };

  // Handle compile/run
  const handleCompile = () => {
    console.log('[DEBUG] handleCompile - selectedSource:', selectedSource);
    if (!selectedSource) return;

    if (selectedSource.type === 'template') {
      // Already compiled
      return;
    }

    if (selectedSource.type === 'file') {
      const file = files.find((f) => f.id === selectedSource.id);
      if (!file) return;

      // Parse file content (one value per line)
      const lines = editingContent
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l);

      console.log('[DEBUG] Compile file - parsed lines:', lines.length);
      setFiles((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, content: editingContent, output: lines } : f)),
      );
      setCurrentPreviewValues(lines);
      setTemplatePreviewValues(lines);
      setOutputText(`✅ Parsed ${lines.length} values from file`);
      console.log('[DEBUG] File compiled - currentPreviewValues:', lines);
    }

    if (selectedSource.type === 'script') {
      const script = scripts.find((s) => s.id === selectedSource.id);
      if (!script) return;

      try {
        const func = new Function(editingContent);
        const result = func();

        if (!Array.isArray(result)) {
          throw new Error('Script must return an array');
        }

        const values = result.map((v) => String(v));

        console.log('[DEBUG] Script compiled - generated values:', values.length);
        setScripts((prev) =>
          prev.map((s) =>
            s.id === script.id ? { ...s, content: editingContent, output: values } : s,
          ),
        );
        setCurrentPreviewValues(values);
        setTemplatePreviewValues(values);
        setOutputText(`✅ Generated ${values.length} values`);
        console.log('[DEBUG] Script compiled - currentPreviewValues:', values);
      } catch (error: any) {
        setOutputText(`❌ Error: ${error.message}`);
        console.log('[DEBUG] Script compile error:', error.message);
      }
    }
  };

  // Handle delete file/script
  const handleDelete = (type: 'file' | 'script', id: string) => {
    if (type === 'file') {
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } else {
      setScripts((prev) => prev.filter((s) => s.id !== id));
    }

    if (selectedSource?.id === id) {
      setSelectedSource(null);
      setEditingContent('');
      setOutputText('');
      setCurrentPreviewValues(currentValues);
      setTemplatePreviewValues(currentValues);
    }
  };

  const handleSave = () => {
    console.log('[DEBUG] handleSave - saving:', currentPreviewValues);
    console.log('[DEBUG] handleSave - length:', currentPreviewValues.length);
    onSave(currentPreviewValues);
    // Clean up storage when saving (optional - keep for future use)
    onClose();
  };

  // Get current selected source
  const getCurrentSource = (): SourceFile | null => {
    if (!selectedSource) return null;
    if (selectedSource.type === 'file')
      return files.find((f) => f.id === selectedSource.id) || null;
    if (selectedSource.type === 'script')
      return scripts.find((s) => s.id === selectedSource.id) || null;
    return null;
  };

  const currentSource = getCurrentSource();
  const isScriptOrFile =
    selectedSource && (selectedSource.type === 'file' || selectedSource.type === 'script');
  const isCurrentValues = selectedSource?.type === 'current';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className={cn(
          'h-[85vh] bg-modal-background border border-border rounded-lg shadow-2xl flex flex-col transition-all duration-300',
          isCurrentValues || (!isScriptOrFile && selectedSource?.type === 'template')
            ? 'w-[70vw] max-w-[900px]'
            : 'w-[90vw] max-w-[1400px]',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div>
            <h2 className="text-sm font-medium text-text-primary">
              Payload Values: <span className="text-primary">{payloadName}</span>
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {currentPreviewValues.length} values
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-dropdown-item-hover">
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex min-h-0">
          {/* Left Panel */}
          <div className="w-64 border-r border-border flex flex-col bg-muted/5">
            {/* Current Values */}
            <div className="p-3 border-b border-border">
              <div className="text-xs font-medium text-text-secondary mb-2">Current Values</div>
              <button
                onClick={() => {
                  console.log('[DEBUG] Click Current Values button');
                  console.log('[DEBUG] currentPreviewValues:', currentPreviewValues);
                  console.log('[DEBUG] currentPreviewValues.length:', currentPreviewValues.length);
                  setSelectedSource({ type: 'current', id: 'current' });
                  setTemplatePreviewValues(currentPreviewValues);
                  setEditingContent(currentPreviewValues.join('\n'));
                  setRawText(currentPreviewValues.join('\n'));
                  setOutputText('');
                }}
                className={cn(
                  'w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-center gap-2',
                  selectedSource?.type === 'current'
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-primary hover:bg-dropdown-item-hover',
                )}
              >
                <FileText className="w-3 h-3 shrink-0" />
                <span className="flex-1 truncate">{payloadName}</span>
                <span className="text-[10px] text-text-secondary">
                  {currentPreviewValues.length}
                </span>
              </button>
            </div>

            {/* Templates */}
            <div className="p-3 border-b border-border">
              <div className="text-xs font-medium text-text-secondary mb-2">Quick Templates</div>
              <div className="space-y-1">
                {defaultTemplates.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => handleTemplateClick(tpl)}
                    className={cn(
                      'w-full text-left px-2 py-1.5 rounded text-xs transition-colors',
                      selectedSource?.type === 'template' && selectedSource.id === tpl.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-text-primary hover:bg-dropdown-item-hover',
                    )}
                  >
                    {tpl.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Files */}
            <div className="p-3 border-b border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-medium text-text-secondary">Files</div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1 rounded hover:bg-dropdown-item-hover transition-colors"
                  title="Upload file"
                >
                  <Plus className="w-3.5 h-3.5 text-text-secondary" />
                </button>
              </div>
              <div className="space-y-0.5">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors cursor-pointer group',
                      selectedSource?.type === 'file' && selectedSource.id === file.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-text-primary hover:bg-dropdown-item-hover',
                    )}
                    onClick={() => {
                      setSelectedSource({ type: 'file', id: file.id });
                      setEditingContent(file.content);
                      setOutputText(file.output ? `${file.output.length} values` : '');
                      setCurrentPreviewValues(file.output || []);
                      setTemplatePreviewValues(file.output || []);
                    }}
                    title={file.filePath || file.name}
                  >
                    <FileText className="w-3 h-3 shrink-0" />
                    <span className="flex-1 truncate">{file.name}</span>
                    {file.filePath && (
                      <span className="text-[9px] text-text-secondary opacity-50 truncate max-w-[60px]">
                        {file.filePath.split('/').pop()}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete('file', file.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-error transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Scripts */}
            <div className="flex-1 p-3 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-medium text-text-secondary">Scripts</div>
                <button
                  onClick={handleAddScript}
                  className="p-1 rounded hover:bg-dropdown-item-hover transition-colors"
                  title="New script"
                >
                  <Plus className="w-3.5 h-3.5 text-text-secondary" />
                </button>
              </div>

              {/* Inline script name input */}
              {isAddingScript && (
                <div className="mb-2">
                  <input
                    type="text"
                    value={newScriptName}
                    onChange={(e) => setNewScriptName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && isValidScriptName) {
                        handleCreateScript();
                      } else if (e.key === 'Escape') {
                        handleCancelAddScript();
                      }
                    }}
                    onBlur={() => {
                      if (isValidScriptName) {
                        handleCreateScript();
                      } else {
                        handleCancelAddScript();
                      }
                    }}
                    placeholder="script.js"
                    autoFocus
                    className={cn(
                      'w-full px-2 py-1 text-xs rounded outline-none',
                      'bg-input-background',
                      isValidScriptName ? 'border border-primary' : 'border border-error',
                    )}
                  />
                  {!isValidScriptName && newScriptName && (
                    <div className="text-[10px] text-error mt-0.5">Only .js allowed</div>
                  )}
                </div>
              )}

              <div className="space-y-0.5">
                {scripts.map((script) => (
                  <div
                    key={script.id}
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors cursor-pointer group',
                      selectedSource?.type === 'script' && selectedSource.id === script.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-text-primary hover:bg-dropdown-item-hover',
                    )}
                    onClick={() => {
                      setSelectedSource({ type: 'script', id: script.id });
                      setEditingContent(script.content);
                      setOutputText(script.output ? `${script.output.length} values` : '');
                      setCurrentPreviewValues(script.output || []);
                      setTemplatePreviewValues(script.output || []);
                    }}
                  >
                    <FileText className="w-3 h-3 shrink-0" />
                    <span className="flex-1 truncate">{script.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete('script', script.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-error transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="flex-1 flex min-w-0">
            {isScriptOrFile ? (
              /* Split view: Code + Output */
              <>
                {/* Code Editor */}
                <div className="flex-1 flex flex-col border-r border-border min-w-0">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0 bg-table-headerBg">
                    <div className="text-xs font-medium text-text-secondary">
                      {currentSource?.name || 'Editor'}
                    </div>
                    <button
                      onClick={handleCompile}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-success/20 text-success hover:bg-success/30 transition-colors"
                    >
                      <Play className="w-3 h-3" />
                      Compile
                    </button>
                  </div>
                  <div className="flex-1 p-2 min-h-0">
                    <CodeBlock
                      ref={codeBlockRef}
                      code={editingContent}
                      onChange={setEditingContent}
                      language={currentSource?.language || 'javascript'}
                      className="h-full"
                      showLineNumbers
                    />
                  </div>
                </div>

                {/* Output */}
                <div className="flex-1 flex flex-col min-w-0">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0 bg-table-headerBg">
                    <div className="text-xs font-medium text-text-secondary">
                      Output ({templatePreviewValues.length})
                    </div>
                    <div className="flex items-center gap-1">
                      {templatePreviewValues.length > 0 && (
                        <button
                          onClick={() => {
                            console.log('[DEBUG] Apply Output to Current Values');
                            console.log('[DEBUG] templatePreviewValues:', templatePreviewValues);
                            setCurrentPreviewValues(templatePreviewValues);
                            setOutputText(
                              `✅ Applied ${templatePreviewValues.length} values to Current Values`,
                            );
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-success hover:text-success/80 hover:bg-success/10 transition-colors"
                          title="Apply these values to Current Values"
                        >
                          <Plus className="w-3 h-3" />
                          Apply
                        </button>
                      )}
                      <button
                        onClick={() =>
                          navigator.clipboard.writeText(templatePreviewValues.join('\n'))
                        }
                        className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-text-secondary hover:text-text-primary hover:bg-dropdown-item-hover transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                        Copy
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto p-3 min-h-0">
                    <div className="font-mono text-xs text-text-primary space-y-0.5">
                      {templatePreviewValues.slice(0, 1000).map((val, i) => (
                        <div key={i} className="flex gap-2">
                          <span className="text-text-secondary w-12 text-right shrink-0">
                            {i + 1}
                          </span>
                          <span className="break-all">{val}</span>
                        </div>
                      ))}
                      {templatePreviewValues.length > 1000 && (
                        <div className="text-text-secondary italic">
                          ... and {templatePreviewValues.length - 1000} more
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : isCurrentValues ? (
              /* Current Values: Textarea view (simple text edit) */
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0 bg-table-headerBg">
                  <div className="text-xs font-medium text-text-secondary">
                    {payloadName} ({currentPreviewValues.length} values)
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(currentPreviewValues.join('\n'))}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-text-secondary hover:text-text-primary hover:bg-dropdown-item-hover transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </button>
                </div>
                <div className="flex-1 p-2 min-h-0">
                  <textarea
                    value={rawText}
                    onChange={(e) => {
                      const newText = e.target.value;
                      setRawText(newText);

                      // Parse values from raw text
                      let values: string[] = [];
                      if (newText.includes('\n')) {
                        values = newText
                          .split('\n')
                          .map((s) => s.trim())
                          .filter((s) => s !== '');
                      } else if (newText.includes(',') || newText.includes(';')) {
                        values = newText
                          .split(/[,;]\s*/)
                          .map((s) => s.trim())
                          .filter((s) => s !== '');
                      } else if (newText.includes(' ')) {
                        values = newText
                          .split(/\s+/)
                          .map((s) => s.trim())
                          .filter((s) => s !== '');
                      } else if (newText.trim() !== '') {
                        values = [newText.trim()];
                      }

                      console.log(`📊 [Payload Value] Current values count: ${values.length}`);
                      if (values.length > 0) {
                        console.log(`📊 [Payload Value] First 3 values:`, values.slice(0, 3));
                      }
                      setCurrentPreviewValues(values);
                      setTemplatePreviewValues(values);
                    }}
                    className="w-full h-full bg-transparent text-text-primary font-mono text-xs resize-none outline-none p-2 whitespace-pre-wrap"
                    placeholder="Enter values (one per line, or separated by commas/spaces)..."
                    spellCheck={false}
                  />
                </div>
              </div>
            ) : (
              /* Template preview: CodeBlock */
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0 bg-table-headerBg">
                  <div className="text-xs font-medium text-text-secondary">
                    Preview ({templatePreviewValues.length} values)
                  </div>
                  <div className="flex items-center gap-1">
                    {templatePreviewValues.length > 0 && (
                      <button
                        onClick={() => {
                          console.log('[DEBUG] Apply Template to Current Values');
                          console.log('[DEBUG] templatePreviewValues:', templatePreviewValues);
                          setCurrentPreviewValues(templatePreviewValues);
                          setOutputText(
                            `✅ Applied ${templatePreviewValues.length} values to Current Values`,
                          );
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-success hover:text-success/80 hover:bg-success/10 transition-colors"
                        title="Apply these values to Current Values"
                      >
                        <Plus className="w-3 h-3" />
                        Apply
                      </button>
                    )}
                    <button
                      onClick={() =>
                        navigator.clipboard.writeText(templatePreviewValues.join('\n'))
                      }
                      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-text-secondary hover:text-text-primary hover:bg-dropdown-item-hover transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                  </div>
                </div>
                <div className="flex-1 p-2 min-h-0">
                  <CodeBlock
                    code={templatePreviewValues.join('\n')}
                    language="text"
                    className="h-full"
                    showLineNumbers
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border shrink-0">
          <div className="text-xs text-text-secondary">
            {currentPreviewValues.length} values ready
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-dropdown-item-hover transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 rounded text-xs font-medium bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
            >
              Save Values
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
