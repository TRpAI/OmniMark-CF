import { apiClient } from './client';

export interface RealFeedItem {
  id: string;
  source: string;
  sourceUrl: string;
  sourceFavicon?: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  relativeTime: string;
  tags: string[];
  readTime?: string;
  views?: number;
  likes?: number;
  isHot?: boolean;
  isFeatured?: boolean;
}

export const feedApi = {
  getLiveFeed: (forceRefresh = false) =>
    apiClient.get<RealFeedItem[]>('/feed/real', forceRefresh ? { refresh: 'true' } : undefined),
};
