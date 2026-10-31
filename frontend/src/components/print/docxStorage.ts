import type {
  CustomDocxTemplate,
  DocLabCanvasDraft,
} from './types';
import { LegacyMigrationNormalizer } from './layout/migration/LegacyMigrationNormalizer';
import { sanitizeLogicalDocumentHtml } from './layout/logicalDocument';
import { fetchWithAuth } from '../../utils/authService';

export const TEMPLATES_STORAGE_KEY = 'spr_custom_docx_templates';

/**
 * LocalStorage & Backend Cloud Custom Template Repository
 * Hybrid offline-first: Instant local optimistic storage + seamless backend database persistence
 */
export function getSavedDocxTemplates(): CustomDocxTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((t) => LegacyMigrationNormalizer.normalizeTemplate(t));
      }
    }
  } catch (e) {
    console.warn('Failed to load saved docx templates', e);
  }
  return [];
}

/**
 * Synchronizes templates between backend database and localStorage.
 * Fetches all templates created by this user or shared across the active academy scope.
 */
export async function fetchCloudDocxTemplates(): Promise<CustomDocxTemplate[]> {
  if (typeof window === 'undefined') return [];
  try {
    const res: any = await fetchWithAuth('/api/v1/docx-templates/?all=true');
    if (!res || !res.ok) {
      console.warn('[DocLab] Failed to fetch templates from cloud backend, status:', res?.status);
      return getSavedDocxTemplates();
    }
    const data = await res.json();
    const items = Array.isArray(data) ? data : (data?.results || []);
    
    if (Array.isArray(items)) {
      const cloudTemplates: CustomDocxTemplate[] = items.map((t: any) =>
        LegacyMigrationNormalizer.normalizeTemplate({
          id: t.id || t.code,
          name: t.name,
          description: t.description || '',
          scopeId: t.scopeId || t.scope_id || '',
          rawHtml: t.rawHtml || t.raw_html || '',
          detectedPlaceholders: t.detectedPlaceholders || t.detected_placeholders || [],
          isTableDocument: t.isTableDocument ?? t.is_table_document ?? false,
          sampleColumns: t.sampleColumns || t.sample_columns || [],
          sampleData: t.sampleData || t.sample_data || [],
          templateType: t.templateType || t.template_type || 'template',
          recordsCount: t.recordsCount ?? t.records_count ?? 0,
          sourceTemplateId: t.sourceTemplateId || t.source_template_id || '',
          pageProperties: t.pageProperties || t.page_properties || {},
          pageSize: t.pageSize || t.page_size || 'A4',
          orientation: t.orientation || 'PORTRAIT',
          margin: t.margin || 'NORMAL',
          isShared: t.isShared ?? t.is_shared ?? false,
          isGlobalSticky: Boolean(t.isGlobalSticky ?? t.is_global_sticky ?? false),
          createdAt: t.createdAt || t.created_at || new Date().toISOString(),
          updatedAt: t.updatedAt || t.updated_at || new Date().toISOString(),
        })
      );

      // Merge local and cloud templates
      const local = getSavedDocxTemplates();
      const templateMap = new Map<string, CustomDocxTemplate>();

      local.forEach((tmpl) => templateMap.set(tmpl.id, tmpl));
      cloudTemplates.forEach((tmpl) => {
        const existing = templateMap.get(tmpl.id);
        if (existing) {
          templateMap.set(tmpl.id, {
            ...existing,
            ...tmpl,
            isGlobalSticky: Boolean(tmpl.isGlobalSticky ?? (existing as any).isGlobalSticky),
          });
        } else {
          templateMap.set(tmpl.id, tmpl);
        }
      });

      const merged = Array.from(templateMap.values());
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(merged));

      window.dispatchEvent(
        new CustomEvent('spr_doclab_template_saved', { detail: { sync: true, count: merged.length } })
      );

      return merged;
    }
  } catch (err) {
    console.warn('[DocLab] Could not sync templates with cloud backend:', err);
  }
  return getSavedDocxTemplates();
}

/**
 * Background async helper to persist a template to the backend database
 */
async function syncDocxTemplateToCloud(template: CustomDocxTemplate): Promise<void> {
  try {
    const payload = {
      id: template.id,
      name: template.name,
      description: template.description || '',
      scope_id: template.scopeId || (template as any).scope_id || '',
      raw_html: template.rawHtml || '',
      detected_placeholders: template.detectedPlaceholders || [],
      is_table_document: !!template.isTableDocument,
      sample_columns: template.sampleColumns || [],
      sample_data: template.sampleData || [],
      template_type: template.templateType || 'template',
      records_count: template.recordsCount || 0,
      source_template_id: template.sourceTemplateId || '',
      page_properties: template.pageProperties || {},
      page_size: template.pageSize || 'A4',
      orientation: template.orientation || 'PORTRAIT',
      margin: template.margin || 'NORMAL',
      is_shared: !!(template as any).isShared,
      is_global_sticky: !!((template as any).isGlobalSticky || (template as any).is_global_sticky),
    };

    const postRes: any = await fetchWithAuth('/api/v1/docx-templates/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!postRes || !postRes.ok) {
      await fetchWithAuth(`/api/v1/docx-templates/${encodeURIComponent(template.id)}/`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    }
  } catch (err) {
    console.warn('[DocLab] Failed to persist template to backend database:', err);
  }
}

/**
 * Background async helper to delete a template from the backend database
 */
async function deleteDocxTemplateFromCloud(id: string): Promise<void> {
  try {
    await fetchWithAuth(`/api/v1/docx-templates/${encodeURIComponent(id)}/`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.warn('[DocLab] Failed to delete template from backend database:', err);
  }
}

/**
 * Toggles global sticky status for a template in the backend database and local cache.
 * Restricted to Super Admin on backend.
 */
export async function toggleGlobalStickyDocxTemplate(templateId: string, explicitTarget?: boolean): Promise<boolean> {
  const existing = getSavedDocxTemplates();
  const currentTmpl = existing.find((t) => t.id === templateId);

  const currentSticky = Boolean(currentTmpl?.isGlobalSticky || (currentTmpl as any)?.is_global_sticky);
  const targetSticky = explicitTarget !== undefined ? explicitTarget : !currentSticky;

  if (currentTmpl) {
    // First ensure the template exists in cloud backend with target status
    await syncDocxTemplateToCloud({
      ...currentTmpl,
      isGlobalSticky: targetSticky,
    });
  }

  const res: any = await fetchWithAuth(`/api/v1/docx-templates/${encodeURIComponent(templateId)}/toggle-sticky/`, {
    method: 'POST',
    body: JSON.stringify({ is_global_sticky: targetSticky }),
  });

  if (!res || !res.ok) {
    let errMsg = `Failed to toggle global sticky status (HTTP ${res?.status || 'network error'})`;
    try {
      const errData = await res.json();
      errMsg = errData?.detail || errData?.message || errData?.error || errMsg;
    } catch {}
    console.error('[DocLab] Failed to toggle global sticky status:', errMsg);
    throw new Error(errMsg);
  }

  const data = await res.json();
  const nextSticky = Boolean(data.is_global_sticky ?? data.isGlobalSticky ?? targetSticky);

  const updated = existing.map((t) =>
    t.id === templateId ? { ...t, isGlobalSticky: nextSticky } : t
  );
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(
        new CustomEvent('spr_doclab_template_saved', { detail: { templateId, isGlobalSticky: nextSticky } })
      );
    } catch {}
  }
  return nextSticky;
}

export function saveDocxTemplate(template: Omit<CustomDocxTemplate, 'createdAt' | 'updatedAt'>): CustomDocxTemplate {
  const existing = getSavedDocxTemplates();
  const now = new Date().toISOString();
  
  const existingIndex = existing.findIndex((t) => t.id === template.id);
  const existingItem = existingIndex >= 0 ? existing[existingIndex] : null;

  const sanitizedHtml = template.rawHtml ? sanitizeLogicalDocumentHtml(template.rawHtml) : '';

  const isSticky = Boolean(
    (template as any).isGlobalSticky ??
    (template as any).is_global_sticky ??
    existingItem?.isGlobalSticky ??
    (existingItem as any)?.is_global_sticky ??
    false
  );

  const newTemplate: CustomDocxTemplate = {
    ...template,
    isGlobalSticky: isSticky,
    rawHtml: sanitizedHtml,
    createdAt: existingItem?.createdAt || (template as any).createdAt || now,
    updatedAt: now,
  };

  let updated: CustomDocxTemplate[];
  if (existingIndex >= 0) {
    updated = [...existing];
    updated[existingIndex] = newTemplate;
  } else {
    updated = [newTemplate, ...existing];
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(
        new CustomEvent('spr_doclab_template_saved', { detail: { templateId: newTemplate.id } })
      );
    } catch (e) {
      console.warn('Failed to save docx template to localStorage', e);
    }
  }

  // Background Cloud Sync to Backend Database (Tenant/User Isolated)
  syncDocxTemplateToCloud(newTemplate);

  return newTemplate;
}

export function deleteDocxTemplate(id: string): boolean {
  const existing = getSavedDocxTemplates();
  const updated = existing.filter((t) => t.id !== id);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(
        new CustomEvent('spr_doclab_template_saved', { detail: { templateId: id, deleted: true } })
      );
      
      // Delete from backend database
      deleteDocxTemplateFromCloud(id);
      return true;
    } catch (e) {
      console.warn('Failed to delete docx template', e);
    }
  }
  return false;
}

export const DOCLAB_CANVAS_DRAFT_PREFIX = 'spr_doclab_canvas_draft_';

export function getDocLabCanvasDraft(scopeId: string = 'general_document'): DocLabCanvasDraft | null {
  if (typeof window === 'undefined') return null;
  const canonicalScope = scopeId || 'general_document';
  try {
    let raw = localStorage.getItem(`${DOCLAB_CANVAS_DRAFT_PREFIX}${canonicalScope}`);
    if (!raw && (canonicalScope === 'general_document' || canonicalScope === 'universal')) {
      raw = localStorage.getItem(`${DOCLAB_CANVAS_DRAFT_PREFIX}universal`) || localStorage.getItem(`${DOCLAB_CANVAS_DRAFT_PREFIX}general_document`);
    }
    // Also check autoSave storageKey draft as resilient fallback
    if (!raw) {
      const autoDraft =
        localStorage.getItem(`draft_doclab_canvas_${canonicalScope}`) ||
        localStorage.getItem('draft_doclab_canvas_general_document') ||
        localStorage.getItem('draft_doclab_canvas_universal');
      if (autoDraft) {
        try {
          const parsed = JSON.parse(autoDraft);
          const data = parsed?.data || parsed;
          if (data && (data.cleanBody || data.fullHtml || data.templateBody || data.rawHtml)) {
            return {
              scopeId: canonicalScope,
              templateId: data.targetId || data.templateId,
              name: data.name || 'Working Draft',
              rawHtml: data.fullHtml || data.rawHtml || data.cleanBody,
              styles: data.styles || '',
              templateBody: data.cleanBody || data.templateBody || data.fullHtml,
              isTableDocument: Boolean(data.isTableDocument),
              sampleColumns: data.columns || data.sampleColumns || [],
              sampleData: data.data || data.sampleData || [],
              pageSize: data.pageSize,
              orientation: data.orientation,
              margin: data.margin,
              pageProperties: data.pageProperties,
              updatedAt: new Date().toISOString(),
            };
          }
        } catch {}
      }
    }
    if (!raw) return null;
    return JSON.parse(raw) as DocLabCanvasDraft;
  } catch (e) {
    console.warn('[DocLab] Failed to parse canvas draft from localStorage:', e);
    return null;
  }
}

/**
 * Saves the working canvas draft for crash recovery and reload persistence
 */
export function saveDocLabCanvasDraft(scopeId: string = 'general_document', draft: Partial<DocLabCanvasDraft>): void {
  if (typeof window === 'undefined') return;
  const canonicalScope = scopeId || 'general_document';
  try {
    const sanitizedHtml = draft.rawHtml ? sanitizeLogicalDocumentHtml(draft.rawHtml) : (draft.templateBody || '');
    const cleanDraft: DocLabCanvasDraft = {
      scopeId: canonicalScope,
      templateId: draft.templateId,
      name: draft.name || 'Working Draft',
      rawHtml: sanitizedHtml,
      styles: draft.styles || '',
      templateBody: draft.templateBody || sanitizedHtml,
      isTableDocument: Boolean(draft.isTableDocument),
      sampleColumns: draft.sampleColumns || [],
      sampleData: draft.sampleData || [],
      pageSize: draft.pageSize,
      orientation: draft.orientation,
      margin: draft.margin,
      pageProperties: draft.pageProperties,
      updatedAt: new Date().toISOString(),
    };
    const serialized = JSON.stringify(cleanDraft);
    localStorage.setItem(`${DOCLAB_CANVAS_DRAFT_PREFIX}${canonicalScope}`, serialized);
    if (canonicalScope === 'general_document' || canonicalScope === 'universal') {
      localStorage.setItem(`${DOCLAB_CANVAS_DRAFT_PREFIX}general_document`, serialized);
      localStorage.setItem(`${DOCLAB_CANVAS_DRAFT_PREFIX}universal`, serialized);
    }
  } catch (e) {
    console.warn('[DocLab] Failed to save canvas draft to localStorage:', e);
  }
}

/**
 * Clears the active canvas draft for a scope
 */
export function clearDocLabCanvasDraft(scopeId: string = 'general_document'): void {
  if (typeof window === 'undefined') return;
  const canonicalScope = scopeId || 'general_document';
  try {
    localStorage.removeItem(`${DOCLAB_CANVAS_DRAFT_PREFIX}${canonicalScope}`);
    if (canonicalScope === 'general_document' || canonicalScope === 'universal') {
      localStorage.removeItem(`${DOCLAB_CANVAS_DRAFT_PREFIX}general_document`);
      localStorage.removeItem(`${DOCLAB_CANVAS_DRAFT_PREFIX}universal`);
    }
    localStorage.removeItem(`draft_doclab_canvas_${canonicalScope}`);
  } catch (e) {
    console.warn('[DocLab] Failed to clear canvas draft from localStorage:', e);
  }
}
