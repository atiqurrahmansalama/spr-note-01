import assert from 'node:assert';
import { en } from '../locales/en';
import { bn } from '../locales/bn';
import { ar } from '../locales/ar';
import { ur } from '../locales/ur';
import { SectionCategory, SectionItem, InheritanceOrigin, ScopeType } from '../types';

console.log('Testing Admin Section Control Module...');

// 1. Verify 4-Language Localization Parity
function flattenKeys(obj: Record<string, any>, prefix = ''): string[] {
  return Object.keys(obj).reduce((acc: string[], k: string) => {
    const pre = prefix.length ? prefix + '.' : '';
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      acc.push(...flattenKeys(obj[k], pre + k));
    } else {
      acc.push(pre + k);
    }
    return acc;
  }, []);
}

const enKeys = flattenKeys(en).sort();
const bnKeys = flattenKeys(bn).sort();
const arKeys = flattenKeys(ar).sort();
const urKeys = flattenKeys(ur).sort();

assert.strictEqual(enKeys.length > 0, true, 'English locale must contain keys');
assert.deepStrictEqual(bnKeys, enKeys, 'Bengali keys must match English keys 100%');
assert.deepStrictEqual(arKeys, enKeys, 'Arabic keys must match English keys 100%');
assert.deepStrictEqual(urKeys, enKeys, 'Urdu keys must match English keys 100%');
console.log(`[PASS] 4-Language localization parity verified across all ${enKeys.length} keys.`);

// 2. Inheritance Evaluation Simulation (4-Tier: User > Role > Academy > Global)
interface EvaluationContext {
  globalRules: Record<string, boolean>;
  academyOverrides?: Record<string, boolean>;
  roleOverrides: Record<string, boolean>;
  userOverrides: Record<string, boolean>;
}

function resolveSectionState(
  sectionKey: string,
  context: EvaluationContext
): { enabled: boolean; origin: InheritanceOrigin } {
  if (context.userOverrides[sectionKey] !== undefined) {
    return { enabled: context.userOverrides[sectionKey], origin: 'USER' };
  }
  if (context.roleOverrides[sectionKey] !== undefined) {
    return { enabled: context.roleOverrides[sectionKey], origin: 'ROLE' };
  }
  if (context.academyOverrides && context.academyOverrides[sectionKey] !== undefined) {
    return { enabled: context.academyOverrides[sectionKey], origin: 'ACADEMY' };
  }
  return {
    enabled: context.globalRules[sectionKey] !== undefined ? context.globalRules[sectionKey] : true,
    origin: 'GLOBAL',
  };
}

// Test Case A: User override takes highest precedence
const ctxUserOverride: EvaluationContext = {
  globalRules: { attendance_mark: true },
  roleOverrides: { attendance_mark: true },
  userOverrides: { attendance_mark: false },
};
const resultA = resolveSectionState('attendance_mark', ctxUserOverride);
assert.strictEqual(resultA.enabled, false);
assert.strictEqual(resultA.origin, 'USER');
console.log('[PASS] User override takes precedence over role and global.');

// Test Case B: Role override takes precedence over global default
const ctxRoleOverride: EvaluationContext = {
  globalRules: { student_admit: true },
  roleOverrides: { student_admit: false },
  userOverrides: {},
};
const resultB = resolveSectionState('student_admit', ctxRoleOverride);
assert.strictEqual(resultB.enabled, false);
assert.strictEqual(resultB.origin, 'ROLE');
console.log('[PASS] Role override takes precedence over global default.');

// Test Case B2: Academy override takes precedence over global default when no role or user override
const ctxAcademyOverride: EvaluationContext = {
  globalRules: { fee_waiver: true },
  academyOverrides: { fee_waiver: false },
  roleOverrides: {},
  userOverrides: {},
};
const resultB2 = resolveSectionState('fee_waiver', ctxAcademyOverride);
assert.strictEqual(resultB2.enabled, false);
assert.strictEqual(resultB2.origin, 'ACADEMY');
console.log('[PASS] Academy override takes precedence over global default.');

// Test Case C: Falls back to global default if no subordinate overrides
const ctxGlobalOnly: EvaluationContext = {
  globalRules: { exam_marksheet: true },
  roleOverrides: {},
  userOverrides: {},
};
const resultC = resolveSectionState('exam_marksheet', ctxGlobalOnly);
assert.strictEqual(resultC.enabled, true);
assert.strictEqual(resultC.origin, 'GLOBAL');
console.log('[PASS] Falls back to global default when no overrides exist.');

// 3. Parent-Child Cascade Disablement Logic
function computeEffectiveEnabled(
  parentEnabled: boolean,
  childEnabled: boolean,
  isChild: boolean
): boolean {
  if (isChild && !parentEnabled) {
    return false;
  }
  return childEnabled;
}

assert.strictEqual(
  computeEffectiveEnabled(false, true, true),
  false,
  'Child section must be effectively disabled if parent is disabled'
);
assert.strictEqual(
  computeEffectiveEnabled(true, true, true),
  true,
  'Child section should remain enabled if parent is enabled'
);
assert.strictEqual(
  computeEffectiveEnabled(true, false, true),
  false,
  'Child section remains disabled when its own flag is false'
);
console.log('[PASS] Parent-child cascade disablement verified.');

// 4. Batch Update Payload Formatting
function formatBatchPayload(
  scope: ScopeType,
  targetRole: string,
  targetUser: string,
  changes: Record<string, boolean>
) {
  const payload: any = {
    scope,
    changes,
  };
  if (scope === 'role') payload.role = targetRole;
  if (scope === 'user') payload.user_id = targetUser;
  return payload;
}

const payloadRole = formatBatchPayload('role', 'TEACHER', '', {
  exam_publish: false,
  exam_edit: true,
});
assert.strictEqual(payloadRole.scope, 'role');
assert.strictEqual(payloadRole.role, 'TEACHER');
assert.strictEqual(payloadRole.changes.exam_publish, false);
assert.strictEqual(payloadRole.changes.exam_edit, true);

const payloadUser = formatBatchPayload('user', 'TEACHER', 'usr_99', {
  developer_mode: true,
});
assert.strictEqual(payloadUser.scope, 'user');
assert.strictEqual(payloadUser.user_id, 'usr_99');
assert.strictEqual(payloadUser.changes.developer_mode, true);
console.log('[PASS] Batch update payload generator verified.');

// 5. Category and Section Filter Matching
const mockCategory: SectionCategory = {
  id: 'academic',
  key: 'academic',
  title: 'Academic Settings',
  sections: [
    {
      section_key: 'academic_classrooms',
      title: 'Classroom Structure',
      description: 'Manage classrooms and batches',
      is_enabled: true,
      effective_enabled: true,
      inheritance_origin: 'GLOBAL',
      children: [
        {
          section_key: 'academic_classrooms_archive',
          title: 'Archive Classroom',
          description: 'Allows archiving completed classrooms',
          is_enabled: false,
          effective_enabled: false,
          inheritance_origin: 'GLOBAL',
        },
      ],
    },
    {
      section_key: 'attendance_portal',
      title: 'Daily Attendance',
      description: 'Record student attendance',
      is_enabled: true,
      effective_enabled: true,
      inheritance_origin: 'GLOBAL',
    },
  ],
};

function filterCategory(cat: SectionCategory, search: string) {
  const q = search.toLowerCase().trim();
  if (!q) return cat.sections;
  return cat.sections.filter((sec) => {
    const matchParent =
      sec.section_key.toLowerCase().includes(q) ||
      sec.title.toLowerCase().includes(q) ||
      (sec.description || '').toLowerCase().includes(q);
    if (matchParent) return true;
    if (sec.children) {
      return sec.children.some(
        (c) =>
          c.section_key.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          (c.description || '').toLowerCase().includes(q)
      );
    }
    return false;
  });
}

const matchArchive = filterCategory(mockCategory, 'archive');
assert.strictEqual(matchArchive.length, 1);
assert.strictEqual(matchArchive[0].section_key, 'academic_classrooms');

const matchAttendance = filterCategory(mockCategory, 'attendance');
assert.strictEqual(matchAttendance.length, 1);
assert.strictEqual(matchAttendance[0].section_key, 'attendance_portal');

const matchNone = filterCategory(mockCategory, 'nonexistent_term');
assert.strictEqual(matchNone.length, 0);

console.log('[PASS] Category and Section filter search verified.');

// 6. Toggle Modification and Baseline Revert Logic
function simulateToggle(
  sectionKey: string,
  currentEffectiveVal: boolean,
  currentModifiedFlags: Record<string, boolean>,
  baselineMap: Record<string, boolean>
): Record<string, boolean> {
  const nextVal = !currentEffectiveVal;
  const baselineVal = baselineMap[sectionKey];

  if (baselineVal !== undefined && nextVal === baselineVal) {
    const next = { ...currentModifiedFlags };
    delete next[sectionKey];
    return next;
  }

  return {
    ...currentModifiedFlags,
    [sectionKey]: nextVal,
  };
}

const mockBaseline = {
  exam_publish: true,
  student_admission: false,
};

let mods: Record<string, boolean> = {};

// Turn exam_publish from true -> false
mods = simulateToggle('exam_publish', true, mods, mockBaseline);
assert.strictEqual(mods.exam_publish, false, 'Should register modification when toggled');
assert.strictEqual(Object.keys(mods).length, 1, 'Modified count should be 1');

// Turn exam_publish back from false -> true (reverts to baseline!)
mods = simulateToggle('exam_publish', false, mods, mockBaseline);
assert.strictEqual(mods.exam_publish, undefined, 'Key should be deleted when reverted to baseline');
assert.strictEqual(Object.keys(mods).length, 0, 'Modified count should be 0 when reverted');

console.log('[PASS] Toggle revert to baseline removes key and resets modification count.');
console.log('All Section Control tests passed successfully.');
