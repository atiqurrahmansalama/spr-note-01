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
import { calendarEventKindsStore, staffCategoriesStore } from "../../utils/localStore";
import { DrawerContainer } from "../layout";
import CustomInput from "../ui/CustomInput";
import CustomSelect from "../ui/CustomSelect";
import ClassSelect from "../selectors/ClassSelect";

/**
 * Detail View Drawer for inspecting full taxonomy details in the Right Sidebar
 */
export function TaxonomyDetailDrawer({
  item,
  itemTypeName = "Category",
  typeOptions = null,
  typeLabel = "Type",
  hideStatus = false,
  extraFields = null,
  onEdit,
  onClose,
}) {
  if (!item) return null;

  const matchedType = typeOptions?.find((t) => t.value === item.type);

  return (
    <DrawerContainer padding="normal" spacing="normal">
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
          </div>
        </div>

        {/* Details Card */}
        <div className="p-4 rounded-2xl border theme-border theme-bg-surface space-y-3.5 text-xs">
          {Array.isArray(typeOptions) && typeOptions.length > 0 && item.type && (
            <div className="flex items-center justify-between py-1 border-b theme-border">
              <span className="theme-text-secondary font-medium">{typeLabel}:</span>
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20">
                {matchedType ? matchedType.label : item.type}
              </span>
            </div>
          )}

          {Array.isArray(extraFields) &&
            extraFields.map((field) => {
              const val = item[field.name];
              let displayContent = null;
              if (Array.isArray(val)) {
                displayContent = (
                  <div className="flex flex-wrap gap-1 justify-end max-w-[280px]">
                    {val.map((v) => {
                      const opt = Array.isArray(field.options) ? field.options.find((o) => o.value === v) : null;
                      return (
                        <span
                          key={v}
                          className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold theme-bg-sub border theme-border theme-text-primary"
                        >
                          {opt ? (opt.tag || opt.label.split("(")[0].trim()) : v}
                        </span>
                      );
                    })}
                  </div>
                );
              } else {
                const matchedOpt = Array.isArray(field.options)
                  ? field.options.find((o) => o.value === val)
                  : null;
                displayContent = (
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold theme-bg-sub border theme-border theme-text-primary">
                    {matchedOpt ? matchedOpt.label : val || "—"}
                  </span>
                );
              }
              return (
                <div key={field.name} className="flex items-center justify-between py-1 border-b theme-border gap-2">
                  <span className="theme-text-secondary font-medium shrink-0">{field.label}:</span>
                  {displayContent}
                </div>
              );
            })}

          <div className="flex items-center justify-between py-1 border-b theme-border">
            <span className="theme-text-secondary font-medium">Display Priority / Order:</span>
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
    </DrawerContainer>
  );
}

/**
 * Drawer Form for adding / editing a taxonomy item in the Right Sidebar
 */
export function TaxonomyDrawerForm({
  initialData = null,
  itemTypeName = "Category",
  typeOptions = null,
  typeLabel = "Type",
  hideStatus = false,
  extraFields = null,
  onManageTypes = null,
  onSave,
  onCancel,
}) {
  const { activeTenantId } = useTenant();
  const { showToast } = useToast();

  const hasTypes = Boolean(Array.isArray(typeOptions) && typeOptions.length > 0);
  const [kindsList, setKindsList] = useState(() => (hasTypes ? typeOptions : []));
  const [isManageOpen, setIsManageOpen] = useState(false);

  // Inline manage states
  const [editingKindVal, setEditingKindVal] = useState(null);
  const [editKindLabel, setEditKindLabel] = useState("");
  const [deletingKindObj, setDeletingKindObj] = useState(null);
  const [kindReplacementVal, setKindReplacementVal] = useState("");
  const [newKindName, setNewKindName] = useState("");

  const refreshKinds = () => {
    if (itemTypeName === "Staff Rank") {
      const stored = staffCategoriesStore.getCategories(activeTenantId);
      if (stored && stored.length > 0) {
        setKindsList(stored);
      }
    } else if (itemTypeName === "Event Type" && onManageTypes) {
      const stored = calendarEventKindsStore.getKinds(activeTenantId);
      if (stored && stored.length > 0) {
        setKindsList(stored);
      }
    }
  };

  useEffect(() => {
    setKindsList(Array.isArray(typeOptions) ? typeOptions : []);
  }, [typeOptions]);

  const [formData, setFormData] = useState(() => {
    const base = {
      name: initialData?.name || "",
      type: initialData?.type || (typeOptions && typeOptions.length > 0 ? typeOptions[0].value : ""),
      description: initialData?.description || "",
      order: initialData?.order ?? 0,
      is_active: initialData?.is_active ?? true,
    };
    if (Array.isArray(extraFields)) {
      extraFields.forEach((f) => {
        base[f.name] = initialData?.[f.name] !== undefined ? initialData[f.name] : (f.defaultValue ?? "");
      });
    }
    return base;
  });

  // Automatically update form state when editing a different item while drawer is open
  useEffect(() => {
    const base = {
      name: initialData?.name || "",
      type: initialData?.type || (typeOptions && typeOptions.length > 0 ? typeOptions[0].value : ""),
      description: initialData?.description || "",
      order: initialData?.order ?? 0,
      is_active: initialData?.is_active ?? true,
    };
    if (Array.isArray(extraFields)) {
      extraFields.forEach((f) => {
        base[f.name] = initialData?.[f.name] !== undefined ? initialData[f.name] : (f.defaultValue ?? "");
      });
    }
    setFormData(base);
    setIsManageOpen(false);
    setEditingKindVal(null);
    setDeletingKindObj(null);
  }, [initialData, typeOptions, extraFields]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNameChange = (val) => {
    setFormData((prev) => ({ ...prev, name: val }));
  };

  // Inline Kind Actions
  const handleAddKind = (e) => {
    e.preventDefault();
    if (!newKindName.trim()) return;
    try {
      if (itemTypeName === "Staff Rank") {
        const val = newKindName.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
        staffCategoriesStore.addCategory(activeTenantId, { value: val, label: newKindName.trim(), badge: val.slice(0, 5) });
      } else {
        calendarEventKindsStore.addKind(activeTenantId, { label: newKindName.trim() });
      }
      setNewKindName("");
      refreshKinds();
      showToast(`Added new ${typeLabel.toLowerCase()}`, "success");
    } catch (err) {
      showToast("Failed to add type", "error");
    }
  };

  const handleSaveEditKind = (oldVal) => {
    if (!editKindLabel.trim()) return;
    try {
      if (itemTypeName === "Staff Rank") {
        staffCategoriesStore.updateCategory(activeTenantId, oldVal, editKindLabel.trim());
      } else {
        calendarEventKindsStore.updateKind(activeTenantId, oldVal, { label: editKindLabel.trim() });
      }
      setEditingKindVal(null);
      refreshKinds();
      showToast("Updated successfully", "success");
    } catch (err) {
      showToast("Failed to update", "error");
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
      if (itemTypeName === "Staff Rank") {
        staffCategoriesStore.deleteCategory(activeTenantId, deletingKindObj.value, kindReplacementVal);
      } else {
        calendarEventKindsStore.deleteKind(activeTenantId, deletingKindObj.value, kindReplacementVal);
      }
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

    const generatedCode = initialData?.code || formData.name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 40);

    setIsSubmitting(true);
    try {
      if (onSave) {
        await onSave({
          ...formData,
          name: formData.name.trim(),
          code: generatedCode || `ITEM_${Date.now()}`,
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
    <DrawerContainer padding="normal" spacing="normal">
      <form onSubmit={handleSubmit} className="flex flex-col justify-between flex-1 space-y-6">
        
        {/* Form Fields */}
        <div className="space-y-4">
          <CustomInput
            label={`${itemTypeName} Display Name`}
            required={true}
            value={formData.name}
            onChange={handleNameChange}
            placeholder={`e.g. General ${itemTypeName}`}
          />

          {/* Optional Type Dropdown with Inline Manage Panel (Only when typeOptions is explicitly passed) */}
          {hasTypes && kindsList && kindsList.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider select-none">
                  {typeLabel} <span className="theme-danger">*</span>
                </label>
                {Boolean(onManageTypes) && (
                  <button
                    type="button"
                    onClick={() => setIsManageOpen((prev) => !prev)}
                    className="text-[11px] font-semibold theme-accent hover:underline flex items-center gap-1 cursor-pointer"
                    title={`Manage, edit, add, or delete ${typeLabel.toLowerCase()}s`}
                  >
                    <span>{isManageOpen ? "Close Manager" : `Manage ${typeLabel}s`}</span>
                  </button>
                )}
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
                          <div key={k.value} className="flex items-center gap-2 p-2 rounded-xl border theme-border theme-bg-surface">
                            <div className="flex-1 min-w-0">
                              <CustomInput
                                value={editKindLabel}
                                onChange={(val) => setEditKindLabel(val)}
                                autoFocus={true}
                                compact={true}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSaveEditKind(k.value)}
                              className="px-3 py-2 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold cursor-pointer hover:opacity-90 shadow-xs shrink-0"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingKindVal(null)}
                              className="px-2.5 py-2 rounded-xl border theme-border text-xs theme-text-secondary hover:theme-bg-sub cursor-pointer shrink-0"
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
                    <div className="flex-1 min-w-0">
                      <CustomInput
                        value={newKindName}
                        onChange={(val) => setNewKindName(val)}
                        placeholder={`Add new ${typeLabel.toLowerCase()}...`}
                        compact={true}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddKind}
                      disabled={!newKindName.trim()}
                      className="px-4 py-2.5 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold disabled:opacity-40 cursor-pointer shrink-0 shadow-xs hover:opacity-90"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dynamic Extra Config Fields */}
          {Array.isArray(extraFields) &&
            extraFields.map((field) => {
              if (field.type === "class_select" || field.type === "class") {
                return (
                  <ClassSelect
                    key={field.name}
                    label={field.label}
                    value={formData[field.name] !== undefined ? formData[field.name] : field.defaultValue}
                    onChange={(val) => setFormData((prev) => ({ ...prev, [field.name]: val }))}
                    allowAll={field.allowAll !== undefined ? field.allowAll : true}
                    allLabel={field.allLabel || "All Classes (General / Default)"}
                    allValue={field.allValue || "ALL"}
                    searchable={Boolean(field.searchable)}
                    placeholder={field.placeholder || `Select ${field.label.toLowerCase()}...`}
                  />
                );
              }

              if (field.type === "select" || field.type === "multiselect" || field.multiple) {
                return (
                  <CustomSelect
                    key={field.name}
                    label={field.label}
                    value={formData[field.name] || field.defaultValue}
                    onChange={(val) => setFormData((prev) => ({ ...prev, [field.name]: val }))}
                    options={field.options}
                    multiple={Boolean(field.multiple || field.type === "multiselect")}
                    searchable={Boolean(field.searchable)}
                    placeholder={field.placeholder || `Select ${field.label.toLowerCase()}...`}
                  />
                );
              }

              return (
                <CustomInput
                  key={field.name}
                  label={field.label}
                  value={formData[field.name] || ""}
                  onChange={(val) => setFormData((prev) => ({ ...prev, [field.name]: val }))}
                  placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                />
              );
            })}

          <CustomInput
            type="textarea"
            label="Description / Remarks (Optional)"
            value={formData.description}
            onChange={(val) => setFormData({ ...formData, description: val })}
            placeholder={`Optional details about this ${itemTypeName.toLowerCase()}...`}
            rows={3}
          />

          <div className={`${hideStatus ? 'block' : 'grid grid-cols-2 gap-3'} pt-2 border-t theme-border`}>
            <CustomInput
              label="Display Order"
              type="number"
              min="0"
              value={formData.order}
              onChange={(val) => setFormData({ ...formData, order: val })}
            />

            {!hideStatus && (
              <CustomSelect
                label="Status"
                value={formData.is_active ? "YES" : "NO"}
                onChange={(val) => setFormData({ ...formData, is_active: val === "YES" })}
                options={[
                  { value: "YES", label: "Active" },
                  { value: "NO", label: "Inactive" },
                ]}
              />
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
    </DrawerContainer>
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
  extraFields = null,
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
              key={`taxonomy-detail-${foundItem?.id || 'none'}`}
              item={foundItem}
              itemTypeName={itemTypeName}
              typeOptions={typeOptions}
              typeLabel={typeLabel}
              hideStatus={hideStatus}
              extraFields={extraFields}
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
              key={`taxonomy-form-edit-${foundItem?.id || 'edit'}`}
              initialData={foundItem}
              itemTypeName={itemTypeName}
              typeOptions={typeOptions}
              typeLabel={typeLabel}
              hideStatus={hideStatus}
              extraFields={extraFields}
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
            key={`taxonomy-form-add-${itemTypeName}`}
            itemTypeName={itemTypeName}
            typeOptions={typeOptions}
            typeLabel={typeLabel}
            hideStatus={hideStatus}
            extraFields={extraFields}
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
    [taxonomyDrawerKey, items, itemTypeName, typeOptions, typeLabel, hideStatus, extraFields, onManageTypes, createItem, updateItem, loadData, closeDrawer, showToast]
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

  // Define Reusable DataTable Columns (Clean Without Code/Slug)
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
    ...(Array.isArray(extraFields)
      ? extraFields
          .filter((f) => f.tableHeader)
          .map((f) => ({
            header: f.tableHeader,
            key: f.name,
            render: (item) => {
              const val = item[f.name];
              if (f.renderBadge) {
                return f.renderBadge(val, item);
              }
              const opt = Array.isArray(f.options) ? f.options.find((o) => o.value === val) : null;
              return (
                <span className="px-2.5 py-0.5 rounded-lg theme-bg-sub border theme-border text-[11px] font-semibold theme-text-primary">
                  {opt ? opt.label : val || "—"}
                </span>
              );
            },
          }))
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
      headerClassName: "w-16 text-right",
      render: (item) => {
        const actionItems = [
          {
            label: "Edit",
            icon: EditIcon,
            onClick: () => handleOpenEditDrawer(item),
          },
          {
            label: "View Details",
            icon: EyeIcon,
            onClick: () => handleOpenDetailDrawer(item),
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
      <div className="p-4 sm:p-5 rounded-2xl border theme-border theme-bg-surface shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 min-w-0">
        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
          {HeaderIcon && (
            <div className="p-2.5 rounded-xl theme-bg-accent-soft theme-accent shrink-0 mt-0.5 sm:mt-0">
              <HeaderIcon className="w-5 h-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold theme-text-primary tracking-tight">
                {title}
              </h2>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md theme-bg-sub border theme-border theme-text-secondary">
                {items.length} {items.length === 1 ? itemTypeName.toLowerCase() : `${itemTypeName.toLowerCase()}s`}
              </span>
            </div>
            {description && (
              <p className="text-xs theme-text-secondary mt-1 max-w-2xl leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Right-aligned Header Actions: Add New Item */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
          {headerExtra}
          <button
            type="button"
            onClick={handleOpenAddDrawer}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl theme-bg-accent theme-accent-text font-bold text-xs shadow-md hover:opacity-90 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer shrink-0 whitespace-nowrap"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add {itemTypeName}</span>
          </button>
        </div>
      </div>

      {/* ─── Main Records DataTable ─────────────────────────────────── */}
      <DataTable
        columns={columns}
        data={items}
        isLoading={isLoading}
        emptyTitle={`No ${itemTypeName}s Registered`}
        emptySubMessage={`Click the "+ Add ${itemTypeName}" button above to register your first taxonomy item.`}
        emptyIcon={HeaderIcon}
        onRowClick={(item) => handleOpenEditDrawer(item)}
      />

      {/* ─── Delete Confirmation Modal ────────────────────────────── */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm theme-bg-surface border theme-border rounded-2xl p-5 shadow-2xl space-y-3.5 animate-scale-in text-left">
            <div className="flex items-center gap-3 theme-danger">
              <div className="p-2 rounded-xl theme-bg-danger-soft border theme-border shrink-0">
                <AlertTriangleIcon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold theme-text-primary">Delete {itemTypeName}</h4>
                <p className="text-[11px] theme-text-secondary">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs theme-text-secondary">
              Are you sure you want to permanently delete <strong className="theme-text-primary">"{deletingItem.name}"</strong>?
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
                className="px-4 py-1.5 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
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
