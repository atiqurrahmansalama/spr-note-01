import React, { useState, useEffect } from 'react';
import {
  BuildingOfficeIcon,
  PlusIcon,
  SearchIcon,
  EditIcon,
  TrashIcon,
  CheckCircleIcon,
  CloseIcon,
  SaveIcon,
  SparklesIcon,
  AlertTriangleIcon,
} from '../../../components/ui/Icons';
import {
  getInstitutionCategories,
  createInstitutionCategory,
  updateInstitutionCategory,
  deleteInstitutionCategory,
} from '../../../api/institutions';
import { useToast } from '../../../context/ToastContext';
import { useTenant } from '../../../context/TenantContext';

export default function SPManagementView() {
  const { showToast } = useToast();
  const { isMultiTenantAdmin } = useTenant();

  const [activeTab, setActiveTab] = useState('categories'); // 'categories' | 'system'
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('ADD'); // 'ADD' | 'EDIT'
  const [currentCatId, setCurrentCatId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    code: '',
    description: '',
    order: 0,
    is_active: true,
  });

  // Delete State
  const [deletingCat, setDeletingCat] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const data = await getInstitutionCategories({ all: true });
      setCategories(data);
    } catch (err) {
      console.error('[SPManagementView] Error loading categories:', err);
      showToast(err.message || 'Failed to load academy categories', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleOpenAdd = () => {
    setModalMode('ADD');
    setCurrentCatId(null);
    setCategoryForm({
      name: '',
      code: '',
      description: '',
      order: categories.length + 1,
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat) => {
    setModalMode('EDIT');
    setCurrentCatId(cat.id);
    setCategoryForm({
      name: cat.name || '',
      code: cat.code || '',
      description: cat.description || '',
      order: cat.order ?? 0,
      is_active: cat.is_active ?? true,
    });
    setIsModalOpen(true);
  };

  const handleNameChange = (val) => {
    setCategoryForm((prev) => {
      const updated = { ...prev, name: val };
      if (modalMode === 'ADD' && !prev.codeManualEdited) {
        updated.code = val
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '_')
          .replace(/_+/g, '_')
          .slice(0, 40);
      }
      return updated;
    });
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      showToast('Category Name is required', 'warning');
      return;
    }
    if (!categoryForm.code.trim()) {
      showToast('Category Code is required', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: categoryForm.name.trim(),
        code: categoryForm.code.trim().toUpperCase(),
        description: categoryForm.description.trim(),
        order: parseInt(categoryForm.order, 10) || 0,
        is_active: categoryForm.is_active,
      };

      if (modalMode === 'ADD') {
        await createInstitutionCategory(payload);
        showToast('Academy category created successfully!', 'success');
      } else {
        await updateInstitutionCategory(currentCatId, payload);
        showToast('Academy category updated successfully!', 'success');
      }

      setIsModalOpen(false);
      loadCategories();
    } catch (err) {
      console.error('[SPManagementView] Save category error:', err);
      showToast(err.message || 'Failed to save category', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (cat) => {
    try {
      await updateInstitutionCategory(cat.id, { is_active: !cat.is_active });
      showToast(`Category "${cat.name}" marked as ${!cat.is_active ? 'Active' : 'Inactive'}`, 'info');
      loadCategories();
    } catch (err) {
      showToast(err.message || 'Failed to toggle category status', 'error');
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCat) return;
    setIsDeleting(true);
    try {
      await deleteInstitutionCategory(deletingCat.id);
      showToast(`Category "${deletingCat.name}" deleted successfully!`, 'success');
      setDeletingCat(null);
      loadCategories();
    } catch (err) {
      showToast(err.message || 'Failed to delete category', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCategories = categories.filter((cat) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      cat.name?.toLowerCase().includes(q) ||
      cat.code?.toLowerCase().includes(q) ||
      cat.description?.toLowerCase().includes(q);

    let matchesStatus = true;
    if (statusFilter === 'ACTIVE') matchesStatus = cat.is_active === true;
    if (statusFilter === 'INACTIVE') matchesStatus = cat.is_active === false;

    return matchesSearch && matchesStatus;
  });

  const totalCount = categories.length;
  const activeCount = categories.filter((c) => c.is_active).length;
  const inactiveCount = totalCount - activeCount;

  return (
    <div className="w-full max-w-7xl mx-auto py-6 px-4 sm:px-6 space-y-6 animate-fade-in text-left">
      {/* Standard Module Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b theme-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft border theme-border flex items-center justify-center theme-accent shrink-0 shadow-xs">
            <SparklesIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight theme-text-primary">
                SP Management
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold theme-bg-accent theme-accent-text tracking-wide uppercase">
                Super Admin Hub
              </span>
            </div>
            <p className="text-xs theme-text-secondary mt-0.5">
              Academy / Developer & super administrator configuration console
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-5 py-2.5 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold shadow-md hover:opacity-90 transition cursor-pointer flex items-center gap-2"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Add New Category</span>
        </button>
      </div>

      {/* Tabs Row (Ready for future developer modules) */}
      <div className="flex items-center gap-2 border-b theme-border pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'categories'
              ? 'theme-bg-accent theme-accent-text shadow-sm'
              : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-sub'
          }`}
        >
          <BuildingOfficeIcon className="w-4 h-4" />
          <span>Academy Category ({totalCount})</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl theme-bg-surface border theme-border shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold theme-text-secondary block">
              Total Categories
            </span>
            <p className="text-xl font-bold theme-text-primary mt-0.5">{totalCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl theme-bg-sub flex items-center justify-center theme-text-secondary">
            <BuildingOfficeIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl theme-bg-surface border theme-border shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold theme-text-secondary block">
              Active in Dropdown
            </span>
            <p className="text-xl font-bold theme-accent mt-0.5">{activeCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl theme-bg-accent-soft flex items-center justify-center theme-accent">
            <CheckCircleIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl theme-bg-surface border theme-border shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold theme-text-secondary block">
              Inactive Categories
            </span>
            <p className="text-xl font-bold theme-text-muted mt-0.5">{inactiveCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl theme-bg-sub flex items-center justify-center theme-text-muted">
            <AlertTriangleIcon className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-3 rounded-2xl theme-bg-surface border theme-border shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <SearchIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories by name, code..."
            className="w-full h-10 pl-9 pr-3.5 py-2 text-xs rounded-xl theme-bg-sub border theme-border theme-text-primary focus:outline-none focus:border-current"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3.5 py-2 text-xs font-semibold rounded-xl theme-bg-sub border theme-border theme-text-primary focus:outline-none focus:border-current cursor-pointer"
          >
            <option value="ALL">All Status ({totalCount})</option>
            <option value="ACTIVE">Active Only ({activeCount})</option>
            <option value="INACTIVE">Inactive Only ({inactiveCount})</option>
          </select>
        </div>
      </div>

      {/* Categories Table / Cards */}
      <div className="theme-bg-surface border theme-border rounded-2xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center theme-text-secondary flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin theme-accent"></div>
            <span className="text-xs font-semibold">Loading Academy Categories...</span>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <BuildingOfficeIcon className="w-12 h-12 mx-auto theme-text-muted opacity-40" />
            <h3 className="text-sm font-bold theme-text-primary">No Categories Found</h3>
            <p className="text-xs theme-text-secondary max-w-sm mx-auto">
              {searchQuery ? 'No categories matched your search criteria.' : 'Click "Add New Category" to create one.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] theme-text-secondary uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Category Display Name</th>
                  <th className="py-3 px-4">Code / Slug</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 w-28 text-center">Status</th>
                  <th className="py-3 px-4 w-28 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.05]">
                {filteredCategories.map((cat, idx) => (
                  <tr key={cat.id} className="hover:theme-bg-sub/40 transition">
                    <td className="py-3 px-4 text-center font-mono theme-text-secondary">
                      {cat.order ?? idx + 1}
                    </td>
                    <td className="py-3 px-4 font-bold theme-text-primary">
                      {cat.name}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold theme-accent">
                      <span className="px-2 py-0.5 rounded-lg theme-bg-sub border theme-border text-[11px]">
                        {cat.code}
                      </span>
                    </td>
                    <td className="py-3 px-4 theme-text-secondary max-w-xs truncate">
                      {cat.description || '--'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(cat)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition cursor-pointer border ${
                          cat.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20 hover:bg-zinc-500/20'
                        }`}
                        title="Click to toggle status"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${cat.is_active ? 'bg-emerald-400' : 'bg-zinc-400'}`}></span>
                        <span>{cat.is_active ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(cat)}
                          className="p-1.5 rounded-lg hover:theme-bg-sub theme-text-secondary hover:theme-text-primary transition cursor-pointer"
                          title="Edit Category"
                        >
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCat(cat)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-400 transition cursor-pointer"
                          title="Delete Category"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- ADD / EDIT CATEGORY MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md theme-bg-surface border theme-border rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 animate-scale-in text-left">
            <div className="flex items-center justify-between pb-3 border-b theme-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl theme-bg-accent-soft flex items-center justify-center theme-accent">
                  <BuildingOfficeIcon className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold theme-text-primary">
                  {modalMode === 'ADD' ? 'Add Academy Category' : 'Edit Academy Category'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:theme-bg-sub theme-text-secondary hover:theme-text-primary transition cursor-pointer"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1">
                  Category Display Name *
                </label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Hifz Madrasa / Maktab"
                  className="w-full px-3 py-2 text-xs sm:text-sm font-medium rounded-xl theme-bg-sub border theme-border theme-text-primary focus:outline-none focus:border-current"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1">
                  System Code / Slug (Upper Case) *
                </label>
                <input
                  type="text"
                  value={categoryForm.code}
                  onChange={(e) =>
                    setCategoryForm((prev) => ({
                      ...prev,
                      code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
                      codeManualEdited: true,
                    }))
                  }
                  placeholder="e.g. HIFZ_MADRASA"
                  className="w-full px-3 py-2 text-xs sm:text-sm font-medium rounded-xl theme-bg-sub border theme-border theme-accent focus:outline-none focus:border-current font-mono"
                  required
                />
                <p className="text-[10px] theme-text-secondary mt-1">
                  Unique technical identifier stored in database records.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1">
                  Description / Remarks (Optional)
                </label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g. Specialized Quran memorization and tajweed curriculum"
                  rows={2}
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl theme-bg-sub border theme-border theme-text-primary focus:outline-none focus:border-current resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t theme-border">
                <div>
                  <label className="block text-xs font-semibold theme-text-secondary mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={categoryForm.order}
                    onChange={(e) => setCategoryForm((prev) => ({ ...prev, order: e.target.value }))}
                    className="w-full px-3 py-2 text-xs font-medium rounded-xl theme-bg-sub border theme-border theme-text-primary focus:outline-none focus:border-current font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold theme-text-secondary mb-1">
                    Active in Dropdowns
                  </label>
                  <select
                    value={categoryForm.is_active ? 'YES' : 'NO'}
                    onChange={(e) =>
                      setCategoryForm((prev) => ({ ...prev, is_active: e.target.value === 'YES' }))
                    }
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl theme-bg-sub border theme-border theme-text-primary focus:outline-none focus:border-current"
                  >
                    <option value="YES">Active</option>
                    <option value="NO">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t theme-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl theme-bg-sub border theme-border hover:theme-bg-elevated text-xs font-bold theme-text-secondary hover:theme-text-primary transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold shadow-md hover:opacity-90 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <SaveIcon className="w-3.5 h-3.5" />
                      <span>{modalMode === 'ADD' ? 'Create Category' : 'Save Changes'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {deletingCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm theme-bg-surface border theme-border rounded-3xl p-6 shadow-2xl space-y-4 animate-scale-in text-left">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <AlertTriangleIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold theme-text-primary">Delete Category</h3>
                <p className="text-xs theme-text-secondary">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs theme-text-secondary">
              Are you sure you want to permanently delete category{' '}
              <strong className="theme-text-primary">"{deletingCat.name}"</strong> ({deletingCat.code})?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t theme-border">
              <button
                type="button"
                onClick={() => setDeletingCat(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl theme-bg-sub border theme-border hover:theme-bg-elevated text-xs font-bold theme-text-secondary hover:theme-text-primary transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCategory}
                disabled={isDeleting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
