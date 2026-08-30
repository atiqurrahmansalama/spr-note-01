import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchWithAuth } from '../../../../utils/authService';
import { useToast } from '../../../../context/ToastContext';
import {
  SectionIcon,
  ClassIcon,
  TeacherIcon,
  EditIcon,
  TrashIcon,
  GroupIcon,
  TableIcon,
  Squares2X2Icon,
} from '../../../../components/ui/Icons';
import ActionMenu from '../../../../components/ui/ActionMenu';
import CustomInput from '../../../../components/ui/CustomInput';
import { ClassSelect } from '../../../../components/selectors';
import DataTable from '../../../../components/ui/DataTable';
import DataCardGrid from '../../../../components/ui/DataCardGrid';
import { useRightSidebar, useDrawerRegistration } from '../../../../context/RightSidebarContext';
import SectionForm from './SectionForm';
import SectionMigrationModal from './SectionMigrationModal';
import DeleteImpactModal from '../../../../components/common/DeleteImpactModal';
import { getSections, deleteSection, getBranches } from '../../../../api/academy';
import { getBranchDisplayName } from '../../../../utils/localStore';

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

  const [sections, setSections] = useState([]);
  const [classes, setClasses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & View Mode
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState(queryClass);
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('spr_sections_view_mode') || 'table';
    } catch {
      return 'table';
    }
  });

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('spr_sections_view_mode', mode);
    } catch {}
  };

  // Modals
  const [deletingSection, setDeletingSection] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (queryClass !== classFilter) {
      setClassFilter(queryClass);
    }
  }, [queryClass]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [secRes, classRes, branchRes, teacherRes] = await Promise.allSettled([
        getSections({ page_size: 500, all: true }),
        fetchWithAuth('/api/v1/classes/?page_size=500&all=true'),
        getBranches(),
        fetchWithAuth('/api/v1/users/'),
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
            key={sectionId ? `edit-sec-${sectionId}` : 'add-sec'}
            section={foundSection}
            classes={classes}
            branches={branches}
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

  // Filtered dataset by search query & class filter
  const filteredSections = sections.filter((sec) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (sec.section_name || sec.name)?.toLowerCase().includes(q);
      const matchClass = sec.student_class_name?.toLowerCase().includes(q);
      const matchTeacher = sec.class_teacher_name?.toLowerCase().includes(q);
      if (!matchName && !matchClass && !matchTeacher) return false;
    }

    if (classFilter !== 'ALL' && String(sec.student_class) !== String(classFilter)) {
      return false;
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

  // Table Columns (Campus/Branch, Format, Enrolled/Capacity removed per request)
  const tableColumns = [
    {
      key: 'index',
      header: 'No',
      align: 'center',
      headerClassName: 'w-14 text-center font-mono text-xs',
      cellClassName: 'w-14 text-center font-mono text-xs',
      render: (_, rowIdx) => (
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
      render: (sec) => (
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
      render: (sec) => (
        <span className="text-xs font-semibold theme-text-primary">
          {sec.student_class_name || 'Academic Class'}
        </span>
      ),
    },
    {
      key: 'class_teacher_name',
      header: 'In-Charge Teacher',
      headerClassName: 'min-w-[180px] sm:min-w-[220px]',
      cellClassName: 'min-w-[180px] sm:min-w-[220px]',
      render: (sec) => (
        <div className="flex items-center gap-1.5 text-xs theme-text-secondary py-1">
          <TeacherIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
          <span className={`font-semibold ${sec.class_teacher_name ? 'theme-text-primary' : 'theme-text-muted italic'}`}>
            {sec.class_teacher_name || 'Unassigned'}
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
      render: (sec) => (
        <span className="text-xs font-bold font-mono theme-text-primary px-2.5 py-0.5 rounded-lg theme-bg-sub border theme-border inline-block">
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
      render: (sec) => (
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <ActionMenu items={getActionMenuItems(sec)} align="right" />
        </div>
      ),
    },
  ];

  // Card Renderer
  const renderSectionCard = (sec) => (
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
              {sec.student_class_name || 'Class'} &bull; {getBranchDisplayName(sec.branch_name || sec.branch) || 'Main Campus'}
            </p>
          </div>

          <div onClick={(e) => e.stopPropagation()}>
            <ActionMenu items={getActionMenuItems(sec)} align="right" />
          </div>
        </div>

        <div className="text-xs theme-text-secondary flex items-center justify-between">
          <span>In-Charge:</span>
          <span className="font-semibold theme-text-primary">{sec.class_teacher_name || 'Unassigned'}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl theme-bg-sub border theme-border text-center">
          <div>
            <span className="block text-sm font-bold theme-accent font-mono">
              {sec.enrolled_students || 0}
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
    <div className="flex flex-col w-full space-y-3.5">
      {/* ─── Top Filter & View Toolbar Card ─── */}
      <div className="p-2.5 sm:p-3 rounded-2xl theme-bg-surface border theme-border shadow-xs flex flex-col sm:flex-row sm:items-end justify-between gap-2.5 sm:gap-3 w-full min-w-0">
        {/* Left Side: Search Bar + Class Filter */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-2.5 flex-1 min-w-0">
          <div className="w-full sm:w-56 md:w-64 lg:w-72 shrink-0">
            <CustomInput
              label="Search Sections"
              type="search"
              size="md"
              value={searchQuery}
              onChange={(val) => setSearchQuery(val)}
              placeholder="Search sections, teacher..."
              clearable={true}
            />
          </div>

          <div className="w-full sm:w-52 md:w-56 shrink-0">
            <ClassSelect
              label="Filter by Class"
              placeholder="All Classes"
              classes={classes}
              value={classFilter}
              onChange={handleFilterChange(setClassFilter, 'class')}
              allowAll={true}
              allLabel="All Classes"
              size="md"
              icon={ClassIcon}
            />
          </div>
        </div>

        {/* Right Side: View Switcher Button */}
        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 theme-border sm:border-transparent pb-0.5">
          <button
            type="button"
            onClick={() => handleViewModeChange(viewMode === 'grid' ? 'table' : 'grid')}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold theme-bg-sub border theme-border hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0 select-none"
            title={viewMode === 'grid' ? 'Switch to Table View' : 'Switch to Cards View'}
          >
            {viewMode === 'grid' ? (
              <>
                <TableIcon className="w-3.5 h-3.5 theme-accent" />
                <span>Table View</span>
              </>
            ) : (
              <>
                <Squares2X2Icon className="w-3.5 h-3.5 theme-accent" />
                <span>Cards View</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main View Content (Table or Cards Grid) */}
      {viewMode === 'table' ? (
        <DataTable
          columns={tableColumns}
          data={filteredSections}
          loading={loading}
          loadingMessage="Loading class sections..."
          keyExtractor={(s, idx) => s.id || `sec_${idx}`}
          cellPaddingClass="py-3.5 px-4 sm:px-5"
          headerCellClassName="py-3 px-4 sm:px-5 text-xs uppercase tracking-wider font-bold"
          emptyIcon={SectionIcon}
          emptyTitle="No Sections Found"
          emptySubMessage={
            searchQuery || classFilter !== 'ALL'
              ? 'No sections match the applied search or filter criteria.'
              : 'Get started by creating your first class section division.'
          }
          onRowClick={(sec) => handleEdit(sec)}
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
            searchQuery || classFilter !== 'ALL'
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
    </div>
  );
}

