import { useState } from "react";
import { saveReportLocally, getLocalReports } from "../../utils/syncEngine";

export default function ReportGenerator() {
  const [formData, setFormData] = useState({
    student_id: "",
    report_date: new Date().toISOString().split("T")[0],
    subject_course: "",
    tasks_completed: "",
    ongoing_tasks: "",
    key_learnings: "",
    challenges_faced: "",
    next_day_plan: "",
    study_hours: 0,
    overall_status: "IN_PROGRESS",
  });

  // Lazy Initialization: useEffect ছাড়াই নিরাপদে লোকাল ডেটা লোড
  const [savedReports, setSavedReports] = useState(() => getLocalReports() || []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveReportLocally(formData);
    setSavedReports(getLocalReports());
    alert("রিপোর্ট লোকালস্টোরেজে সেভ করা হয়েছে এবং সিঙ্কের জন্য কিউতে রয়েছে!");
  };

  return (
    <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* INPUT FORM (Legacy Compatible Fields) */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 border-b pb-3 dark:border-slate-700">
          📝 Student Daily Progress Report Generator
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Student ID / Roll</label>
              <input
                type="text"
                name="student_id"
                value={formData.student_id}
                onChange={handleChange}
                className="mt-1 w-full p-2.5 border rounded-lg dark:bg-slate-900 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. ST-2026"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Report Date</label>
              <input
                type="date"
                name="report_date"
                value={formData.report_date}
                onChange={handleChange}
                className="mt-1 w-full p-2.5 border rounded-lg dark:bg-slate-900 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Subject / Course Name</label>
            <input
              type="text"
              name="subject_course"
              value={formData.subject_course}
              onChange={handleChange}
              className="mt-1 w-full p-2.5 border rounded-lg dark:bg-slate-900 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Full-Stack Web Development"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tasks Completed Today</label>
            <textarea
              name="tasks_completed"
              rows="3"
              value={formData.tasks_completed}
              onChange={handleChange}
              className="mt-1 w-full p-2.5 border rounded-lg dark:bg-slate-900 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500"
              placeholder="- Built React Generator UI&#10;- Configured Django API"
            ></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Ongoing Tasks</label>
            <textarea
              name="ongoing_tasks"
              rows="2"
              value={formData.ongoing_tasks}
              onChange={handleChange}
              className="mt-1 w-full p-2.5 border rounded-lg dark:bg-slate-900 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500"
            ></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Key Learnings</label>
            <textarea
              name="key_learnings"
              rows="2"
              value={formData.key_learnings}
              onChange={handleChange}
              className="mt-1 w-full p-2.5 border rounded-lg dark:bg-slate-900 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500"
            ></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Challenges Faced</label>
            <textarea
              name="challenges_faced"
              rows="2"
              value={formData.challenges_faced}
              onChange={handleChange}
              className="mt-1 w-full p-2.5 border rounded-lg dark:bg-slate-900 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500"
            ></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Next Day Plan</label>
            <textarea
              name="next_day_plan"
              rows="2"
              value={formData.next_day_plan}
              onChange={handleChange}
              className="mt-1 w-full p-2.5 border rounded-lg dark:bg-slate-900 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500"
            ></textarea>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Study Hours</label>
              <input
                type="number"
                step="0.5"
                name="study_hours"
                value={formData.study_hours}
                onChange={handleChange}
                className="mt-1 w-full p-2.5 border rounded-lg dark:bg-slate-900 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Overall Status</label>
              <select
                name="overall_status"
                value={formData.overall_status}
                onChange={handleChange}
                className="mt-1 w-full p-2.5 border rounded-lg dark:bg-slate-900 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="BLOCKED">Blocked</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg shadow transition"
          >
            💾 Save & Queue Sync
          </button>
        </form>
      </div>

      {/* LIVE REPORT PREVIEW & HISTORY */}
      <div className="space-y-6">
        {/* Live Preview Card */}
        <div className="bg-slate-900 text-slate-100 p-6 rounded-xl shadow-lg border border-slate-700">
          <h3 className="text-xl font-bold border-b border-slate-700 pb-3 mb-4 flex justify-between items-center">
            <span>📄 Live Report Preview</span>
            <span className="text-xs font-normal px-2.5 py-1 bg-indigo-900 text-indigo-300 rounded-full">
              {formData.overall_status}
            </span>
          </h3>
          <div className="space-y-3 text-sm">
            <p><strong className="text-indigo-400">Date:</strong> {formData.report_date}</p>
            <p><strong className="text-indigo-400">Student ID:</strong> {formData.student_id || "N/A"}</p>
            <p><strong className="text-indigo-400">Subject:</strong> {formData.subject_course || "N/A"}</p>
            <hr className="border-slate-800" />
            <p><strong className="text-indigo-400">Tasks Completed:</strong></p>
            <pre className="whitespace-pre-wrap font-sans text-slate-300 bg-slate-950 p-2.5 rounded border border-slate-800">
              {formData.tasks_completed || "None specified."}
            </pre>
            <p><strong className="text-indigo-400">Key Learnings:</strong></p>
            <p className="text-slate-300">{formData.key_learnings || "None specified."}</p>
            <p><strong className="text-indigo-400">Study Duration:</strong> {formData.study_hours} Hours</p>
          </div>
        </div>

        {/* Local Storage History List */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
            📁 Saved Reports ({savedReports.length})
          </h3>
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {savedReports.length === 0 ? (
              <p className="text-sm text-slate-500">কোনো সেভ করা রিপোর্ট পাওয়া যায়নি।</p>
            ) : (
              savedReports.map((rep) => (
                <div
                  key={rep.id}
                  className="p-3 border rounded-lg dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900"
                >
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-white text-sm">
                      {rep.subject_course || "Untitled Report"}
                    </p>
                    <p className="text-xs text-slate-500">{rep.report_date}</p>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      rep.sync_status === "SYNCED"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    }`}
                  >
                    {rep.sync_status || "PENDING"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}