import React, { useState } from 'react';
import { Cloud, Database, Zap, Terminal, Copy, Check, ExternalLink, Code2, LayoutDashboard, Globe, KeyRound, GitBranch } from 'lucide-react';
import { useUiStore } from '../../../stores/ui.store';
import { uploadApi } from '../../../api/settings.api';

export const CloudflareGuide: React.FC = () => {
  const { showToast } = useUiStore();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'cli' | 'actions'>('dashboard');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast('已复制到剪贴板', 'success');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const cliSteps = [
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

  const dashboardSteps = [
    {
      step: '1',
      title: '在控制面板创建 D1 数据库并执行建表 SQL',
      items: [
        '登录 Cloudflare 控制面板 (dash.cloudflare.com)。',
        '左侧导航栏点击「存储与数据库 (Storage & Databases)」->「D1 SQL 数据库」。',
        '点击「创建数据库 (Create Database)」，数据库名称输入「omnimark-db」，点击「创建」。',
        '创建后点击进入该数据库，切换到顶部的「控制台 (Console)」标签页。',
        '将项目 data/migrations/0001_init_d1.sql 中的 SQL 内容粘贴到控制台输入框，点击「执行 (Execute)」。所有表结构与默认数据即可初始化完成！',
      ],
      actionText: '下载初始 SQL 文件',
      actionUrl: uploadApi.getExportD1SqlUrl(),
    },
    {
      step: '2',
      title: '在控制面板创建 KV 命名空间 (缓存加速)',
      items: [
        '在左侧导航栏点击「存储与数据库 (Storage & Databases)」->「KV」。',
        '点击「创建命名空间 (Create a namespace)」。',
        '命名空间名称填写「omnimark-cache」，点击「添加」。',
      ],
    },
    {
      step: '3',
      title: '在控制面板创建 Worker 服务端并绑定 D1 / KV',
      items: [
        '在左侧导航栏点击「Workers 和 Pages (Workers & Pages)」->「概览 (Overview)」。',
        '点击「创建应用程序 (Create application)」->「创建 Worker」，名称填写「omnimark-api」，点击「部署」。',
        '部署后点击「编辑代码 (Edit code)」，将项目 cloudflare/worker.js 的全部代码复制粘贴进去，点击右上角「保存并部署 (Save and deploy)」。',
        '回到该 Worker 详情页，点击「设置 (Settings)」->「变量与绑定 (Variables and Bindings)」：',
        '① 添加 D1 数据库绑定：变量名称严格填写「DB」，选择刚刚创建的「omnimark-db」。',
        '② 添加 KV 命名空间绑定：变量名称严格填写「CACHE_KV」，选择刚刚创建的「omnimark-cache」。',
        '点击保存，你的 Worker 边缘后端即配置完成！你会获得一个形如 https://omnimark-api.your-name.workers.dev 的 API 域名。',
      ],
    },
    {
      step: '4',
      title: '在控制面板创建 Cloudflare Pages 部署前端',
      items: [
        '在左侧导航栏点击「Workers 和 Pages」->「创建应用程序」-> 切换到「Pages」标签。',
        '方案 A (推荐·Git 自动部署)：点击「连接到 Git」，选择包含本项目的 GitHub 仓库。构建预设选择「Vite」，构建命令输入「npm run build」，构建输出目录输入「dist」。环境变量中添加 VITE_API_URL 填写你的 Worker API 域名。点击「保存并部署」。',
        '方案 B (无需 Git·拖拽直传)：在本地执行 npm run build，在 Pages 页面点击「上传资产 (Upload assets)」，将打包生成的 dist 文件夹直接拖入网页中即可瞬间完成发布！',
      ],
    },
    {
      step: '5',
      title: '绑定自定义域名 (可选)',
      items: [
        '在 Pages 项目设置中点击「自定义域 (Custom Domains)」，输入你的独立域名 (如 nav.yourdomain.com)。',
        '在 Worker 设置中也可绑定 API 子域名 (如 api-nav.yourdomain.com)，Cloudflare 会自动签发免费 SSL 证书并开启全球 CDN 加速。',
      ],
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

      {/* Mode Switch Tabs */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Cloudflare 控制面板网页部署 (可视化操作·零命令行)</span>
          </button>
          <button
            onClick={() => setActiveTab('cli')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'cli'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Wrangler CLI 本地部署</span>
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'actions'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>GitHub Actions 自动部署 (推荐)</span>
          </button>
        </div>

        <a
          href={uploadApi.getExportD1SqlUrl()}
          download="omnimark-d1-migration.sql"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium shadow-sm transition-colors"
        >
          <Database className="w-3.5 h-3.5" />
          <span>下载当前最新 D1 数据 SQL</span>
        </a>
      </div>

      {/* Tab 1: Dashboard Guide */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-sky-50/80 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/40 text-xs text-sky-800 dark:text-sky-300 leading-relaxed">
            <span className="font-bold">提示：</span> 通过 Cloudflare 网页控制面板部署无需配置复杂的 Node.js 或命令行工具，直接在浏览器中点选创建 D1、KV，并使用在线代码编辑器粘贴 Worker 代码即可上线！
          </div>

          <div className="space-y-4">
            {dashboardSteps.map((s, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {s.step}
                  </div>
                  <h5 className="text-sm font-bold text-zinc-900 dark:text-white">
                    {s.title}
                  </h5>
                </div>

                <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400 pl-10 list-disc">
                  {s.items.map((item, iIdx) => (
                    <li key={iIdx} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>

                {s.actionText && s.actionUrl && (
                  <div className="pl-10 pt-1">
                    <a
                      href={s.actionUrl}
                      download="omnimark-d1-migration.sql"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors"
                    >
                      <Database className="w-3.5 h-3.5 text-amber-500" />
                      <span>{s.actionText}</span>
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: CLI Guide */}
      {activeTab === 'cli' && (
        <div className="space-y-4">
          {cliSteps.map((step, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <h5 className="text-sm font-bold text-zinc-900 dark:text-white">
                  {step.title}
                </h5>
                <button
                  onClick={() => copyToClipboard(step.cmd, `cli-${idx}`)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                >
                  {copiedKey === `cli-${idx}` ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>已复制</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>复制命令</span>
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
      )}

      {/* Tab 3: GitHub Actions CI/CD Guide */}
      {activeTab === 'actions' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
            <span className="font-bold">全自动化上线：</span> 项目已内置完整 <code className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 font-mono font-bold">.github/workflows/deploy.yml</code>。只需在 GitHub 仓库中配置好 2 个 Cloudflare 密钥，之后每次 <code className="font-mono">git push</code>，GitHub 就会自动部署 Worker 后端和 Pages 前端，再也无需人工登录手动操作！
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <h5 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-500" />
              <span>步骤 1: 在 GitHub 仓库添加 Cloudflare Secrets</span>
            </h5>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              打开你的 GitHub 仓库 ➔ <strong>Settings</strong> ➔ <strong>Secrets and variables</strong> ➔ <strong>Actions</strong> ➔ 点击 <strong>New repository secret</strong> 添加以下两项：
            </p>
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
                <div className="font-mono font-bold text-zinc-900 dark:text-white">CLOUDFLARE_API_TOKEN</div>
                <div className="text-zinc-500 dark:text-zinc-400 mt-0.5">
                  获取方式：登录 Cloudflare ➔ 右上角头像「我的个人资料」➔「API 令牌 (API Tokens)」➔「创建令牌」➔ 选择「编辑 Cloudflare Workers」模板创建并复制 Token。
                </div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
                <div className="font-mono font-bold text-zinc-900 dark:text-white">CLOUDFLARE_ACCOUNT_ID</div>
                <div className="text-zinc-500 dark:text-zinc-400 mt-0.5">
                  获取方式：Cloudflare 控制面板任意页面右下角或 Workers 概览页右侧即可看到 32 位「账户 ID (Account ID)」。
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
            <h5 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-sky-500" />
              <span>步骤 2: 确认 wrangler.toml 中的 D1 数据库 UUID</span>
            </h5>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              确保项目根目录的 <code className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono">wrangler.toml</code> 里的 <code className="font-mono">database_id</code> 已填入你实际创建的 D1 数据库 UUID（在控制台 D1 详情页可查看）。
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
            <h5 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-emerald-500" />
              <span>步骤 3: 提交代码，自动触发构建发布</span>
            </h5>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              在本地或 GitHub 执行提交：
            </p>
            <div className="p-3 rounded-xl bg-zinc-950 text-zinc-200 font-mono text-xs overflow-x-auto">
              <pre>{`git add .\ngit commit -m "feat: auto deploy to cloudflare"\ngit push origin main`}</pre>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              随后进入 GitHub 仓库顶部的 <strong>Actions</strong> 标签页，即可看到绿色流水线自动将 Worker 与 Pages 部署至全球边缘！
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

