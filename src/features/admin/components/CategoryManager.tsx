import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Folder, ArrowUp, ArrowDown, X, AlertTriangle } from 'lucide-react';
import { Category } from '../../../../packages/shared/types';
import { useBookmarkStore } from '../../../stores/bookmark.store';
import { useUiStore } from '../../../stores/ui.store';
import { ICON_OPTIONS, renderCategoryIcon } from '../../../utils/iconMap';

export const CategoryManager: React.FC = () => {
  const { categories, bookmarks, createCategory, updateCategory, deleteCategory, reorderCategories } =
    useBookmarkStore();
  const { showToast } = useUiStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteModalCat, setDeleteModalCat] = useState<Category | null>(null);
  const [deleteBookmarksOption, setDeleteBookmarksOption] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    icon: 'Folder',
    sortOrder: 1,
  });

  const openAddModal = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      icon: 'Folder',
      sortOrder: categories.length + 1,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      icon: cat.icon || 'Folder',
      sortOrder: cat.sortOrder,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('请输入分类名称', 'error');
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: formData.name.trim(),
          icon: formData.icon,
          sortOrder: Number(formData.sortOrder) || 1,
        });
        showToast('分类修改成功', 'success');
      } else {
        await createCategory({
          name: formData.name.trim(),
          icon: formData.icon,
          sortOrder: Number(formData.sortOrder) || 1,
        });
        showToast('分类创建成功', 'success');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      showToast(err.message || '操作失败', 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deleteModalCat) return;
    try {
      await deleteCategory(deleteModalCat.id, deleteBookmarksOption);
      showToast('分类已删除', 'success');
      setDeleteModalCat(null);
    } catch (err: any) {
      showToast(err.message || '删除失败', 'error');
    }
  };

  const moveCategory = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const newCategories = [...categories];
    const temp = newCategories[index];
    newCategories[index] = newCategories[targetIndex];
    newCategories[targetIndex] = temp;

    const reordered = newCategories.map((c, i) => ({ id: c.id, sortOrder: i + 1 }));
    try {
      await reorderCategories(reordered);
      showToast('分类排序已保存', 'success');
    } catch (err: any) {
      showToast(err.message || '排序失败', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">
            分类管理
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            自定义导航分类的图标、名称与显示先后顺序
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>新建分类</span>
        </button>
      </div>

      {/* Categories List */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">
              <th className="py-3 px-4 w-14">排序</th>
              <th className="py-3 px-4">分类名称与图标</th>
              <th className="py-3 px-4">包含书签数</th>
              <th className="py-3 px-4">创建时间</th>
              <th className="py-3 px-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {categories.map((cat, index) => {
              const count = bookmarks.filter((b) => b.categoryId === cat.id).length;
              return (
                <tr key={cat.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                  {/* Reorder Arrows */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1">
                      <button
                        disabled={index === 0}
                        onClick={() => moveCategory(index, 'up')}
                        className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-30 cursor-pointer"
                        title="上移"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        disabled={index === categories.length - 1}
                        onClick={() => moveCategory(index, 'down')}
                        className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-30 cursor-pointer"
                        title="下移"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>

                  {/* Name & Icon */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50">
                        {renderCategoryIcon(cat.icon, 'w-4 h-4')}
                      </div>
                      <div>
                        <span className="font-semibold text-zinc-900 dark:text-white">
                          {cat.name}
                        </span>
                        <p className="text-xs text-zinc-400 font-mono">
                          图标: {cat.icon}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Count */}
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                      {count} 个书签
                    </span>
                  </td>

                  {/* CreatedAt */}
                  <td className="py-3.5 px-4 text-xs text-zinc-400">
                    {new Date(cat.createdAt).toLocaleDateString()}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(cat)}
                        className="p-1.5 text-zinc-500 hover:text-indigo-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                        title="编辑分类"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setDeleteModalCat(cat);
                          setDeleteBookmarksOption(false);
                        }}
                        className="p-1.5 text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                        title="删除分类"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-sm animate-in fade-in">
          <div
            className="relative w-full max-w-md p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
              {editingCategory ? '编辑分类' : '新建分类'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  分类名称 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：媒体与娱乐"
                  className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  选择图标
                </label>
                <div className="grid grid-cols-6 gap-2 p-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 max-h-48 overflow-y-auto">
                  {ICON_OPTIONS.map((opt) => {
                    const isSelected = formData.icon === opt.name;
                    const IconComp = opt.icon;
                    return (
                      <button
                        key={opt.name}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon: opt.name })}
                        className={`p-2 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                        }`}
                        title={opt.name}
                      >
                        <IconComp className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  排序序号
                </label>
                <input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                >
                  {editingCategory ? '保存修改' : '立即创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl">
            <div className="flex items-center gap-3 mb-4 text-amber-600 dark:text-amber-400">
              <div className="p-2 rounded-2xl bg-amber-50 dark:bg-amber-950/50">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                确认删除分类 "{deleteModalCat.name}"？
              </h3>
            </div>

            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              该分类下包含 {bookmarks.filter((b) => b.categoryId === deleteModalCat.id).length} 个书签。请选择如何处理关联的书签：
            </p>

            <div className="space-y-2 mb-6">
              <label className="flex items-center gap-2 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <input
                  type="radio"
                  name="delOption"
                  checked={!deleteBookmarksOption}
                  onChange={() => setDeleteBookmarksOption(false)}
                  className="text-indigo-600"
                />
                <span className="text-xs text-zinc-800 dark:text-zinc-200">
                  保留书签并将它们自动迁移至其他分类
                </span>
              </label>

              <label className="flex items-center gap-2 p-3 rounded-xl border border-red-200 dark:border-red-900/50 cursor-pointer hover:bg-red-50/50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400">
                <input
                  type="radio"
                  name="delOption"
                  checked={deleteBookmarksOption}
                  onChange={() => setDeleteBookmarksOption(true)}
                  className="text-red-600"
                />
                <span className="text-xs">
                  一并永久删除该分类下的所有书签
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteModalCat(null)}
                className="px-4 py-2 text-sm rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                className="px-5 py-2 text-sm font-medium rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
