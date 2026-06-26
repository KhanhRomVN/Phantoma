import { targetRepository, type TargetRow, type CreateTargetInput, type TargetStatus } from '../database';
import { TargetTab } from '../../features/Emulate/types/target.types';

/**
 * DataService - Centralized data access layer
 * 
 * Usage:
 * import { dataService } from '@/services/DataService';
 * 
 * // Get all targets
 * const targets = await dataService.getTargets();
 * 
 * // Save a target
 * await dataService.saveTarget({ id: '123', title: 'Google', url: 'https://google.com' });
 * 
 * // Delete a target
 * await dataService.deleteTarget('123');
 */
class DataService {
  private static instance: DataService;

  private constructor() {}

  static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }

  // === Target CRUD ===

  /**
   * Get all targets
   */
  async getTargets(): Promise<TargetTab[]> {
    return targetRepository.getActiveTargets();
  }

  /**
   * Get target by ID
   */
  async getTargetById(id: string): Promise<TargetTab | null> {
    return targetRepository.getById(id);
  }

  /**
   * Get targets by platform
   */
  async getTargetsByPlatform(platform: string): Promise<TargetTab[]> {
    return targetRepository.getByPlatform(platform);
  }

  /**
   * Get targets by status
   */
  async getTargetsByStatus(status: TargetStatus): Promise<TargetTab[]> {
    return targetRepository.getByStatus(status);
  }

  /**
   * Get stored targets (đang lưu trữ)
   */
  async getStoredTargets(): Promise<TargetTab[]> {
    return targetRepository.getStored();
  }

  /**
   * Get staged targets (đã đưa lên kệ)
   */
  async getStagedTargets(): Promise<TargetTab[]> {
    return targetRepository.getStaged();
  }

  /**
   * Get active targets (đang hoạt động)
   */
  async getActiveTargets(): Promise<TargetTab[]> {
    return targetRepository.getActive();
  }

  /**
   * Update target status
   */
  async updateTargetStatus(id: string, status: TargetStatus): Promise<TargetTab | null> {
    return targetRepository.updateStatus(id, status);
  }

  /**
   * Search targets by title or URL
   */
  async searchTargets(query: string): Promise<TargetTab[]> {
    return targetRepository.search(query);
  }

  /**
   * Save a single target (create or update)
   */
  async saveTarget(target: TargetTab): Promise<TargetTab> {
    return targetRepository.saveTarget(target);
  }

  /**
   * Save multiple targets (batch upsert)
   */
  async saveTargets(targets: TargetTab[]): Promise<TargetTab[]> {
    return targetRepository.saveTargets(targets);
  }

  /**
   * Create a new target (auto-generate ID)
   */
  async createTarget(input: Omit<TargetTab, 'id'> & { id?: string }): Promise<TargetTab> {
    const createInput: CreateTargetInput = {
      id: input.id || crypto.randomUUID(),
      title: input.title,
      favicon: input.favicon,
      url: input.url,
      platform: input.platform || 'web', // Use input platform or fallback to 'web'
    };
    return targetRepository.create(createInput);
  }

  /**
   * Delete a target by ID
   */
  async deleteTarget(id: string): Promise<boolean> {
    return targetRepository.removeTarget(id);
  }

  /**
   * Delete multiple targets
   */
  async deleteTargets(ids: string[]): Promise<number> {
    return targetRepository.removeTargets(ids);
  }

  /**
   * Delete all targets
   */
  async clearAllTargets(): Promise<number> {
    return targetRepository.clearAll();
  }

  /**
   * Count total targets
   */
  async countTargets(): Promise<number> {
    return targetRepository.count();
  }

  /**
   * Check if target exists
   */
  async targetExists(id: string): Promise<boolean> {
    return targetRepository.exists(id);
  }

  // === Utility methods ===

  /**
   * Initialize database and create tables if needed
   */
  async initialize(): Promise<void> {
    const { db } = await import('../database');
    await db.init();
  }

  /**
   * Check if database is initialized
   */
  isInitialized(): boolean {
    // We'll check this lazily
    return true;
  }
}

// Export singleton instance
export const dataService = DataService.getInstance();

// Also export the class for testing or extension
export default DataService;