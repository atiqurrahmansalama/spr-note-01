/**
 * conflictResolver.js
 * Universal Conflict Resolution & Dataset Diffing Utilities
 * Supports REPLACE_ALL, APPEND_MISSING, and MERGE_UPDATE strategies across any domain.
 */

export const CONFLICT_MODES = {
  REPLACE_ALL: 'REPLACE',
  APPEND_MISSING: 'APPEND',
  MERGE_UPDATE: 'MERGE',
};

/**
 * Resolves proposed new items against existing items using the specified conflict mode.
 * 
 * @param {Object} params
 * @param {Array} params.existingItems - Currently saved items in store
 * @param {Array} params.generatedItems - Newly computed items proposed by generator
 * @param {Function} params.keyExtractor - Function returning unique string identity for an item (e.g. item => `${item.classId}__${item.subjectId}`)
 * @param {string} [params.conflictMode='REPLACE'] - REPLACE | APPEND | MERGE
 * @param {Function} [params.customMerger] - Custom merger function (existing, proposed) => merged
 * @returns {{
 *   finalItems: Array,
 *   toCreate: Array,
 *   toUpdate: Array,
 *   toPreserve: Array,
 *   toRemove: Array,
 *   conflictsCount: number,
 *   summary: Object
 * }}
 */
export function resolveConflicts({
  existingItems = [],
  generatedItems = [],
  keyExtractor = (item) => item.id || JSON.stringify(item),
  conflictMode = CONFLICT_MODES.REPLACE_ALL,
  customMerger = null,
}) {
  const existingMap = new Map();
  existingItems.forEach((item) => {
    const key = keyExtractor(item);
    if (key) existingMap.set(key, item);
  });

  const toCreate = [];
  const toUpdate = [];
  const toPreserve = [];
  const toRemove = [];
  const finalItems = [];

  if (conflictMode === CONFLICT_MODES.REPLACE_ALL) {
    // In REPLACE mode: All newly generated items become the final items.
    // Existing items not present in generatedItems are marked for removal.
    const generatedKeys = new Set();
    generatedItems.forEach((genItem) => {
      const key = keyExtractor(genItem);
      generatedKeys.add(key);
      if (existingMap.has(key)) {
        toUpdate.push(genItem);
      } else {
        toCreate.push(genItem);
      }
      finalItems.push(genItem);
    });

    existingItems.forEach((existItem) => {
      const key = keyExtractor(existItem);
      if (!generatedKeys.has(key)) {
        toRemove.push(existItem);
      }
    });
  } else if (conflictMode === CONFLICT_MODES.APPEND_MISSING) {
    // In APPEND mode: Keep ALL existing items untouched. Only add generated items that don't already exist.
    existingItems.forEach((existItem) => {
      toPreserve.push(existItem);
      finalItems.push(existItem);
    });

    generatedItems.forEach((genItem) => {
      const key = keyExtractor(genItem);
      if (!existingMap.has(key)) {
        toCreate.push(genItem);
        finalItems.push(genItem);
      } else {
        toPreserve.push(existingMap.get(key));
      }
    });
  } else if (conflictMode === CONFLICT_MODES.MERGE_UPDATE) {
    // In MERGE mode: For matching keys, apply new fields while keeping user-customized fields (e.g. room, notes, custom overrides)
    const handledKeys = new Set();

    generatedItems.forEach((genItem) => {
      const key = keyExtractor(genItem);
      handledKeys.add(key);

      if (existingMap.has(key)) {
        const existItem = existingMap.get(key);
        const mergedItem = customMerger
          ? customMerger(existItem, genItem)
          : {
              ...existItem,
              ...genItem,
              // Preserve existing notes/room/custom values if already set in existing item
              roomNo: existItem.roomNo || genItem.roomNo || '',
              notes: existItem.notes || genItem.notes || '',
              id: existItem.id || genItem.id,
            };
        toUpdate.push(mergedItem);
        finalItems.push(mergedItem);
      } else {
        toCreate.push(genItem);
        finalItems.push(genItem);
      }
    });

    // Also preserve existing items that weren't in generated items
    existingItems.forEach((existItem) => {
      const key = keyExtractor(existItem);
      if (!handledKeys.has(key)) {
        toPreserve.push(existItem);
        finalItems.push(existItem);
      }
    });
  }

  return {
    finalItems,
    toCreate,
    toUpdate,
    toPreserve,
    toRemove,
    conflictsCount: toUpdate.length,
    summary: {
      totalFinal: finalItems.length,
      createdCount: toCreate.length,
      updatedCount: toUpdate.length,
      preservedCount: toPreserve.length,
      removedCount: toRemove.length,
      conflictMode,
    },
  };
}
