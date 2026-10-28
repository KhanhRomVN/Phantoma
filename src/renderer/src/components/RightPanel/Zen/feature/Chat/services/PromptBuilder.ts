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
import { buildSystemPrompt } from './ModuleRegistry';
import type { WorkflowAgentId } from '../types/workflow-agents';

// ── Services ──
import { extensionService } from '@renderer/components/RightPanel/Zen/services/ExtensionService';

// NOTE: skillInstall.service is not yet available in Phantoma renderer context.
// Skills injection is disabled until Marketplace integration is complete.
// import { listInstalledSkills, readSkillContent } from '@renderer/features/marketplace/services/skillInstall.service';

// ── Types ──
import type { AgentFeature } from '@renderer/components/RightPanel/Zen/context/FeatureContext';

// ── Utils ──

// ─── Types ─────────────────────────────────────────────────────────────
export interface PromptBuilderOptions {
  content: string;
  isReq1: boolean;
  skipFirstRequestLogic: boolean;
  aiLanguage: string;
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
  /** Cờ anti_system_prompt_injection từ provider config — khi true, dùng claude-system-prompt riêng */
  antiSystemPromptInjection?: boolean;
  /** Prompt length mode — controls which sections are included (Zen parity). */
  promptLengthMode?: 'none' | 'short' | 'medium' | 'long';
  /** System prompt mode (balanced/concise/thorough/fast) — controls AI behavior */
  systemPromptMode?: 'fast' | 'balanced' | 'thorough' | 'short' | 'none';
  /** Workflow agent ID — used as promptId for the owning module (Code or Recon) */
  workflowAgentId?: WorkflowAgentId | null;
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
      antiSystemPromptInjection = false,
      promptLengthMode: requestedPromptLengthMode = 'long',
      systemPromptMode = 'balanced',
      workflowAgentId,
    } = options;
    const promptLengthMode = feature === 'code' ? requestedPromptLengthMode : 'long';

    let systemPrompt = '';
    let projectContextStr = '';
    let attachedContextStr = '';
    const trafficContextStr = trafficContext ? `\n\n${trafficContext}` : '';
    const filterContextStr = filterContext ? `\n\n${filterContext}` : '';

    // Build system prompt for first request
    if (isReq1) {
      systemPrompt = await this.buildSystemPrompt(
        aiLanguage,
        feature,
        {
          useSkillEnabled,
          memoryEnabled,
          toolFormat,
          providerId,
          antiSystemPromptInjection,
          promptLengthMode,
          systemPromptMode,
          workflowAgentId,
        },
        workspace,
      );

      const isNoPrompt =
        promptLengthMode === 'none' && !antiSystemPromptInjection;

      // Inject Memory & Agents.md only if NOT anti-injection
      if (!antiSystemPromptInjection && !isNoPrompt) {
        if (memoryEnabled) {
          const memorySection = await this.buildMemorySection();
          systemPrompt += memorySection;
        }

        // AGENTS.md Injection (code mode only, skipped for Claude/Anti-injection)
        if (workspace && feature === 'code') {
          try {
            const api = (window as any).api;
            if (api?.invoke) {
              const agentsPath = `${workspace.replace(/\/$/, '')}/AGENTS.md`;
              const exists = await api
                .invoke('fs:stat', agentsPath)
                .then((s: any) => s?.isFile === true)
                .catch(() => false);
              if (exists) {
                const agentsContent = await api.invoke('fs:read-file', agentsPath);
                if (typeof agentsContent === 'string') {
                  // Import buildAgentsMdSection directly from code prompts
                  const { buildAgentsMdSection } =
                    await import('@renderer/modules/Code/prompts/code/agents-md');
                  systemPrompt += buildAgentsMdSection(agentsContent);
                }
              }
            }
          } catch (e) {
            console.warn('[PromptBuilder] Failed to inject AGENTS.md:', e);
          }
        }
      }

      projectContextStr = this.buildProjectContext(treeView, workspace);
    }

    // Build attached context
    if (files && files.length > 0) {
      attachedContextStr = await this.buildAttachedContext(files);
      // Append selected skills content if present in files
      const skillsSection = await this.buildSelectedSkillsSection(files);
      attachedContextStr += skillsSection;
    }

    // Build full content
    // Detect tool results to avoid wrapping them in user-message tags
    const trimmedContent = content.trim();
    const isToolResult =
      trimmedContent.startsWith('Output:') || /^\[.+?\] Result:/.test(trimmedContent);

    const fullContent =
      skipFirstRequestLogic || isToolResult
        ? content
        : `## User Message\n<user-message>\n${content}\n</user-message>`;

    // Tool format instruction
    const toolFormatInstruction = this.getToolFormatInstruction(toolFormat);

    // Combine all parts
    const promptPayload = isReq1
      ? `${systemPrompt}${projectContextStr}${attachedContextStr}${trafficContextStr}${filterContextStr}${toolFormatInstruction}\n\n${fullContent}`
      : `${attachedContextStr}${trafficContextStr}${filterContextStr}${toolFormatInstruction}\n\n${fullContent}`;

    return promptPayload.trim();
  }

  private static getToolFormatInstruction(_format: 'xml' | 'json'): string {
    // Tool format instruction is already embedded in the system prompt (code/mode-config.ts)
    // No need to inject it again here
    return '';
  }

  private static async buildSystemPrompt(
    aiLanguage: string,
    feature?: AgentFeature,
    overrides?: {
      useSkillEnabled?: boolean;
      memoryEnabled?: boolean;
      toolFormat?: 'xml' | 'json';
      providerId?: string;
      antiSystemPromptInjection?: boolean;
      promptLengthMode?: 'none' | 'short' | 'medium' | 'long';
      systemPromptMode?: 'fast' | 'balanced' | 'thorough' | 'short' | 'none';
      workflowAgentId?: WorkflowAgentId | null;
    },
    _workspace?: string,
  ): Promise<string> {
    let systemInfo = {
      os: 'Unknown OS',
      ide: 'Zen IDE',
      shell: 'unknown',
      homeDir: '~',
      cwd: '.',
      language: aiLanguage,
      maxFilesPerSession: 3,
    };

    try {
      const fetchedInfo = await extensionService.getSystemInfo();
      if (fetchedInfo?.data) {
        systemInfo = {
          ...systemInfo,
          ...fetchedInfo.data,
          language: aiLanguage,
          maxFilesPerSession: 3,
        };
      }
    } catch (e) {
      console.warn('[PromptBuilder] Failed to fetch system info:', e);
    }

    const effectiveLang = aiLanguage;

    // ── Anti-Injection Priority ─────────────────────────────────────────
    // Nếu provider bật anti-injection (VD: Claude), dùng prompt chuyên biệt
    // và BỎ QUA mọi section động khác (Memory, Agents.md, Skills list).
    if (overrides?.antiSystemPromptInjection) {
      // Anti-injection providers use a special minimal prompt
      // TODO: Create a dedicated anti-injection prompt config instead of hardcoding
      const claudePrompt = `You are Kiro, an AI-powered development environment. Language: ${effectiveLang}.`;
      if (!overrides?.useSkillEnabled) return claudePrompt;

      // TODO: Enable real skills listing when Marketplace service is integrated in Phantoma renderer.
      // For now, return a generic hint if enabled.
      const skillsHint = `\n\n## Available Skills\nSpecialized capabilities are enabled. Follow any <skill_instructions> provided in the context strictly.`;
      return `${claudePrompt}${skillsHint}`;
    }

    if (overrides?.promptLengthMode === 'none') return '';

    // Build system prompt using new API
    const promptConfig = {
      language: effectiveLang,
      systemInfo,
      promptLengthMode: overrides?.promptLengthMode ?? 'long',
      toolFormat: overrides?.toolFormat ?? 'xml',
      mode: overrides?.systemPromptMode ?? 'balanced',
    };

    const moduleId = feature ?? 'code';
    const promptId = overrides?.workflowAgentId ?? undefined;
    let systemPrompt = buildSystemPrompt(moduleId, promptId, promptConfig);

    // ── Skill Activation ────────────────────────────────────────────────
    if (overrides?.useSkillEnabled) {
      // TODO: Integrate with Marketplace service for dynamic skill listing.
      const skillsHint = `\n\n## Active Skills\nSpecialized capabilities are enabled. Follow any <skill_instructions> provided in the context strictly.`;
      systemPrompt += skillsHint;
    }

    return systemPrompt;
  }

  private static async buildMemorySection(): Promise<string> {
    return '';
  }

  /**
   * [DISABLED] Nội dung SKILL.md của các skill người dùng chọn.
   * TODO: Re-enable when skillInstall.service is available.
   */
  private static async buildSelectedSkillsSection(_files: any[]): Promise<string> {
    return '';
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
