import { GoogleGenAI } from '@google/genai';
import { settingsRepository } from '../repositories/settings.repository';
import { DEFAULT_AI_PROVIDER_MODELS, DEFAULT_AI_BASE_URLS } from '../../../packages/shared/constants';

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
   * 从上游厂商自动动态获取可用模型列表
   */
  async fetchUpstreamModels(providerParam?: string, apiKeyParam?: string, baseUrlParam?: string): Promise<string[]> {
    const settings = await settingsRepository.getSettings();
    const provider = providerParam || settings.aiProvider || 'gemini';
    const apiKey = apiKeyParam?.trim() || settings.aiApiKey?.trim() || process.env.GEMINI_API_KEY || '';
    const baseUrl = baseUrlParam?.trim() || settings.aiBaseUrl?.trim() || DEFAULT_AI_BASE_URLS[provider] || '';

    if (provider === 'gemini') {
      const effectiveKey = apiKey || process.env.GEMINI_API_KEY || '';
      if (!effectiveKey) {
        throw new Error('未检测到 Gemini API Key，请先填入 Key 再从上游拉取模型列表');
      }
      const host = (baseUrl || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');
      const endpoint = `${host}/v1beta/models?key=${effectiveKey}`;
      try {
        const res = await fetch(endpoint, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          let detail = `Google API 返回异常 (${res.status})`;
          try {
            const p = JSON.parse(errText);
            if (p.error?.message) detail += `: ${p.error.message}`;
          } catch {}
          throw new Error(detail);
        }
        const data = await res.json() as any;
        if (data && Array.isArray(data.models)) {
          const modelList = data.models
            .filter((m: any) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
            .map((m: any) => m.name.replace(/^models\//, ''))
            .filter((name: string) => !name.includes('embedding') && !name.includes('aqa') && !name.includes('imagen'));
          if (modelList.length > 0) return modelList;
        }
      } catch (err: any) {
        throw new Error(err.message || '从 Google API 获取模型列表失败，请检查 API Token 是否有效');
      }
      return DEFAULT_AI_PROVIDER_MODELS.gemini;
    }

    // OpenAI, DeepSeek, Anthropic (via gateway), SiliconFlow, Moonshot, Ollama or custom OpenAI-compatible API
    const defaultBase = provider === 'deepseek' ? 'https://api.deepseek.com/v1' : 'https://api.openai.com/v1';
    let effectiveBaseUrl = (baseUrl || defaultBase).replace(/\/+$/, '');
    if (provider === 'deepseek' && !effectiveBaseUrl.includes('/v1') && !effectiveBaseUrl.includes('/chat')) {
      effectiveBaseUrl += '/v1';
    }
    const endpoint = `${effectiveBaseUrl}/models`;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const res = await fetch(endpoint, { method: 'GET', headers });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        let detail = `上游接口返回异常 (${res.status})`;
        try {
          const p = JSON.parse(errText);
          if (p.error?.message) detail += `: ${p.error.message}`;
          else if (p.message) detail += `: ${p.message}`;
          else if (errText) detail += `: ${errText.slice(0, 120)}`;
        } catch {
          if (errText) detail += `: ${errText.slice(0, 120)}`;
        }
        throw new Error(detail);
      }
      const data = await res.json() as any;
      if (data && Array.isArray(data.data)) {
        const models = data.data.map((m: any) => m.id || m.name).filter(Boolean);
        if (models.length > 0) {
          return models.sort((a: string, b: string) => a.localeCompare(b));
        }
      }
    } catch (err: any) {
      throw new Error(err.message || '获取模型列表失败，请检查 API Token 与接口地址配置');
    }

    return DEFAULT_AI_PROVIDER_MODELS[provider] || DEFAULT_AI_PROVIDER_MODELS.openai;
  }

  /**
   * 测试 AI 模型连通性
   */
  async testConnection(
    providerParam?: string,
    apiKeyParam?: string,
    baseUrlParam?: string,
    modelParam?: string
  ): Promise<{ success: boolean; model: string; message: string; sampleResponse?: string }> {
    const settings = await settingsRepository.getSettings();
    const provider = providerParam || settings.aiProvider || 'gemini';
    const apiKey = apiKeyParam?.trim() || settings.aiApiKey?.trim() || process.env.GEMINI_API_KEY || '';
    const baseUrl = baseUrlParam?.trim() || settings.aiBaseUrl?.trim() || DEFAULT_AI_BASE_URLS[provider] || '';
    const model = modelParam?.trim() || settings.aiCustomModelName?.trim() || settings.aiModel?.trim() || (provider === 'deepseek' ? 'deepseek-chat' : 'gemini-2.5-flash');

    if (provider !== 'gemini' && !apiKey) {
      throw new Error('请先填入 API Token / API Key 后再进行连接测试');
    }

    const testPrompt = '请简短回复一句中文：“连接成功，我是 [当前模型名称]，随时为您提供全站智能服务！”';

    const resultText = await this.executeModelPrompt(testPrompt, {
      provider,
      apiKey,
      baseUrl,
      model,
      systemPrompt: '你是一个专业的测试机器人，请准确精练地响应测试。',
    });

    return {
      success: true,
      model,
      message: '测试成功！模型连接与授权一切正常。',
      sampleResponse: resultText,
    };
  }

  /**
   * 核心多厂商模型调用执行器
   */
  private async executeModelPrompt(
    userPrompt: string,
    override?: {
      provider?: string;
      apiKey?: string;
      baseUrl?: string;
      model?: string;
      systemPrompt?: string;
    }
  ): Promise<string> {
    const settings = await settingsRepository.getSettings();
    const provider = override?.provider || settings.aiProvider || 'gemini';
    const apiKey = override?.apiKey?.trim() || settings.aiApiKey?.trim() || process.env.GEMINI_API_KEY || '';
    const baseUrl = override?.baseUrl?.trim() || settings.aiBaseUrl?.trim() || DEFAULT_AI_BASE_URLS[provider] || '';
    const model = override?.model?.trim() || settings.aiCustomModelName?.trim() || settings.aiModel?.trim() || (provider === 'deepseek' ? 'deepseek-chat' : 'gemini-2.5-flash');
    const systemPrompt = override?.systemPrompt || '你是一个专业的网站分析与书签导航专家，请给出客观、精准的高质量回答。';

    // 1. Google Gemini 官方 SDK 或 REST 协议
    if (provider === 'gemini') {
      const effectiveKey = apiKey || process.env.GEMINI_API_KEY || '';
      if (!effectiveKey) {
        throw new Error('未配置 Gemini API Key，请在后台设置中填写 Token 或在环境配置 GEMINI_API_KEY');
      }

      const effectiveModel = model.replace(/^models\//, '') || 'gemini-2.5-flash';

      // 如果未指定特殊 BaseURL，优先使用 GoogleGenAI SDK
      if (!baseUrl || baseUrl === DEFAULT_AI_BASE_URLS.gemini) {
        try {
          const ai = new GoogleGenAI({ apiKey: effectiveKey });
          const res = await ai.models.generateContent({
            model: effectiveModel,
            contents: userPrompt,
            config: {
              systemInstruction: systemPrompt,
            },
          });
          return res.text?.trim() || '';
        } catch (err: any) {
          let msg = err?.message || '';
          if (msg.includes('API_KEY_INVALID') || msg.includes('400')) {
            msg = 'Gemini API Key 无效，请检查填写的 Token';
          } else if (msg.includes('NOT_FOUND') || msg.includes('404')) {
            msg = `模型 '${effectiveModel}' 不存在，请切换为 gemini-2.5-flash 或重新拉取`;
          }
          throw new Error(msg || 'Gemini 服务调用失败');
        }
      }

      // 走自定义 Base URL REST 代理
      const host = baseUrl.replace(/\/+$/, '');
      const endpoint = `${host}/v1beta/models/${effectiveModel}:generateContent?key=${effectiveKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
        }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        let detail = `Gemini API 错误 (${res.status})`;
        try {
          const p = JSON.parse(errText);
          if (p.error?.message) detail += `: ${p.error.message}`;
        } catch {
          if (errText) detail += `: ${errText.slice(0, 140)}`;
        }
        throw new Error(detail);
      }
      const data = await res.json() as any;
      return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    // 2. Anthropic 原生官方接口判断
    if (provider === 'anthropic' && (baseUrl.includes('anthropic.com') || !baseUrl)) {
      const endpoint = 'https://api.anthropic.com/v1/messages';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: model || 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        let detail = `Claude API 错误 (${res.status})`;
        try {
          const p = JSON.parse(errText);
          if (p.error?.message) detail += `: ${p.error.message}`;
        } catch {}
        throw new Error(detail);
      }
      const data = await res.json() as any;
      return data?.content?.[0]?.text?.trim() || '';
    }

    // 3. OpenAI / DeepSeek / Moonshot / SiliconFlow / Ollama / OneAPI / Custom OpenAI-compatible
    let effectiveBaseUrl = (baseUrl || (provider === 'deepseek' ? DEFAULT_AI_BASE_URLS.deepseek : DEFAULT_AI_BASE_URLS.openai)).replace(/\/+$/, '');
    if (provider === 'deepseek' && !effectiveBaseUrl.includes('/v1') && !effectiveBaseUrl.includes('/chat')) {
      effectiveBaseUrl += '/v1';
    }
    const endpoint = `${effectiveBaseUrl}/chat/completions`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model || (provider === 'deepseek' ? 'deepseek-chat' : 'gpt-4o-mini'),
        messages,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      let detail = `上游 AI 接口错误 (${res.status})`;
      try {
        const p = JSON.parse(errText);
        if (p.error?.message) detail += `: ${p.error.message}`;
        else if (p.message) detail += `: ${p.message}`;
        else if (errText) detail += `: ${errText.slice(0, 140)}`;
      } catch {
        if (errText) detail += `: ${errText.slice(0, 140)}`;
      }
      throw new Error(detail);
    }

    const data = await res.json() as any;
    const reply = data?.choices?.[0]?.message?.content || '';
    return reply.trim();
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
      const responseText = await this.executeModelPrompt(prompt, {
        systemPrompt: '你是一个专业的信息提取与分类引擎，请直接输出 JSON 数据，不要包含 markdown 标记。',
      });

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
      console.warn('AI analyzeSiteInfo fallback to raw metadata:', err?.message);
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
      const responseText = await this.executeModelPrompt(prompt, {
        systemPrompt: '你是一个资深的数字产品分析专家，请只输出纯 JSON 数据。',
      });

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
      console.warn('AI generateSiteSummary failed:', err?.message);
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
      const responseText = await this.executeModelPrompt(prompt, {
        systemPrompt: '你是一个智能书签知识助手，请严格输出 JSON 格式数据。',
      });

      const cleanJson = responseText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      const parsed = JSON.parse(cleanJson);

      return {
        answer: parsed.answer || responseText,
        recommendedBookmarks: Array.isArray(parsed.recommendedBookmarks) ? parsed.recommendedBookmarks : [],
      };
    } catch (err: any) {
      console.warn('AI askAssistant failed:', err?.message);
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
        answer: `抱歉，分析您的需求时出现临时波动：${err?.message || '请稍后再试'}。`,
        recommendedBookmarks: [],
      };
    }
  }
}

export const aiService = new AiService();
