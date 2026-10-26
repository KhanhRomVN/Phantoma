/**
 * ------------------------------------------------------------------
 * Lưu trữ hội thoại
 * ------------------------------------------------------------------
 * Lưu trữ bền vững cho các hội thoại, dùng CHUNG nguồn với Zen.
 *
 * Cấu trúc lưu trữ (giống Zen PathService):
 *   ~/.khanhromvn-zen/projects/{md5(folderPath)}/{conversationId}/{conversationId}.json
 *
 * Định dạng file JSON giống Zen: { messages, backendConversationId, metadata, ... }
 * Key hash = folderPath (đường dẫn project); nếu không có thì dùng moduleId.
 *
 * Hàm chính:
 * - saveConversation()      : Ghi một hội thoại xuống đĩa
 * - getConversation()       : Đọc một hội thoại theo ID
 * - listConversations()     : Liệt kê các ID hội thoại cho một project
 * - deleteConversation()    : Xóa một hội thoại đơn lẻ
 * - deleteAllConversations(): Xóa tất cả hội thoại cho một project
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Node.js ──
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

// ── Internal ──
import { logger } from '../utils/logger';

// ─── Interfaces ─────────────────────────────────────────────────────────
export interface ConversationData {
  conversationId: string;
  title?: string;
  backendConversationId?: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    timestamp: number;
    tokenUsage?: number;
    conversationId?: string;
  }>;
  toolOutputs?: Record<
    string,
    {
      output: string;
      isError: boolean;
      terminalId?: string;
    }
  >;
  questionAnswers?: Record<string, string>;
  singleLineReviewActions?: Record<string, any>;
  conversationFileStats?: {
    totalFiles: number;
    totalAdditions: number;
    totalDeletions: number;
    responseNumber?: number;
  };
  /** Per-conversation feature overrides (3-mode Phantoma: code/emulate/recon) */
  conversationOverrides?: {
    diagnosticEnabled?: boolean;
    useSkillEnabled?: boolean;
    memoryEnabled?: boolean;
    toolFormat?: 'xml' | 'json';
    workflowAgentId?: 'orchestrator' | 'planner' | 'executor' | 'reviewer' | null;
  };
  createdAt: number;
  lastModified: number;
}

// ─── Class ──────────────────────────────────────────────────────────────
export class ConversationStorage {
  private readonly contextRoot: string;

  constructor() {
    // ASSUMED: dùng cùng root với Zen (PathService.getContextRoot)
    this.contextRoot = path.join(os.homedir(), '.khanhromvn-zen');
  }

  private getProjectDir(moduleId: string, folderPath?: string | null): string {
    const hash = crypto
      .createHash('md5')
      .update(folderPath || moduleId)
      .digest('hex');
    return path.join(this.contextRoot, 'projects', hash);
  }

  private getConversationDir(
    moduleId: string,
    conversationId: string,
    folderPath?: string | null,
  ): string {
    return path.join(this.getProjectDir(moduleId, folderPath), conversationId);
  }

  private getConversationPath(
    moduleId: string,
    conversationId: string,
    folderPath?: string | null,
  ): string {
    return path.join(
      this.getConversationDir(moduleId, conversationId, folderPath),
      `${conversationId}.json`,
    );
  }

  private getLegacyConversationPath(
    moduleId: string,
    conversationId: string,
    folderPath?: string | null,
  ): string {
    return path.join(this.getProjectDir(moduleId, folderPath), `${conversationId}.json`);
  }

  private ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  private fromDisk(conversationId: string, raw: any): ConversationData | null {
    if (Array.isArray(raw)) {
      const last = raw[raw.length - 1];
      const ts = Number(last?.timestamp) || Date.now();
      return { conversationId, messages: raw, createdAt: ts, lastModified: ts };
    }
    if (!raw || !Array.isArray(raw.messages)) return null;
    const meta = raw.metadata || {};
    return {
      conversationId,
      title: meta.title,
      backendConversationId: raw.backendConversationId,
      messages: raw.messages.map((m: any) => ({ ...m, tokenUsage: m.tokenUsage ?? m.token_usage })),
      toolOutputs: raw.toolOutputs,
      questionAnswers: raw.questionAnswers,
      singleLineReviewActions: raw.singleLineReviewActions,
      conversationFileStats: raw.conversationFileStats,
      conversationOverrides:
        meta.conversationOverrides ??
        (meta.useSkillEnabled !== undefined ||
        meta.diagnosticEnabled !== undefined ||
        meta.toolFormat
          ? {
              diagnosticEnabled: meta.diagnosticEnabled,
              useSkillEnabled: meta.useSkillEnabled,
              toolFormat: meta.toolFormat,
            }
          : undefined),
      createdAt: meta.createdAt || meta.lastModified || Date.now(),
      lastModified: meta.lastModified || meta.createdAt || Date.now(),
    };
  }

  private async readRaw(filePath: string): Promise<any | null> {
    try {
      return JSON.parse(await fs.promises.readFile(filePath, 'utf-8'));
    } catch {
      return null;
    }
  }

  async saveConversation(
    moduleId: string,
    conversationId: string,
    data: ConversationData,
    folderPath?: string | null,
  ): Promise<void> {
    const filePath = this.getConversationPath(moduleId, conversationId, folderPath);
    this.ensureDir(path.dirname(filePath));

    data.lastModified = data.lastModified || Date.now();
    if (!data.createdAt) {
      data.createdAt = Date.now();
    }

    const existing = await this.readRaw(filePath);
    const existingMeta = existing && !Array.isArray(existing) ? existing.metadata || {} : {};
    const overrides = data.conversationOverrides ?? existingMeta.conversationOverrides;
    const userMessages = data.messages.filter((m) => m.role === 'user');
    const totalTokenUsage = data.messages.reduce((sum, m) => sum + (m.tokenUsage || 0), 0);

    const out: any = {
      messages: data.messages.map((m) => ({
        ...m,
        token_usage: m.tokenUsage ?? (m as any).token_usage,
      })),
      backendConversationId: data.backendConversationId,
      metadata: {
        ...existingMeta,
        id: conversationId,
        title: data.title ?? existingMeta.title,
        createdAt: data.createdAt,
        lastModified: data.lastModified,
        messageCount: data.messages.length,
        totalRequests: userMessages.length,
        totalTokenUsage,
        folderPath: folderPath ?? existingMeta.folderPath,
        diagnosticEnabled: overrides?.diagnosticEnabled,
        useSkillEnabled: overrides?.useSkillEnabled,
        toolFormat: overrides?.toolFormat,
        conversationOverrides: overrides,
      },
    };
    if (data.toolOutputs && Object.keys(data.toolOutputs).length > 0) {
      out.toolOutputs = data.toolOutputs;
    }
    if (data.questionAnswers && Object.keys(data.questionAnswers).length > 0) {
      out.questionAnswers = data.questionAnswers;
    }
    if (data.singleLineReviewActions && Object.keys(data.singleLineReviewActions).length > 0) {
      out.singleLineReviewActions = data.singleLineReviewActions;
    }
    if (data.conversationFileStats) {
      out.conversationFileStats = data.conversationFileStats;
    }

    await fs.promises.writeFile(filePath, JSON.stringify(out, null, 2), 'utf-8');
  }

  async getConversation(
    moduleId: string,
    conversationId: string,
    folderPath?: string | null,
  ): Promise<ConversationData | null> {
    const raw =
      (await this.readRaw(this.getConversationPath(moduleId, conversationId, folderPath))) ||
      (await this.readRaw(this.getLegacyConversationPath(moduleId, conversationId, folderPath)));
    if (!raw) {
      return null;
    }
    return this.fromDisk(conversationId, raw);
  }

  async listConversations(moduleId: string, folderPath?: string | null): Promise<string[]> {
    const dirPath = this.getProjectDir(moduleId, folderPath);
    if (!fs.existsSync(dirPath)) {
      // Project chưa có conversation nào — không phải lỗi, trả rỗng.
      return [];
    }
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      const ids: string[] = [];
      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (fs.existsSync(path.join(dirPath, entry.name, `${entry.name}.json`))) {
            ids.push(entry.name);
          }
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          ids.push(entry.name.replace('.json', ''));
        }
      }
      return ids;
    } catch (error) {
      logger.warn(`[ConversationStorage] Failed to list conversations for ${moduleId}:`, error);
      return [];
    }
  }

  async deleteConversation(
    moduleId: string,
    conversationId: string,
    folderPath?: string | null,
  ): Promise<void> {
    try {
      await fs.promises.rm(this.getConversationDir(moduleId, conversationId, folderPath), {
        recursive: true,
        force: true,
      });
      await fs.promises
        .unlink(this.getLegacyConversationPath(moduleId, conversationId, folderPath))
        .catch(() => {});
    } catch (error) {
      logger.warn(`[ConversationStorage] Failed to delete conversation ${conversationId}:`, error);
    }
  }

  async deleteAllConversations(moduleId: string, folderPath?: string | null): Promise<void> {
    const dirPath = this.getProjectDir(moduleId, folderPath);
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() || (entry.isFile() && entry.name.endsWith('.json'))) {
          await fs.promises.rm(path.join(dirPath, entry.name), { recursive: true, force: true });
        }
      }
    } catch (error) {
      logger.warn(
        `[ConversationStorage] Failed to delete all conversations for ${moduleId}:`,
        error,
      );
    }
  }

  /**
   * Update only the title of a conversation (metadata.title, giống Zen).
   */
  async updateConversationTitle(
    moduleId: string,
    conversationId: string,
    title: string,
    folderPath?: string | null,
  ): Promise<boolean> {
    const filePath = this.getConversationPath(moduleId, conversationId, folderPath);
    const raw = await this.readRaw(filePath);
    if (!raw || Array.isArray(raw)) {
      logger.warn(
        `[ConversationStorage] Cannot set title — conversation ${conversationId} not found in ${moduleId}`,
      );
      return false;
    }
    try {
      raw.metadata = { ...(raw.metadata || {}), title, lastModified: Date.now() };
      await fs.promises.writeFile(filePath, JSON.stringify(raw, null, 2), 'utf-8');
      return true;
    } catch (err: any) {
      logger.error('[ConversationStorage] Failed to update title:', err.message);
      return false;
    }
  }
}
