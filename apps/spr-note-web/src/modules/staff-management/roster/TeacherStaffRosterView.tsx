import React, { useState } from 'react';
import { PageContainer } from '@/components/layout';
import {
  StaffRosterHeader,
  StaffRosterToolbar,
  StaffRosterTable,
  StaffRosterCardGrid,
  TeacherAssignmentModal,
  GeneralDutyModal,
} from './components';
import { useStaffRoster, useStaffFilter } from './hooks';
import type { StaffMember } from '../types';

export const TeacherStaffRosterView: React.FC = () => {
  const {
    staffList,
    departments,
    ranksList,
    metrics,
    loading,
    isRefreshing,
    loadData,
    handleDeleteStaff,
  } = useStaffRoster();

  const {
    searchQuery,
    setSearchQuery,
    roleFilter,
    setRoleFilter,
    rankFilter,
    setRankFilter,
    deptFilter,
    setDeptFilter,
    statusFilter,
    setStatusFilter,
    displayMode,
    handleToggleDisplayMode,
    filteredStaff,
    rankFilterOptions,
    departmentOptions,
    statusOptions,
  } = useStaffFilter({ staffList, ranksList, departments });

  // Modals for In-Page Class & Duty Assignments (Zero Right Sidebar Required)
  const [selectedTeacherForClasses, setSelectedTeacherForClasses] = useState<StaffMember | null>(null);
  const [selectedStaffForDuties, setSelectedStaffForDuties] = useState<StaffMember | null>(null);

  return (
    <PageContainer>
      {/* 1. Header with Live Metrics & Direct Onboarding Action */}
      <StaffRosterHeader
        metrics={metrics}
        matchingCount={filteredStaff.length}
        isRefreshing={isRefreshing}
        onRefresh={() => loadData(true)}
      />

      {/* 2. Search, Filter Toolbar & Table/Grid View Switcher */}
      <StaffRosterToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        roleFilter={roleFilter}
        onRoleChange={setRoleFilter}
        rankFilter={rankFilter}
        onRankChange={setRankFilter}
        rankFilterOptions={rankFilterOptions}
        deptFilter={deptFilter}
        onDeptChange={setDeptFilter}
        departmentOptions={departmentOptions}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        statusOptions={statusOptions}
        displayMode={displayMode}
        onToggleDisplayMode={handleToggleDisplayMode}
        matchingCount={filteredStaff.length}
        totalCount={staffList.length}
      />

      {/* 3. Main Roster Content (Table View vs Responsive Card Grid) */}
      {displayMode === 'table' ? (
        <StaffRosterTable
          data={filteredStaff}
          ranksList={ranksList}
          isLoading={loading}
          onOpenClassesModal={(teacher) => setSelectedTeacherForClasses(teacher)}
          onOpenDutiesModal={(staff) => setSelectedStaffForDuties(staff)}
          onDeleteStaff={handleDeleteStaff}
        />
      ) : (
        <StaffRosterCardGrid
          data={filteredStaff}
          ranksList={ranksList}
          isLoading={loading}
          onOpenClassesModal={(teacher) => setSelectedTeacherForClasses(teacher)}
          onOpenDutiesModal={(staff) => setSelectedStaffForDuties(staff)}
          onDeleteStaff={handleDeleteStaff}
        />
      )}

      {/* 4. In-Page Modals (Zero Drawer / Right Sidebar Dependency) */}
      <TeacherAssignmentModal
        isOpen={Boolean(selectedTeacherForClasses)}
        teacher={selectedTeacherForClasses}
        onClose={() => setSelectedTeacherForClasses(null)}
        onUpdated={() => loadData(true)}
      />

      <GeneralDutyModal
        isOpen={Boolean(selectedStaffForDuties)}
        staff={selectedStaffForDuties}
        onClose={() => setSelectedStaffForDuties(null)}
        onUpdated={() => loadData(true)}
      />
    </PageContainer>
  );
};

export default TeacherStaffRosterView;
