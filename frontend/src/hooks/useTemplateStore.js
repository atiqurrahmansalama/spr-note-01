import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchWithAuth } from "../utils/authService";
import { isOnline, readJSON, writeJSON } from "../utils/localStore";
import { useToast } from "../context/ToastContext";
import { useUndoRedo } from "../context/useUndoRedo";

/**
 * Module-level in-memory cache for ultra-fast 0ms synchronous access
 * across all mounted inputs, textareas, and table cells sharing the same category.
 */
const templateMemoryCache = new Map();
const TEMPLATES_SYNC_EVENT = "spr_saved_templates_updated";

/**
 * Helper to broadcast template updates across all components on the page
 * and persist into local engine storage immediately.
 */
const broadcastTemplatesUpdate = (category, updatedList) => {
  const cleanCat = String(category || "general").trim().toLowerCase().replace(/[^a-z0-9_]/g, "_") || "general";
  const storageKey = `spr_saved_templates_${cleanCat}`;
  templateMemoryCache.set(cleanCat, updatedList);
  writeJSON(storageKey, updatedList);
  window.dispatchEvent(
    new CustomEvent(TEMPLATES_SYNC_EVENT, {
      detail: { category: cleanCat, namespace: cleanCat, templates: updatedList },
    })
  );
};

/**
 * useTemplateStore
 * Universal Enterprise Hook for managing text templates (e.g. comments, remarks, instructions).
 * Features 100% instant local engine synchronization across sibling components and tables.
 * 
 * @param {Object} options
 * @param {string} options.category - Category identifier (e.g. "exam_mark_entry_remarks", "comments")
 * @param {string} options.namespace - Alias for category (default: "general")
 * @param {Array} options.initialTemplates - Initial fallback template list
 * @param {boolean} options.syncWithServer - Whether to sync with backend /messages/ API (default: true)
 */
export function useTemplateStore({
  category,
  namespace = "general",
  initialTemplates = [],
  syncWithServer = true,
} = {}) {
  const { showToast } = useToast();
  
  let undoRedoCtx = null;
  try {
    undoRedoCtx = useUndoRedo();
  } catch {
    // Fallback gracefully if used outside provider
  }

  // Strictly sanitize category / namespace to guarantee isolated storage per field or column
  const cleanNamespace = useMemo(() => {
    const raw = String(category || namespace || "general").trim().toLowerCase();
    return raw.replace(/[^a-z0-9_]/g, "_") || "general";
  }, [category, namespace]);

  const storageKey = useMemo(() => {
    return `spr_saved_templates_${cleanNamespace}`;
  }, [cleanNamespace]);

  const lruKey = useMemo(() => {
    return `spr_last_picked_${cleanNamespace}`;
  }, [cleanNamespace]);

  // Load templates with priority: 1. In-memory cache, 2. LocalStore, 3. Initial fallback
  const [templates, setTemplates] = useState(() => {
    if (templateMemoryCache.has(cleanNamespace)) {
      return templateMemoryCache.get(cleanNamespace);
    }
    try {
      const stored = readJSON(storageKey, null);
      if (Array.isArray(stored)) {
        const validStored = stored.filter(
          (item) =>
            item &&
            typeof item === "object" &&
            String(item.category || "").trim().toLowerCase() === cleanNamespace.toLowerCase()
        );
        if (validStored.length > 0) {
          templateMemoryCache.set(cleanNamespace, validStored);
          return validStored;
        }
      }
      if (Array.isArray(initialTemplates) && initialTemplates.length > 0) {
        const mapped = initialTemplates.map((item) =>
          typeof item === "object"
            ? { ...item, category: cleanNamespace }
            : {
                id: `tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                text: String(item),
                category: cleanNamespace,
              }
        );
        templateMemoryCache.set(cleanNamespace, mapped);
        return mapped;
      }
      return [];
    } catch {
      return [];
    }
  });

  // Reactive Event Listener: Instantly syncs state across all sibling components (e.g. table rows)
  useEffect(() => {
    const handleSync = (e) => {
      const targetCat = e.detail?.category || e.detail?.namespace;
      if (targetCat === cleanNamespace && Array.isArray(e.detail?.templates)) {
        setTemplates(e.detail.templates);
      }
    };
    window.addEventListener(TEMPLATES_SYNC_EVENT, handleSync);
    return () => {
      window.removeEventListener(TEMPLATES_SYNC_EVENT, handleSync);
    };
  }, [cleanNamespace]);

  // Sync with backend API in the background if online
  useEffect(() => {
    if (!syncWithServer || !isOnline()) return;

    let isMounted = true;
    const fetchServerTemplates = async () => {
      try {
        const endpoint = `/messages/?category=${encodeURIComponent(cleanNamespace)}`;
        const res = await fetchWithAuth(endpoint);
        if (res.ok && isMounted) {
          const apiData = await res.json();
          if (Array.isArray(apiData)) {
            const normalized = apiData
              .filter(
                (item) =>
                  String(item.category || "").trim().toLowerCase() === cleanNamespace.toLowerCase()
              )
              .map((item) => ({
                id: item.id,
                text: item.text || item.comment || item.content || String(item),
                category: cleanNamespace,
                createdAt: item.created_at,
              }))
              .filter((item) => Boolean(item.text && item.text.trim()));

            // Merge server templates with any local templates
            const currentCache = templateMemoryCache.get(cleanNamespace) || [];
            const mergedMap = new Map();
            normalized.forEach((item) => mergedMap.set(item.text.toLowerCase().trim(), item));
            currentCache.forEach((item) => {
              const key = (item.text || "").toLowerCase().trim();
              if (!mergedMap.has(key)) {
                mergedMap.set(key, item);
              }
            });
            const merged = Array.from(mergedMap.values());

            templateMemoryCache.set(cleanNamespace, merged);
            writeJSON(storageKey, merged);
            if (isMounted) {
              setTemplates(merged);
            }
            window.dispatchEvent(
              new CustomEvent(TEMPLATES_SYNC_EVENT, {
                detail: { category: cleanNamespace, namespace: cleanNamespace, templates: merged },
              })
            );
          }
        }
      } catch (err) {
        // Silently fall back to local cache
      }
    };

    fetchServerTemplates();
    return () => {
      isMounted = false;
    };
  }, [storageKey, syncWithServer, cleanNamespace]);

  // Check if a specific text is already saved
  const isAlreadySaved = useCallback(
    (text) => {
      const trimmed = (text || "").trim();
      if (!trimmed) return true;
      const currentList = templateMemoryCache.get(cleanNamespace) || templates;
      return currentList.some((item) => {
        const itemText = typeof item === "object" && item !== null ? item.text : String(item);
        return (itemText || "").trim().toLowerCase() === trimmed.toLowerCase();
      });
    },
    [cleanNamespace, templates]
  );

  // Add a new template (Instant local engine update + non-blocking background server sync)
  const addTemplate = useCallback(
    async (text) => {
      const trimmed = (text || "").trim();
      if (!trimmed) {
        showToast("Cannot save an empty template.", "warning");
        return { success: false };
      }

      if (isAlreadySaved(trimmed)) {
        showToast("This template is already saved.", "info");
        return { success: false, alreadyExists: true };
      }

      const tempId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const savedItem = {
        id: tempId,
        text: trimmed,
        category: cleanNamespace,
        createdAt: new Date().toISOString(),
      };

      // 1. INSTANT LOCAL OPTIMISTIC UPDATE (0ms)
      const currentList = templateMemoryCache.get(cleanNamespace) || templates;
      const updated = [
        savedItem,
        ...currentList.filter((item) => {
          const t = typeof item === "object" && item !== null ? item.text : String(item);
          return t.toLowerCase().trim() !== trimmed.toLowerCase();
        }),
      ];

      setTemplates(updated);
      broadcastTemplatesUpdate(cleanNamespace, updated);
      showToast("Template saved successfully!", "success");

      // 2. BACKGROUND SERVER SYNC (Non-blocking async)
      if (syncWithServer && isOnline()) {
        (async () => {
          try {
            const endpoint = `/messages/?category=${encodeURIComponent(cleanNamespace)}`;
            const response = await fetchWithAuth(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: trimmed, category: cleanNamespace }),
            });
            if (response.ok) {
              const apiMsg = await response.json();
              if (apiMsg && apiMsg.id) {
                const latestList = templateMemoryCache.get(cleanNamespace) || updated;
                const syncedList = latestList.map((item) =>
                  item.id === tempId
                    ? { ...item, id: apiMsg.id, createdAt: apiMsg.created_at || item.createdAt }
                    : item
                );
                broadcastTemplatesUpdate(cleanNamespace, syncedList);
              }
            }
          } catch {
            // Keep local persistence intact
          }
        })();
      }

      return { success: true, item: savedItem };
    },
    [isAlreadySaved, cleanNamespace, templates, syncWithServer, showToast]
  );

  // Restore a previously deleted template (Instant local update + background sync)
  const restoreTemplate = useCallback(
    async (itemToRestore) => {
      if (!itemToRestore) return { success: false };
      const text =
        typeof itemToRestore === "object" && itemToRestore !== null
          ? itemToRestore.text
          : String(itemToRestore);
      const trimmed = (text || "").trim();
      if (!trimmed) return { success: false };

      const tempId =
        typeof itemToRestore === "object" && itemToRestore !== null && itemToRestore.id
          ? itemToRestore.id
          : `tmpl_${Date.now()}`;

      const restoredItem =
        typeof itemToRestore === "object" && itemToRestore !== null
          ? { ...itemToRestore, category: cleanNamespace }
          : {
              id: tempId,
              text: trimmed,
              category: cleanNamespace,
              createdAt: new Date().toISOString(),
            };

      // 1. INSTANT LOCAL OPTIMISTIC UPDATE (0ms)
      const currentList = templateMemoryCache.get(cleanNamespace) || templates;
      const exists = currentList.some((p) => {
        const pTxt = typeof p === "object" && p !== null ? p.text : String(p);
        return pTxt.toLowerCase().trim() === trimmed.toLowerCase();
      });
      if (exists) return { success: true, item: restoredItem };

      const updated = [restoredItem, ...currentList];
      setTemplates(updated);
      broadcastTemplatesUpdate(cleanNamespace, updated);
      showToast("Template restored successfully!", "success");

      // 2. BACKGROUND SERVER SYNC (Non-blocking async)
      if (syncWithServer && isOnline()) {
        (async () => {
          try {
            const endpoint = `/messages/?category=${encodeURIComponent(cleanNamespace)}`;
            const response = await fetchWithAuth(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: trimmed, category: cleanNamespace }),
            });
            if (response.ok) {
              const apiMsg = await response.json();
              if (apiMsg && apiMsg.id) {
                const latestList = templateMemoryCache.get(cleanNamespace) || updated;
                const syncedList = latestList.map((item) =>
                  item.text === trimmed
                    ? { ...item, id: apiMsg.id, createdAt: apiMsg.created_at || item.createdAt }
                    : item
                );
                broadcastTemplatesUpdate(cleanNamespace, syncedList);
              }
            }
          } catch {
            // Keep local restoration intact
          }
        })();
      }

      return { success: true, item: restoredItem };
    },
    [cleanNamespace, templates, syncWithServer, showToast]
  );

  // Delete a template (Instant local update + background sync + undo history)
  const deleteTemplate = useCallback(
    async (itemToDelete, recordUndo = true) => {
      const text =
        typeof itemToDelete === "object" && itemToDelete !== null
          ? itemToDelete.text
          : String(itemToDelete);
      const id =
        typeof itemToDelete === "object" && itemToDelete !== null ? itemToDelete.id : null;
      const fullItem =
        typeof itemToDelete === "object" && itemToDelete !== null
          ? itemToDelete
          : { id: `tmpl_${Date.now()}`, text, category: cleanNamespace };

      // 1. INSTANT LOCAL OPTIMISTIC UPDATE (0ms)
      const currentList = templateMemoryCache.get(cleanNamespace) || templates;
      const updated = currentList.filter((item) => {
        const itemText = typeof item === "object" && item !== null ? item.text : String(item);
        const itemId = typeof item === "object" && item !== null ? item.id : null;
        if (id && itemId) return itemId !== id;
        return itemText.toLowerCase() !== text.toLowerCase();
      });

      setTemplates(updated);
      broadcastTemplatesUpdate(cleanNamespace, updated);
      showToast("Template deleted. (Press Ctrl+Z to undo)", "info");

      // 2. BACKGROUND SERVER SYNC (Non-blocking async)
      if (syncWithServer && isOnline()) {
        (async () => {
          try {
            let targetId = id;
            if (!targetId || typeof targetId !== "number") {
              const listRes = await fetchWithAuth(
                `/messages/?category=${encodeURIComponent(cleanNamespace)}`
              );
              if (listRes.ok) {
                const rawMsgs = await listRes.json();
                const match = (Array.isArray(rawMsgs) ? rawMsgs : []).find(
                  (m) => (m.text || m.comment || "").toLowerCase() === text.toLowerCase()
                );
                if (match) targetId = match.id;
              }
            }
            if (targetId) {
              await fetchWithAuth(`/messages/${targetId}/`, { method: "DELETE" });
            }
          } catch {
            // Keep local deletion intact
          }
        })();
      }

      // Register undo action in global history
      if (recordUndo !== false && undoRedoCtx?.pushAction) {
        const shortDesc = text.length > 25 ? text.slice(0, 22) + "..." : text;
        undoRedoCtx.pushAction({
          title: `Delete template "${shortDesc}"`,
          domain: "Templates",
          scope: "global",
          undo: async () => {
            await restoreTemplate(fullItem);
          },
          redo: async () => {
            await deleteTemplate(fullItem, false);
          },
        });
      }

      return { success: true };
    },
    [cleanNamespace, templates, syncWithServer, showToast, undoRedoCtx, restoreTemplate]
  );

  // Update an existing template (Instant local update + background sync + undo history)
  const updateTemplate = useCallback(
    async (itemToUpdate, newText, recordUndo = true) => {
      const trimmed = (newText || "").trim();
      if (!trimmed) {
        showToast("Template text cannot be empty.", "warning");
        return { success: false };
      }

      const id =
        typeof itemToUpdate === "object" && itemToUpdate !== null ? itemToUpdate.id : null;
      const oldText =
        typeof itemToUpdate === "object" && itemToUpdate !== null
          ? itemToUpdate.text
          : String(itemToUpdate);

      // 1. INSTANT LOCAL OPTIMISTIC UPDATE (0ms)
      const currentList = templateMemoryCache.get(cleanNamespace) || templates;
      const updated = currentList.map((item) => {
        const itemText = typeof item === "object" && item !== null ? item.text : String(item);
        const itemId = typeof item === "object" && item !== null ? item.id : null;
        if ((id && itemId === id) || (!id && itemText.toLowerCase() === oldText.toLowerCase())) {
          return typeof item === "object" && item !== null
            ? {
                ...item,
                text: trimmed,
                category: cleanNamespace,
                updatedAt: new Date().toISOString(),
              }
            : {
                id: `tmpl_${Date.now()}`,
                text: trimmed,
                category: cleanNamespace,
                updatedAt: new Date().toISOString(),
              };
        }
        return item;
      });

      setTemplates(updated);
      broadcastTemplatesUpdate(cleanNamespace, updated);
      showToast("Template updated successfully!", "success");

      // 2. BACKGROUND SERVER SYNC (Non-blocking async)
      if (syncWithServer && isOnline()) {
        (async () => {
          try {
            let targetId = id;
            if (!targetId || typeof targetId !== "number") {
              const listRes = await fetchWithAuth(
                `/messages/?category=${encodeURIComponent(cleanNamespace)}`
              );
              if (listRes.ok) {
                const rawMsgs = await listRes.json();
                const match = (Array.isArray(rawMsgs) ? rawMsgs : []).find(
                  (m) => (m.text || m.comment || "").toLowerCase() === oldText.toLowerCase()
                );
                if (match) targetId = match.id;
              }
            }
            if (targetId) {
              await fetchWithAuth(`/messages/${targetId}/`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: trimmed, category: cleanNamespace }),
              });
            }
          } catch {
            // Keep local update intact
          }
        })();
      }

      // Register undo action for update
      if (recordUndo !== false && undoRedoCtx?.pushAction) {
        const shortDesc = oldText.length > 20 ? oldText.slice(0, 18) + "..." : oldText;
        undoRedoCtx.pushAction({
          title: `Edit template "${shortDesc}"`,
          domain: "Templates",
          scope: "global",
          undo: async () => {
            await updateTemplate(itemToUpdate, oldText, false);
          },
          redo: async () => {
            await updateTemplate(itemToUpdate, trimmed, false);
          },
        });
      }

      return { success: true };
    },
    [cleanNamespace, templates, syncWithServer, showToast, undoRedoCtx]
  );

  // Record template usage for LRU sorting (isolated per category)
  const recordTemplateUsage = useCallback(
    (idOrText) => {
      try {
        const key =
          typeof idOrText === "object" && idOrText !== null
            ? idOrText.id || idOrText.text
            : String(idOrText);
        const pickedMap = readJSON(lruKey, {});
        pickedMap[key] = Date.now();
        writeJSON(lruKey, pickedMap);
      } catch {
        // Ignore storage errors
      }
    },
    [lruKey]
  );

  // Sorted templates by most recent usage
  const sortedTemplates = useMemo(() => {
    try {
      const pickedMap = readJSON(lruKey, {});
      return [...templates].sort((a, b) => {
        const keyA = typeof a === "object" && a !== null ? a.id || a.text : String(a);
        const keyB = typeof b === "object" && b !== null ? b.id || b.text : String(b);
        const timeA = pickedMap[keyA] || 0;
        const timeB = pickedMap[keyB] || 0;
        return timeB - timeA;
      });
    } catch {
      return templates;
    }
  }, [templates, lruKey]);

  // Pick/insert template into text
  const applyTemplate = useCallback(
    (templateItem, currentText = "", mode = "append") => {
      const text =
        typeof templateItem === "object" && templateItem !== null
          ? templateItem.text
          : String(templateItem);
      recordTemplateUsage(templateItem);

      if (mode === "replace" || !currentText.trim()) {
        return text;
      }
      return `${currentText}\n${text}`;
    },
    [recordTemplateUsage]
  );

  return {
    templates,
    sortedTemplates,
    count: templates.length,
    isAlreadySaved,
    addTemplate,
    restoreTemplate,
    updateTemplate,
    deleteTemplate,
    recordTemplateUsage,
    applyTemplate,
    setTemplates,
  };
}

export default useTemplateStore;
