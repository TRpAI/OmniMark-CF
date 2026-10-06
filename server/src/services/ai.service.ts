import { GoogleGenAI } from '@google/genai';

interface SiteInfoResult {
  title: string;
  description: string;
  tags: string[];
  suggestedCategory?: string;
  favicon?: string;
}

interface SiteSummaryResult {
  oneSentenceSummary: string;
  coreFeatures: string[];
  targetAudience: string[];
  keyHighlights: string[];
  recommendedUsage: string;
  relatedKeywords: string[];
}

export class AiService {
  private getClient(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({ apiKey });
  }

  /**
   * 抓取网页基础元信息（兜底或为 AI 提供参考上下文）
   */
  private async fetchRawMetadata(targetUrl: string): Promise<{ title?: string; description?: string; keywords?: string; favicon?: string }> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OmniMarkBot/2.0; +https://omnimark.dev)',
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) return {};

      const html = await res.text();
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : undefined;

      const descMatch =
        html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
      const description = descMatch ? descMatch[1].trim() : undefined;

      const keywordsMatch = html.match(/<meta[^>]+name=["']keywords["'][^>]+content=["']([^"']+)["']/i);
      const keywords = keywordsMatch ? keywordsMatch[1].trim() : undefined;

      // Favicon fallback
      let favicon: string | undefined;
      const iconMatch = html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i);
      if (iconMatch) {
        const rawIcon = iconMatch[1];
        try {
          favicon = new URL(rawIcon, targetUrl).href;
        } catch {}
      }
      if (!favicon) {
        try {
          const u = new URL(targetUrl);
          favicon = `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=128`;
        } catch {}
      }

      return { title, description, keywords, favicon };
    } catch {
      return {};
    }
  }

  /**
   * 智能提取与整理站点信息（用于添加/编辑书签时一键自动填写）
   */
  async analyzeSiteInfo(targetUrl: string, existingCategories: string[] = []): Promise<SiteInfoResult> {
    if (!targetUrl || !targetUrl.trim()) {
      throw new Error('请提供有效的目标网址');
    }

    let normalizedUrl = targetUrl.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    // 1. 预先抓取网页元数据作为事实依据
    const rawMeta = await this.fetchRawMetadata(normalizedUrl);
    let parsedHostname = '';
    try {
      parsedHostname = new URL(normalizedUrl).hostname;
    } catch {}

    const ai = this.getClient();
    if (!ai) {
      // 若未配置 GEMINI_API_KEY，优雅回退到元数据提取，不中断用户体验
      const defaultTitle = rawMeta.title || parsedHostname || '新站点';
      const defaultDesc = rawMeta.description || `${parsedHostname} 站点导航与资源链接。`;
      const defaultTags = rawMeta.keywords
        ? rawMeta.keywords.split(/[,，]/).map(t => t.trim()).filter(Boolean).slice(0, 4)
        : ['网络资源', '常用站点'];

      return {
        title: defaultTitle,
        description: defaultDesc,
        tags: defaultTags,
        suggestedCategory: existingCategories[0] || '常用工具',
        favicon: rawMeta.favicon || `https://www.google.com/s2/favicons?domain=${parsedHostname}&sz=128`,
      };
    }

    // 2. 调用 Gemini 3.8 Flash 提取并生成专业结构化信息
    const prompt = `你是一个专业的互联网网站分析与信息架构专家。请针对以下网址，提炼并生成最适合收录进导航书签系统的中文信息：

目标网址: ${normalizedUrl}
域名: ${parsedHostname}
预抓取网页标题: ${rawMeta.title || '无'}
预抓取网页描述: ${rawMeta.description || '无'}
预抓取网页关键词: ${rawMeta.keywords || '无'}
当前系统现有的可选分类列表: ${JSON.stringify(existingCategories)}

请以严格的 JSON 格式输出（不要添加 markdown 格式代码块，直接输出纯 JSON 字符串）：
{
  "title": "简练、准确、通用的站点名称（如 'GitHub', 'Figma 设计工具'，不要堆砌 SEO 垃圾长标题，30字以内）",
  "description": "50~100字左右的高质量中文简介，概括该网站的核心定位、主打功能与目标受众，语句通顺专业",
  "tags": ["3到5个精炼中文标签，如 '代码托管', '开源社区', '效率工具' 等"],
  "suggestedCategory": "从当前可选分类列表中选择最契合的一项；若无完全契合的，给出一个合理的中文分类建议",
  "favicon": "官方 favicon 图标 URL，如果无法确定留空字符串"
}`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const responseText = response.text?.trim() || '';
      const cleanJson = responseText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      const parsed = JSON.parse(cleanJson);

      return {
        title: parsed.title || rawMeta.title || parsedHostname,
        description: parsed.description || rawMeta.description || `${parsedHostname} 站点导航与资源链接。`,
        tags: Array.isArray(parsed.tags) && parsed.tags.length > 0 ? parsed.tags : ['精选站点'],
        suggestedCategory: parsed.suggestedCategory || existingCategories[0] || '默认分类',
        favicon: parsed.favicon || rawMeta.favicon || `https://www.google.com/s2/favicons?domain=${parsedHostname}&sz=128`,
      };
    } catch (err: any) {
      console.warn('Gemini analyzeSiteInfo fallback to raw metadata:', err?.message);
      return {
        title: rawMeta.title || parsedHostname || '未命名站点',
        description: rawMeta.description || `${parsedHostname} 站点资源导航。`,
        tags: ['实用站点'],
        suggestedCategory: existingCategories[0] || '常用精选',
        favicon: rawMeta.favicon || `https://www.google.com/s2/favicons?domain=${parsedHostname}&sz=128`,
      };
    }
  }

  /**
   * 站点深度智能摘要与解读
   */
  async generateSiteSummary(targetUrl: string, title?: string, description?: string): Promise<SiteSummaryResult> {
    if (!targetUrl || !targetUrl.trim()) {
      throw new Error('请提供有效的目标网址');
    }

    let normalizedUrl = targetUrl.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    const ai = this.getClient();
    if (!ai) {
      // 离线/无 API Key 默认结构
      return {
        oneSentenceSummary: title ? `${title} 是一个实用的数字网络资源服务。` : '现代化网络站点与在线工具。',
        coreFeatures: [
          description || '提供在线核心功能与服务访问',
          '支持浏览器直达与跨设备协同',
          '界面现代简洁，交互直观',
        ],
        targetAudience: ['互联网用户与数字创作者', '效率与工具爱好者'],
        keyHighlights: ['免安装在线秒开', '稳定可靠的服务能力'],
        recommendedUsage: '点击卡片即可直达该服务，建议加入常用分类或置顶以便快速访问。',
        relatedKeywords: ['在线工具', '资源导航'],
      };
    }

    const prompt = `你是一个资深的数字产品评测专家与知识架构师。请针对以下网站进行深入、精准、客观的智能摘要与功能解读：

网址: ${normalizedUrl}
站点标题: ${title || '未知'}
已知简介: ${description || '无'}

请严格输出纯 JSON 字符串（不要使用 markdown 代码块包裹）：
{
  "oneSentenceSummary": "精炼的一句话核心定位（25~45字以内）",
  "coreFeatures": [
    "核心特性1（清晰明确，20字左右）",
    "核心特性2",
    "核心特性3",
    "核心特性4"
  ],
  "targetAudience": [
    "最适用的用户群体或典型工作场景1",
    "适用场景2"
  ],
  "keyHighlights": [
    "特色亮点或技术优势1",
    "差异化体验2"
  ],
  "recommendedUsage": "高效使用建议或操作小窍门（50~80字）",
  "relatedKeywords": ["标签1", "标签2", "标签3", "标签4"]
}`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const responseText = response.text?.trim() || '';
      const cleanJson = responseText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      const parsed = JSON.parse(cleanJson);

      return {
        oneSentenceSummary: parsed.oneSentenceSummary || `${title || '该站点'} 的在线核心服务。`,
        coreFeatures: Array.isArray(parsed.coreFeatures) ? parsed.coreFeatures : ['在线数字功能访问'],
        targetAudience: Array.isArray(parsed.targetAudience) ? parsed.targetAudience : ['互联网用户'],
        keyHighlights: Array.isArray(parsed.keyHighlights) ? parsed.keyHighlights : ['高效便捷'],
        recommendedUsage: parsed.recommendedUsage || '建议收藏常备，随时访问。',
        relatedKeywords: Array.isArray(parsed.relatedKeywords) ? parsed.relatedKeywords : ['工具', '导航'],
      };
    } catch (err: any) {
      console.warn('Gemini generateSiteSummary failed:', err?.message);
      return {
        oneSentenceSummary: `${title || '该站点'} 提供了便捷的在线服务与工具支持。`,
        coreFeatures: [description || '核心功能服务', '支持多端快捷浏览与直达'],
        targetAudience: ['工具使用者与数字探索者'],
        keyHighlights: ['随开随用，高效直达'],
        recommendedUsage: '直接通过导航卡片访问即可使用全部功能。',
        relatedKeywords: ['在线工具', '精选资源'],
      };
    }
  }

  /**
   * 全站书签智能问答与寻宝助手
   */
  async askAssistant(query: string, bookmarksContext: Array<{ title: string; url: string; description?: string; tags?: string[]; categoryName?: string }>): Promise<{ answer: string; recommendedBookmarks: Array<{ title: string; url: string }> }> {
    if (!query || !query.trim()) {
      throw new Error('请输入您的问题或需求');
    }

    const ai = this.getClient();
    if (!ai) {
      // 简单关键词匹配回退
      const keywords = query.toLowerCase().split(/\s+/);
      const matched = bookmarksContext.filter(b => {
        const text = `${b.title} ${b.description || ''} ${(b.tags || []).join(' ')} ${b.categoryName || ''}`.toLowerCase();
        return keywords.some(k => text.includes(k));
      }).slice(0, 5);

      if (matched.length > 0) {
        return {
          answer: `为您在现有书签库中找到以下相关站点：\n\n` + matched.map(m => `* **[${m.title}](${m.url})** - ${m.description || '点击直达'}`).join('\n'),
          recommendedBookmarks: matched.map(m => ({ title: m.title, url: m.url })),
        };
      }
      return {
        answer: '未在当前书签库中匹配到完全相关的站点，建议尝试输入更具体的工具或分类关键词。',
        recommendedBookmarks: [],
      };
    }

    // 限制书签上下文长度，防止超出 Prompt 边界
    const compactBookmarks = (bookmarksContext || []).slice(0, 100).map(b => ({
      title: b.title,
      url: b.url,
      description: b.description || '',
      tags: b.tags || [],
      category: b.categoryName || '',
    }));

    const prompt = `你是一个智能书签知识库助理。用户正在向你咨询或寻找合适的网站、工具和资源。

用户的提问: "${query.trim()}"

用户收藏夹中的全量书签库（JSON格式，共 ${compactBookmarks.length} 项）：
${JSON.stringify(compactBookmarks, null, 2)}

请按以下要求回答：
1. 深入理解用户的真实意图（如开发、设计、办公、娱乐、AI模型等）。
2. 优先从用户已有的书签库中寻找最匹配的工具，并给出清晰、有说服力的推荐理由。若书签库中有匹配项，请在正文中以 Markdown 链接格式引用：[站点名称](网址)。
3. 如果书签库中没有完全匹配的项，请真诚指出，并可结合你的知识给出 1~2 个公认顶尖的推荐，同时建议用户将其收录到 OmniMark。
4. 语言亲切、专业、排版清晰精美，适当使用 emoji 与项目符号。

请严格输出 JSON 格式（不要添加 markdown 格式代码块，直接输出纯 JSON 字符串）：
{
  "answer": "包含排版精美 Markdown 文本的完整回答",
  "recommendedBookmarks": [
    { "title": "推荐的站点名称", "url": "对应的完整网址" }
  ]
}`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const responseText = response.text?.trim() || '';
      const cleanJson = responseText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      const parsed = JSON.parse(cleanJson);

      return {
        answer: parsed.answer || responseText,
        recommendedBookmarks: Array.isArray(parsed.recommendedBookmarks) ? parsed.recommendedBookmarks : [],
      };
    } catch (err: any) {
      console.warn('Gemini askAssistant failed:', err?.message);
      return {
        answer: `抱歉，分析您的需求时出现临时波动：${err?.message || '请稍后再试'}。`,
        recommendedBookmarks: [],
      };
    }
  }
}

export const aiService = new AiService();
