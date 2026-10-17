/**
 * ------------------------------------------------------------------
 * Prompt Builder
 * ------------------------------------------------------------------
 * Xây dựng system prompt và context cho LLM requests.
 * Chọn prompt module phù hợp theo feature và merge với system info.
 *
 * Main functions:
 * - buildPrompt()         : Build full prompt payload cho request
 * - getShallowTree()      : Rút gọn cây thư mục cho context
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Prompts ──
import {
  getDefaultPrompt as getCodeDefaultPrompt,
  combinePrompts as combineCodePrompts,
  buildClaudePrompt,
  buildAgentsMdSection,
} from '../prompts/code';
import {
  getDefaultPrompt as getEmulateDefaultPrompt,
  combinePrompts as combineEmulatePrompts,
} from '../prompts/emulate';
import {
  getDefaultPrompt as getReconDefaultPrompt,
  combinePrompts as combineReconPrompts,
} from '../prompts/recon';

// ── Services ──
import { extensionService } from '@renderer/components/RightPanel/Agent/services/ExtensionService';

// ── Types ──
import type { AgentFeature } from '@renderer/components/RightPanel/Agent/context/FeatureContext';

// ── Utils ──

// ─── Types ─────────────────────────────────────────────────────────────
export interface PromptBuilderOptions {
  content: string;
  isReq1: boolean;
  skipFirstRequestLogic: boolean;
  aiLanguage: string;
  permissionMode: string;
  treeView: string;
  workspace: string;
  files?: any[];
  userRequestCount: number;
  feature?: AgentFeature;
  /** Traffic context string (đã bọc sẵn <traffic_context> tag) — inject vào mọi request */
  trafficContext?: string;
  /** Filter context string (đã bọc sẵn <filter_context> tag) — inject vào mọi request */
  filterContext?: string;
  /** Enable Skill injection in system prompt */
  useSkillEnabled?: boolean;
  /** Enable Memory context injection */
  memoryEnabled?: boolean;
  /** Tool output format preference ('xml' or 'json') */
  toolFormat?: 'xml' | 'json';
  /** Current provider ID for conditional prompting */
  providerId?: string;
  /** Prompt length mode — controls which sections are included (Zen parity). */
  promptLengthMode?: 'none' | 'short' | 'medium' | 'long';
  /** When false, LSP-DIAGNOSTICS-FALLBACK constraint is added to system prompt. */
  diagnosticEnabled?: boolean;
}

export const getShallowTree = (tree: string): string => {
  const lines = tree.split('\n');
  const result: string[] = [];
  let currentFolder: string | null = null;
  let fileCount = 0;

  const flush = () => {
    if (currentFolder !== null) {
      result.push(`${currentFolder} (${fileCount} files)`);
      currentFolder = null;
      fileCount = 0;
    }
  };

  for (const line of lines) {
    if (!line.trim()) continue;
    const isTopLevel = !/^ /.test(line);
    if (isTopLevel) {
      flush();
      if (line.trimEnd().endsWith('/')) {
        currentFolder = line.trimEnd();
      } else {
        result.push(line);
      }
    } else if (currentFolder !== null) {
      if (!line.trimEnd().endsWith('/')) fileCount++;
    }
  }
  flush();
  return result.join('\n');
};

export class PromptBuilder {
  static async buildPrompt(options: PromptBuilderOptions): Promise<string> {
    const {
      content,
      isReq1,
      skipFirstRequestLogic,
      aiLanguage,
      permissionMode,
      treeView,
      workspace,
      files,
      feature,
      trafficContext,
      filterContext,
      useSkillEnabled = false,
      memoryEnabled = false,
      toolFormat = 'xml',
      providerId,
      promptLengthMode = 'long',
      diagnosticEnabled = true,
    } = options;

    let systemPrompt = '';
    let projectContextStr = '';
    let attachedContextStr = '';
    const trafficContextStr = trafficContext ? `\n\n${trafficContext}` : '';
    const filterContextStr = filterContext ? `\n\n${filterContext}` : '';

    // Build system prompt for first request
    if (isReq1) {
      systemPrompt = await this.buildSystemPrompt(
        aiLanguage,
        permissionMode,
        feature,
        {
          useSkillEnabled,
          memoryEnabled,
          toolFormat,
          providerId,
          promptLengthMode,
          diagnosticEnabled,
        },
        workspace,
      );
      projectContextStr = this.buildProjectContext(treeView, workspace);
    }

    // Build attached context
    if (files && files.length > 0) {
      attachedContextStr = await this.buildAttachedContext(files);
    }

    // Build full content
    const fullContent = skipFirstRequestLogic
      ? content
      : `## User Message\n<zen-user-content>\n${content}\n</zen-user-content>`;

    // Tool format instruction (appended to every request if not handled in system prompt)
    // Note: For simplicity, we append it here. Ideally, this should be part of the system prompt structure.
    const toolFormatInstruction = this.getToolFormatInstruction(toolFormat);

    // Combine all parts
    const promptPayload = isReq1
      ? `${systemPrompt}${projectContextStr}${attachedContextStr}${trafficContextStr}${filterContextStr}${toolFormatInstruction}\n\n${fullContent}`
      : `${attachedContextStr}${trafficContextStr}${filterContextStr}${toolFormatInstruction}\n\n${fullContent}`;

    return promptPayload;
  }

  private static getToolFormatInstruction(format: 'xml' | 'json'): string {
    if (format === 'json') {
      return `\n\n## Tool Output Format\nWhen executing tools, please provide arguments in strict JSON format within a <tool_call> block or as specified by your internal protocol.`;
    }
    // Default XML behavior is usually implicit in the base prompts, but we can reinforce it if needed.
    return '';
  }

  private static async buildSystemPrompt(
    aiLanguage: string,
    permissionMode: string,
    feature?: AgentFeature,
    overrides?: {
      useSkillEnabled?: boolean;
      memoryEnabled?: boolean;
      toolFormat?: 'xml' | 'json';
      providerId?: string;
      promptLengthMode?: 'none' | 'short' | 'medium' | 'long';
      diagnosticEnabled?: boolean;
    },
    workspace?: string,
  ): Promise<string> {
    let systemInfo = {
      os: 'Unknown OS',
      ide: 'Zen IDE',
      shell: 'unknown',
      homeDir: '~',
      cwd: '.',
      language: aiLanguage,
    };

    try {
      const fetchedInfo = await extensionService.getSystemInfo();
      if (fetchedInfo?.data) {
        systemInfo = {
          ...systemInfo,
          ...fetchedInfo.data,
          language: aiLanguage,
        };
      }
    } catch (e) {
      console.warn('[PromptBuilder] Failed to fetch system info:', e);
    }

    const effectiveLang = aiLanguage;

    // Select prompt module based on feature.
    // Cast to a common signature: 3 modules expose nearly-identical
    // combinePrompts(config) but their SystemInfo interfaces diverge
    // (code has no `ide`, emulate/recon require it). The runtime contract is
    // identical — only the TS types differ.
    type AnyCombine = (config: any) => string;
    let getDefaultPrompt: (lang: string) => string = getCodeDefaultPrompt;
    let combinePrompts: AnyCombine = combineCodePrompts as AnyCombine;

    if (feature === 'emulate') {
      getDefaultPrompt = getEmulateDefaultPrompt;
      combinePrompts = combineEmulatePrompts as AnyCombine;
    } else if (feature === 'recon') {
      getDefaultPrompt = getReconDefaultPrompt;
      combinePrompts = combineReconPrompts as AnyCombine;
    }

    // ── Claude provider: dùng prompt riêng cho sandbox claude.ai ──
    // Backend claude.ai hiện chưa emit __CLAUDE_TOOL__ markers ở Phantoma,
    // nhưng prompt này vẫn được dùng để hướng dẫn tool_use format.
    const isClaudeProvider = overrides?.providerId?.toLowerCase() === 'claude';

    let systemPrompt = getDefaultPrompt(effectiveLang);

    if (isClaudeProvider) {
      systemPrompt = buildClaudePrompt({ language: effectiveLang });
    } else if (systemInfo.os !== 'Unknown OS') {
      // Use real system info if we managed to fetch it
      systemPrompt = combinePrompts({
        language: effectiveLang,
        systemInfo,
        permissionMode,
        promptLengthMode: overrides?.promptLengthMode,
        diagnosticEnabled: overrides?.diagnosticEnabled,
        toolFormat: overrides?.toolFormat,
      });
    }

    // ── AGENTS.md Injection (code mode only) ────────────────────────────
    // Đọc AGENTS.md ở workspace root (nếu có) và inject như một section
    // project-level guidance. Bỏ qua với claude provider (dùng prompt riêng).
    if (!isClaudeProvider && workspace) {
      try {
        const api = (window as any).api;
        if (api?.invoke) {
          const agentsPath = `${workspace.replace(/\/$/, '')}/AGENTS.md`;
          const exists = await api
            .invoke('fs:stat', agentsPath)
            .then((s: any) => s?.isFile === true)
            .catch(() => false);
          if (exists) {
            const content = await api.invoke('fs:read-file', agentsPath);
            if (typeof content === 'string') {
              systemPrompt += buildAgentsMdSection(content);
            }
          }
        }
      } catch (e) {
        // Không có AGENTS.md hoặc không đọc được — bỏ qua, không chặn request.
        console.warn('[PromptBuilder] Failed to inject AGENTS.md:', e);
      }
    }

    // ── Memory Context Injection ────────────────────────────────────────
    if (overrides?.memoryEnabled) {
      // TODO: Fetch actual memory context from MemoryService when available.
      // For now, inject a structural hint so the LLM knows to look for <memory_context>.
      systemPrompt += `\n\n## Memory Protocol\nYou have access to persistent memory. Look for <memory_context> blocks in subsequent messages or tool outputs to retrieve relevant historical information.`;
    }

    // ── Skill Activation ────────────────────────────────────────────────
    if (overrides?.useSkillEnabled) {
      // TODO: Load dynamic skills based on feature/provider.
      // Placeholder to enable skill-aware prompting structure.
      systemPrompt += `\n\n## Active Skills\nSpecialized capabilities are enabled. Follow any <skill_instructions> provided in the context strictly.`;
    }

    return systemPrompt;
  }

  private static buildProjectContext(treeView: string, workspace: string): string {
    let projectContextStr = '';

    if (treeView && treeView.trim()) {
      projectContextStr += `\n\n## Project Structure\n\`\`\`\n${getShallowTree(treeView)}\n\`\`\``;
    }
    if (workspace && workspace.trim()) {
      projectContextStr += `\n\n## WORKSPACE EXPERIENCE (workspace.md)\n\`\`\`\n${workspace}\n\`\`\``;
    }

    return projectContextStr;
  }

  private static async buildAttachedContext(files: any[]): Promise<string> {
    const attachedItems = files.filter(
      (f: any) =>
        f.id?.startsWith('attached-') ||
        f.id?.startsWith('rule-') ||
        f.id?.startsWith('terminal-') ||
        f.id?.startsWith('snippet-') ||
        f.id?.startsWith('external-'),
    );

    if (attachedItems.length === 0) return '';

    let attachedContextStr = '\n\n## Attached Context\n';

    const fileItems = attachedItems.filter((f: any) => f.type === 'file');
    const folderItems = attachedItems.filter((f: any) => f.type === 'folder');
    const terminalItems = attachedItems.filter((f: any) => f.type === 'terminal');
    const snippetItems = attachedItems.filter((f: any) => f.type === 'text-snippet');
    const externalItems = attachedItems.filter((f: any) => f.type === 'external');

    if (fileItems.length > 0) {
      attachedContextStr += '\n### Files\n';
      fileItems.forEach((f: any) => {
        attachedContextStr += `- ${f.path}\n`;
      });
    }

    if (folderItems.length > 0) {
      attachedContextStr += '\n### Folders (Tree Structure)\n';
      for (const f of folderItems) {
        const requestId = `folder-tree-${Date.now()}-${Math.random()}`;
        const treeData: any = await new Promise((resolve) => {
          const timeoutId = setTimeout(() => resolve(null), 3000);
          const handler = (event: MessageEvent) => {
            const msg = event.data;
            if (msg.command === 'getFolderTreeResult' && msg.requestId === requestId) {
              clearTimeout(timeoutId);
              window.removeEventListener('message', handler);
              resolve(msg.tree);
            }
          };
          window.addEventListener('message', handler);
          extensionService.postMessage({
            command: 'getFolderTree',
            requestId,
            path: f.path,
          });
        });
        attachedContextStr += `#### ${f.path}\n\`\`\`\n${treeData || 'Error fetching tree structure'}\n\`\`\`\n`;
      }
    }

    if (terminalItems.length > 0) {
      attachedContextStr += '\n### Terminals\n';
      terminalItems.forEach((f: any) => {
        attachedContextStr += `- terminal_id: ${f.path}\n`;
      });
    }

    if (snippetItems.length > 0) {
      attachedContextStr += '\n### Text Snippets\n';
      snippetItems.forEach((f: any, index: number) => {
        attachedContextStr += `#### Snippet[${index + 1}] (${f.lineCount || 0} lines)\n\`\`\`\n${f.content || ''}\n\`\`\`\n`;
      });
    }

    if (externalItems.length > 0) {
      attachedContextStr += '\n### External Files\n';
      externalItems.forEach((f: any) => {
        attachedContextStr += `#### ${f.path}\n\`\`\`\n${f.content || ''}\n\`\`\`\n`;
      });
    }

    return attachedContextStr;
  }
}
