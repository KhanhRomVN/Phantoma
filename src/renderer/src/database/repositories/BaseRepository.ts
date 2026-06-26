import { db } from '../Database';

export abstract class BaseRepository<T, TCreate = Omit<T, 'id'>> {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  abstract toModel(row: any): T;
  abstract toRow(model: T | TCreate): any;

  async getAll(): Promise<T[]> {
    const rows = await db.execute(`SELECT * FROM ${this.tableName} ORDER BY updated_at DESC`);
    return rows.map(row => this.toModel(row));
  }

  async getById(id: string): Promise<T | null> {
    const row = await db.executeSingle(
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
    return row ? this.toModel(row) : null;
  }

  async getByField(field: string, value: any): Promise<T[]> {
    const rows = await db.execute(
      `SELECT * FROM ${this.tableName} WHERE ${field} = ? ORDER BY updated_at DESC`,
      [value]
    );
    return rows.map(row => this.toModel(row));
  }

  async create(model: TCreate): Promise<T> {
    const row = this.toRow(model);
    const keys = Object.keys(row);
    const placeholders = keys.map(() => '?').join(', ');
    const values = Object.values(row);

    await db.run(
      `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders})`,
      values
    );

    // Lấy lại record vừa tạo
    const created = await this.getById(row.id);
    if (!created) {
      throw new Error(`Failed to retrieve created record with id: ${row.id}`);
    }
    return created;
  }

  async update(id: string, model: Partial<T>): Promise<T | null> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Record with id ${id} not found`);
    }

    // Merge existing với model mới
    const merged = { ...existing, ...model };
    const row = this.toRow(merged);
    const keys = Object.keys(row);
    const sets = keys.map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(row), id];

    await db.run(
      `UPDATE ${this.tableName} SET ${sets}, updated_at = unixepoch() WHERE id = ?`,
      values
    );

    return this.getById(id);
  }

  async upsert(model: T | TCreate): Promise<T> {
    const row = this.toRow(model);
    const existing = await this.getById(row.id);
    
    if (existing) {
      // Update
      const updated = await this.update(row.id, row);
      if (!updated) {
        throw new Error(`Failed to update record with id: ${row.id}`);
      }
      return updated;
    } else {
      // Create
      return this.create(model as TCreate);
    }
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.run(
      `DELETE FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
    return result.changes > 0;
  }

  async deleteAll(): Promise<number> {
    const result = await db.run(`DELETE FROM ${this.tableName}`);
    return result.changes;
  }

  async count(): Promise<number> {
    const row = await db.executeSingle<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName}`
    );
    return row?.count || 0;
  }

  async exists(id: string): Promise<boolean> {
    const row = await db.executeSingle<{ exists: number }>(
      `SELECT 1 as exists FROM ${this.tableName} WHERE id = ? LIMIT 1`,
      [id]
    );
    return !!row?.exists;
  }

  async bulkCreate(models: TCreate[]): Promise<T[]> {
    return db.transaction(async () => {
      const results: T[] = [];
      for (const model of models) {
        const created = await this.create(model);
        results.push(created);
      }
      return results;
    });
  }

  async bulkUpsert(models: (T | TCreate)[]): Promise<T[]> {
    return db.transaction(async () => {
      const results: T[] = [];
      for (const model of models) {
        const upserted = await this.upsert(model);
        results.push(upserted);
      }
      return results;
    });
  }

  async bulkDelete(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const placeholders = ids.map(() => '?').join(', ');
    const result = await db.run(
      `DELETE FROM ${this.tableName} WHERE id IN (${placeholders})`,
      ids
    );
    return result.changes;
  }
}