export interface Group {
  id: string;
  name: string;
  iconId: string | null;
  sortOrder: number;
  isOpen: boolean;
  createdAt: string;
  updatedAt: string;
}