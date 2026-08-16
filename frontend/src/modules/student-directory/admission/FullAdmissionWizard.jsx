import React, { useState, useEffect } from "react";
import apiClient from "../../../api/axios";
import { fetchWithAuth } from "../../../utils/authService";
import { useToast } from "../../../context/ToastContext";
import CustomSelect from "../../../components/ui/CustomSelect";
import ReusableCalendar from "../../../components/common/ReusableCalendar";
import { BD_GEO_DATA } from "../../../utils/bdGeoData";
import { calculateAge, validateBDPhone, validateBRN, validateNID } from "../../../utils/admissionValidators";

const CLASS_CHOICES = ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Hifz", "Nazera", "Play", "Nursery", "Qaida", "Ampara"];

export default function FullAdmissionWizard({ onCancel, onSuccess, sharedData, setSharedData }) {
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);

  // File objects for document vault
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  
  const [birthCertFile, setBirthCertFile] = useState(null);
  const [prevTcFile, setPrevTcFile] = useState(null);
  const [guardianNidFile, setGuardianNidFile] = useState(null);

  // Drag and drop states
  const [activeDragField, setActiveDragField] = useState(null);

  // Address checkbox
  const [sameAddress, setSameAddress] = useState(true);

  // Guardian Sibling Lookup State
  const [lookupResults, setLookupResults] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);

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

  // Guardian Debounce Sibling Lookup
  useEffect(() => {
    const phone = sharedData.guardian_phone || "";
    const digitsOnly = phone.replace(/[^\d]/g, "");
    
    if (digitsOnly.length === 11) {
      setLookupLoading(true);
      fetchWithAuth(`/api/v1/students/guardian-lookup/?phone=${digitsOnly}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.guardian) {
            setLookupResults(data);
          } else {
            setLookupResults(null);
          }
        })
        .catch(() => setLookupResults(null))
        .finally(() => setLookupLoading(false));
    } else {
      setLookupResults(null);
    }
  }, [sharedData.guardian_phone]);

  const handleAutoFillGuardian = () => {
    if (lookupResults && lookupResults.guardian) {
      const g = lookupResults.guardian;
      setSharedData((prev) => ({
        ...prev,
        father_name: g.father_name || prev.father_name,
        father_phone: g.father_phone || prev.father_phone,
        father_occupation: g.father_occupation || prev.father_occupation,
        mother_name: g.mother_name || prev.mother_name,
        mother_phone: g.mother_phone || prev.mother_phone,
        mother_occupation: g.mother_occupation || prev.mother_occupation,
        primary_guardian_name: g.primary_guardian_name || prev.primary_guardian_name,
        guardian_nid: g.guardian_nid || prev.guardian_nid,
        emergency_contact_phone: g.emergency_contact_phone || prev.emergency_contact_phone
      }));
      showToast("Guardian information auto-filled successfully.", "success");
    }
  };

  const handleChange = (field, val) => {
    setSharedData((prev) => {
      const updated = { ...prev, [field]: val };
      // Capitalize English name
      if (field === "name" && val) {
        updated.name = val.replace(/\b\w/g, (c) => c.toUpperCase());
      }
      return updated;
    });
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
      if (sharedData.birth_certificate_no && !validateBRN(sharedData.birth_certificate_no)) {
        showToast("Birth Certificate must be exactly 17 digits", "warning");
        return;
      }
      if (sharedData.nid_no && !validateNID(sharedData.nid_no)) {
        showToast("National ID (NID) must be 10, 13 or 17 digits", "warning");
        return;
      }
      if (!sharedData.birth_certificate_no?.trim() && !sharedData.nid_no?.trim()) {
        showToast("Either Birth Registration Number or National ID is required", "warning");
        return;
      }
    }
    if (currentStep === 2) {
      if (!sharedData.education_status) {
        showToast("Class selection is required", "warning");
        return;
      }
      if (!sharedData.class_or_group_id) {
        showToast("Group / Section is required", "warning");
        return;
      }
    }
    if (currentStep === 3) {
      if (!sharedData.guardian_phone?.trim() || !validateBDPhone(sharedData.guardian_phone)) {
        showToast("Valid 11-digit Bangladesh Guardian Phone is required", "warning");
        return;
      }
      if (!sharedData.guardian_relation?.trim()) {
        showToast("Relation to Student is required", "warning");
        return;
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, 5));
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleDrag = (e, field) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setActiveDragField(field);
    } else if (e.type === "dragleave") {
      setActiveDragField(null);
    }
  };

  const handleDrop = (e, field) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveDragField(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (field === "birth_certificate") setBirthCertFile(file);
      if (field === "tc_marksheet") setPrevTcFile(file);
      if (field === "guardian_nid") setGuardianNidFile(file);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);

    const presentAddressData = {
      address_type: "PRESENT",
      street_address: sharedData.street_address || "",
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
      previous_school_address: sharedData.previous_school_address || "",
      tc_number: sharedData.tc_number || "",
    };

    const guardianData = {
      father_name: sharedData.father_name || "",
      father_phone: sharedData.father_phone || "",
      father_occupation: sharedData.father_occupation || "",
      mother_name: sharedData.mother_name || "",
      mother_phone: sharedData.mother_phone || "",
      mother_occupation: sharedData.mother_occupation || "",
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
      nid_no: sharedData.nid_no || "",
      admission_mode: "FULL",
      status: "ACTIVE",
      group_name: sharedData.group_name || "General Group",
      education_status: sharedData.education_status || "",
      present_address_data: presentAddressData,
      permanent_address_data: permanentAddressData,
      academic_data: academicData,
      guardian_data: guardianData,
    };

    try {
      // 1. Submit admission base details
      const res = await apiClient.post("/students/admission/", payload);
      const studentId = res.data.id;

      // 2. Upload student profile picture
      if (photoFile && studentId) {
        const photoFormData = new FormData();
        photoFormData.append("photo", photoFile);
        await apiClient.patch(`/students/${studentId}/full-profile/`, photoFormData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      // 3. Upload Birth Certificate
      if (birthCertFile && studentId) {
        const bcFormData = new FormData();
        bcFormData.append("doc_type", "BIRTH_CERTIFICATE");
        bcFormData.append("file", birthCertFile);
        bcFormData.append("title", `Birth Certificate of ${sharedData.name}`);
        await apiClient.post(`/students/${studentId}/upload-document/`, bcFormData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      // 4. Upload TC/Marksheet
      if (prevTcFile && studentId) {
        const tcFormData = new FormData();
        tcFormData.append("doc_type", "TRANSFER_CERTIFICATE");
        tcFormData.append("file", prevTcFile);
        tcFormData.append("title", `Transfer Certificate of ${sharedData.name}`);
        await apiClient.post(`/students/${studentId}/upload-document/`, tcFormData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      // 5. Upload Guardian NID Copy
      if (guardianNidFile && studentId) {
        const gnidFormData = new FormData();
        gnidFormData.append("doc_type", "GUARDIAN_NID");
        gnidFormData.append("file", guardianNidFile);
        gnidFormData.append("title", `Guardian NID copy of ${sharedData.name}`);
        await apiClient.post(`/students/${studentId}/upload-document/`, gnidFormData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      showToast("Student profile successfully registered", "success");
      if (onSuccess) {
        const profileRes = await apiClient.get(`/students/${studentId}/full-profile/`);
        onSuccess(profileRes.data);
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to complete full admission registration. Check form fields.", "error");
    } finally {
      setLoading(false);
    }
  };

  // BD Geo Cascading Lists Helper
  const getDistrictsForDivision = (div) => {
    if (!div || !BD_GEO_DATA[div]) return [];
    return Object.keys(BD_GEO_DATA[div]);
  };

  const getUpazilasForDistrict = (div, dist) => {
    if (!div || !dist || !BD_GEO_DATA[div] || !BD_GEO_DATA[div][dist]) return [];
    return BD_GEO_DATA[div][dist];
  };

  return (
    <div className="space-y-6 w-full min-h-[480px] flex flex-col justify-between select-none">
      <div>
        {/* Stepper Headers */}
        <div className="flex justify-between items-center text-xs font-semibold theme-text-secondary border-b theme-border pb-3 mb-6">
          <span className={currentStep === 1 ? "theme-accent font-bold" : ""}>1. Personal Info</span>
          <span className={currentStep === 2 ? "theme-accent font-bold" : ""}>2. Academic</span>
          <span className={currentStep === 3 ? "theme-accent font-bold" : ""}>3. Guardian</span>
          <span className={currentStep === 4 ? "theme-accent font-bold" : ""}>4. Residential</span>
          <span className={currentStep === 5 ? "theme-accent font-bold" : ""}>5. Vault &amp; Review</span>
        </div>

        {/* STEP 1: PERSONAL INFORMATION */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-fade-in text-left">
            <div className="flex flex-col items-center space-y-3">
              <div className="relative w-24 h-24 rounded-full border theme-border overflow-hidden bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center shadow-md">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] theme-text-secondary text-center px-2">No Photo</span>
                )}
              </div>
              <label className="cursor-pointer px-3.5 py-2 text-xs font-semibold theme-bg-sub theme-text-primary rounded-xl border theme-border hover:theme-bg-sub-hover transition-colors shadow-sm">
                Select Photo
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </label>
              <span className="text-[10px] theme-text-secondary font-medium">JPEG/PNG, max size 2MB</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1">English Full Name *</label>
                <input
                  type="text"
                  value={sharedData.name || ""}
                  onChange={(e) => handleChange("name", e.target.value)}
                  required
                  placeholder="e.g. Abdullah bin Arif"
                  className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1">Bangla Full Name</label>
                <input
                  type="text"
                  value={sharedData.bangla_name || ""}
                  onChange={(e) => handleChange("bangla_name", e.target.value)}
                  placeholder="e.g. Local / Native script name"
                  className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1.5">Gender</label>
                <CustomSelect
                  options={[
                    { label: "Male", value: "MALE" },
                    { label: "Female", value: "FEMALE" },
                    { label: "Other", value: "OTHER" },
                  ]}
                  value={sharedData.gender || "MALE"}
                  onChange={(val) => handleChange("gender", val)}
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold theme-text-secondary">Date of Birth</label>
                  {sharedData.dob && (
                    <span className="text-[10px] font-bold bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded border border-sky-500/20">
                      Age: {calculateAge(sharedData.dob)}
                    </span>
                  )}
                </div>
                <ReusableCalendar
                  selectedDate={sharedData.dob || ""}
                  onSelectDate={(val) => handleChange("dob", val)}
                  placeholder="Select Date of Birth"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1.5">Blood Group</label>
                <CustomSelect
                  options={[
                    { label: "Unknown", value: "" },
                    { label: "A+", value: "A+" },
                    { label: "A-", value: "A-" },
                    { label: "B+", value: "B+" },
                    { label: "B-", value: "B-" },
                    { label: "O+", value: "O+" },
                    { label: "O-", value: "O-" },
                    { label: "AB+", value: "AB+" },
                    { label: "AB-", value: "AB-" },
                  ]}
                  value={sharedData.blood_group || ""}
                  onChange={(val) => handleChange("blood_group", val)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1">Birth Registration No (BRN)</label>
                <input
                  type="text"
                  value={sharedData.birth_certificate_no || ""}
                  onChange={(e) => handleChange("birth_certificate_no", e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="17 Digit Certificate Number"
                  className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
                />
                {sharedData.birth_certificate_no && !validateBRN(sharedData.birth_certificate_no) && (
                  <span className="text-[10px] text-rose-400 block mt-1 font-bold">Must be exactly 17 digits.</span>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1">National ID (NID)</label>
                <input
                  type="text"
                  value={sharedData.nid_no || ""}
                  onChange={(e) => handleChange("nid_no", e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="10, 13, or 17 Digit NID Card Number"
                  className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
                />
                {sharedData.nid_no && !validateNID(sharedData.nid_no) && (
                  <span className="text-[10px] text-rose-400 block mt-1 font-bold">Must be 10, 13, or 17 digits.</span>
                )}
              </div>
            </div>
            <p className="text-[10px] theme-text-secondary italic pt-2">
              * Note: Valid BRN or NID is strictly required to proceed.
            </p>
          </div>
        )}

        {/* STEP 2: ACADEMIC ASSIGNMENT */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-fade-in text-left">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <label className="block text-xs font-semibold theme-text-secondary mb-1.5">Class / Track *</label>
                <CustomSelect
                  options={CLASS_CHOICES}
                  value={sharedData.education_status || ""}
                  onChange={(val) => handleChange("education_status", val)}
                  placeholder="Select Class..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1.5">Group / Section *</label>
                <CustomSelect
                  options={groups.map((g) => ({ label: g.name, value: g.id }))}
                  value={sharedData.class_or_group_id || ""}
                  onChange={(grpId) => {
                    const grp = groups.find((g) => String(g.id) === String(grpId));
                    setSharedData((prev) => ({
                      ...prev,
                      class_or_group_id: grpId,
                      group_name: grp ? grp.name : "General Group",
                    }));
                  }}
                  placeholder="Select Group..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1">Class Roll Number</label>
                <input
                  type="text"
                  value={sharedData.roll_number || ""}
                  onChange={(e) => handleChange("roll_number", e.target.value)}
                  placeholder="Roll Number"
                  className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1.5">Admission Date</label>
                <ReusableCalendar
                  selectedDate={sharedData.admission_date || new Date().toISOString().split("T")[0]}
                  onSelectDate={(val) => handleChange("admission_date", val)}
                  placeholder="Select Admission Date"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t theme-border pt-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold theme-text-secondary mb-1">Previous School Name</label>
                <input
                  type="text"
                  value={sharedData.previous_school_name || ""}
                  onChange={(e) => handleChange("previous_school_name", e.target.value)}
                  placeholder="Previous School Name"
                  className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1">TC Number</label>
                <input
                  type="text"
                  value={sharedData.tc_number || ""}
                  onChange={(e) => handleChange("tc_number", e.target.value)}
                  placeholder="Transfer Certificate No"
                  className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: GUARDIAN INFORMATION & AUTO-FILL */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-fade-in text-left">
            
            {/* Guardian Sibling Lookup Notification Banner */}
            {lookupLoading && (
              <div className="p-3 bg-zinc-800 border theme-border rounded-xl text-xs text-sky-400 animate-pulse font-semibold">
                Searching parent profile database...
              </div>
            )}
            {lookupResults && lookupResults.guardian && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <span className="font-bold">Database Match Found:</span>{" "}
                  Registered siblings:{" "}
                  <span className="underline font-semibold">
                    {lookupResults.siblings.map((sib) => sib.name).join(", ")}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAutoFillGuardian}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold shadow-sm transition-all cursor-pointer"
                >
                  Auto-fill Parent Info
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1">Father Name</label>
                <input
                  type="text"
                  value={sharedData.father_name || ""}
                  onChange={(e) => handleChange("father_name", e.target.value)}
                  placeholder="Father's Full Name"
                  className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1">Father Phone</label>
                <input
                  type="text"
                  value={sharedData.father_phone || ""}
                  onChange={(e) => handleChange("father_phone", e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="e.g. 01712345678"
                  className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1">Father Occupation</label>
                <input
                  type="text"
                  value={sharedData.father_occupation || ""}
                  onChange={(e) => handleChange("father_occupation", e.target.value)}
                  placeholder="Father's Occupation"
                  className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1">Mother Name</label>
                <input
                  type="text"
                  value={sharedData.mother_name || ""}
                  onChange={(e) => handleChange("mother_name", e.target.value)}
                  placeholder="Mother's Full Name"
                  className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1">Mother Phone</label>
                <input
                  type="text"
                  value={sharedData.mother_phone || ""}
                  onChange={(e) => handleChange("mother_phone", e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="e.g. 01712345678"
                  className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1">Mother Occupation</label>
                <input
                  type="text"
                  value={sharedData.mother_occupation || ""}
                  onChange={(e) => handleChange("mother_occupation", e.target.value)}
                  placeholder="Mother's Occupation"
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
                  onChange={(e) => handleChange("guardian_phone", e.target.value.replace(/[^\d]/g, ""))}
                  required
                  placeholder="Official SMS alert mobile number"
                  className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
                />
                {sharedData.guardian_phone && !validateBDPhone(sharedData.guardian_phone) && (
                  <span className="text-[10px] text-rose-400 block mt-1 font-bold">Must be 11 digit mobile starting with 01.</span>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1.5">Select Relation</label>
                <CustomSelect
                  options={["Father", "Mother", "Brother", "Sister", "Uncle", "Aunt", "Other"]}
                  value={["Father", "Mother", "Brother", "Sister", "Uncle", "Aunt"].includes(sharedData.guardian_relation) ? sharedData.guardian_relation : "Other"}
                  onChange={(val) => {
                    if (val !== "Other") {
                      handleChange("guardian_relation", val);
                    }
                  }}
                  placeholder="Select Relation..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1">Specify Relation (Editable) *</label>
                <input
                  type="text"
                  value={sharedData.guardian_relation || ""}
                  onChange={(e) => handleChange("guardian_relation", e.target.value)}
                  placeholder="e.g. Uncle"
                  required
                  className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1">Guardian NID</label>
                <input
                  type="text"
                  value={sharedData.guardian_nid || ""}
                  onChange={(e) => handleChange("guardian_nid", e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="National ID Number"
                  className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
                />
                {sharedData.guardian_nid && !validateNID(sharedData.guardian_nid) && (
                  <span className="text-[10px] text-rose-400 block mt-1 font-bold">Must be 10, 13, or 17 digits.</span>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1">Emergency Contact Phone</label>
                <input
                  type="text"
                  value={sharedData.emergency_contact_phone || ""}
                  onChange={(e) => handleChange("emergency_contact_phone", e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="Emergency Alternate Phone"
                  className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: RESIDENTIAL ADDRESSES (CASCADING DROPDOWNS) */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider theme-text-secondary border-b theme-border pb-1">Present Address</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold theme-text-secondary mb-1.5">Division</label>
                  <CustomSelect
                    options={Object.keys(BD_GEO_DATA).map((d) => ({ label: d, value: d }))}
                    value={sharedData.division || ""}
                    onChange={(val) => {
                      setSharedData((prev) => ({
                        ...prev,
                        division: val,
                        district: "",
                        thana_or_upazila: "",
                      }));
                    }}
                    placeholder="Select Division..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold theme-text-secondary mb-1.5">District</label>
                  <CustomSelect
                    options={getDistrictsForDivision(sharedData.division).map((d) => ({ label: d, value: d }))}
                    value={sharedData.district || ""}
                    onChange={(val) => {
                      setSharedData((prev) => ({
                        ...prev,
                        district: val,
                        thana_or_upazila: "",
                      }));
                    }}
                    placeholder="Select District..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold theme-text-secondary mb-1.5">Thana / Upazila</label>
                  <CustomSelect
                    options={getUpazilasForDistrict(sharedData.division, sharedData.district).map((u) => ({ label: u, value: u }))}
                    value={sharedData.thana_or_upazila || ""}
                    onChange={(val) => handleChange("thana_or_upazila", val)}
                    placeholder="Select Upazila..."
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
                    placeholder="Street, Road, House, and Village detail"
                    className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold theme-text-secondary mb-1">Postal Code</label>
                  <input
                    type="text"
                    value={sharedData.post_code || ""}
                    onChange={(e) => handleChange("post_code", e.target.value)}
                    placeholder="Post Code"
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
                <h4 className="text-xs font-bold uppercase tracking-wider theme-text-secondary border-b theme-border pb-1">Permanent Address</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold theme-text-secondary mb-1.5">Division</label>
                    <CustomSelect
                      options={Object.keys(BD_GEO_DATA).map((d) => ({ label: d, value: d }))}
                      value={sharedData.perm_division || ""}
                      onChange={(val) => {
                        setSharedData((prev) => ({
                          ...prev,
                          perm_division: val,
                          perm_district: "",
                          perm_thana: "",
                        }));
                      }}
                      placeholder="Select Division..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold theme-text-secondary mb-1.5">District</label>
                    <CustomSelect
                      options={getDistrictsForDivision(sharedData.perm_division).map((d) => ({ label: d, value: d }))}
                      value={sharedData.perm_district || ""}
                      onChange={(val) => {
                        setSharedData((prev) => ({
                          ...prev,
                          perm_district: val,
                          perm_thana: "",
                        }));
                      }}
                      placeholder="Select District..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold theme-text-secondary mb-1.5">Thana / Upazila</label>
                    <CustomSelect
                      options={getUpazilasForDistrict(sharedData.perm_division, sharedData.perm_district).map((u) => ({ label: u, value: u }))}
                      value={sharedData.perm_thana || ""}
                      onChange={(val) => handleChange("perm_thana", val)}
                      placeholder="Select Upazila..."
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
                      placeholder="Street, Road, House, and Village detail"
                      className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold theme-text-secondary mb-1">Postal Code</label>
                    <input
                      type="text"
                      value={sharedData.perm_post_code || ""}
                      onChange={(e) => handleChange("perm_post_code", e.target.value)}
                      placeholder="Post Code"
                      className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 5: DOCUMENT VAULT & REVIEW SUMMARY */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-fade-in text-left">
            
            {/* Drag & Drop Document Vault */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider theme-text-secondary border-b theme-border pb-1">Document Repository Vault</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* File 1: Birth Cert */}
                <div
                  onDragEnter={(e) => handleDrag(e, "birth_cert")}
                  onDragOver={(e) => handleDrag(e, "birth_cert")}
                  onDragLeave={(e) => handleDrag(e, "birth_cert")}
                  onDrop={(e) => handleDrop(e, "birth_cert")}
                  className={`p-4 rounded-2xl border-2 border-dashed text-center flex flex-col justify-center items-center transition-all ${
                    activeDragField === "birth_cert" ? "border-sky-500 bg-sky-500/10" : "border-zinc-800 hover:border-zinc-700 bg-zinc-950/20"
                  }`}
                >
                  <span className="text-xl mb-1">Document</span>
                  <span className="text-xs font-bold">Birth Certificate</span>
                  <span className="text-[10px] theme-text-secondary mt-1">
                    {birthCertFile ? birthCertFile.name : "Drag & Drop or Click"}
                  </span>
                  <input
                    type="file"
                    id="bc-input"
                    className="hidden"
                    onChange={(e) => setBirthCertFile(e.target.files[0])}
                  />
                  <label htmlFor="bc-input" className="mt-3 px-3 py-1.5 bg-zinc-800 text-zinc-300 text-[10px] font-bold rounded-lg border theme-border hover:theme-bg-sub cursor-pointer">
                    Browse File
                  </label>
                </div>

                {/* File 2: Previous TC */}
                <div
                  onDragEnter={(e) => handleDrag(e, "tc_marksheet")}
                  onDragOver={(e) => handleDrag(e, "tc_marksheet")}
                  onDragLeave={(e) => handleDrag(e, "tc_marksheet")}
                  onDrop={(e) => handleDrop(e, "tc_marksheet")}
                  className={`p-4 rounded-2xl border-2 border-dashed text-center flex flex-col justify-center items-center transition-all ${
                    activeDragField === "tc_marksheet" ? "border-sky-500 bg-sky-500/10" : "border-zinc-800 hover:border-zinc-700 bg-zinc-950/20"
                  }`}
                >
                  <span className="text-xl mb-1">Document</span>
                  <span className="text-xs font-bold">Transfer Slip / TC</span>
                  <span className="text-[10px] theme-text-secondary mt-1">
                    {prevTcFile ? prevTcFile.name : "Drag & Drop or Click"}
                  </span>
                  <input
                    type="file"
                    id="tc-input"
                    className="hidden"
                    onChange={(e) => setPrevTcFile(e.target.files[0])}
                  />
                  <label htmlFor="tc-input" className="mt-3 px-3 py-1.5 bg-zinc-800 text-zinc-300 text-[10px] font-bold rounded-lg border theme-border hover:theme-bg-sub cursor-pointer">
                    Browse File
                  </label>
                </div>

                {/* File 3: Guardian NID */}
                <div
                  onDragEnter={(e) => handleDrag(e, "guardian_nid")}
                  onDragOver={(e) => handleDrag(e, "guardian_nid")}
                  onDragLeave={(e) => handleDrag(e, "guardian_nid")}
                  onDrop={(e) => handleDrop(e, "guardian_nid")}
                  className={`p-4 rounded-2xl border-2 border-dashed text-center flex flex-col justify-center items-center transition-all ${
                    activeDragField === "guardian_nid" ? "border-sky-500 bg-sky-500/10" : "border-zinc-800 hover:border-zinc-700 bg-zinc-950/20"
                  }`}
                >
                  <span className="text-xl mb-1">Document</span>
                  <span className="text-xs font-bold">Guardian NID</span>
                  <span className="text-[10px] theme-text-secondary mt-1">
                    {guardianNidFile ? guardianNidFile.name : "Drag & Drop or Click"}
                  </span>
                  <input
                    type="file"
                    id="gnid-input"
                    className="hidden"
                    onChange={(e) => setGuardianNidFile(e.target.files[0])}
                  />
                  <label htmlFor="gnid-input" className="mt-3 px-3 py-1.5 bg-zinc-800 text-zinc-300 text-[10px] font-bold rounded-lg border theme-border hover:theme-bg-sub cursor-pointer">
                    Browse File
                  </label>
                </div>

              </div>
            </div>

            {/* Information Summary Review (Fixed Theme & Emojis) */}
            <div className="space-y-4 border-t theme-border pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider theme-text-secondary border-b theme-border pb-1">Review Registration Details</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
                
                {/* Column 1: Personal & Academic */}
                <div className="theme-bg-surface border theme-border p-4 rounded-2xl space-y-2">
                  <h5 className="font-bold text-sky-400 uppercase tracking-wider text-[10px] mb-2">Personal &amp; Academic</h5>
                  <div className="flex justify-between py-1 border-b theme-border">
                    <span className="theme-text-secondary">Student Name</span>
                    <span className="font-bold theme-text-primary">{sharedData.name || "--"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b theme-border">
                    <span className="theme-text-secondary">Bangla Name</span>
                    <span className="font-bold theme-text-primary">{sharedData.bangla_name || "--"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b theme-border">
                    <span className="theme-text-secondary">Gender &amp; DOB</span>
                    <span className="theme-text-primary">{sharedData.gender || "MALE"} / {sharedData.dob || "--"}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="theme-text-secondary">Class &amp; Group</span>
                    <span className="theme-text-primary">{sharedData.education_status || "--"} / {sharedData.group_name || "--"}</span>
                  </div>
                </div>

                {/* Column 2: Guardian & Address */}
                <div className="theme-bg-surface border theme-border p-4 rounded-2xl space-y-2">
                  <h5 className="font-bold text-sky-400 uppercase tracking-wider text-[10px] mb-2">Guardian &amp; Address</h5>
                  <div className="flex justify-between py-1 border-b theme-border">
                    <span className="theme-text-secondary">Guardian Phone</span>
                    <span className="font-bold theme-text-primary">{sharedData.guardian_phone || "--"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b theme-border">
                    <span className="theme-text-secondary">Relation</span>
                    <span className="theme-text-primary">{sharedData.guardian_relation || "--"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b theme-border">
                    <span className="theme-text-secondary">Present Address</span>
                    <span className="theme-text-primary truncate max-w-[200px]" title={sharedData.street_address}>
                      {sharedData.street_address 
                        ? `${sharedData.street_address}, ${sharedData.thana_or_upazila || ""}, ${sharedData.district || ""}`
                        : "--"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="theme-text-secondary">Permanent Address</span>
                    <span className="theme-text-primary truncate max-w-[200px]" title={sharedData.perm_street}>
                      {sameAddress 
                        ? "Same as Present" 
                        : (sharedData.perm_street ? `${sharedData.perm_street}, ${sharedData.perm_thana || ""}, ${sharedData.perm_district || ""}` : "--")}
                    </span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

      </div>

      {/* Control Buttons */}
      <div className="flex justify-between items-center pt-4 border-t theme-border select-none mt-6">
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
            className="px-6 py-2.5 text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-90 rounded-xl transition cursor-pointer disabled:opacity-50 shadow-md"
          >
            {loading ? "Registering Student..." : "Enroll Student"}
          </button>
        )}
      </div>
    </div>
  );
}
