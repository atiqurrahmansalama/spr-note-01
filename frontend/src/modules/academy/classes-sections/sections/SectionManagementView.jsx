import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchWithAuth } from '../../../../utils/authService';
import { useToast } from '../../../../context/ToastContext';
import {
  SectionIcon,
  ClassIcon,
  BuildingOfficeIcon,
  StudentIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  GroupIcon,
} from '../../../../components/ui/Icons';
import ActionMenu from '../../../../components/ui/ActionMenu';
import CustomSelect from '../../../../components/ui/CustomSelect';
import { ClassSelect, BranchSelect, TeacherSelect } from '../../../../components/selectors';
import UniversalManagementView from '../../../../components/common/UniversalManagementView';
import { useRightSidebar, useDrawerRegistration } from '../../../../context/RightSidebarContext';
import SectionForm from './SectionForm';
import SectionMigrationModal from './SectionMigrationModal';
import DeleteImpactModal from '../../../../components/common/DeleteImpactModal';
import { getSections, getSectionMetrics, deleteSection, getBranches } from '../../../../api/academy';

const TYPE_CONFIG = {
  GENERAL_SECTION: 'General Section',
  HIFZ_SECTION: 'Quran / Hifz Section',
  RESIDENTIAL_DORM: 'Residential Dormitory',
};

export default function SectionManagementView({
  hideHeader = false,
  hideMetrics = false,
  isEmbedded = false,
}) {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { openDrawer, closeDrawer } = useRightSidebar();
  const [searchParams, setSearchParams] = useSearchParams();

  const queryClass = searchParams.get('class') || searchParams.get('student_class') || 'ALL';
  const queryBranch = searchParams.get('branch') || 'ALL';

  const [sections, setSections] = useState([]);
  const [classes, setClasses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [metrics, setMetrics] = useState({
    total_sections: 0,
    total_capacity: 0,
    total_enrolled: 0,
    occupancy_rate: 0,
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState(queryClass);
  const [branchFilter, setBranchFilter] = useState(queryBranch);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Selection & UI
  const [selectedIds, setSelectedIds] = useState([]);
  const [viewMode, setViewMode] = useState('table');

  // Modals
  const [deletingSection, setDeletingSection] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pagination & Sorting
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState('section_name');
  const [sortDirection, setSortDirection] = useState('asc');

  useEffect(() => {
    if (queryClass !== classFilter) {
      setClassFilter(queryClass);
    }
    if (queryBranch !== branchFilter) {
      setBranchFilter(queryBranch);
    }
  }, [queryClass, queryBranch]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [secRes, classRes, branchRes, teacherRes, metricRes] = await Promise.allSettled([
        getSections({ page_size: 500, all: true }),
        fetchWithAuth('/api/v1/classes/?page_size=500&all=true'),
        getBranches(),
        fetchWithAuth('/api/v1/users/'),
        getSectionMetrics(),
      ]);

      if (secRes.status === 'fulfilled' && secRes.value) {
        const d = secRes.value;
        const list = Array.isArray(d) ? d : d.results || [];
        setSections(list.filter((s) => !s.is_deleted));
      }

      if (classRes.status === 'fulfilled' && classRes.value && classRes.value.ok) {
        const d = await classRes.value.json();
        const list = Array.isArray(d) ? d : d.results || [];
        setClasses(list.filter((c) => !c.is_deleted));
      }

      if (branchRes.status === 'fulfilled' && branchRes.value) {
        const d = branchRes.value;
        setBranches(Array.isArray(d) ? d : d.results || []);
      }

      if (teacherRes.status === 'fulfilled' && teacherRes.value && teacherRes.value.ok) {
        const d = await teacherRes.value.json();
        const list = Array.isArray(d) ? d : d.results || [];
        setTeachers(list.filter((u) => u.is_active && !u.is_deactivated));
      }

      if (metricRes.status === 'fulfilled' && metricRes.value) {
        const md = metricRes.value;
        setMetrics({
          total_sections: md.total_sections || 0,
          total_capacity: md.total_capacity || 0,
          total_enrolled: md.total_enrolled || 0,
          occupancy_rate: md.occupancy_rate || 0,
        });
      }
    } catch {
      showToast('Failed to load sections.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();

    const handleTenantChanged = () => {
      loadData();
    };

    const handleSectionUpdated = () => {
      loadData();
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
        subtitle:
          mode === 'edit'
            ? `Update settings for section ${foundSection?.section_name || foundSection?.name || ''}`
            : 'Configure a new class section division',
        width: 'lg',
        content: (
          <SectionForm
            section={foundSection}
            classes={classes}
            branches={branches}
            teachers={teachers}
            defaultClassId={classFilter !== 'ALL' ? classFilter : null}
            defaultBranchId={branchFilter !== 'ALL' ? branchFilter : null}
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
    [sections, classes, branches, teachers, classFilter, branchFilter, loadData, closeDrawer]
  );

  const handleCreateNew = () => {
    openDrawer('section', { mode: 'add' });
  };

  const handleEdit = (section) => {
    openDrawer('section', { mode: 'edit', id: section.id });
  };

  const handleDeletePrompt = (section) => {
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
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to delete section.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setClassFilter('ALL');
    setBranchFilter('ALL');
    setTypeFilter('ALL');
    setStatusFilter('ALL');
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('class');
    newParams.delete('student_class');
    newParams.delete('branch');
    newParams.delete('type');
    newParams.delete('status');
    setSearchParams(newParams);
  };

  const handleFilterChange = (setter, key) => (val) => {
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

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    classFilter !== 'ALL' ||
    branchFilter !== 'ALL' ||
    typeFilter !== 'ALL' ||
    statusFilter !== 'ALL'
  );

  const activeFilterCount = [
    classFilter !== 'ALL',
    branchFilter !== 'ALL',
    typeFilter !== 'ALL',
    statusFilter !== 'ALL',
  ].filter(Boolean).length;

  // Filtered dataset
  const filteredSections = sections.filter((sec) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (sec.section_name || sec.name)?.toLowerCase().includes(q);
      const matchClass = sec.student_class_name?.toLowerCase().includes(q);
      const matchBranch = sec.branch_name?.toLowerCase().includes(q);
      const matchTeacher = sec.class_teacher_name?.toLowerCase().includes(q);
      if (!matchName && !matchClass && !matchBranch && !matchTeacher) return false;
    }

    if (classFilter !== 'ALL' && String(sec.student_class) !== String(classFilter)) {
      return false;
    }

    if (branchFilter !== 'ALL' && String(sec.branch) !== String(branchFilter)) {
      return false;
    }

    if (typeFilter !== 'ALL' && sec.section_type !== typeFilter) {
      return false;
    }

    if (statusFilter !== 'ALL') {
      if (statusFilter === 'ACTIVE' && !sec.is_active) return false;
      if (statusFilter === 'INACTIVE' && sec.is_active) return false;
    }

    return true;
  });

  const getActionMenuItems = (section) => [
    {
      label: 'Edit Section',
      icon: EditIcon,
      onClick: () => handleEdit(section),
    },
    {
      label: 'View Groups',
      icon: GroupIcon,
      onClick: () =>
        navigate(`/academy/classes-groups?tab=groups&student_class=${section.student_class}&section=${section.id}`),
    },
    { divider: true },
    {
      label: 'Delete Section',
      icon: TrashIcon,
      danger: true,
      onClick: () => handleDeletePrompt(section),
    },
  ];

  // Table Columns
  const tableColumns = [
    {
      key: 'section_name',
      header: 'Section Name & Class',
      render: (sec) => (
        <div className="space-y-0.5">
          <span className="font-bold text-sm theme-text-primary block">{sec.section_name || sec.name}</span>
          <span className="text-xs theme-text-secondary block">
            {sec.student_class_name || 'Academic Class'}
          </span>
        </div>
      ),
    },
    {
      key: 'branch',
      header: 'Campus / Branch',
      render: (sec) => (
        <span className="text-xs font-semibold theme-text-primary">
          {sec.branch_name || 'Main Campus'}
        </span>
      ),
    },
    {
      key: 'section_type',
      header: 'Format',
      render: (sec) => (
        <span className="text-xs theme-text-secondary">
          {TYPE_CONFIG[sec.section_type] || sec.section_type || 'General'}
        </span>
      ),
    },
    {
      key: 'class_teacher_name',
      header: 'In-Charge Teacher',
      render: (sec) => (
        <span className="text-xs font-semibold theme-text-primary">
          {sec.class_teacher_name || 'Unassigned'}
        </span>
      ),
    },
    {
      key: 'enrolled_students',
      header: 'Enrolled / Capacity',
      align: 'center',
      render: (sec) => (
        <div className="text-center font-mono">
          <span className="text-xs font-bold theme-text-primary">
            {sec.enrolled_students || 0}
          </span>
          <span className="text-xs theme-text-secondary"> / {sec.max_capacity || 40}</span>
        </div>
      ),
    },
    {
      key: 'group_count',
      header: 'Groups',
      align: 'center',
      render: (sec) => (
        <span className="text-xs font-bold font-mono theme-text-primary">
          {sec.group_count || 0}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      headerClassName: 'w-16 text-right',
      render: (sec) => (
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <ActionMenu items={getActionMenuItems(sec)} />
        </div>
      ),
    },
  ];

  // Card Renderer
  const renderSectionCard = (sec) => (
    <div
      key={sec.id}
      onClick={() => handleEdit(sec)}
      className="rounded-2xl theme-bg-surface border theme-border p-5 shadow-xs flex flex-col justify-between hover:theme-bg-sub/20 transition-all space-y-4 group cursor-pointer"
    >
      <div className="space-y-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-bold theme-text-primary text-sm leading-tight truncate">
              {sec.section_name || sec.name}
            </h3>
            <p className="text-xs font-medium theme-text-secondary mt-1 truncate">
              {sec.student_class_name || 'Class'} &bull; {sec.branch_name || 'Main Campus'}
            </p>
          </div>

          <div onClick={(e) => e.stopPropagation()}>
            <ActionMenu items={getActionMenuItems(sec)} />
          </div>
        </div>

        <div className="text-xs theme-text-secondary flex items-center justify-between">
          <span>In-Charge:</span>
          <span className="font-semibold theme-text-primary">{sec.class_teacher_name || 'Unassigned'}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl theme-bg-sub border theme-border text-center">
          <div>
            <span className="block text-sm font-bold theme-accent font-mono">
              {sec.enrolled_students || 0} / {sec.max_capacity || 40}
            </span>
            <span className="text-[9px] theme-text-secondary uppercase tracking-wider font-semibold">
              Enrolled / Capacity
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

  const filterControls = (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 w-full">
      <ClassSelect
        label="Class"
        classes={classes}
        value={classFilter}
        onChange={handleFilterChange(setClassFilter, 'class')}
        allowAll={true}
      />
      <BranchSelect
        label="Branch"
        branches={branches}
        value={branchFilter}
        onChange={handleFilterChange(setBranchFilter, 'branch')}
        allowAll={true}
      />
      <CustomSelect
        label="Format"
        value={typeFilter}
        onChange={handleFilterChange(setTypeFilter, 'type')}
        options={[
          { value: 'ALL', label: 'All Formats' },
          { value: 'GENERAL_SECTION', label: 'General Section' },
          { value: 'HIFZ_SECTION', label: 'Quranic / Hifz Section' },
          { value: 'RESIDENTIAL_DORM', label: 'Residential Dorm' },
        ]}
      />
      <CustomSelect
        label="Status"
        value={statusFilter}
        onChange={handleFilterChange(setStatusFilter, 'status')}
        options={[
          { value: 'ALL', label: 'All Status' },
          { value: 'ACTIVE', label: 'Active' },
          { value: 'INACTIVE', label: 'Inactive' },
        ]}
      />
    </div>
  );

  return (
    <>
      <UniversalManagementView
        title="Class Sections"
        subtitle="Manage academic section divisions, seat capacities, and in-charge mentors."
        icon={SectionIcon}
        hideHeader={hideHeader}
        hideMetrics={hideMetrics}
        isEmbedded={isEmbedded}
        primaryAction={{
          label: 'Add Section',
          icon: PlusIcon,
          onClick: handleCreateNew,
        }}
        metrics={[
          {
            label: 'Total Sections',
            value: metrics.total_sections || sections.length,
            icon: SectionIcon,
            color: 'accent',
            subLabel: 'Active sections',
          },
          {
            label: 'Total Capacity',
            value: metrics.total_capacity || 0,
            icon: StudentIcon,
            color: 'accent',
            subLabel: 'Allocated seats',
          },
          {
            label: 'Enrolled Students',
            value: metrics.total_enrolled || 0,
            icon: StudentIcon,
            color: 'accent',
            subLabel: 'Active enrollment',
          },
          {
            label: 'Occupancy Rate',
            value: `${metrics.occupancy_rate || 0}%`,
            icon: BuildingOfficeIcon,
            color: 'accent',
            subLabel: 'Seat utilization',
          },
        ]}
        searchPlaceholder="Search sections by name, class, branch, or teacher..."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        hasActiveFilters={hasActiveFilters}
        activeFilterCount={activeFilterCount}
        onResetFilters={handleResetFilters}
        filterControls={filterControls}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        data={filteredSections}
        columns={tableColumns}
        loading={loading}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onRowClick={(sec) => handleEdit(sec)}
        renderCard={renderSectionCard}
        page={page}
        pageSize={pageSize}
        totalCount={filteredSections.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={(f, d) => {
          setSortField(f);
          setSortDirection(d);
        }}
        emptyState={{
          icon: SectionIcon,
          title: 'No Sections Found',
          description: hasActiveFilters
            ? 'No sections match the selected filter criteria. Try clearing some filters.'
            : 'No class sections have been created yet. Click "Add Section" to configure your first section.',
        }}
      />

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
            direct_students: deletingSection.enrolled_students || 0,
            groups: deletingSection.group_count || 0,
          }}
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
    </>
  );
}
