import React, { useState, useEffect, useCallback, useMemo } from "react";
import DataTable from "../ui/DataTable";
import ActionMenu from "../ui/ActionMenu";
import {
  PlusIcon,
  EditIcon,
  TrashIcon,
  SaveIcon,
  AlertTriangleIcon,
  CheckIcon,
  BuildingOfficeIcon,
  EyeIcon,
} from "../ui/Icons";
import { useToast } from "../../context/ToastContext";
import { useRightSidebar } from "../../context/RightSidebarContext";

/**
 * Detail View Drawer for inspecting full taxonomy details in the Right Sidebar
 */
export function TaxonomyDetailDrawer({
  item,
  itemTypeName = "Category",
  onEdit,
  onClose,
}) {
  if (!item) return null;

  return (
    <div className="w-full max-w-md mx-auto p-1 flex-1 flex flex-col justify-between min-h-[calc(100vh-140px)] text-left animate-fade-in">
      <div className="space-y-4">
        {/* Header Badge & Name */}
        <div className="p-4 rounded-2xl theme-bg-sub border theme-border space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md theme-bg-accent-soft theme-accent">
              {itemTypeName} Details
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                item.is_active
                  ? "theme-bg-accent-soft theme-accent"
                  : "theme-bg-surface theme-text-secondary border theme-border"
              }`}
            >
              {item.is_active ? "Active in System" : "Inactive"}
            </span>
          </div>

          <div>
            <h3 className="text-base font-bold theme-text-primary tracking-tight">
              {item.name}
            </h3>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs font-semibold theme-text-secondary">Code / Slug:</span>
              <span className="font-mono text-xs font-bold theme-accent px-2 py-0.5 rounded-lg theme-bg-surface border theme-border">
                {item.code}
              </span>
            </div>
          </div>
        </div>

        {/* Details Card */}
        <div className="p-4 rounded-2xl border theme-border theme-bg-surface space-y-3.5 text-xs">
          <div className="flex items-center justify-between py-1 border-b theme-border">
            <span className="theme-text-secondary font-medium">Display Sort Order:</span>
            <span className="font-mono font-bold theme-text-primary">{item.order ?? 0}</span>
          </div>

          <div className="space-y-1.5 pt-1">
            <span className="theme-text-secondary font-medium block">Full Description & Remarks:</span>
            <div className="p-3 rounded-xl theme-bg-sub border theme-border text-xs leading-relaxed theme-text-primary whitespace-pre-wrap min-h-[72px]">
              {item.description ? (
                item.description
              ) : (
                <span className="italic opacity-60">No additional description or remarks provided for this {itemTypeName.toLowerCase()}.</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pinned Bottom Actions */}
      <div className="pt-6 pb-2 border-t theme-border flex items-center justify-end gap-2.5 mt-auto">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 rounded-xl border theme-border hover:theme-bg-elevated theme-text-secondary text-sm font-semibold transition cursor-pointer"
        >
          Close
        </button>
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="flex-1 py-2.5 rounded-xl theme-bg-accent text-white font-bold text-sm uppercase tracking-wider shadow-md hover:opacity-90 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <EditIcon className="w-4 h-4" />
          <span>Edit {itemTypeName}</span>
        </button>
      </div>
    </div>
  );
}

/**
 * Drawer Form for adding / editing a taxonomy item in the Right Sidebar
 */
export function TaxonomyDrawerForm({
  initialData = null,
  itemTypeName = "Category",
  onSave,
  onCancel,
}) {
  const [formData, setFormData] = useState(() => ({
    name: initialData?.name || "",
    code: initialData?.code || "",
    description: initialData?.description || "",
    order: initialData?.order ?? 0,
    is_active: initialData?.is_active ?? true,
  }));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNameChange = (val) => {
    setFormData((prev) => {
      const updated = { ...prev, name: val };
      if (!initialData) {
        updated.code = val
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "_")
          .replace(/_+/g, "_")
          .slice(0, 40);
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formData.name.trim()) return;
    if (!formData.code.trim()) return;

    setIsSubmitting(true);
    try {
      if (onSave) {
        await onSave({
          ...formData,
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          description: formData.description.trim(),
          order: parseInt(formData.order, 10) || 0,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-1 flex-1 flex flex-col justify-between min-h-[calc(100vh-140px)] text-left">
      <form onSubmit={handleSubmit} className="flex flex-col justify-between flex-1 space-y-6">
        
        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold theme-text-secondary mb-1.5">
              {itemTypeName} Display Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder={`e.g. General ${itemTypeName}`}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border theme-border theme-bg-sub theme-text-primary focus:outline-none focus:ring-1 focus:ring-[var(--accent-main)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold theme-text-secondary mb-1.5">
              Code / Unique Identifier <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder={`e.g. GENERAL_${itemTypeName.toUpperCase()}`}
              className="w-full text-sm font-mono px-3.5 py-2.5 rounded-xl border theme-border theme-bg-sub theme-text-primary uppercase focus:outline-none focus:ring-1 focus:ring-[var(--accent-main)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold theme-text-secondary mb-1.5">
              Description / Remarks (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={`Optional details about this ${itemTypeName.toLowerCase()}...`}
              rows={3}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border theme-border theme-bg-sub theme-text-primary focus:outline-none focus:ring-1 focus:ring-[var(--accent-main)] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t theme-border">
            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1.5">
                Display Order
              </label>
              <input
                type="number"
                min="0"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                className="w-full text-sm font-mono px-3.5 py-2.5 rounded-xl border theme-border theme-bg-sub theme-text-primary focus:outline-none focus:ring-1 focus:ring-[var(--accent-main)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1.5">
                Status
              </label>
              <select
                value={formData.is_active ? "YES" : "NO"}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.value === "YES" })}
                className="w-full text-sm font-semibold px-3.5 py-2.5 rounded-xl border theme-border theme-bg-sub theme-text-primary focus:outline-none focus:ring-1 focus:ring-[var(--accent-main)] cursor-pointer"
              >
                <option value="YES">Active</option>
                <option value="NO">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pinned Bottom Footer */}
        <div className="pt-6 pb-2 border-t theme-border flex items-center justify-end gap-2.5 mt-auto">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl border theme-border hover:theme-bg-elevated theme-text-secondary text-sm font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-xl theme-bg-accent text-white font-bold text-sm uppercase tracking-wider shadow-md hover:opacity-90 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <SaveIcon className="w-4 h-4" />
            <span>{initialData ? "Save Changes" : `Create ${itemTypeName}`}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * Reusable Compact Taxonomy / Category Manager
 */
export default function CompactTaxonomyManager({
  title = "Categories",
  description = "Manage categories, taxonomy tags, and system classifications.",
  fetchItems,
  createItem,
  updateItem,
  deleteItem,
  itemTypeName = "Category",
  icon: HeaderIcon = BuildingOfficeIcon,
  className = "",
}) {
  const { showToast } = useToast();
  const { openRightSidebar, closeRightSidebar } = useRightSidebar();

  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Delete Confirmation State
  const [deletingItem, setDeletingItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    if (!fetchItems) return;
    setIsLoading(true);
    try {
      const data = await fetchItems({ all: true });
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(`[CompactTaxonomyManager] Error loading ${itemTypeName}:`, err);
      showToast(err.message || `Failed to load ${itemTypeName.toLowerCase()} items`, "error");
    } finally {
      setIsLoading(false);
    }
  }, [fetchItems, itemTypeName, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open Right Sidebar for Details
  const handleOpenDetailDrawer = (item) => {
    openRightSidebar({
      title: `${itemTypeName} Details`,
      width: 480,
      content: (
        <TaxonomyDetailDrawer
          item={item}
          itemTypeName={itemTypeName}
          onEdit={(targetItem) => {
            closeRightSidebar();
            handleOpenEditDrawer(targetItem);
          }}
          onClose={closeRightSidebar}
        />
      ),
    });
  };

  // Open Right Sidebar for Adding
  const handleOpenAddDrawer = () => {
    openRightSidebar({
      title: `Add New ${itemTypeName}`,
      width: 480,
      content: (
        <TaxonomyDrawerForm
          itemTypeName={itemTypeName}
          onSave={async (payload) => {
            try {
              if (createItem) await createItem(payload);
              showToast(`${itemTypeName} created successfully!`, "success");
              closeRightSidebar();
              loadData();
            } catch (err) {
              showToast(err.message || `Failed to create ${itemTypeName.toLowerCase()}`, "error");
            }
          }}
          onCancel={closeRightSidebar}
        />
      ),
    });
  };

  // Open Right Sidebar for Editing
  const handleOpenEditDrawer = (item) => {
    openRightSidebar({
      title: `Edit ${itemTypeName}`,
      width: 480,
      content: (
        <TaxonomyDrawerForm
          initialData={item}
          itemTypeName={itemTypeName}
          onSave={async (payload) => {
            try {
              if (updateItem) await updateItem(item.id, payload);
              showToast(`${itemTypeName} updated successfully!`, "success");
              closeRightSidebar();
              loadData();
            } catch (err) {
              showToast(err.message || `Failed to update ${itemTypeName.toLowerCase()}`, "error");
            }
          }}
          onCancel={closeRightSidebar}
        />
      ),
    });
  };

  const handleToggleActive = async (item) => {
    if (!updateItem) return;
    try {
      await updateItem(item.id, { is_active: !item.is_active });
      showToast(`"${item.name}" marked as ${!item.is_active ? "Active" : "Inactive"}`, "info");
      loadData();
    } catch (err) {
      showToast(err.message || "Failed to update status", "error");
    }
  };

  const handleDelete = async () => {
    if (!deletingItem || !deleteItem) return;
    setIsDeleting(true);
    try {
      await deleteItem(deletingItem.id);
      showToast(`"${deletingItem.name}" deleted successfully!`, "success");
      setDeletingItem(null);
      loadData();
    } catch (err) {
      showToast(err.message || `Failed to delete ${itemTypeName.toLowerCase()}`, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Define Reusable DataTable Columns (Without Description column)
  const columns = useMemo(() => [
    {
      header: "#",
      key: "order",
      align: "center",
      headerClassName: "w-12",
      render: (item, idx) => (
        <span className="font-mono theme-text-secondary text-[11px]">
          {item.order ?? idx + 1}
        </span>
      ),
    },
    {
      header: `${itemTypeName} Name`,
      key: "name",
      render: (item) => (
        <div className="font-bold theme-text-primary text-xs">
          {item.name}
        </div>
      ),
    },
    {
      header: "Code / Slug",
      key: "code",
      render: (item) => (
        <span className="px-2 py-0.5 rounded-lg theme-bg-sub border theme-border font-mono text-[11px] theme-accent font-semibold">
          {item.code}
        </span>
      ),
    },
    {
      header: "Status",
      key: "is_active",
      align: "center",
      headerClassName: "w-28",
      render: (item) => (
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
            item.is_active
              ? "theme-bg-accent-soft theme-accent"
              : "theme-bg-sub theme-text-secondary border theme-border"
          }`}
        >
          {item.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      header: "Actions",
      key: "actions",
      align: "right",
      headerClassName: "w-16",
      render: (item) => {
        const actionItems = [
          {
            label: "View Details",
            icon: EyeIcon,
            onClick: () => handleOpenDetailDrawer(item),
          },
          {
            label: "Edit",
            icon: EditIcon,
            onClick: () => handleOpenEditDrawer(item),
          },
          {
            label: item.is_active ? "Mark Inactive" : "Mark Active",
            icon: CheckIcon,
            onClick: () => handleToggleActive(item),
          },
          {
            label: "Delete",
            icon: TrashIcon,
            variant: "danger",
            onClick: () => setDeletingItem(item),
          },
        ];

        return <ActionMenu items={actionItems} align="right" />;
      },
    },
  ], [itemTypeName, handleToggleActive]);

  return (
    <div className={`space-y-4 animate-fade-in ${className}`}>
      
      {/* ─── Clean Header (Without Searchbar & Dropdowns) ──────────── */}
      <div className="p-4 sm:p-5 rounded-2xl border theme-border theme-bg-surface shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
        <div className="flex items-center gap-3">
          {HeaderIcon && (
            <div className="p-2.5 rounded-xl theme-bg-accent-soft theme-accent shrink-0">
              <HeaderIcon className="w-5 h-5" />
            </div>
          )}
          <div>
            <h3 className="text-sm sm:text-base font-bold theme-text-primary tracking-tight">
              {title}
            </h3>
            {description && (
              <p className="text-xs theme-text-secondary mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAddDrawer}
          className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          <span>Add {itemTypeName}</span>
        </button>
      </div>

      {/* ─── Reusable DataTable (Without Description column, Row Click to View Details) ─── */}
      <DataTable
        columns={columns}
        data={items}
        isLoading={isLoading}
        loadingMessage={`Loading ${itemTypeName.toLowerCase()} list...`}
        emptyTitle={`No ${itemTypeName} Found`}
        emptySubMessage={`Click "Add ${itemTypeName}" to create the first entry.`}
        emptyIcon={HeaderIcon}
        onRowClick={(item) => handleOpenDetailDrawer(item)}
      />

      {/* ─── Delete Confirmation Modal ────────────────────────────── */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm theme-bg-surface border theme-border rounded-2xl p-5 shadow-2xl space-y-3.5 animate-scale-in text-left">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 shrink-0">
                <AlertTriangleIcon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold theme-text-primary">Delete {itemTypeName}</h4>
                <p className="text-[11px] theme-text-secondary">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs theme-text-secondary">
              Are you sure you want to permanently delete <strong className="theme-text-primary">"{deletingItem.name}"</strong> ({deletingItem.code})?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t theme-border">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 rounded-xl border theme-border hover:theme-bg-elevated theme-text-secondary text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
