import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "../../../context/ToastContext";
import { useFeatureControl } from "../../../context/FeatureControlContext";
import { fetchWithAuth } from "../../../utils/authService";
import {
  StudentIcon,
  ClassIcon,
  GroupIcon,
  PlusIcon,
  SearchIcon,
  EditIcon,
  TrashIcon,
  WhatsAppIcon,
  CloseIcon,
  SectionControlIcon,
  BookOpenIcon,
  CheckCircleIcon,
  BuildingOfficeIcon,
  DepartmentIcon,
  PhoneIcon,
  TransferIcon,
} from "../../../components/ui/Icons";
import DataTable from "../../../components/ui/DataTable";
import DataCardGrid from "../../../components/ui/DataCardGrid";
import ActionMenu from "../../../components/ui/ActionMenu";
import CustomSelect from "../../../components/ui/CustomSelect";
import CustomCheckbox from "../../../components/ui/CustomCheckbox";
import MetricsGrid from "../../../components/ui/MetricsGrid";
import PageHeader from "../../../components/ui/PageHeader";
import Modal from "../../../components/ui/Modal";
import StudentTransferModal from "../../student-profile/StudentTransferModal";

export default function StudentDirectoryView({ viewMode = "all" }) {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isSectionEnabled } = useFeatureControl();

  const urlGroup = searchParams.get("student_group") || searchParams.get("group") || "ALL";
  const urlClass = searchParams.get("student_class") || searchParams.get("class") || "ALL";

  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    total_students: 0,
    active_students: 0,
    new_admissions_this_month: 0,
    avg_juz_completed: 0.0,
  });

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState(urlGroup);
  const [classFilter, setClassFilter] = useState(urlClass);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [displayMode, setDisplayMode] = useState(() => {
    try {
      return localStorage.getItem("spr_students_display_mode") || "table";
    } catch {
      return "table";
    }
  });
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals
  const [bulkActionType, setBulkActionType] = useState("change_status");
  const [bulkGroupInput, setBulkGroupInput] = useState("");
  const [bulkStatusInput, setBulkStatusInput] = useState("Active");
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [isBulkTransferModalOpen, setIsBulkTransferModalOpen] = useState(false);

  const handleToggleDisplayMode = (mode) => {
    setDisplayMode(mode);
    try {
      localStorage.setItem("spr_students_display_mode", mode);
    } catch {}
  };

  useEffect(() => {
    loadStudents();
    loadClassesAndGroups();
    loadMetrics();

    const handleTenantChanged = () => {
      setGroupFilter("ALL");
      setClassFilter("ALL");
      loadStudents();
      loadClassesAndGroups();
      loadMetrics();
    };
    window.addEventListener("spr_tenant_changed", handleTenantChanged);
    return () => window.removeEventListener("spr_tenant_changed", handleTenantChanged);
  }, []);

  // Sync state when URL searchParams change
  useEffect(() => {
    const g = searchParams.get("student_group") || searchParams.get("group") || "ALL";
    const c = searchParams.get("student_class") || searchParams.get("class") || "ALL";
    setGroupFilter(g);
    setClassFilter(c);
  }, [searchParams]);

  const loadClassesAndGroups = async () => {
    try {
      const [cRes, gRes] = await Promise.all([
        fetchWithAuth("/api/v1/classes/"),
        fetchWithAuth("/api/v1/groups/"),
      ]);
      if (cRes.ok) {
        const cData = await cRes.json();
        setClasses(Array.isArray(cData) ? cData : cData.results || []);
      }
      if (gRes.ok) {
        const gData = await gRes.json();
        setGroups(Array.isArray(gData) ? gData : gData.results || []);
      }
    } catch {}
  };

  const loadStudents = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/v1/students/");
      if (res.ok) {
        const data = await res.json();
        setStudents(data.results || data);
      }
    } catch {
      showToast("Failed to load students.", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const res = await fetchWithAuth("/api/v1/students/metrics/");
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch {}
  };

  const handleGroupFilterChange = (val) => {
    setGroupFilter(val);
    const newParams = new URLSearchParams(searchParams);
    if (val && val !== "ALL") {
      newParams.set("student_group", val);
    } else {
      newParams.delete("student_group");
      newParams.delete("group");
    }
    setSearchParams(newParams);
  };

  const handleClassFilterChange = (val) => {
    setClassFilter(val);
    const newParams = new URLSearchParams(searchParams);
    if (val && val !== "ALL") {
      newParams.set("student_class", val);
    } else {
      newParams.delete("student_class");
      newParams.delete("class");
    }
    setSearchParams(newParams);
  };

  const handleSelectAll = (checked) => {
    if (!checked || selectedIds.length === filteredStudents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredStudents.map((s) => s.id));
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const handleBulkActionSubmit = async () => {
    if (!bulkActionType) return;
    if (selectedIds.length === 0) {
      showToast("No students selected.", "warning");
      return;
    }

    try {
      let payload = {
        action: bulkActionType,
        student_ids: selectedIds,
      };

      if (bulkActionType === "assign_group") {
        if (!bulkGroupInput) {
          showToast("Please specify a group.", "warning");
          return;
        }
        payload.group_name = bulkGroupInput;
      } else if (bulkActionType === "change_status") {
        payload.status = bulkStatusInput;
      }

      const res = await fetchWithAuth("/api/v1/students/bulk-action/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast("Bulk operation successful!", "success");
        setShowBulkModal(false);
        setSelectedIds([]);
        loadStudents();
        loadMetrics();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Bulk action failed.", "error");
      }
    } catch {
      showToast("Error processing bulk action.", "error");
    }
  };

  const handleDeleteSingle = async (id, studentName) => {
    if (
      !window.confirm(
        `Are you sure you want to delete student record "${studentName || ""}"? This action cannot be undone.`
      )
    )
      return;

    try {
      const res = await fetchWithAuth(`/api/v1/students/${id}/`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast("Student record deleted.", "success");
        loadStudents();
        loadMetrics();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Failed to delete record.", "error");
      }
    } catch {
      showToast("Failed to delete record.", "error");
    }
  };

  // Find active group or class object
  const activeGroupObj = groups.find(
    (g) =>
      String(g.id) === String(groupFilter) ||
      g.name?.toLowerCase() === String(groupFilter).toLowerCase()
  );
  const activeClassObj = classes.find(
    (c) =>
      String(c.id) === String(classFilter) ||
      c.name?.toLowerCase() === String(classFilter).toLowerCase()
  );

  // Filter students dynamically
  const filteredStudents = students.filter((s) => {
    const name = (s.name_en || s.name || "").toLowerCase();
    const bName = (s.bangla_name || "").toLowerCase();
    const roll = String(s.roll_number || s.roll || "");
    const gPhone = (s.details?.guardian_phone || "").toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch =
      !query ||
      name.includes(query) ||
      bName.includes(query) ||
      roll.includes(query) ||
      gPhone.includes(query);

    let matchesGroup = true;
    if (groupFilter !== "ALL") {
      const targetGroupStr = String(groupFilter).toLowerCase();
      const sGroupId = s.student_group ? String(s.student_group).toLowerCase() : "";
      const sGroupName = (s.student_group_name || s.group_name || s.group || "").toLowerCase();
      matchesGroup =
        sGroupId === targetGroupStr ||
        sGroupName === targetGroupStr ||
        (activeGroupObj && sGroupName === activeGroupObj.name.toLowerCase());
    }

    let matchesClass = true;
    if (classFilter !== "ALL") {
      const targetClassStr = String(classFilter).toLowerCase();
      const sClassId = s.student_class ? String(s.student_class).toLowerCase() : "";
      const sClassName = (s.student_class_name || "").toLowerCase();
      matchesClass =
        sClassId === targetClassStr ||
        sClassName === targetClassStr ||
        (activeClassObj && sClassName === activeClassObj.name.toLowerCase());
    }

    const studentStatus = s.status || "Active";
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && studentStatus.toUpperCase() === "ACTIVE") ||
      (statusFilter === "INACTIVE" && studentStatus.toUpperCase() === "INACTIVE") ||
      (statusFilter === "ALUMNI" &&
        (studentStatus.toUpperCase() === "ALUMNI" || studentStatus.toUpperCase() === "TC"));

    return matchesSearch && matchesGroup && matchesClass && matchesStatus;
  });

  const getActionMenuItems = (s) => [
    {
      label: "View Profile",
      icon: SearchIcon,
      onClick: () => navigate(`/students/${s.id}/profile`),
    },
    ...(s.details?.guardian_phone
      ? [
          {
            label: "Contact",
            icon: WhatsAppIcon,
            onClick: () =>
              window.open(
                `https://wa.me/${s.details.guardian_phone.replace(/[^\d]/g, "")}`,
                "_blank"
              ),
          },
        ]
      : []),
    { divider: true },
    {
      label: "Delete Record",
      icon: TrashIcon,
      danger: true,
      onClick: () => handleDeleteSingle(s.id, s.name_en || s.name),
    },
  ];

  // Reusable Centered Table Columns Specification
  const tableColumns = [
    {
      key: "select",
      header: (
        <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
          <CustomCheckbox
            size="sm"
            checked={
              filteredStudents.length > 0 && selectedIds.length === filteredStudents.length
            }
            onChange={handleSelectAll}
          />
        </div>
      ),
      headerClassName: "w-12 text-center",
      align: "center",
      render: (s) => (
        <div onClick={(e) => e.stopPropagation()} className="flex justify-center">
          <CustomCheckbox
            size="sm"
            checked={selectedIds.includes(s.id)}
            onChange={() => handleSelectRow(s.id)}
          />
        </div>
      ),
    },
    {
      key: "name",
      header: "NAME",
      headerClassName: "text-left",
      align: "left",
      render: (s) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl theme-bg-accent-soft text-xs font-bold theme-accent flex items-center justify-center border theme-border shrink-0 shadow-xs">
            {s.name_en ? s.name_en.charAt(0).toUpperCase() : "S"}
          </div>
          <div className="min-w-0">
            <span className="font-bold theme-text-primary text-xs sm:text-sm truncate block leading-tight">
              {s.name_en || s.name}
            </span>
            {s.details?.name_bn && (
              <span className="text-[11px] theme-text-secondary block mt-0.5 truncate">
                {s.details.name_bn}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "class",
      header: "CLASS",
      headerClassName: "text-center",
      align: "center",
      render: (s) => (
        <div className="text-center truncate text-xs">
          <span className="theme-accent font-bold">
            {s.student_class_name || "General"}
          </span>
          {(s.student_group_name || s.group_name) && (
            <span className="theme-text-secondary">
              {" • "}
              {s.student_group_name || s.group_name}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "guardian",
      header: "GUARDIAN",
      headerClassName: "text-center",
      align: "center",
      render: (s) => (
        <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-center gap-2">
          {s.details?.guardian_phone ? (
            <>
              <span className="font-mono text-xs font-semibold theme-text-primary">
                {s.details.guardian_phone}
              </span>
              <a
                href={`https://wa.me/${s.details.guardian_phone.replace(/[^\d]/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:scale-110 transition-transform inline-flex items-center"
                title="Contact on WhatsApp"
              >
                <WhatsAppIcon className="w-3.5 h-3.5" />
              </a>
            </>
          ) : (
            <span className="text-zinc-500 text-xs italic">Unspecified</span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "STATUS",
      headerClassName: "text-center",
      align: "center",
      render: (s) => {
        const status = (s.status || "Active").toUpperCase();
        const isActive = status === "ACTIVE";
        const isAlumni = status === "ALUMNI" || status === "TC";

        return (
          <div className="flex justify-center">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                isActive
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  : isAlumni
                  ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                  : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
              }`}
            >
              {s.status || "Active"}
            </span>
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "ACTIONS",
      align: "center",
      headerClassName: "w-20 text-center",
      render: (s) => (
        <div onClick={(e) => e.stopPropagation()} className="flex justify-center">
          <ActionMenu items={getActionMenuItems(s)} />
        </div>
      ),
    },
  ];

  // Reusable Card Renderer for Grid View
  const renderStudentCard = (s) => (
    <div
      key={s.id}
      onClick={() => navigate(`/students/${s.id}/profile`)}
      className="rounded-2xl theme-bg-surface border theme-border p-5 shadow-xs flex flex-col justify-between hover:theme-bg-sub/20 transition-all space-y-4 cursor-pointer group"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft text-sm font-bold theme-accent flex items-center justify-center border theme-border shrink-0 shadow-xs">
              {s.name_en ? s.name_en.charAt(0).toUpperCase() : "S"}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold theme-text-primary text-sm truncate">
                {s.name_en || s.name}
              </h3>
              {s.details?.name_bn && (
                <p className="text-[11px] theme-text-secondary truncate">
                  {s.details.name_bn}
                </p>
              )}
            </div>
          </div>

          <div onClick={(e) => e.stopPropagation()}>
            <ActionMenu items={getActionMenuItems(s)} />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="theme-accent font-bold">
            {s.student_class_name || "General"}
          </span>
          {(s.student_group_name || s.group_name) && (
            <span className="theme-text-secondary">
              {" • "}
              {s.student_group_name || s.group_name}
            </span>
          )}
        </div>
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        className="pt-3 border-t theme-border flex items-center justify-between text-xs"
      >
        {s.details?.guardian_phone ? (
          <div className="flex items-center gap-1.5 font-mono text-[11px] theme-text-primary">
            <span>{s.details.guardian_phone}</span>
            <a
              href={`https://wa.me/${s.details.guardian_phone.replace(/[^\d]/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 hover:scale-110 transition-transform"
              title="Contact on WhatsApp"
            >
              <WhatsAppIcon className="w-3.5 h-3.5" />
            </a>
          </div>
        ) : (
          <span className="text-[11px] text-zinc-500 italic">No phone</span>
        )}

        <span className="text-[10px] font-bold theme-accent">View Profile &rarr;</span>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto py-5 sm:py-6 px-3.5 sm:px-6 font-sans theme-text-primary animate-fade-in space-y-5 sm:space-y-6 text-left">
      
      {/* 1. Responsive Header with Reusable PageHeader */}
      <PageHeader
        icon={StudentIcon}
        title="Student Roster"
        subtitle="Directory of enrolled students, academic classes, guardian contacts, and status"
        actions={
          selectedIds.length > 0 && (
            <div className="flex items-center gap-2 animate-fade-in flex-wrap">
              <span className="px-2.5 py-1 rounded-xl text-xs font-bold theme-bg-accent-soft theme-accent border theme-border">
                {selectedIds.length} Selected
              </span>
              <button
                type="button"
                onClick={() => setIsBulkTransferModalOpen(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-90 cursor-pointer transition-all flex items-center gap-1.5 shadow-md"
              >
                <TransferIcon className="w-3.5 h-3.5" />
                <span>Bulk Transfer</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setBulkActionType("change_status");
                  setShowBulkModal(true);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold theme-bg-sub border theme-border hover:theme-bg-elevated theme-text-primary cursor-pointer transition-all flex items-center gap-1.5 shadow-xs"
              >
                <SectionControlIcon className="w-3.5 h-3.5" />
                <span>Bulk Status</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-2.5 py-2 rounded-xl text-xs font-semibold theme-text-secondary hover:theme-text-primary border theme-border hover:theme-bg-sub transition cursor-pointer"
              >
                Clear
              </button>
            </div>
          )
        }
      />

      {/* 2. Reusable Metric Cards (Positioned BELOW Header) */}
      <MetricsGrid
        items={[
          {
            label: "Total Students",
            value: metrics.total_students || students.length,
            icon: StudentIcon,
            color: "sky",
          },
          {
            label: "Active Students",
            value: metrics.active_students,
            icon: CheckCircleIcon,
            color: "emerald",
          },
          {
            label: "New Admissions",
            value: metrics.new_admissions_this_month,
            icon: PlusIcon,
            color: "purple",
          },
          ...(isSectionEnabled("quran_hifz_tracker")
            ? [
                {
                  label: "Avg Juz Completed",
                  value: `${metrics.avg_juz_completed} Juz`,
                  icon: BookOpenIcon,
                  color: "accent",
                },
              ]
            : []),
        ]}
      />

      {/* 3. Search & Reusable Dropdown Toolbar (Fully Responsive) */}
      <div className="theme-bg-surface border theme-border p-3.5 rounded-2xl flex flex-col lg:flex-row gap-3 justify-between items-center shadow-xs">
        <div className="relative w-full lg:w-72">
          <SearchIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search student, roll, guardian..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-3.5 py-2 text-xs rounded-xl theme-bg-sub border theme-border theme-text-primary focus:outline-none focus:border-current transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-start sm:justify-end">
          {/* Class Filter Dropdown */}
          <div className="w-full sm:w-44 shrink-0">
            <CustomSelect
              size="sm"
              value={classFilter}
              onChange={handleClassFilterChange}
              options={[
                { value: "ALL", label: "All Classes" },
                ...classes.map((c) => ({ value: c.id, label: c.name })),
              ]}
              placeholder="All Classes"
              icon={ClassIcon}
            />
          </div>

          {/* Group Filter Dropdown */}
          <div className="w-full sm:w-48 shrink-0">
            <CustomSelect
              size="sm"
              value={groupFilter}
              onChange={handleGroupFilterChange}
              options={[
                { value: "ALL", label: "All Groups / Halqas" },
                ...groups.map((g) => ({
                  value: g.id,
                  label: `${g.name}${g.student_class_name ? ` (${g.student_class_name})` : ""}`,
                })),
              ]}
              placeholder="All Groups"
              icon={GroupIcon}
            />
          </div>

          {/* Status Filter Dropdown */}
          <div className="w-full sm:w-36 shrink-0">
            <CustomSelect
              size="sm"
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              options={[
                { value: "ALL", label: "All Status" },
                { value: "ACTIVE", label: "Active Only" },
                { value: "INACTIVE", label: "Inactive Only" },
                { value: "ALUMNI", label: "Alumni / TC" },
              ]}
              placeholder="All Status"
            />
          </div>

          {/* View Mode Toggle Buttons */}
          <div className="flex items-center h-10 p-1 rounded-xl theme-bg-sub border theme-border shrink-0 ml-auto sm:ml-0">
            <button
              type="button"
              onClick={() => handleToggleDisplayMode("table")}
              className={`h-full px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                displayMode === "table"
                  ? "theme-bg-accent theme-accent-text shadow-xs"
                  : "theme-text-secondary hover:theme-text-primary"
              }`}
            >
              <DepartmentIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleDisplayMode("grid")}
              className={`h-full px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                displayMode === "grid"
                  ? "theme-bg-accent theme-accent-text shadow-xs"
                  : "theme-text-secondary hover:theme-text-primary"
              }`}
            >
              <BuildingOfficeIcon className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Display: Reusable Centered DataTable or DataCardGrid */}
      {displayMode === "table" ? (
        <DataTable
          columns={tableColumns}
          data={filteredStudents}
          isLoading={loading}
          loadingMessage="Loading student roster directory..."
          emptyIcon={StudentIcon}
          emptyTitle="No Students Found"
          emptySubMessage={
            searchQuery || classFilter !== "ALL" || groupFilter !== "ALL" || statusFilter !== "ALL"
              ? "No student records match your active filter criteria."
              : "No students registered in this academy roster."
          }
          onRowClick={(s) => navigate(`/students/${s.id}/profile`)}
        />
      ) : (
        <DataCardGrid
          data={filteredStudents}
          renderCard={renderStudentCard}
          isLoading={loading}
          loadingMessage="Loading student roster directory..."
          emptyIcon={StudentIcon}
          emptyTitle="No Students Found"
          emptySubMessage={
            searchQuery || classFilter !== "ALL" || groupFilter !== "ALL" || statusFilter !== "ALL"
              ? "No student records match your active filter criteria."
              : "No students registered in this academy roster."
          }
          gridClassName="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
        />
      )}

      {/* --- BULK OPERATIONS MODAL --- */}
      <Modal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        title={`Bulk Operations (${selectedIds.length} Selected)`}
        subtitle="Apply batch updates to selected student profiles"
        icon={SectionControlIcon}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              type="button"
              onClick={() => setShowBulkModal(false)}
              className="px-4 py-2 rounded-xl border theme-border hover:theme-bg-elevated text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleBulkActionSubmit}
              className="px-5 py-2 rounded-xl font-bold text-xs theme-bg-accent theme-accent-text hover:opacity-90 shadow-md cursor-pointer"
            >
              Execute Bulk Action
            </button>
          </div>
        }
      >
        <div className="p-5 sm:p-6 space-y-4 text-left">
          <div>
            <CustomSelect
              label="Select Action"
              value={bulkActionType}
              onChange={(val) => setBulkActionType(val)}
              options={[
                { value: "change_status", label: "Change Status" },
                { value: "assign_group", label: "Assign Group / Halqa" },
                { value: "bulk_delete", label: "Bulk Delete Students" },
              ]}
              placeholder="Select Action..."
            />
          </div>

          {bulkActionType === "assign_group" && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider theme-text-secondary mb-2">
                Group / Halqa Name
              </label>
              <input
                type="text"
                placeholder="e.g. Nazera Group"
                value={bulkGroupInput}
                onChange={(e) => setBulkGroupInput(e.target.value)}
                className="w-full h-10 px-3.5 py-2 rounded-xl border theme-border theme-bg-sub text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]"
              />
            </div>
          )}

          {bulkActionType === "change_status" && (
            <div>
              <CustomSelect
                label="Target Status"
                value={bulkStatusInput}
                onChange={(val) => setBulkStatusInput(val)}
                options={[
                  { value: "Active", label: "Active" },
                  { value: "Inactive", label: "Inactive" },
                  { value: "Alumni", label: "Alumni" },
                  { value: "Tc", label: "Transfer Certificate (TC)" },
                ]}
                placeholder="Select Status..."
              />
            </div>
          )}
        </div>
      </Modal>

      {/* --- BULK STUDENT TRANSFER MODAL --- */}
      {isBulkTransferModalOpen && (
        <StudentTransferModal
          isOpen={isBulkTransferModalOpen}
          studentIds={selectedIds}
          onClose={() => setIsBulkTransferModalOpen(false)}
          onSuccess={() => {
            setSelectedIds([]);
            loadStudents();
            loadMetrics();
          }}
        />
      )}
    </div>
  );
}
