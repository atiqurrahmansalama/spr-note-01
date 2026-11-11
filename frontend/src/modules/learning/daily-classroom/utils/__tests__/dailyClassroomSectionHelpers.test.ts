import assert from "node:assert/strict";
import {
  harvestSectionsFromStudents,
  mergeEffectiveSections,
  filterSectionsForHierarchy,
  buildSectionSelectOptions,
} from "../dailyClassroomUtils";

// 1. Relational FK scoping with Never-Hide Guarantee
{
  const classes = [
    { id: "cls-hifz", name: "Hifzul Quran", department: "dept-hifz" },
    { id: "cls-nazera", name: "Nazera", department: "dept-hifz" },
  ];
  const departments = [{ id: "dept-hifz", name: "Hifzul Quran Department" }];
  const sections = [
    { id: "sec-1", section_name: "Morning Nazera", student_class: "cls-nazera", department: "dept-hifz" },
    { id: "sec-2", section_name: "General", student_class: "cls-nazera", department: "dept-hifz" },
  ];

  // Matching class returns its scoped sections
  const matched = filterSectionsForHierarchy({
    sections,
    classes,
    departments,
    selectedClassId: "cls-nazera",
    selectedDepartmentId: "dept-hifz",
  });
  assert.equal(matched.length, 2);
  // Real institutional section named "General" is NEVER suppressed by hardcoded name checks
  assert.ok(matched.some((s) => s.section_name === "General"));

  // Unmatched class (Hifzul Quran has 0 direct sections) MUST fall back to active sections, NEVER hide them
  const fallbackForHifz = filterSectionsForHierarchy({
    sections,
    classes,
    departments,
    selectedClassId: "cls-hifz",
    selectedDepartmentId: "dept-hifz",
  });
  assert.equal(fallbackForHifz.length, 2);
}

// 2. Daily Progress builds zero synthetic "All Sections" options
{
  const sections = [
    { id: "sec-a", section_name: "Section A", student_class: "cls-1" },
    { id: "sec-b", section_name: "Section B", student_class: "cls-2" },
  ];
  const classes = [
    { id: "cls-1", name: "Hifz" },
    { id: "cls-2", name: "Kitab" },
  ];

  const dailyProgressOpts = buildSectionSelectOptions({
    sections,
    classes,
    selectedClassId: "cls-1",
    selectedSectionId: "sec-b",
    includeAllOption: false,
  });

  assert.ok(!dailyProgressOpts.some((o) => o.value === "" || o.label.toLowerCase().includes("all ")));
  // Includes scoped Section A AND preserves active selectedSectionId (Section B) so select never blanks
  assert.deepEqual(
    dailyProgressOpts.map((o) => o.value).sort(),
    ["sec-a", "sec-b"]
  );

  // Filter mode with includeAllOption: true keeps "All Sections" at top
  const hubFilterOpts = buildSectionSelectOptions({
    sections,
    classes,
    selectedClassId: "cls-1",
    includeAllOption: true,
    allLabel: "All Sections",
  });
  assert.equal(hubFilterOpts[0].value, "");
  assert.equal(hubFilterOpts[0].label, "All Sections");
}

// 3. Offline student harvesting & source merging keep active records cleanly without duplicates
{
  const harvested = harvestSectionsFromStudents([
    { id: "stu-1", section_id: "sec-9", section_name: "Hifz Group B", student_class: "cls-9", department: "dept-1" },
    { id: "stu-2", section_id: "sec-9", section_name: "Hifz Group B", student_class: "cls-9", department: "dept-1" },
  ]);
  assert.equal(harvested.length, 1);

  const merged = mergeEffectiveSections(
    [{ id: "sec-9", section_name: "Hifz Group B", student_class: "cls-9" }],
    [{ id: "sec-10", section_name: "Deleted Sec", is_deleted: true }],
    harvested
  );
  assert.equal(merged.length, 1);
  assert.equal(merged[0].id, "sec-9");
}

console.log("dailyClassroomSectionHelpers.test.ts passed!");

