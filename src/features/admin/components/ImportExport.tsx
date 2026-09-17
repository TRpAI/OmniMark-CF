import React, { useState } from 'react';
import {
  Upload,
  Download,
  FileCode,
  FileText,
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { uploadApi } from '../../../api/settings.api';
import { useBookmarkStore } from '../../../stores/bookmark.store';
import { useUiStore } from '../../../stores/ui.store';

export const ImportExport: React.FC = () => {
  const { loadInitialData, bookmarks, categories } = useBookmarkStore();
  const { showToast } = useUiStore();

  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ categoriesAdded: number; bookmarksAdded: number } | null>(null);

  // HTML Bookmark file handler
  const handleHtmlFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const res: any = await uploadApi.importHtml(text);
      setImportResult(res);
      showToast('HTML 书签导入成功', 'success');
      await loadInitialData();
    } catch (err: any) {
      showToast(err.message || '导入失败，请检查文件格式', 'error');
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  // JSON backup file handler
  const handleJsonFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res: any = await uploadApi.importJson(parsed, false);
      setImportResult(res);
      showToast('JSON 数据导入成功', 'success');
      await loadInitialData();
    } catch (err: any) {
      showToast(err.message || 'JSON 解析失败', 'error');
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const downloadFile = (url: string) => {
    window.location.href = url;
  };

  return (
    <div className="space-y-8">
      {/* Overview Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-1">
          数据导入与备份中心
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          支持从 Chrome、Edge、Safari、Firefox 导出书签一键导入，支持完整 JSON 备份恢复，以及导出 Cloudflare D1 SQL 迁移脚本。
        </p>

        {importResult && (
          <div className="mt-4 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="text-xs text-emerald-800 dark:text-emerald-300">
              <p className="font-semibold">导入完成！</p>
              <p>
                已成功新增 <span className="font-bold">{importResult.categoriesAdded}</span> 个分类，
                <span className="font-bold">{importResult.bookmarksAdded}</span> 条书签数据。
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Two Columns: Import & Export */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Import section */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                导入书签数据
              </h4>
              <p className="text-xs text-zinc-400">选择本地文件直接解析并追加导入</p>
            </div>
          </div>

          {/* Option 1: Chrome/Edge HTML */}
          <div className="p-4 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/30 text-center hover:border-indigo-500 transition-colors">
            <FileText className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-zinc-900 dark:text-white mb-1">
              导入浏览器 HTML 书签文件
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3 max-w-xs mx-auto">
              支持 Chrome、Edge、Firefox 导出的标准 Netscape Bookmark HTML 格式
            </p>
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer shadow-sm transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>选择 .html 书签文件</span>
              <input
                type="file"
                accept=".html,.htm"
                disabled={isImporting}
                onChange={handleHtmlFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Option 2: JSON Backup */}
          <div className="p-4 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/30 text-center hover:border-indigo-500 transition-colors">
            <FileCode className="w-8 h-8 text-sky-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-zinc-900 dark:text-white mb-1">
              导入 OmniMark JSON 备份
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3 max-w-xs mx-auto">
              恢复包含分类、书签和站点设置的完整 JSON 结构
            </p>
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-white text-xs font-semibold cursor-pointer shadow-sm transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>选择 .json 备份文件</span>
              <input
                type="file"
                accept=".json"
                disabled={isImporting}
                onChange={handleJsonFileChange}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Export section */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                导出与备份
              </h4>
              <p className="text-xs text-zinc-400">
                当前共有 {categories.length} 个分类、{bookmarks.length} 条书签可供导出
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Export JSON */}
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between">
              <div>
                <h5 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  OmniMark JSON 完整快照
                </h5>
                <p className="text-xs text-zinc-400 mt-0.5">
                  包含所有书签、分类、标签及点击数数据
                </p>
              </div>
              <a
                href={uploadApi.getExportJsonUrl()}
                download="omnimark-backup.json"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>导出 JSON</span>
              </a>
            </div>

            {/* Export HTML */}
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between">
              <div>
                <h5 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  标准浏览器 HTML 书签文件
                </h5>
                <p className="text-xs text-zinc-400 mt-0.5">
                  可直接导入至 Chrome、Edge、Safari 或手机浏览器
                </p>
              </div>
              <a
                href={uploadApi.getExportHtmlUrl()}
                download="omnimark-bookmarks.html"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 text-xs font-medium shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>导出 HTML</span>
              </a>
            </div>

            {/* Export Cloudflare D1 SQL */}
            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <h5 className="text-sm font-semibold text-zinc-900 dark:text-white">
                    Cloudflare D1 SQL 迁移脚本
                  </h5>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold">
                    D1 Ready
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  生成可在 Cloudflare D1 中直接执行的建表与数据插入 SQL
                </p>
              </div>
              <a
                href={uploadApi.getExportD1SqlUrl()}
                download="omnimark-d1-migration.sql"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium shadow-sm transition-colors"
              >
                <Database className="w-3.5 h-3.5" />
                <span>生成 D1 SQL</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
