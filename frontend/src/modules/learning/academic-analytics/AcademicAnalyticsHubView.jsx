import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../../../components/ui/PageHeader';
import TabSwitcher from '../../../components/ui/TabSwitcher';
import { PageContainer } from '../../../components/layout';
import UniversalManagementView from '../../../components/common/UniversalManagementView';
import CustomSelect from '../../../components/ui/CustomSelect';
import CustomInput from '../../../components/ui/CustomInput';
import CustomButton from '../../../components/ui/CustomButton';
import ReusableCalendar from '../../../components/common/ReusableCalendar';
import {
  SavedMessagesIcon,
  PrinterIcon,
} from '../../../components/ui/Icons';
import { learningStore } from '../../../utils/stores/learningStore';
import { useTenant } from '../../../context/TenantContext';
import { useAcademicData } from '../useAcademicData';

const TABS = [
  { id: 'LEDGER', label: 'Multi-Period Academic Ledger', icon: SavedMessagesIcon },
];

const REPORT_PERIOD_TABS = [
  { value: 'DAILY', label: 'Daily Summary Report' },
  { value: 'WEEKLY', label: 'Weekly Performance Digest' },
  { value: 'MONTHLY', label: 'Monthly Report Card' },
  { value: 'YEARLY', label: 'Annual Academic Transcript' },
];

export default function AcademicAnalyticsHubView({ defaultTab = 'LEDGER' }) {
  const { activeTenantId } = useTenant();
  const [searchParams, setSearchParams] = useSearchParams();
  const { classes = [], students = [] } = useAcademicData();
  const tenantId = activeTenantId || 'default';

  const activeTabParam = searchParams.get('tab') || defaultTab;
  const [activeTab, setActiveTab] = useState(activeTabParam);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', tabId);
        return next;
      },
      { replace: true }
    );
  };

  // Filters
  const [reportPeriod, setReportPeriod] = useState('MONTHLY');
  const [selectedClassId, setSelectedClassId] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reportMonth, setReportMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [reportYear, setReportYear] = useState(() => String(new Date().getFullYear()));
  const [searchQuery, setSearchQuery] = useState('');

  // Summary State
  const [summaryData, setSummaryData] = useState({
    totalLessons: 0,
    totalEvaluations: 0,
    masteredCount: 0,
    satisfactoryCount: 0,
    needsImprovementCount: 0,
    totalMistakes: 0,
    totalStucks: 0,
    masteryRate: 0,
    evaluations: [],
  });

  const loadSummary = () => {
    let sDate = selectedDate;
    let eDate = selectedDate;

    if (reportPeriod === 'WEEKLY') {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() - 6);
      sDate = d.toISOString().split('T')[0];
      eDate = selectedDate;
    } else if (reportPeriod === 'MONTHLY') {
      const [y, m] = reportMonth.split('-');
      sDate = `${y}-${m}-01`;
      const lastDayObj = new Date(Number(y), Number(m), 0);
      eDate = `${y}-${m}-${String(lastDayObj.getDate()).padStart(2, '0')}`;
    } else if (reportPeriod === 'YEARLY') {
      sDate = `${reportYear}-01-01`;
      eDate = `${reportYear}-12-31`;
    }

    const res = learningStore.getMultiPeriodSummary(tenantId, {
      class_id: selectedClassId !== 'ALL' ? selectedClassId : null,
      start_date: sDate,
      end_date: eDate,
    });
    setSummaryData(res || {});
  };

  useEffect(() => {
    loadSummary();
    const handleUpdate = () => loadSummary();
    window.addEventListener('spr_learning_updated', handleUpdate);
    return () => window.removeEventListener('spr_learning_updated', handleUpdate);
  }, [tenantId, selectedClassId, reportPeriod, selectedDate, reportMonth, reportYear]);

  // Enrolled Students
  const enrolledStudents = useMemo(() => {
    return students.filter((s) => {
      const matchClass = selectedClassId === 'ALL' || String(s.student_class) === String(selectedClassId);
      const matchSearch =
        searchQuery === '' ||
        (s.name_en || s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.uniq_id || s.roll_number || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchClass && matchSearch;
    });
  }, [students, selectedClassId, searchQuery]);

  // Computed Student Evaluation Rows
  const studentRows = useMemo(() => {
    return enrolledStudents.map((st) => {
      const stEvals = (summaryData?.evaluations || []).filter(
        (e) => String(e.student) === String(st.id)
      );
      const evalCount = stEvals.length;
      const mistakes = stEvals.reduce((acc, e) => acc + (Number(e.total_mistakes) || 0), 0);
      const stucks = stEvals.reduce((acc, e) => acc + (Number(e.total_stucks) || 0), 0);
      const scoreSum = stEvals.reduce((acc, e) => acc + (Number(e.score) || 0), 0);
      const avg = evalCount > 0 ? (scoreSum / evalCount).toFixed(1) : 'N/A';

      return {
        id: st.id,
        student_name: st.name_en || st.name,
        student_uniq_id: st.uniq_id || st.roll_number || 'N/A',
        student_class_name: st.student_class_name || 'Standard Division',
        evalCount,
        mistakes,
        stucks,
        averageScore: avg,
        status: evalCount > 0 ? 'Evaluated' : 'Pending',
      };
    });
  }, [enrolledStudents, summaryData]);

  // Metrics
  const metrics = useMemo(() => [
    { label: 'Evaluated Sessions', value: summaryData.totalEvaluations || 0, subValue: 'Cross-period performance records' },
    { label: 'Mastery Rate', value: `${summaryData.masteryRate || 0}%`, subValue: 'Flawless student deliveries' },
    { label: 'Total Mistakes', value: summaryData.totalMistakes || 0, subValue: 'Errors flagged & corrected' },
    { label: 'Total Stucks', value: summaryData.totalStucks || 0, subValue: 'Lukmah occurrences' },
  ], [summaryData]);

  const classSelectOptions = [
    { value: 'ALL', label: 'All Classes' },
    ...classes.map((c) => ({ value: String(c.id), label: c.name || 'Class' })),
  ];

  const columns = [
    {
      header: 'Student Name',
      render: (row) => (
        <div className="text-left">
          <span className="font-bold theme-text-primary block">{row.student_name}</span>
          <span className="text-xs theme-text-secondary">{row.student_uniq_id}</span>
        </div>
      ),
    },
    {
      header: 'Class / Division',
      render: (row) => (
        <span className="text-xs font-medium theme-text-primary">{row.student_class_name}</span>
      ),
    },
    {
      header: 'Sessions Evaluated',
      render: (row) => (
        <span className="text-xs font-bold theme-text-primary px-2.5 py-1 rounded-md border theme-border theme-bg-secondary/40">
          {row.evalCount} Sessions
        </span>
      ),
    },
    {
      header: 'Mistakes',
      align: 'center',
      headerClassName: 'text-center',
      render: (row) => (
        <span className="text-xs font-bold theme-text-primary text-center block">{row.mistakes}</span>
      ),
    },
    {
      header: 'Stucks',
      align: 'center',
      headerClassName: 'text-center',
      render: (row) => (
        <span className="text-xs font-bold theme-text-primary text-center block">{row.stucks}</span>
      ),
    },
    {
      header: 'Grade Average',
      align: 'center',
      headerClassName: 'text-center',
      render: (row) => (
        <span className="text-xs font-bold theme-text-accent px-2.5 py-1 rounded-md border theme-border theme-bg-secondary/40">
          {row.averageScore} / 10
        </span>
      ),
    },
    {
      header: 'Progress Status',
      render: (row) => (
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border theme-border ${
          row.status === 'Evaluated' ? 'theme-text-accent' : 'theme-text-secondary'
        }`}>
          {row.status}
        </span>
      ),
    },
  ];

  return (
    <PageContainer>
      {/* ─── 1. Header (Reporting & Performance Layer) ────────────────────────── */}
      <PageHeader
        title="Academic Analytics & Ledger"
        subtitle="Reporting & Performance Layer: Cross-period summaries, student academic diaries, progress cards, and transcripts"
        badge="Academic Studies"
        icon={SavedMessagesIcon}
        actions={
          <CustomButton
            type="button"
            variant="primary"
            size="sm"
            icon={PrinterIcon}
            onClick={() => window.print()}
          >
            Print Ledger & Reports
          </CustomButton>
        }
      />

      {/* ─── 2. In-Page Tab Switcher ──────────────────────────────────────────── */}
      <TabSwitcher tabs={TABS} activeTab={activeTab} onChange={handleTabChange} />

      {/* ─── 3. TAB CONTENT: Multi-Period Academic Ledger ─────────────────────── */}
      <div className="animate-fade-in space-y-4">
        <UniversalManagementView
          hideHeader={true}
          isEmbedded={true}
          storageKey="spr_academic_analytics_view"
          defaultViewMode="table"
          stackedSwitcher={true}
          metrics={metrics}
          searchLabel="Search Students"
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search student name, ID, roll number..."
          filters={
            <>
              <div className="lg:col-span-2">
                <CustomSelect
                  label="Report Mode"
                  options={REPORT_PERIOD_TABS}
                  value={reportPeriod}
                  onChange={setReportPeriod}
                  size="md"
                />
              </div>

              <div className="lg:col-span-1">
                <CustomSelect
                  label="Class"
                  options={classSelectOptions}
                  value={selectedClassId}
                  onChange={setSelectedClassId}
                  size="md"
                />
              </div>

              <div className="lg:col-span-1">
                {reportPeriod === 'DAILY' && (
                  <ReusableCalendar
                    label="Report Date"
                    selectedDate={selectedDate}
                    onSelectDate={(val) => setSelectedDate(val)}
                    placeholder="Select Date"
                  />
                )}

                {reportPeriod === 'MONTHLY' && (
                  <CustomInput
                    label="Select Month"
                    type="month"
                    size="md"
                    value={reportMonth}
                    onChange={(val) => {
                      setReportMonth(typeof val === 'string' ? val : val?.target?.value || '');
                    }}
                  />
                )}

                {reportPeriod === 'YEARLY' && (
                  <CustomInput
                    label="Academic Year"
                    size="md"
                    value={reportYear}
                    onChange={(val) => {
                      setReportYear(typeof val === 'string' ? val : val?.target?.value || '');
                    }}
                  />
                )}

                {reportPeriod === 'WEEKLY' && (
                  <ReusableCalendar
                    label="Week Ending Date"
                    selectedDate={selectedDate}
                    onSelectDate={(val) => setSelectedDate(val)}
                    placeholder="Select Date"
                  />
                )}
              </div>
            </>
          }
          data={studentRows}
          columns={columns}
          totalCount={studentRows.length}
          emptyIcon={SavedMessagesIcon}
          emptyTitle="No student records found"
          emptySubMessage="Select another class or timeframe to inspect performance analytics."
        />

        {/* Printable Official Grade Matrix & Signature Sheet */}
        <div className="rounded-2xl border theme-border theme-bg-surface p-6 shadow-xs space-y-6 mt-4 text-left">
          <div className="border-b theme-border pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md theme-bg-accent-soft theme-accent uppercase tracking-wider">
                {reportPeriod} ACADEMIC REPORT
              </span>
              <h2 className="text-lg font-bold theme-text-primary mt-1">
                Class Performance & Learning Progress Sheet
              </h2>
              <p className="text-xs theme-text-secondary">
                Institutional record of student performance accuracy, mistakes, stucks, and evaluation scores
              </p>
            </div>

            <div className="text-right text-xs theme-text-secondary">
              <div>Generated: <strong>{new Date().toLocaleDateString()}</strong></div>
              <div>Mastery Rate: <strong className="theme-accent">{summaryData.masteryRate || 0}%</strong></div>
            </div>
          </div>

          {/* Signature Block */}
          <div className="border-t theme-border pt-8 mt-6 grid grid-cols-3 gap-4 text-center text-xs theme-text-secondary">
            <div>
              <div className="border-t border-dashed theme-border w-3/4 mx-auto pt-1 font-semibold theme-text-primary">
                Class Ustadh / Teacher
              </div>
            </div>
            <div>
              <div className="border-t border-dashed theme-border w-3/4 mx-auto pt-1 font-semibold theme-text-primary">
                Academic Supervisor
              </div>
            </div>
            <div>
              <div className="border-t border-dashed theme-border w-3/4 mx-auto pt-1 font-semibold theme-text-primary">
                Principal / Muhtamim
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
