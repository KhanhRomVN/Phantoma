export interface FileStatLike {
  size: number;
  isFile(): boolean;
  isDirectory(): boolean;
}

export interface FilePort {
  readText(filePath: string): Promise<string>;
  writeFile(filePath: string, content: string, mode?: number): Promise<void>;
  mkdirp(dirPath: string): Promise<void>;
  realpath(targetPath: string): Promise<string>;
  exists(targetPath: string): Promise<boolean>;
  stat(targetPath: string): Promise<FileStatLike>;
  copyFile(src: string, dest: string): Promise<void>;
  chmod(targetPath: string, mode: number): Promise<void>;
  unlink(filePath: string): Promise<void>;
  remove(targetPath: string): Promise<void>;
}