import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { randomUUID } from 'crypto';

export interface ActiveTargetTab {
  id: string;
  title: string;
  favicon?: string;
  url?: string;
}

class ActiveTargetStore {
  private path: string;
  private targets: ActiveTargetTab[] = [];
  private activeId: string | null = null;

  constructor() {
    this.path = path.join(app.getPath('userData'), 'active-targets.json');
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.path)) {
        const data = fs.readFileSync(this.path, 'utf8');
        const parsed = JSON.parse(data);
        this.targets = parsed.targets || [];
        this.activeId = parsed.activeId || null;
      } else {
        this.targets = [];
        this.activeId = null;
        this.save();
      }
    } catch (error) {
      console.error('[ActiveTargetStore] Failed to load targets:', error);
      this.targets = [];
      this.activeId = null;
    }
  }

  private save() {
    try {
      const dir = path.dirname(this.path);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(
        this.path,
        JSON.stringify(
          {
            targets: this.targets,
            activeId: this.activeId,
          },
          null,
          2,
        ),
      );
    } catch (error) {
      console.error('[ActiveTargetStore] Failed to save targets:', error);
    }
  }

  public getTargets(): ActiveTargetTab[] {
    return this.targets;
  }

  public getActiveId(): string | null {
    return this.activeId;
  }

  public setTargets(targets: ActiveTargetTab[], activeId: string | null) {
    this.targets = targets;
    this.activeId = activeId;
    this.save();
  }

  public addTarget(target: Omit<ActiveTargetTab, 'id'>): ActiveTargetTab {
    const newTarget: ActiveTargetTab = {
      ...target,
      id: randomUUID(),
    };
    this.targets.push(newTarget);
    this.save();
    return newTarget;
  }

  public removeTarget(id: string): boolean {
    const initialLength = this.targets.length;
    this.targets = this.targets.filter((t) => t.id !== id);
    if (this.activeId === id) {
      this.activeId = this.targets.length > 0 ? this.targets[0].id : null;
    }
    if (this.targets.length !== initialLength) {
      this.save();
      return true;
    }
    return false;
  }

  public setActiveId(id: string | null) {
    this.activeId = id;
    this.save();
  }

  public clear() {
    this.targets = [];
    this.activeId = null;
    this.save();
  }
}

export const activeTargetStore = new ActiveTargetStore();
