/**
 * ------------------------------------------------------------------
 * Lưu trữ hội thoại
 * ------------------------------------------------------------------
 * Lưu trữ bền vững cho các hội thoại trong thư mục home của người dùng.
 * Xử lý CRUD file JSON cho dữ liệu hội thoại theo từng module.
 *
 * Hàm chính:
 * - saveConversation()      : Ghi một hội thoại xuống đĩa
 * - getConversation()       : Đọc một hội thoại theo ID
 * - listConversations()     : Liệt kê các ID hội thoại cho một module
 * - deleteConversation()    : Xóa một hội thoại đơn lẻ
 * - deleteAllConversations(): Xóa tất cả hội thoại cho một module
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Node.js ──
import fs from 'fs';
import path from 'path';
import os from 'os';

// ── Internal ──
import { logger } from '../utils/logger';

// ─── Interfaces ─────────────────────────────────────────────────────────
export interface ConversationData {
  conversationId: string;
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
  createdAt: number;
  lastModified: number;
}

// ─── Class ──────────────────────────────────────────────────────────────
export class ConversationStorage {
  private readonly baseDir: string;

  constructor() {
    this.baseDir = path.join(os.homedir(), '.phantoma', 'conversations');
  }

  /**
   * Get the full path for a conversation file
   */
  private getConversationPath(moduleId: string, conversationId: string): string {
    return path.join(this.baseDir, moduleId, `${conversationId}.json`);
  }

  /**
   * Ensure the directory exists
   */
  private ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Save a conversation
   */
  async saveConversation(
    moduleId: string,
    conversationId: string,
    data: ConversationData,
  ): Promise<void> {
    const filePath = this.getConversationPath(moduleId, conversationId);
    const dir = path.dirname(filePath);
    this.ensureDir(dir);

    // Update lastModified
    data.lastModified = Date.now();

    // If conversation doesn't have createdAt, set it
    if (!data.createdAt) {
      data.createdAt = Date.now();
    }

    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Get a conversation
   */
  async getConversation(
    moduleId: string,
    conversationId: string,
  ): Promise<ConversationData | null> {
    const filePath = this.getConversationPath(moduleId, conversationId);
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return JSON.parse(content) as ConversationData;
    } catch (error: any) {
      // File not found or read error
      logger.warn(`[ConversationStorage] Failed to read conversation ${conversationId}:`, error.message);
      return null;
    }
  }

  /**
   * List all conversation IDs for a module
   */
  async listConversations(moduleId: string): Promise<string[]> {
    const dirPath = path.join(this.baseDir, moduleId);
    try {
      const entries = await fs.promises.readdir(dirPath);
      return entries
        .filter((entry) => entry.endsWith('.json'))
        .map((entry) => entry.replace('.json', ''));
    } catch (error) {
      logger.warn(`[ConversationStorage] Failed to list conversations for ${moduleId}:`, error);
      return [];
    }
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(moduleId: string, conversationId: string): Promise<void> {
    const filePath = this.getConversationPath(moduleId, conversationId);
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      // Ignore if file doesn't exist
      logger.warn(`[ConversationStorage] Failed to delete conversation ${conversationId}:`, error);
    }
  }

  /**
   * Delete all conversations for a module
   */
  async deleteAllConversations(moduleId: string): Promise<void> {
    const dirPath = path.join(this.baseDir, moduleId);
    try {
      await fs.promises.rm(dirPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore if directory doesn't exist
      logger.warn(`[ConversationStorage] Failed to delete all conversations for ${moduleId}:`, error);
    }
  }
}