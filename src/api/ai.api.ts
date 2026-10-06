import { apiClient } from './client';

export interface AiSiteInfoResult {
  title: string;
  description: string;
  tags: string[];
  suggestedCategory?: string;
  favicon?: string;
}

export interface AiSiteSummaryResult {
  oneSentenceSummary: string;
  coreFeatures: string[];
  targetAudience: string[];
  keyHighlights: string[];
  recommendedUsage: string;
  relatedKeywords: string[];
}

export interface AiAssistantResult {
  answer: string;
  recommendedBookmarks: Array<{ title: string; url: string }>;
}

export const aiApi = {
  /**
   * 智能提取站点简介与信息（用于添加/编辑书签表单自动填入）
   */
  analyzeSiteInfo: (url: string, existingCategories?: string[]) =>
    apiClient.post<AiSiteInfoResult>('/ai/site-info', { url, existingCategories }),

  /**
   * 生成站点深度智能摘要
   */
  generateSiteSummary: (url: string, title?: string, description?: string) =>
    apiClient.post<AiSiteSummaryResult>('/ai/site-summary', { url, title, description }),

  /**
   * 全站书签智能问答与寻宝
   */
  askAssistant: (query: string) =>
    apiClient.post<AiAssistantResult>('/ai/assistant', { query }),

  /**
   * 自动从上游厂商动态拉取可用模型列表
   */
  fetchUpstreamModels: (provider?: string, apiKey?: string, baseUrl?: string) =>
    apiClient.post<string[]>('/ai/fetch-models', { provider, apiKey, baseUrl }),

  /**
   * 测试 AI API Token 与模型的连通性
   */
  testConnection: (provider?: string, apiKey?: string, baseUrl?: string, model?: string) =>
    apiClient.post<{ success: boolean; model: string; message: string; sampleResponse?: string }>('/ai/test-connection', {
      provider,
      apiKey,
      baseUrl,
      model,
    }),
};
