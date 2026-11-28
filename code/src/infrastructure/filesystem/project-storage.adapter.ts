import fs from 'fs';
import path from 'path';
import type { ProjectStoragePort } from '../../application/ports/project-storage.port';

export class ProjectStorageAdapter implements ProjectStoragePort {
  constructor(private readonly dataDir: string) {}

  removeProjectDir(projectId: string): void {
    fs.rmSync(path.join(this.dataDir, projectId), { recursive: true, force: true });
  }
}