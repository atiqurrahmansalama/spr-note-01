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
import { useRightSidebar, useDrawerRegistration } from "../../context/RightSidebarContext";
import { useTenant } from "../../context/TenantContext";
import { calendarEventKindsStore } from "../../utils/localStore";

/**
 * Detail View Drawer for inspecting full taxonomy details in the Right Sidebar
 */
export function TaxonomyDetailDrawer({
  item,
  itemTypeName = "Category",
  typeOptions = null,
  typeLabel = "Type",
  hideStatus = false,
  onEdit,
  onClose,
}) {
  if (!item) return null;

  const matchedType = typeOptions?.find((t) => t.value === item.type);

  return (
    <div className="w-full max-w-md mx-auto p-1 flex-1 flex flex-col justify-between min-h-[calc(100vh-140px)] text-left animate-fade-in">
      <div className="space-y-4">
        {/* Header Badge & Name */}
        <div className="p-4 rounded-2xl theme-bg-sub border theme-border space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md theme-bg-accent-soft theme-accent">
              {itemTypeName} Details
            </span>
            {!hideStatus && (
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  item.is_active
                    ? "theme-bg-accent-soft theme-accent"
                    : "theme-bg-surface theme-text-secondary border theme-border"
                }`}
              >
                {item.is_active ? "Active in System" : "Inactive"}
              </span>
            )}
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
          {item.type && (
            <div className="flex items-center justify-between py-1 border-b theme-border">
              <span className="theme-text-secondary font-medium">{typeLabel}:</span>
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20">
                {matchedType ? matchedType.label : item.type}
              </span>
            </div>
          )}

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

import CustomSelect from "../ui/CustomSelect";

/**
 * Drawer Form for adding / editing a taxonomy item in the Right Sidebar
 */
export function TaxonomyDrawerForm({
  initialData = null,
  itemTypeName = "Category",
  typeOptions = null,
  typeLabel = "Type",
  hideStatus = false,
  onSave,
  onCancel,
}) {
  const { activeTenantId } = useTenant();
  const { showToast } = useToast();

  const [kindsList, setKindsList] = useState(typeOptions || []);
  const [isManageOpen, setIsManageOpen] = useState(false);

  // Inline manage states
  const [editingKindVal, setEditingKindVal] = useState(null);
  const [editKindLabel, setEditKindLabel] = useState("");
  const [deletingKindObj, setDeletingKindObj] = useState(null);
  const [kindReplacementVal, setKindReplacementVal] = useState("");
  const [newKindName, setNewKindName] = useState("");

  const refreshKinds = () => {
    if (itemTypeName === "Event Type" || typeOptions) {
      const stored = calendarEventKindsStore.getKinds(activeTenantId);
      if (stored && stored.length > 0) {
        setKindsList(stored);
      }
    }
  };

  useEffect(() => {
    if (typeOptions) setKindsList(typeOptions);
  }, [typeOptions]);

  const [formData, setFormData] = useState(() => ({
    name: initialData?.name || "",
    code: initialData?.code || "",
    type: initialData?.type || (typeOptions && typeOptions.length > 0 ? typeOptions[0].value : ""),
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

  // Inline Kind Actions
  const handleAddKind = (e) => {
    e.preventDefault();
    if (!newKindName.trim()) return;
    try {
      const created = calendarEventKindsStore.addKind(activeTenantId, { label: newKindName.trim() });
      setNewKindName("");
      refreshKinds();
      setFormData((prev) => ({ ...prev, type: created.value }));
      showToast(`Type "${created.label}" added!`, "success");
    } catch (err) {
      showToast("Failed to add type", "error");
    }
  };

  const handleSaveEditKind = (oldVal) => {
    if (!editKindLabel.trim()) return;
    try {
      calendarEventKindsStore.updateKind(activeTenantId, oldVal, { label: editKindLabel.trim() });
      setEditingKindVal(null);
      refreshKinds();
      showToast("Type updated!", "success");
    } catch (err) {
      showToast("Failed to update type", "error");
    }
  };

  const handlePromptDeleteKind = (k) => {
    const remaining = kindsList.filter((item) => item.value !== k.value);
    if (remaining.length === 0) {
      showToast("Cannot delete the last remaining type", "warning");
      return;
    }
    setEditingKindVal(null);
    setDeletingKindObj(k);
    setKindReplacementVal(remaining[0].value);
  };

  const handleConfirmDeleteKind = () => {
    if (!deletingKindObj || !kindReplacementVal) return;
    try {
      calendarEventKindsStore.deleteKind(activeTenantId, deletingKindObj.value, kindReplacementVal);
      if (formData.type === deletingKindObj.value) {
        setFormData((prev) => ({ ...prev, type: kindReplacementVal }));
      }
      setDeletingKindObj(null);
      refreshKinds();
      showToast(`Deleted "${deletingKindObj.label}". Migrated to replacement type.`, "info");
    } catch (err) {
      showToast("Failed to delete type", "error");
    }
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
          type: formData.type || undefined,
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
              {itemTypeName} Display Name <span className="theme-accent">*</span>
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
              Code / Unique Identifier <span className="theme-accent">*</span>
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

          {/* Optional Type Dropdown with Inline Manage Panel Directly Underneath */}
          {kindsList && kindsList.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold theme-text-secondary">
                  {typeLabel} <span className="theme-accent">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsManageOpen((prev) => !prev)}
                  className="text-[11px] font-semibold theme-accent hover:underline flex items-center gap-1 cursor-pointer"
                  title="Manage, edit, add, or delete types"
                >
                  <span>{isManageOpen ? "Close Manager" : "Manage Types"}</span>
                </button>
              </div>

              <CustomSelect
                value={formData.type}
                onChange={(val) => setFormData({ ...formData, type: val })}
                options={kindsList}
                placeholder={`Select ${typeLabel}...`}
                searchable={true}
              />

              {/* Inline Expandable Manager Panel Underneath Dropdown - Increased Height & Spacious Design */}
              {isManageOpen && (
                <div className="mt-2.5 p-3.5 rounded-2xl border theme-border theme-bg-sub/80 space-y-3 animate-fade-in text-left">
                  <div className="flex items-center justify-between border-b theme-border pb-2">
                    <span className="text-xs font-bold theme-text-primary">Manage {typeLabel}s</span>
                    <span className="text-[10px] font-mono theme-text-secondary">{kindsList.length} items</span>
                  </div>

                  {/* List of Types with Increased Height and Padding */}
                  <div className="space-y-2 max-h-72 sm:max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                    {kindsList.map((k) => {
                      const isEditing = editingKindVal === k.value;
                      if (isEditing) {
                        return (
                          <div key={k.value} className="flex items-center gap-1.5 p-2 rounded-xl border theme-border theme-bg-surface">
                            <input
                              type="text"
                              value={editKindLabel}
                              onChange={(e) => setEditKindLabel(e.target.value)}
                              className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border theme-border theme-bg-sub theme-text-primary focus:outline-none"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEditKind(k.value)}
                              className="px-3 py-1.5 rounded-lg theme-bg-accent theme-accent-text text-xs font-bold cursor-pointer hover:opacity-90"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingKindVal(null)}
                              className="px-2.5 py-1.5 rounded-lg border theme-border text-xs theme-text-secondary hover:theme-bg-sub cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={k.value}
                          className="flex items-center justify-between p-2.5 rounded-xl border theme-border theme-bg-surface hover:theme-bg-elevated transition text-xs shadow-2xs group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full theme-bg-accent shrink-0" />
                            <span className="font-semibold theme-text-primary truncate">{k.label}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingKindVal(k.value);
                                setEditKindLabel(k.label);
                                setDeletingKindObj(null);
                              }}
                              className="p-1.5 rounded-lg border theme-border hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition cursor-pointer"
                              title="Edit Type"
                            >
                              <EditIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePromptDeleteKind(k)}
                              className="p-1.5 rounded-lg border theme-border hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition cursor-pointer"
                              title="Delete Type with Replacement"
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Delete & Replace Confirmation Box Inline inside Drawer */}
                  {deletingKindObj && (
                    <div className="p-3.5 rounded-xl border theme-border theme-bg-surface space-y-2.5 animate-fade-in text-xs">
                      <div className="theme-text-primary font-bold">
                        Delete "{deletingKindObj.label}"?
                      </div>
                      <p className="text-[11px] theme-text-secondary">
                        Select replacement type for existing items:
                      </p>

                      <CustomSelect
                        value={kindReplacementVal}
                        onChange={(val) => setKindReplacementVal(val)}
                        options={kindsList.filter((k) => k.value !== deletingKindObj.value)}
                        placeholder="Select replacement..."
                      />

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setDeletingKindObj(null)}
                          className="px-3 py-1.5 rounded-xl border theme-border text-xs theme-text-secondary hover:theme-bg-elevated cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmDeleteKind}
                          className="px-3.5 py-1.5 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold hover:opacity-90 cursor-pointer shadow-xs"
                        >
                          Confirm & Replace
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Inline Add Form */}
                  <div className="pt-2.5 border-t theme-border flex items-center gap-2">
                    <input
                      type="text"
                      value={newKindName}
                      onChange={(e) => setNewKindName(e.target.value)}
                      placeholder={`Add new ${typeLabel.toLowerCase()}...`}
                      className="flex-1 text-xs px-3 py-2 rounded-xl border theme-border theme-bg-surface theme-text-primary focus:outline-none focus:ring-1 focus:ring-[var(--accent-main)]"
                    />
                    <button
                      type="button"
                      onClick={handleAddKind}
                      disabled={!newKindName.trim()}
                      className="px-3.5 py-2 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold disabled:opacity-40 cursor-pointer shrink-0 shadow-xs hover:opacity-90"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

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

          <div className={`${hideStatus ? 'block' : 'grid grid-cols-2 gap-3'} pt-2 border-t theme-border`}>
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

            {!hideStatus && (
              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1.5">
                  Status
                </label>
                <CustomSelect
                  value={formData.is_active ? "YES" : "NO"}
                  onChange={(val) => setFormData({ ...formData, is_active: val === "YES" })}
                  options={[
                    { value: "YES", label: "Active" },
                    { value: "NO", label: "Inactive" },
                  ]}
                />
              </div>
            )}
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
  typeOptions = null,
  typeLabel = "Type",
  hideStatus = false,
  onManageTypes = null,
  headerExtra = null,
  icon: HeaderIcon = BuildingOfficeIcon,
  className = "",
}) {
  const { showToast } = useToast();
  const { openDrawer, closeDrawer } = useRightSidebar();

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

  const taxonomyDrawerKey = `taxonomy-${itemTypeName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  // Universal Drawer Registration for Taxonomy (survives F5 refresh)
  useDrawerRegistration(
    taxonomyDrawerKey,
    (params) => {
      const mode = params.get('mode') || 'add';
      const itemId = params.get('id');
      const foundItem = itemId ? items.find((i) => String(i.id) === String(itemId)) : null;

      if (mode === 'detail') {
        return {
          title: `${itemTypeName} Details`,
          category: 'Taxonomy & Settings',
          width: 480,
          content: (
            <TaxonomyDetailDrawer
              item={foundItem}
              itemTypeName={itemTypeName}
              typeOptions={typeOptions}
              typeLabel={typeLabel}
              hideStatus={hideStatus}
              onEdit={(targetItem) => {
                openDrawer(taxonomyDrawerKey, { mode: 'edit', id: targetItem.id });
              }}
              onClose={closeDrawer}
            />
          ),
        };
      }

      if (mode === 'edit') {
        return {
          title: `Edit ${itemTypeName}`,
          category: 'Taxonomy & Settings',
          width: 480,
          content: (
            <TaxonomyDrawerForm
              initialData={foundItem}
              itemTypeName={itemTypeName}
              typeOptions={typeOptions}
              typeLabel={typeLabel}
              hideStatus={hideStatus}
              onManageTypes={onManageTypes}
              onSave={async (payload) => {
                try {
                  if (updateItem) await updateItem(foundItem?.id, payload);
                  showToast(`${itemTypeName} updated successfully!`, "success");
                  closeDrawer();
                  loadData();
                } catch (err) {
                  showToast(err.message || `Failed to update ${itemTypeName.toLowerCase()}`, "error");
                }
              }}
              onCancel={closeDrawer}
            />
          ),
        };
      }

      return {
        title: `Add New ${itemTypeName}`,
        category: 'Taxonomy & Settings',
        width: 480,
        content: (
          <TaxonomyDrawerForm
            itemTypeName={itemTypeName}
            typeOptions={typeOptions}
            typeLabel={typeLabel}
            hideStatus={hideStatus}
            onManageTypes={onManageTypes}
            onSave={async (payload) => {
              try {
                if (createItem) await createItem(payload);
                showToast(`${itemTypeName} created successfully!`, "success");
                closeDrawer();
                loadData();
              } catch (err) {
                showToast(err.message || `Failed to create ${itemTypeName.toLowerCase()}`, "error");
              }
            }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [taxonomyDrawerKey, items, itemTypeName, typeOptions, typeLabel, hideStatus, onManageTypes, createItem, updateItem, loadData, closeDrawer, showToast]
  );

  // Open Right Sidebar for Details
  const handleOpenDetailDrawer = (item) => {
    openDrawer(taxonomyDrawerKey, { mode: 'detail', id: item.id });
  };

  // Open Right Sidebar for Adding
  const handleOpenAddDrawer = () => {
    openDrawer(taxonomyDrawerKey, { mode: 'add' });
  };

  // Open Right Sidebar for Editing
  const handleOpenEditDrawer = (item) => {
    openDrawer(taxonomyDrawerKey, { mode: 'edit', id: item.id });
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

  // Define Reusable DataTable Columns
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
    ...(typeOptions && typeOptions.length > 0
      ? [
          {
            header: typeLabel,
            key: "type",
            render: (item) => {
              const matched = typeOptions.find((t) => t.value === item.type);
              return (
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold theme-bg-sub border theme-border theme-text-primary">
                  {matched ? matched.label : item.type || "—"}
                </span>
              );
            },
          },
        ]
      : []),
    ...(!hideStatus
      ? [
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
        ]
      : []),
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
          ...(!hideStatus
            ? [
                {
                  label: item.is_active ? "Mark Inactive" : "Mark Active",
                  icon: CheckIcon,
                  onClick: () => handleToggleActive(item),
                },
              ]
            : []),
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
  ], [itemTypeName, typeOptions, typeLabel, hideStatus, handleToggleActive]);

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

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {headerExtra}
          <button
            type="button"
            onClick={handleOpenAddDrawer}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Add {itemTypeName}</span>
          </button>
        </div>
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
