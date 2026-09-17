import React, { useState } from 'react';
import { Cloud, Database, Zap, Terminal, Copy, Check, ExternalLink, Code2 } from 'lucide-react';
import { useUiStore } from '../../../stores/ui.store';
import { uploadApi } from '../../../api/settings.api';

export const CloudflareGuide: React.FC = () => {
  const { showToast } = useUiStore();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    showToast('命令已复制到剪贴板', 'success');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const steps = [
    {
      title: '步骤 1: 创建 Cloudflare D1 数据库与 KV 缓存空间',
      desc: '在本地终端中运行 Wrangler 命令创建 D1 实例与 KV 命名空间：',
      cmd: `npx wrangler d1 create omnimark-db\nnpx wrangler kv:namespace create CACHE_KV`,
    },
    {
      title: '步骤 2: 更新 wrangler.toml 绑定信息',
      desc: '将生成的 database_id 和 kv id 填入项目根目录中的 wrangler.toml：',
      cmd: `[[d1_databases]]\nbinding = "DB"\ndatabase_name = "omnimark-db"\ndatabase_id = "<your-d1-database-uuid>"\n\n[[kv_namespaces]]\nbinding = "CACHE_KV"\nid = "<your-kv-namespace-id>"`,
    },
    {
      title: '步骤 3: 执行 D1 数据库表初始化与数据灌入',
      desc: '使用 OmniMark 生成的 SQL 文件一键在 Cloudflare 边缘运行：',
      cmd: `npx wrangler d1 execute omnimark-db --remote --file=data/migrations/0001_init_d1.sql`,
    },
    {
      title: '步骤 4: 部署 Cloudflare Workers 后端',
      desc: '将 cloudflare/worker.ts 部署到 Cloudflare 边缘节点：',
      cmd: `npx wrangler deploy`,
    },
    {
      title: '步骤 5: 构建并发布 Cloudflare Pages 前端',
      desc: '构建前端并将 dist 静态产物发布至 Cloudflare Pages：',
      cmd: `npm run build\nnpx wrangler pages deploy dist --project-name=omnimark`,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-200 dark:border-amber-900/40">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-2xl bg-amber-500 text-white shadow-sm">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
              Cloudflare 全栈版部署与迁移指南
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Pages (前端) + Workers (API 边缘服务) + D1 (SQLite 关系存储) + KV (缓存加速)
            </p>
          </div>
        </div>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
          重构后的 OmniMark 采用了清晰的 <span className="font-semibold text-zinc-900 dark:text-white">Repository 数据访问抽象</span> 与 <span className="font-semibold text-zinc-900 dark:text-white">Service 业务分离</span>，
          在本地与服务器使用高性能 JSON Repository，同时提供了开箱即用的 Cloudflare Worker 与 D1 SQL 脚本，可无缝零成本运行在 Cloudflare 全球边缘网络！
        </p>
      </div>

      {/* Architecture Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-3">
            <Cloud className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Cloudflare Pages</h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            React + Vite 纯静态构建产物，全球 CDN 任何节点秒级直达加载，免运维高可用。
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
            <Database className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Cloudflare D1</h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            无服务器边缘 SQLite 数据库，标准 SQL 语义，完美契合书签、分类、多用户表模型。
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
            <Zap className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Cloudflare KV 缓存</h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            针对前台高频读取的书签列表与分类数据，通过 KV 边缘高速缓存响应，毫秒级返回。
          </p>
        </div>
      </div>

      {/* Deployment steps */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-bold text-zinc-900 dark:text-white">
            部署步骤操作指南
          </h4>
          <a
            href={uploadApi.getExportD1SqlUrl()}
            download="omnimark-d1-migration.sql"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium shadow-sm transition-colors"
          >
            <Database className="w-3.5 h-3.5" />
            <span>下载当前最新 D1 数据 SQL</span>
          </a>
        </div>

        <div className="space-y-4">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <h5 className="text-sm font-bold text-zinc-900 dark:text-white">
                  {step.title}
                </h5>
                <button
                  onClick={() => copyToClipboard(step.cmd, idx)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                >
                  {copiedIndex === idx ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>已复制</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>复制</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {step.desc}
              </p>

              <div className="p-3 rounded-xl bg-zinc-950 text-zinc-200 font-mono text-xs overflow-x-auto">
                <pre>{step.cmd}</pre>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
