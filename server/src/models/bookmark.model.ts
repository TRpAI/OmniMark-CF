export interface BookmarkModel {
  id: string;
  categoryId: string;
  title: string;
  url: string;
  description: string;
  favicon?: string;
  tags: string[];
  clickCount: number;
  sortOrder: number;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}
