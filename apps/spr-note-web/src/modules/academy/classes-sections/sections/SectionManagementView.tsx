import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchWithAuth } from '../../../../utils/authService';
import { useToast } from '../../../../context/ToastContext';
import { useFeatureControl } from '../../../../context/FeatureControlContext';
import {
  SectionIcon,
  ClassIcon,
  TeacherIcon,
  EditIcon,
  TrashIcon,
  GroupIcon,
  TableIcon,
  Squares2X2Icon,
  PlusIcon,
} from '../../../../components/ui/Icons';
import ActionMenu from '../../../../components/ui/ActionMenu';
import DataTable from '../../../../components/ui/DataTable';
import DataCardGrid from '../../../../components/ui/DataCardGrid';
import EmptyState from '../../../../components/ui/EmptyState';
import { useRightSidebar, useDrawerRegistration } from '../../../../context/RightSidebarContext';
import { useTenant } from '../../../../context/TenantContext';
import SectionForm from './SectionForm';
import SectionMigrationModal from './SectionMigrationModal';
import DeleteImpactModal from '../../../../components/common/DeleteImpactModal';
import ClassesSectionsToolbar from '../components/ClassesSectionsToolbar';
import { PageContainer } from '../../../../components/layout';
import { getSections, deleteSection, getBranches, getDepartments } from '../../../../api/academy';
import { getBranchDisplayName } from '../../../../stores/academicStore';
import {
  AcademicSection,
  AcademicClass,
  AcademicBranch,
  AcademicDepartment,
  TeacherUser,
  SectionManagementViewProps,
} from '../types';

export default function SectionManagementView({
  hideHeader = false,
  hideMetrics = false,
  isEmbedded = false,
}: SectionManagementViewProps) {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { openDrawer, closeDrawer } = useRightSidebar();
  const { activeTenantId } = useTenant();
  const { isSectionEnabled } = useFeatureControl();
  const [searchParams, setSearchParams] = useSearchParams();

  const canMigrateDelete = isSectionEnabled('sections_action_migrate_delete') !== false;
  const canAddSection = isSectionEnabled('sections_action_add_section') !== false;

  const queryDept = searchParams.get('department') || 'ALL';
  const queryClass = searchParams.get('class') || searchParams.get('student_class') || 'ALL';

  const [sections, setSections] = useState<AcademicSection[]>([]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [departments, setDepartments] = useState<AcademicDepartment[]>([]);
  const [branches, setBranches] = useState<AcademicBranch[]>([]);
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters & View Mode
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deptFilter, setDeptFilter] = useState<string>(queryDept);
  const [classFilter, setClassFilter] = useState<string>(queryClass);
  const [viewMode, setViewMode] = useState<'table' | 'card'>(() => {
    try {
      const saved = localStorage.getItem('spr_sections_view_mode');
      return saved === 'card' || saved === 'grid' ? 'card' : 'table';
    } catch {
      return 'table';
    }
  });

  const handleViewModeChange = (mode: 'table' | 'card') => {
    setViewMode(mode);
    try {
      localStorage.setItem('spr_sections_view_mode', mode);
    } catch {}
  };

  // Modals
  const [deletingSection, setDeletingSection] = useState<AcademicSection | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  useEffect(() => {
    if (queryDept !== deptFilter) {
      setDeptFilter(queryDept);
    }
  }, [queryDept, deptFilter]);

  useEffect(() => {
    if (queryClass !== classFilter) {
      setClassFilter(queryClass);
    }
  }, [queryClass, classFilter]);

  const loadData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent && sections.length === 0) {
        setLoading(true);
      }
      const tenantParam = activeTenantId && activeTenantId !== 'ALL' ? `&institution=${activeTenantId}` : '';
      const [secRes, classRes, branchRes, teacherRes, deptRes] = await Promise.allSettled([
        getSections({ page_size: 500, all: true, ...(activeTenantId && activeTenantId !== 'ALL' ? { institution: activeTenantId } : {}) }),
        fetchWithAuth(`/api/v1/classes/?page_size=500&all=true${tenantParam}`),
        getBranches(),
        fetchWithAuth(`/api/v1/staff/?page_size=500${tenantParam}`),
        getDepartments({ page_size: 500, all: true, ...(activeTenantId && activeTenantId !== 'ALL' ? { institution: activeTenantId } : {}) }),
      ]);

      if (secRes.status === 'fulfilled' && secRes.value) {
        const d = secRes.value;
        const list: AcademicSection[] = Array.isArray(d) ? d : (d as any).results || [];
        setSections(list.filter((s) => !s.is_deleted));
      }

      if (classRes.status === 'fulfilled' && classRes.value && classRes.value.ok) {
        const d = await classRes.value.json();
        const list: AcademicClass[] = Array.isArray(d) ? d : d.results || [];
        setClasses(list.filter((c) => !c.is_deleted));
      }

      if (deptRes.status === 'fulfilled' && deptRes.value) {
        const d = deptRes.value;
        const list = Array.isArray(d) ? d : (d as any).results || [];
        setDepartments(list.filter((dp: any) => !dp.is_deleted));
      }

      if (branchRes.status === 'fulfilled' && branchRes.value) {
        const d = branchRes.value;
        setBranches(Array.isArray(d) ? d : (d as any).results || []);
      }

      if (teacherRes.status === 'fulfilled' && teacherRes.value && teacherRes.value.ok) {
        const d = await teacherRes.value.json();
        const list: TeacherUser[] = Array.isArray(d) ? d : d.results || [];
        setTeachers(list.filter((u: any) => u.is_active && !u.is_deactivated));
      }
    } catch {
      showToast('Failed to load sections.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, activeTenantId, sections.length]);

  useEffect(() => {
    loadData();

    const handleTenantChanged = () => {
      loadData(false);
    };

    const handleSectionUpdated = () => {
      loadData(true);
    };

    window.addEventListener('spr_tenant_changed', handleTenantChanged);
    window.addEventListener('spr_section_updated', handleSectionUpdated);
    return () => {
      window.removeEventListener('spr_tenant_changed', handleTenantChanged);
      window.removeEventListener('spr_section_updated', handleSectionUpdated);
    };
  }, [loadData]);

  // Drawer Registration for Add/Edit Section
  useDrawerRegistration(
    'section',
    (params) => {
      const mode = params.get('mode') || 'add';
      const sectionId = params.get('id');
      const foundSection = sectionId ? sections.find((s) => String(s.id) === String(sectionId)) : null;

      return {
        title: mode === 'edit' ? 'Edit Section' : 'Create New Section',
        width: 'SM',
        content: (
          <SectionForm
            key={sectionId ? `edit-sec-${sectionId}` : 'add-sec'}
            section={foundSection}
            classes={classes}
            teachers={teachers}
            defaultClassId={classFilter !== 'ALL' ? classFilter : null}
            onSaved={() => {
              loadData();
              window.dispatchEvent(new CustomEvent('spr_section_updated'));
              closeDrawer();
            }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [sections, classes, branches, teachers, classFilter, loadData, closeDrawer]
  );

  const handleAdd = () => {
    openDrawer('section', { mode: 'add' });
  };

  const handleEdit = (section: AcademicSection) => {
    openDrawer('section', { mode: 'edit', id: section.id });
  };

  const handleDeletePrompt = (section: AcademicSection) => {
    setDeletingSection(section);
    setIsDeleteModalOpen(true);
  };

  const performDirectDelete = async () => {
    if (!deletingSection) return;
    try {
      setIsDeleting(true);
      await deleteSection(deletingSection.id);
      showToast(`Section "${deletingSection.section_name || deletingSection.name}" deleted successfully.`, 'success');
      window.dispatchEvent(new CustomEvent('spr_section_updated'));
      setIsDeleteModalOpen(false);
      setDeletingSection(null);
      loadData();
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to delete section.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const classMap = useMemo(() => {
    const map = new Map<string | number, AcademicClass>();
    classes.forEach((c) => map.set(c.id, c));
    return map;
  }, [classes]);

  const eligibleClasses = useMemo(() => {
    if (deptFilter === 'ALL' || !deptFilter) return classes;
    return classes.filter(
      (c) => String(c.department || (c as any).department_id) === String(deptFilter)
    );
  }, [classes, deptFilter]);

  const handleDeptFilterChange = (val: string) => {
    setDeptFilter(val);
    const newParams = new URLSearchParams(searchParams);
    if (val === 'ALL' || !val) {
      newParams.delete('department');
    } else {
      newParams.set('department', val);
    }
    // If current classFilter does not belong to the selected department, reset class filter
    if (classFilter !== 'ALL' && val !== 'ALL') {
      const cls = classMap.get(classFilter);
      if (cls && String(cls.department || (cls as any).department_id) !== String(val)) {
        setClassFilter('ALL');
        newParams.delete('class');
        newParams.delete('student_class');
      }
    }
    setSearchParams(newParams);
  };

  const handleFilterChange = (setter: (val: string) => void, key: string) => (val: string) => {
    setter(val);
    const newParams = new URLSearchParams(searchParams);
    if (val === 'ALL' || !val) {
      newParams.delete(key);
      if (key === 'class') newParams.delete('student_class');
    } else {
      newParams.set(key, val);
    }
    setSearchParams(newParams);
  };

  // Filtered dataset by search query, department filter & class filter
  const filteredSections = sections.filter((sec) => {
    if (!sec) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (sec.section_name || sec.name)?.toLowerCase().includes(q);
      const matchClass = (sec as any).student_class_name?.toLowerCase().includes(q);
      const matchTeacher = (sec as any).class_teacher_name?.toLowerCase().includes(q);
      if (!matchName && !matchClass && !matchTeacher) return false;
    }

    if (deptFilter !== 'ALL') {
      const parentClass = classMap.get(sec.student_class);
      const secDept = sec.department || (sec as any).department_id || parentClass?.department || (parentClass as any)?.department_id;
      if (String(secDept) !== String(deptFilter)) {
        return false;
      }
    }

    if (classFilter !== 'ALL' && String(sec.student_class) !== String(classFilter)) {
      return false;
    }
    return true;
  });

  const getActionMenuItems = (section: AcademicSection) => [
    {
      label: 'Edit Section',
      icon: EditIcon,
      onClick: () => handleEdit(section),
    },
    {
      label: 'View Groups',
      icon: GroupIcon,
      hidden: section.has_groups === false,
      onClick: () =>
        navigate(`/academy/classes-groups?tab=groups&student_class=${section.student_class}&section=${section.id}`),
    },
    ...(canMigrateDelete
      ? [
          { divider: true },
          {
            label: 'Delete Section',
            icon: TrashIcon,
            danger: true,
            onClick: () => handleDeletePrompt(section),
          },
        ]
      : []),
  ];

  // Table Columns
  const tableColumns = [
    {
      key: 'index',
      header: 'No',
      align: 'center',
      headerClassName: 'w-14 text-center font-mono text-xs',
      cellClassName: 'w-14 text-center font-mono text-xs',
      render: (_: any, rowIdx: number) => (
        <span className="font-mono text-xs font-bold theme-text-secondary">
          {rowIdx + 1}
        </span>
      ),
    },
    {
      key: 'section_name',
      header: 'Section Name',
      headerClassName: 'min-w-[160px] sm:min-w-[200px]',
      cellClassName: 'min-w-[160px] sm:min-w-[200px]',
      render: (sec: AcademicSection) => (
        <span className="font-bold text-sm theme-text-primary block py-1">
          {sec.section_name || sec.name}
        </span>
      ),
    },
    {
      key: 'student_class_name',
      header: 'Class',
      headerClassName: 'min-w-[140px] sm:min-w-[180px]',
      cellClassName: 'min-w-[140px] sm:min-w-[180px]',
      render: (sec: AcademicSection) => (
        <span className="text-xs font-semibold theme-text-primary">
          {(sec as any).student_class_name || 'Academic Class'}
        </span>
      ),
    },
    {
      key: 'class_teacher_name',
      header: 'In-Charge Teacher',
      headerClassName: 'min-w-[180px] sm:min-w-[220px]',
      cellClassName: 'min-w-[180px] sm:min-w-[220px]',
      render: (sec: AcademicSection) => (
        <div className="flex items-center gap-1.5 text-xs theme-text-secondary py-1">
          <TeacherIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
          <span className={`font-semibold ${(sec as any).class_teacher_name ? 'theme-text-primary' : 'theme-text-muted italic'}`}>
            {(sec as any).class_teacher_name || 'Unassigned'}
          </span>
        </div>
      ),
    },
    {
      key: 'group_count',
      header: 'Groups',
      align: 'center',
      headerClassName: 'w-24 text-center',
      cellClassName: 'w-24 text-center',
      render: (sec: AcademicSection) => (
        <span className="text-xs font-semibold font-mono theme-text-secondary">
          {sec.group_count || 0}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      headerClassName: 'w-16 text-right',
      cellClassName: 'w-16 text-right',
      render: (sec: AcademicSection) => (
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <ActionMenu items={getActionMenuItems(sec)} align="right" />
        </div>
      ),
    },
  ];

  // Card Renderer
  const renderSectionCard = (sec: AcademicSection) => (
    <div
      key={sec.id}
      onClick={() => handleEdit(sec)}
      className="rounded-2xl theme-bg-surface border theme-border p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:theme-bg-sub/20 transition-all space-y-4 group cursor-pointer"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-bold theme-text-primary text-sm leading-tight truncate group-hover:theme-accent transition-colors">
              {sec.section_name || sec.name}
            </h3>
            <p className="text-xs font-medium theme-text-secondary mt-1 truncate">
              {(sec as any).student_class_name || 'Class'} &bull; {getBranchDisplayName((sec as any).branch_name || sec.branch) || 'Main Campus'}
            </p>
          </div>

          <div onClick={(e) => e.stopPropagation()}>
            <ActionMenu items={getActionMenuItems(sec)} align="right" />
          </div>
        </div>

        <div className="text-xs theme-text-secondary flex items-center justify-between">
          <span>In-Charge:</span>
          <span className="font-semibold theme-text-primary">{(sec as any).class_teacher_name || 'Unassigned'}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl theme-bg-sub border theme-border text-center">
          <div>
            <span className="block text-sm font-bold theme-accent font-mono">
              {(sec as any).enrolled_students || sec.total_students || 0}
            </span>
            <span className="text-[9px] theme-text-secondary uppercase tracking-wider font-semibold">
              Enrolled Students
            </span>
          </div>
          <div className="border-l theme-border">
            <span className="block text-sm font-bold theme-text-primary font-mono">{sec.group_count || 0}</span>
            <span className="text-[9px] theme-text-secondary uppercase tracking-wider font-semibold">
              Study Groups
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <PageContainer
      isEmbedded={isEmbedded}
      maxWidth="7xl"
      animate={!isEmbedded}
      className="space-y-4 sm:space-y-6"
    >
      {/* ─── Reusable Responsive Filter & View Toolbar ─── */}
      <ClassesSectionsToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search sections by name, room, teacher..."
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        departmentFilter={{
          value: deptFilter,
          onChange: handleDeptFilterChange,
          departments,
        }}
        classFilter={{
          value: classFilter,
          onChange: handleFilterChange(setClassFilter, 'class'),
          classes: eligibleClasses,
        }}
        totalCount={filteredSections.length}
        entityName="Sections"
      />

      {/* Main View Content (Table or Cards Grid with EmptyState fallback) */}
      {!loading && filteredSections.length === 0 ? (
        <EmptyState
          icon={SectionIcon}
          iconVariant="sub"
          title={searchQuery || classFilter !== 'ALL' || deptFilter !== 'ALL' ? 'No Matching Sections' : 'No Sections Found'}
          description={
            searchQuery || classFilter !== 'ALL' || deptFilter !== 'ALL'
              ? 'No sections match the applied search or filter criteria.'
              : 'Sections allow dividing large classes into structured cohorts or rooms.'
          }
          action={
            searchQuery || classFilter !== 'ALL' || deptFilter !== 'ALL'
              ? {
                  label: 'Clear Filters',
                  onClick: () => {
                    setSearchQuery('');
                    handleDeptFilterChange('ALL');
                    handleFilterChange(setClassFilter, 'class')('ALL');
                  },
                }
              : canAddSection
              ? {
                  label: 'Add Section',
                  icon: PlusIcon,
                  onClick: () => handleAdd(),
                }
              : undefined
          }
        />
      ) : viewMode === 'table' ? (
        <DataTable
          columns={tableColumns}
          data={filteredSections}
          loading={loading}
          loadingMessage="Loading class sections..."
          keyExtractor={(s: AcademicSection, idx: number) => s.id || `sec_${idx}`}
          cellPaddingClass="py-3.5 px-4 sm:px-5"
          headerCellClassName="py-3 px-4 sm:px-5 text-xs uppercase tracking-wider font-bold"
          emptyIcon={SectionIcon}
          emptyTitle="No Sections Found"
          emptySubMessage={
            searchQuery || classFilter !== 'ALL' || deptFilter !== 'ALL'
              ? 'No sections match the applied search or filter criteria.'
              : 'Get started by creating your first class section division.'
          }
          onRowClick={(sec: AcademicSection) => handleEdit(sec)}
        />
      ) : (
        <DataCardGrid
          data={filteredSections}
          renderCard={renderSectionCard}
          isLoading={loading}
          loadingMessage="Loading class sections..."
          emptyIcon={SectionIcon}
          emptyTitle="No Sections Found"
          emptySubMessage={
            searchQuery || classFilter !== 'ALL' || deptFilter !== 'ALL'
              ? 'No sections match the applied search or filter criteria.'
              : 'Get started by creating your first class section division.'
          }
          gridClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        />
      )}

      {/* Delete Impact Modal */}
      {deletingSection && (
        <DeleteImpactModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDeletingSection(null);
          }}
          title="Delete Section"
          itemName={deletingSection.section_name || deletingSection.name}
          itemType="section"
          impactData={{
            direct_students: (deletingSection as any).enrolled_students || deletingSection.total_students || 0,
            groups: deletingSection.group_count || 0,
          }}
          onConfirm={performDirectDelete}
          onDirectDelete={performDirectDelete}
          onMigrateOpen={() => {
            setIsDeleteModalOpen(false);
            setIsMigrationModalOpen(true);
          }}
          isDeleting={isDeleting}
        />
      )}

      {/* Section Migration Modal */}
      {deletingSection && (
        <SectionMigrationModal
          isOpen={isMigrationModalOpen}
          onClose={() => {
            setIsMigrationModalOpen(false);
            setDeletingSection(null);
          }}
          deletingSection={deletingSection}
          availableSections={sections}
          onSuccess={() => {
            loadData();
            window.dispatchEvent(new CustomEvent('spr_section_updated'));
          }}
        />
      )}
    </PageContainer>
  );
}

