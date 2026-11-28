import type { ImagePort, SquareImage } from '../../ports/filesystem.port';
import type { PathAccessPort } from '../../ports/path-access.port';

export class ImageService {
  constructor(
    private readonly images: ImagePort,
    private readonly pathAccess: PathAccessPort,
  ) {}

  async scanSquareImages(rawProjectPath: unknown): Promise<SquareImage[]> {
    const projectPath = this.pathAccess.safePath(rawProjectPath, 'projectPath');
    return this.images.scanSquareImages(projectPath);
  }

  async readImageDataUrl(rawFilePath: unknown): Promise<string | null> {
    const filePath = this.pathAccess.safePath(rawFilePath, 'filePath');
    return this.images.readImageDataUrl(filePath);
  }

  async downloadProjectLogo(url: string): Promise<{ success: boolean; path?: string; error?: string }> {
    return this.images.downloadProjectLogo(url);
  }
}