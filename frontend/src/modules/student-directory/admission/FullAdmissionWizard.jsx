import { useState, useEffect } from "react";
import apiClient from "../../../api/axios";
import { useToast } from "../../../context/ToastContext";

export default function FullAdmissionWizard({ onCancel, onSuccess, sharedData, setSharedData }) {
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);

  // File states
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [birthCertificateFile, setBirthCertificateFile] = useState(null);
  const [marksheetFile, setMarksheetFile] = useState(null);

  // Address sync
  const [sameAddress, setSameAddress] = useState(true);

  useEffect(() => {
    apiClient.get("/groups/")
      .then((res) => {
        if (Array.isArray(res.data)) {
          setGroups(res.data);
        }
      })
      .catch((err) => {
        console.error("Failed to load student groups", err);
      });
  }, []);

  const handleChange = (field, val) => {
    setSharedData((prev) => ({
      ...prev,
      [field]: val,
    }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast("Photo must be less than 2MB", "warning");
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleAddressClone = (checked) => {
    setSameAddress(checked);
    if (checked) {
      setSharedData((prev) => ({
        ...prev,
        perm_street: prev.street_address,
        perm_post_office: prev.post_office,
        perm_post_code: prev.post_code,
        perm_thana: prev.thana_or_upazila,
        perm_district: prev.district,
        perm_division: prev.division,
      }));
    }
  };

  const nextStep = () => {
    if (currentStep === 1) {
      if (!sharedData.name?.trim()) {
        showToast("Student Name is required", "warning");
        return;
      }
    }
    if (currentStep === 3) {
      if (!sharedData.guardian_phone?.trim()) {
        showToast("Guardian Phone is required", "warning");
        return;
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, 5));
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    setLoading(true);

    // Build nested structure
    const presentAddressData = {
      address_type: "PRESENT",
      street_address: sharedData.street_address || "",
      post_office: sharedData.post_office || "",
      post_code: sharedData.post_code || "",
      thana_or_upazila: sharedData.thana_or_upazila || "",
      district: sharedData.district || "",
      division: sharedData.division || "",
    };

    const permanentAddressData = sameAddress
      ? { ...presentAddressData, address_type: "PERMANENT" }
      : {
          address_type: "PERMANENT",
          street_address: sharedData.perm_street || "",
          post_office: sharedData.perm_post_office || "",
          post_code: sharedData.perm_post_code || "",
          thana_or_upazila: sharedData.perm_thana || "",
          district: sharedData.perm_district || "",
          division: sharedData.perm_division || "",
        };

    const academicData = {
      session_year: sharedData.session_year || "2026-2027",
      class_or_group_id: sharedData.class_or_group_id || null,
      roll_number: sharedData.roll_number || "",
      admission_date: sharedData.admission_date || new Date().toISOString().split("T")[0],
      previous_school_name: sharedData.previous_school_name || "",
      tc_number: sharedData.tc_number || "",
    };

    const guardianData = {
      father_name: sharedData.father_name || "",
      father_phone: sharedData.father_phone || "",
      father_occupation: sharedData.father_occupation || "",
      mother_name: sharedData.mother_name || "",
      mother_phone: sharedData.mother_phone || "",
      primary_guardian_name: sharedData.primary_guardian_name || sharedData.father_name || "",
      primary_guardian_phone: sharedData.guardian_phone || "",
      guardian_relation: sharedData.guardian_relation || "Father",
      guardian_nid: sharedData.guardian_nid || "",
      emergency_contact_phone: sharedData.emergency_contact_phone || "",
    };

    const payload = {
      name: sharedData.name,
      bangla_name: sharedData.bangla_name || "",
      student_id_card_number: sharedData.student_id_card_number || null,
      gender: sharedData.gender || "MALE",
      dob: sharedData.dob || null,
      blood_group: sharedData.blood_group || null,
      birth_certificate_no: sharedData.birth_certificate_no || "",
      admission_mode: "FULL",
      status: "ACTIVE",
      group_name: sharedData.group_name || "General Group",
      present_address_data: presentAddressData,
      permanent_address_data: permanentAddressData,
      academic_data: academicData,
      guardian_data: guardianData,
    };

    try {
      // 1. Submit admission JSON data
      const res = await apiClient.post("/students/admission/", payload);
      const studentId = res.data.id;

      // 2. Upload photo if present
      if (photoFile && studentId) {
        const photoFormData = new FormData();
        photoFormData.append("photo", photoFile);
        await apiClient.patch(`/students/${studentId}/full-profile/`, photoFormData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      }

      // 3. Upload Birth Certificate document if present
      if (birthCertificateFile && studentId) {
        const bcFormData = new FormData();
        bcFormData.append("doc_type", "BIRTH_CERTIFICATE");
        bcFormData.append("file", birthCertificateFile);
        bcFormData.append("title", "Birth Certificate of " + sharedData.name);
        await apiClient.post(`/students/${studentId}/upload-document/`, bcFormData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      }

      // 4. Upload Marksheet document if present
      if (marksheetFile && studentId) {
        const msFormData = new FormData();
        msFormData.append("doc_type", "PREVIOUS_MARKSHEET");
        msFormData.append("file", marksheetFile);
        msFormData.append("title", "Previous Marksheet of " + sharedData.name);
        await apiClient.post(`/students/${studentId}/upload-document/`, msFormData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      }

      showToast("Student enrolled and documents uploaded successfully", "success");
      if (onSuccess) {
        // Fetch full profile and trigger callback
        const profileRes = await apiClient.get(`/students/${studentId}/full-profile/`);
        onSuccess(profileRes.data);
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to complete full admission. Check fields.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stepper Header */}
      <div className="flex justify-between items-center text-xs font-semibold theme-text-secondary border-b theme-border pb-3">
        <span className={currentStep === 1 ? "theme-accent font-bold" : ""}>1. Personal</span>
        <span className={currentStep === 2 ? "theme-accent font-bold" : ""}>2. Academic</span>
        <span className={currentStep === 3 ? "theme-accent font-bold" : ""}>3. Guardian</span>
        <span className={currentStep === 4 ? "theme-accent font-bold" : ""}>4. Address</span>
        <span className={currentStep === 5 ? "theme-accent font-bold" : ""}>5. Verification</span>
      </div>

      {/* Step 1: Personal Details */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div className="flex flex-col items-center space-y-3">
            <div className="relative w-24 h-24 rounded-full border theme-border overflow-hidden bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] theme-text-secondary text-center px-2">No Photo</span>
              )}
            </div>
            <label className="cursor-pointer px-3 py-1.5 text-xs font-semibold theme-bg-sub theme-text-primary rounded-lg border theme-border hover:theme-bg-sub-hover transition-colors">
              Choose Photo
              <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
            </label>
            <span className="text-[10px] theme-text-secondary">JPEG/PNG under 2MB</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1">English Full Name *</label>
              <input
                type="text"
                value={sharedData.name || ""}
                onChange={(e) => handleChange("name", e.target.value)}
                required
                className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1">Bangla Name</label>
              <input
                type="text"
                value={sharedData.bangla_name || ""}
                onChange={(e) => handleChange("bangla_name", e.target.value)}
                className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1">Gender</label>
              <select
                value={sharedData.gender || "MALE"}
                onChange={(e) => handleChange("gender", e.target.value)}
                className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1">Date of Birth</label>
              <input
                type="date"
                value={sharedData.dob || ""}
                onChange={(e) => handleChange("dob", e.target.value)}
                className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1">Blood Group</label>
              <select
                value={sharedData.blood_group || ""}
                onChange={(e) => handleChange("blood_group", e.target.value)}
                className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
              >
                <option value="">Unknown</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold theme-text-secondary mb-1">Birth Certificate No</label>
            <input
              type="text"
              value={sharedData.birth_certificate_no || ""}
              onChange={(e) => handleChange("birth_certificate_no", e.target.value)}
              placeholder="17 Digit Certificate Number"
              className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
            />
          </div>
        </div>
      )}

      {/* Step 2: Academic Details */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1">Session Year</label>
              <input
                type="text"
                value={sharedData.session_year || "2026-2027"}
                onChange={(e) => handleChange("session_year", e.target.value)}
                placeholder="e.g. 2026-2027"
                className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1">Class / Group</label>
              <select
                value={sharedData.class_or_group_id || ""}
                onChange={(e) => {
                  const grpId = e.target.value;
                  const grp = groups.find((g) => String(g.id) === String(grpId));
                  setSharedData((prev) => ({
                    ...prev,
                    class_or_group_id: grpId,
                    group_name: grp ? grp.name : "General Group",
                  }));
                }}
                className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
              >
                <option value="">Select Class</option>
                {groups.map((grp) => (
                  <option key={grp.id} value={grp.id}>
                    {grp.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1">Class Roll Number</label>
              <input
                type="text"
                value={sharedData.roll_number || ""}
                onChange={(e) => handleChange("roll_number", e.target.value)}
                placeholder="Class Roll Number"
                className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1">Admission Date</label>
              <input
                type="date"
                value={sharedData.admission_date || new Date().toISOString().split("T")[0]}
                onChange={(e) => handleChange("admission_date", e.target.value)}
                className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1">Previous School Name</label>
              <input
                type="text"
                value={sharedData.previous_school_name || ""}
                onChange={(e) => handleChange("previous_school_name", e.target.value)}
                className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1">TC Number</label>
              <input
                type="text"
                value={sharedData.tc_number || ""}
                onChange={(e) => handleChange("tc_number", e.target.value)}
                className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Guardian Details */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1">Father Name</label>
              <input
                type="text"
                value={sharedData.father_name || ""}
                onChange={(e) => handleChange("father_name", e.target.value)}
                className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1">Father Phone</label>
              <input
                type="text"
                value={sharedData.father_phone || ""}
                onChange={(e) => handleChange("father_phone", e.target.value)}
                className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1">Father Occupation</label>
              <input
                type="text"
                value={sharedData.father_occupation || ""}
                onChange={(e) => handleChange("father_occupation", e.target.value)}
                className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1">Mother Name</label>
              <input
                type="text"
                value={sharedData.mother_name || ""}
                onChange={(e) => handleChange("mother_name", e.target.value)}
                className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1">Mother Phone</label>
              <input
                type="text"
                value={sharedData.mother_phone || ""}
                onChange={(e) => handleChange("mother_phone", e.target.value)}
                className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t theme-border pt-4">
            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1">Primary Guardian Phone *</label>
              <input
                type="text"
                value={sharedData.guardian_phone || ""}
                onChange={(e) => handleChange("guardian_phone", e.target.value)}
                required
                className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1">Primary Guardian Name</label>
              <input
                type="text"
                value={sharedData.primary_guardian_name || ""}
                onChange={(e) => handleChange("primary_guardian_name", e.target.value)}
                className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1">Relation to Student</label>
              <select
                value={sharedData.guardian_relation || "Father"}
                onChange={(e) => handleChange("guardian_relation", e.target.value)}
                className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
              >
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Uncle">Uncle</option>
                <option value="Guardian">Other Local Guardian</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1">Guardian NID</label>
              <input
                type="text"
                value={sharedData.guardian_nid || ""}
                onChange={(e) => handleChange("guardian_nid", e.target.value)}
                className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1">Emergency Contact Phone</label>
              <input
                type="text"
                value={sharedData.emergency_contact_phone || ""}
                onChange={(e) => handleChange("emergency_contact_phone", e.target.value)}
                className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Addresses */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider theme-text-secondary">Present Address</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1">Division</label>
                <input
                  type="text"
                  value={sharedData.division || ""}
                  onChange={(e) => handleChange("division", e.target.value)}
                  className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1">District</label>
                <input
                  type="text"
                  value={sharedData.district || ""}
                  onChange={(e) => handleChange("district", e.target.value)}
                  className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1">Thana / Upazila</label>
                <input
                  type="text"
                  value={sharedData.thana_or_upazila || ""}
                  onChange={(e) => handleChange("thana_or_upazila", e.target.value)}
                  className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold theme-text-secondary mb-1">Street / House / Village</label>
                <input
                  type="text"
                  value={sharedData.street_address || ""}
                  onChange={(e) => handleChange("street_address", e.target.value)}
                  className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1">Post Code</label>
                <input
                  type="text"
                  value={sharedData.post_code || ""}
                  onChange={(e) => handleChange("post_code", e.target.value)}
                  className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 border-t theme-border pt-4">
            <input
              type="checkbox"
              id="sameAddress"
              checked={sameAddress}
              onChange={(e) => handleAddressClone(e.target.checked)}
              className="rounded border theme-border text-[var(--accent-main)] focus:ring-[var(--accent-main)] focus:ring-opacity-50"
            />
            <label htmlFor="sameAddress" className="text-xs font-semibold theme-text-primary select-none cursor-pointer">
              Permanent address is the same as present address
            </label>
          </div>

          {!sameAddress && (
            <div className="space-y-4 animate-fade-in">
              <h4 className="text-xs font-bold uppercase tracking-wider theme-text-secondary">Permanent Address</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold theme-text-secondary mb-1">Division</label>
                  <input
                    type="text"
                    value={sharedData.perm_division || ""}
                    onChange={(e) => handleChange("perm_division", e.target.value)}
                    className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold theme-text-secondary mb-1">District</label>
                  <input
                    type="text"
                    value={sharedData.perm_district || ""}
                    onChange={(e) => handleChange("perm_district", e.target.value)}
                    className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold theme-text-secondary mb-1">Thana / Upazila</label>
                  <input
                    type="text"
                    value={sharedData.perm_thana || ""}
                    onChange={(e) => handleChange("perm_thana", e.target.value)}
                    className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold theme-text-secondary mb-1">Street / House / Village</label>
                  <input
                    type="text"
                    value={sharedData.perm_street || ""}
                    onChange={(e) => handleChange("perm_street", e.target.value)}
                    className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold theme-text-secondary mb-1">Post Code</label>
                  <input
                    type="text"
                    value={sharedData.perm_post_code || ""}
                    onChange={(e) => handleChange("perm_post_code", e.target.value)}
                    className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 5: Verification & Files */}
      {currentStep === 5 && (
        <div className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider theme-text-secondary">Attach Verification Documents</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1">Birth Certificate Attachment</label>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => setBirthCertificateFile(e.target.files[0])}
                  className="w-full text-xs text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:theme-bg-sub file:theme-text-primary hover:file:opacity-90"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1">Previous Marksheet Attachment</label>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => setMarksheetFile(e.target.files[0])}
                  className="w-full text-xs text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:theme-bg-sub file:theme-text-primary hover:file:opacity-90"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t theme-border pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider theme-text-secondary">Information Summary Review</h4>
            <div className="overflow-x-auto max-h-60 rounded-xl border theme-border">
              <table className="w-full text-xs text-left">
                <tbody>
                  <tr className="border-b theme-border">
                    <td className="px-4 py-2 font-bold theme-text-secondary bg-neutral-50 dark:bg-neutral-900 w-1/3">Student Name</td>
                    <td className="px-4 py-2 theme-text-primary">{sharedData.name}</td>
                  </tr>
                  <tr className="border-b theme-border">
                    <td className="px-4 py-2 font-bold theme-text-secondary bg-neutral-50 dark:bg-neutral-900">Bangla Name</td>
                    <td className="px-4 py-2 theme-text-primary">{sharedData.bangla_name || "-"}</td>
                  </tr>
                  <tr className="border-b theme-border">
                    <td className="px-4 py-2 font-bold theme-text-secondary bg-neutral-50 dark:bg-neutral-900">Gender &amp; DOB</td>
                    <td className="px-4 py-2 theme-text-primary">{sharedData.gender || "MALE"} / {sharedData.dob || "-"}</td>
                  </tr>
                  <tr className="border-b theme-border">
                    <td className="px-4 py-2 font-bold theme-text-secondary bg-neutral-50 dark:bg-neutral-900">Academic Group</td>
                    <td className="px-4 py-2 theme-text-primary">{sharedData.group_name || "General Group"}</td>
                  </tr>
                  <tr className="border-b theme-border">
                    <td className="px-4 py-2 font-bold theme-text-secondary bg-neutral-50 dark:bg-neutral-900">Guardian Phone</td>
                    <td className="px-4 py-2 theme-text-primary">{sharedData.guardian_phone}</td>
                  </tr>
                  <tr className="border-b theme-border">
                    <td className="px-4 py-2 font-bold theme-text-secondary bg-neutral-50 dark:bg-neutral-900">Street Address</td>
                    <td className="px-4 py-2 theme-text-primary">
                      {sharedData.street_address || "-"}, {sharedData.thana_or_upazila || "-"}, {sharedData.district || "-"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex justify-between items-center pt-4 border-t theme-border">
        {currentStep > 1 ? (
          <button
            type="button"
            onClick={prevStep}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold theme-bg-sub theme-text-primary rounded-xl border theme-border hover:theme-bg-sub-hover transition-colors cursor-pointer"
          >
            Back
          </button>
        ) : (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium theme-bg-sub theme-text-primary hover:theme-bg-sub-hover rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
        )}

        {currentStep < 5 ? (
          <button
            type="button"
            onClick={nextStep}
            className="px-5 py-2 text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-90 rounded-xl transition cursor-pointer"
          >
            Next Step
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-90 rounded-xl transition cursor-pointer disabled:opacity-50"
          >
            {loading ? "Registering Profile..." : "Enroll Student"}
          </button>
        )}
      </div>
    </div>
  );
}
