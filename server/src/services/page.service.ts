import crypto from 'crypto';
import { pageRepository } from '../repositories/page.repository';
import { CustomPage } from '../../../packages/shared/types';

export interface CreatePageDTO {
  title: string;
  slug?: string;
  icon?: string;
  content: string;
  linkUrl?: string;
  openInNewTab?: boolean;
  isPrivate?: boolean;
  sortOrder?: number;
}

export class PageService {
  async list(isAuthenticated = false): Promise<CustomPage[]> {
    let pages = await pageRepository.findAll();
    if (!isAuthenticated) {
      pages = pages.filter((p) => !p.isPrivate);
    }
    return pages;
  }

  async getById(id: string, isAuthenticated = false): Promise<CustomPage | null> {
    const page = await pageRepository.findById(id);
    if (!page) return null;
    if (page.isPrivate && !isAuthenticated) {
      return null;
    }
    return page;
  }

  async create(data: CreatePageDTO): Promise<CustomPage> {
    if (!data.title || !data.title.trim()) {
      throw new Error('页面标题不能为空');
    }

    const all = await pageRepository.findAll();
    const sortOrder = data.sortOrder ?? (all.length > 0 ? Math.max(...all.map((p) => p.sortOrder)) + 1 : 1);

    const newPage: CustomPage = {
      id: 'page-' + crypto.randomUUID(),
      title: data.title.trim(),
      slug: data.slug?.trim() || '',
      icon: data.icon?.trim() || 'FileText',
      content: data.content || '',
      linkUrl: data.linkUrl?.trim() || '',
      openInNewTab: Boolean(data.openInNewTab),
      isPrivate: Boolean(data.isPrivate),
      sortOrder,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return pageRepository.insert(newPage);
  }

  async update(id: string, data: Partial<CreatePageDTO>): Promise<CustomPage> {
    const existing = await pageRepository.findById(id);
    if (!existing) {
      throw new Error('自定义页面不存在');
    }

    const updated = await pageRepository.update(id, {
      ...data,
      ...(data.title ? { title: data.title.trim() } : {}),
      ...(data.linkUrl !== undefined ? { linkUrl: data.linkUrl.trim() } : {}),
    });

    if (!updated) {
      throw new Error('更新自定义页面失败');
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    const deleted = await pageRepository.delete(id);
    if (!deleted) {
      throw new Error('页面未找到或已删除');
    }
  }

  async reorder(items: { id: string; sortOrder: number }[]): Promise<void> {
    await pageRepository.reorder(items);
  }
}

export const pageService = new PageService();
