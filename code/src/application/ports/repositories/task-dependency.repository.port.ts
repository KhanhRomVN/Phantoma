export interface TaskDependencyRepositoryPort {
  listByTask(taskId: string): string[];
  insert(taskId: string, dependsOnId: string): void;
  remove(taskId: string, dependsOnId: string): boolean;
  removeByTask(taskId: string): number;
}