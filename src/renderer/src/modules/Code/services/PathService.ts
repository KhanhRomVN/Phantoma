/**
 * PathService — Quản lý đường dẫn tập trung cho Code module.
 *
 * ?Usage:
 *   const ps = PathService.getInstance();
 *   const projectDir = ps.getProjectContextDir(workspacePath);
 *
 * ?Function:
 *   getContextRoot()       : Trả về đường dẫn gốc cho storage.
 *   getProjectContextDir() : Trả về đường dẫn context cho project.
 *
 * ?Note:
 *   Port từ temp/Zen/src/services/PathService.ts.
 *   Adapt: thay os.homedir() + crypto.hash → dùng project path trực tiếp.
 *   Trong Electron renderer, không có quyền truy cập os.homedir() trực tiếp,
 *   nên dùng localStorage key prefix thay vì file system path.
 */

export class PathService {
  private static instance: PathService;

  private constructor() {}

  public static getInstance(): PathService {
    if (!PathService.instance) {
      PathService.instance = new PathService();
    }
    return PathService.instance;
  }

  /**
   * Trả về context root. Trong Code module (Electron renderer),
   * dùng localStorage prefix thay vì đường dẫn file system.
   */
  public getContextRoot(): string {
    return 'code_context';
  }

  /**
   * Trả về project context dir dựa trên project path.
   * Dùng project path làm key prefix cho localStorage.
   */
  public getProjectContextDir(projectPath: string): string {
    // Sanitize path thành key hợp lệ cho localStorage
    const sanitized = projectPath
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .toLowerCase();
    return `${this.getContextRoot()}:${sanitized}`;
  }
}