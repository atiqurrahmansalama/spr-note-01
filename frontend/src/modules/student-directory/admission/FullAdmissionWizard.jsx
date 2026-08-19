import React, { useState, useEffect, useRef } from "react";
import { fetchWithAuth } from "../../../utils/authService";
import { useToast } from "../../../context/ToastContext";
import CustomSelect from "../../../components/ui/CustomSelect";
import ReusableCalendar from "../../../components/common/ReusableCalendar";
import { BD_GEO_DATA } from "../../../utils/bdGeoData";
import { calculateAge, validateBDPhone, validateBRN, validateNID } from "../../../utils/admissionValidators";
import { CameraIcon, UploadIcon, ChevronIcon } from "../../../components/ui/Icons";
import AddressLocationPicker from "../../../components/common/AddressLocationPicker";

const RELATION_OPTIONS = [
  "Father",
  "Mother",
  "Brother",
  "Sister",
  "Uncle",
  "Aunt",
  "Grandfather",
  "Grandmother",
  "Legal Guardian",
  "Other",
];

function RelationCombobox({ value, onChange, placeholder = "Select or type relation..." }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          required
          className="w-full px-4 py-3 pr-10 min-h-[46px] rounded-2xl theme-bg-sub border theme-border text-xs sm:text-sm font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/20 transition-all"
        />
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="absolute right-2 p-2 theme-text-secondary hover:theme-text-primary cursor-pointer transition-colors"
          tabIndex={-1}
        >
          <ChevronIcon isOpen={isOpen} className="w-4 h-4" />
        </button>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl theme-bg-surface border theme-border shadow-2xl p-1.5 max-h-56 overflow-y-auto animate-fade-in custom-scrollbar">
          {RELATION_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                value === opt
                  ? "theme-bg-accent theme-accent-text font-black"
                  : "theme-text-primary hover:theme-bg-elevated"
              }`}
            >
              <span>{opt}</span>
              {value === opt && <span className="font-bold">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FullAdmissionWizard({ onCancel, onSuccess, sharedData, setSharedData }) {
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);

  // Photo Input Ref
  const photoInputRef = useRef(null);

  // File objects for document vault
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  
  const [birthCertFile, setBirthCertFile] = useState(null);
  const [guardianNidFile, setGuardianNidFile] = useState(null);

  // Drag and drop states
  const [activeDragField, setActiveDragField] = useState(null);

  // Address checkbox
  const [sameAddress, setSameAddress] = useState(true);

  // Guardian Sibling Lookup State
  const [lookupResults, setLookupResults] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  // Fetch institution dynamic classes
  useEffect(() => {
    fetchWithAuth("/api/v1/classes/")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.results || []);
        setClasses(list.map((c) => ({ label: c.name, value: c.id, name: c.name })));
      })
      .catch((err) => {
        console.error("Failed to load classes", err);
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
      if (field === "name" && val) {
        updated.name = val.replace(/\b\w/g, (c) => c.toUpperCase());
      }
      return updated;
    });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        showToast("Photo must be less than 3MB", "warning");
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      showToast("Photo selected successfully", "success");
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
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
        perm_latitude: prev.latitude,
        perm_longitude: prev.longitude,
        perm_map_place_id: prev.map_place_id,
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
    }
    if (currentStep === 2) {
      if (!sharedData.student_class && !sharedData.education_status) {
        showToast("Please select an Institutional Class", "warning");
        return;
      }
    }
    if (currentStep === 3) {
      if (!sharedData.guardian_phone?.trim()) {
        showToast("Primary Guardian Phone is required", "warning");
        return;
      }
      if (!validateBDPhone(sharedData.guardian_phone)) {
        showToast("Guardian Phone must be a valid 11-digit mobile", "warning");
        return;
      }
      if (!sharedData.guardian_relation?.trim()) {
        showToast("Relation to Student is required", "warning");
        return;
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, 4));
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
      if (field === "photo") {
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
      }
      if (field === "birth_certificate") setBirthCertFile(file);
      if (field === "guardian_nid") setGuardianNidFile(file);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);

    const presentAddressData = {
      address_type: "PRESENT",
      street_address: sharedData.street_address || "",
      post_code: sharedData.post_code || "",
      postal_code: sharedData.post_code || "",
      thana_or_upazila: sharedData.thana_or_upazila || "",
      district: sharedData.district || "",
      division: sharedData.division || "",
      latitude: sharedData.latitude != null ? sharedData.latitude : null,
      longitude: sharedData.longitude != null ? sharedData.longitude : null,
      map_place_id: sharedData.map_place_id || "",
    };

    const permanentAddressData = sameAddress
      ? { ...presentAddressData, address_type: "PERMANENT" }
      : {
          address_type: "PERMANENT",
          street_address: sharedData.perm_street || "",
          post_code: sharedData.perm_post_code || "",
          postal_code: sharedData.perm_post_code || "",
          thana_or_upazila: sharedData.perm_thana || "",
          district: sharedData.perm_district || "",
          division: sharedData.perm_division || "",
          latitude: sharedData.perm_latitude != null ? sharedData.perm_latitude : null,
          longitude: sharedData.perm_longitude != null ? sharedData.perm_longitude : null,
          map_place_id: sharedData.perm_map_place_id || "",
        };

    const parsedRoll = sharedData.roll_number && parseInt(sharedData.roll_number, 10) > 0 
      ? parseInt(sharedData.roll_number, 10) 
      : null;

    const academicData = {
      session_year: sharedData.session_year || "2026-2027",
      roll_number: parsedRoll,
      admission_date: sharedData.admission_date || new Date().toISOString().split("T")[0],
      previous_school_name: sharedData.previous_school_name || "",
      previous_school_address: "",
    };

    const guardianData = {
      father_name: sharedData.father_name || "",
      father_phone: sharedData.father_phone || "",
      father_occupation: sharedData.father_occupation || "",
      mother_name: sharedData.mother_name || "",
      mother_phone: sharedData.mother_phone || "",
      mother_occupation: sharedData.mother_occupation || "",
      primary_guardian_name: sharedData.primary_guardian_name || sharedData.father_name || "Guardian",
      primary_guardian_phone: sharedData.guardian_phone || "",
      guardian_relation: sharedData.guardian_relation || "Father",
      guardian_nid: sharedData.guardian_nid || "",
      emergency_contact_phone: sharedData.emergency_contact_phone || "",
    };

    const selectedClassObj = classes.find((c) => c.value === sharedData.student_class);

    const payload = {
      name: sharedData.name,
      bangla_name: sharedData.bangla_name || "",
      student_id_card_number: sharedData.student_id_card_number || null,
      gender: sharedData.gender || "MALE",
      dob: sharedData.dob || null,
      blood_group: sharedData.blood_group || null,
      birth_certificate_no: sharedData.birth_certificate_no || "",
      nid_no: sharedData.nid_no || "",
      latitude: sharedData.latitude != null ? sharedData.latitude : null,
      longitude: sharedData.longitude != null ? sharedData.longitude : null,
      map_place_id: sharedData.map_place_id || "",
      admission_mode: "FULL",
      status: "ACTIVE",
      roll_number: parsedRoll,
      student_class: sharedData.student_class || null,
      education_status: selectedClassObj ? selectedClassObj.name : (sharedData.education_status || ""),
      present_address_data: presentAddressData,
      permanent_address_data: permanentAddressData,
      academic_data: academicData,
      guardian_data: guardianData,
    };

    try {
      // 1. Submit admission base record
      const res = await fetchWithAuth("/api/v1/students/admission/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("Admission submission error:", errorData);
        let errorMsg = "Failed to enroll student. Please review inputs.";
        if (errorData && typeof errorData === "object") {
          if (typeof errorData.detail === "string") {
            errorMsg = errorData.detail;
          } else if (typeof errorData.message === "string") {
            errorMsg = errorData.message;
          } else if (Array.isArray(errorData.non_field_errors) && errorData.non_field_errors.length > 0) {
            errorMsg = errorData.non_field_errors[0];
          } else {
            for (const [k, v] of Object.entries(errorData)) {
              if (typeof v === "string") {
                errorMsg = `${k}: ${v}`;
                break;
              } else if (Array.isArray(v) && v.length > 0) {
                errorMsg = typeof v[0] === "string" ? `${k}: ${v[0]}` : JSON.stringify(v[0]);
                break;
              } else if (typeof v === "object" && v !== null) {
                const subVal = Object.values(v)[0];
                if (Array.isArray(subVal) && subVal.length > 0) {
                  errorMsg = `${k}: ${subVal[0]}`;
                  break;
                }
              }
            }
          }
        }
        showToast(errorMsg, "error");
        setLoading(false);
        return;
      }

      const resData = await res.json();
      const studentId = resData.id;

      // 2. Upload student profile picture if selected
      if (photoFile && studentId) {
        const photoFormData = new FormData();
        photoFormData.append("photo", photoFile);
        await fetchWithAuth(`/api/v1/students/${studentId}/full-profile/`, {
          method: "PATCH",
          body: photoFormData,
        }).catch((e) => console.warn("Photo upload warning:", e));
      }

      // 3. Upload Birth Certificate if attached
      if (birthCertFile && studentId) {
        const bcFormData = new FormData();
        bcFormData.append("doc_type", "BIRTH_CERTIFICATE");
        bcFormData.append("file", birthCertFile);
        bcFormData.append("title", `Birth Certificate of ${sharedData.name}`);
        await fetchWithAuth(`/api/v1/students/${studentId}/upload-document/`, {
          method: "POST",
          body: bcFormData,
        }).catch((e) => console.warn("Birth cert upload warning:", e));
      }

      // 4. Upload Guardian NID Copy if attached
      if (guardianNidFile && studentId) {
        const gnidFormData = new FormData();
        gnidFormData.append("doc_type", "GUARDIAN_NID");
        gnidFormData.append("file", guardianNidFile);
        gnidFormData.append("title", `Guardian NID copy of ${sharedData.name}`);
        await fetchWithAuth(`/api/v1/students/${studentId}/upload-document/`, {
          method: "POST",
          body: gnidFormData,
        }).catch((e) => console.warn("Guardian NID upload warning:", e));
      }

      showToast("Student successfully enrolled & registered!", "success");
      
      if (onSuccess) {
        const profileRes = await fetchWithAuth(`/api/v1/students/${studentId}/full-profile/`);
        const fullData = profileRes.ok ? await profileRes.json() : resData;
        onSuccess(fullData);
      }
    } catch (err) {
      console.error("Enrollment error:", err);
      showToast("Network connection failed during admission. Please retry.", "error");
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
    <div className="w-full flex-1 flex flex-col justify-between select-none py-1 text-left min-h-0 h-full">
      <div className="flex-1 flex flex-col min-h-0">
        {/* Streamlined Stepper Header */}
        <div className="grid grid-cols-4 gap-2 text-xs font-bold theme-text-secondary border-b theme-border pb-3 mb-5 shrink-0">
          <div className={`flex items-center gap-2 ${currentStep === 1 ? "theme-accent" : ""}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${currentStep === 1 ? "theme-bg-accent theme-accent-text" : "theme-bg-elevated theme-text-secondary"}`}>1</span>
            <span className="truncate">Profile &amp; Photo</span>
          </div>
          <div className={`flex items-center gap-2 ${currentStep === 2 ? "theme-accent" : ""}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${currentStep === 2 ? "theme-bg-accent theme-accent-text" : "theme-bg-elevated theme-text-secondary"}`}>2</span>
            <span className="truncate">Academic</span>
          </div>
          <div className={`flex items-center gap-2 ${currentStep === 3 ? "theme-accent" : ""}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${currentStep === 3 ? "theme-bg-accent theme-accent-text" : "theme-bg-elevated theme-text-secondary"}`}>3</span>
            <span className="truncate">Guardian &amp; Address</span>
          </div>
          <div className={`flex items-center gap-2 ${currentStep === 4 ? "theme-accent" : ""}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${currentStep === 4 ? "theme-bg-accent theme-accent-text" : "theme-bg-elevated theme-text-secondary"}`}>4</span>
            <span className="truncate">Vault &amp; Review</span>
          </div>
        </div>

        {/* Scrollable Step Body */}
        <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 custom-scrollbar min-h-0">
          {/* STEP 1: PERSONAL INFORMATION & PHOTO */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-fade-in">
              {/* Top Row: Name Inputs (Left) + Tall Square Photo Bar (Right) */}
              <div className="flex flex-col-reverse sm:flex-row items-start gap-5">
                {/* Left Side: English & Bangla Full Names */}
                <div className="flex-1 space-y-4 w-full">
                  <div>
                    <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                      Student Full Name (English) <span className="theme-danger">*</span>
                    </label>
                    <input
                      type="text"
                      value={sharedData.name || ""}
                      onChange={(e) => handleChange("name", e.target.value)}
                      required
                      placeholder="e.g. Abdullah bin Arif"
                      className="w-full px-4 py-3 min-h-[46px] rounded-2xl theme-bg-sub border theme-border text-xs sm:text-sm font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/20 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                      Native / Regional Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={sharedData.bangla_name || ""}
                      onChange={(e) => handleChange("bangla_name", e.target.value)}
                      placeholder="e.g. Full Name in Native Script"
                      className="w-full px-4 py-3 min-h-[46px] rounded-2xl theme-bg-sub border theme-border text-xs sm:text-sm font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/20 transition-all"
                    />
                  </div>
                </div>

                {/* Right Side: Tall Square Student Photo Upload Card with responsive ref */}
                <div className="w-full sm:w-40 shrink-0 flex flex-col items-center">
                  <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2 self-start">
                    Student Photo
                  </label>
                  <div
                    onClick={() => photoInputRef.current && photoInputRef.current.click()}
                    onDragEnter={(e) => handleDrag(e, "photo")}
                    onDragOver={(e) => handleDrag(e, "photo")}
                    onDragLeave={(e) => handleDrag(e, "photo")}
                    onDrop={(e) => handleDrop(e, "photo")}
                    className="relative w-36 sm:w-40 h-44 sm:h-48 rounded-2xl border-2 border-dashed theme-border overflow-hidden theme-bg-sub hover:border-[var(--accent-main)] transition-all duration-200 flex flex-col items-center justify-center cursor-pointer shadow-xs group"
                    title="Click to choose student photo"
                  >
                    {photoPreview ? (
                      <>
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 gap-1.5 text-white text-[11px] font-bold">
                          <CameraIcon className="w-5 h-5 theme-accent" />
                          <span>Change Photo</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemovePhoto();
                          }}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full theme-bg-danger-soft theme-danger border theme-border text-xs font-bold flex items-center justify-center shadow-md hover:opacity-80 cursor-pointer z-10"
                          title="Remove Photo"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-3 text-center space-y-2">
                        <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft theme-accent border theme-border flex items-center justify-center shadow-inner">
                          <CameraIcon className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold theme-text-primary">Click to Upload</span>
                        <span className="text-[10px] theme-text-secondary">Passport / 3:4 (Max 3MB)</span>
                      </div>
                    )}
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Gender, DOB, Blood Group */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <CustomSelect
                    label="Gender"
                    options={[
                      { label: "Male", value: "MALE" },
                      { label: "Female", value: "FEMALE" },
                      { label: "Other", value: "OTHER" },
                    ]}
                    value={sharedData.gender || "MALE"}
                    onChange={(val) => handleChange("gender", val)}
                    required
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider">
                      Date of Birth
                    </label>
                    {sharedData.dob && (
                      <span className="text-[10px] font-bold theme-bg-accent-soft theme-accent px-2 py-0.5 rounded-lg border theme-border">
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
                  <CustomSelect
                    label="Blood Group"
                    options={[
                      { label: "Unknown / Not Tested", value: "" },
                      { label: "A+ (Positive)", value: "A+" },
                      { label: "A- (Negative)", value: "A-" },
                      { label: "B+ (Positive)", value: "B+" },
                      { label: "B- (Negative)", value: "B-" },
                      { label: "O+ (Positive)", value: "O+" },
                      { label: "O- (Negative)", value: "O-" },
                      { label: "AB+", value: "AB+" },
                      { label: "AB-", value: "AB-" },
                    ]}
                    value={sharedData.blood_group || ""}
                    onChange={(val) => handleChange("blood_group", val)}
                  />
                </div>
              </div>

              {/* BRN & NID (Optional) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                    Birth Registration No (BRN)
                  </label>
                  <input
                    type="text"
                    value={sharedData.birth_certificate_no || ""}
                    onChange={(e) => handleChange("birth_certificate_no", e.target.value.replace(/[^\d]/g, ""))}
                    placeholder="17 Digit Certificate Number"
                    className="w-full px-4 py-3 min-h-[46px] rounded-2xl theme-bg-sub border theme-border text-xs sm:text-sm font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/20 transition-all"
                  />
                  {sharedData.birth_certificate_no && !validateBRN(sharedData.birth_certificate_no) && (
                    <span className="text-[10px] theme-danger block mt-1.5 font-bold">Must be exactly 17 digits.</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                    National ID (NID)
                  </label>
                  <input
                    type="text"
                    value={sharedData.nid_no || ""}
                    onChange={(e) => handleChange("nid_no", e.target.value.replace(/[^\d]/g, ""))}
                    placeholder="10, 13, or 17 Digit NID Number"
                    className="w-full px-4 py-3 min-h-[46px] rounded-2xl theme-bg-sub border theme-border text-xs sm:text-sm font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/20 transition-all"
                  />
                  {sharedData.nid_no && !validateNID(sharedData.nid_no) && (
                    <span className="text-[10px] theme-danger block mt-1.5 font-bold">Must be 10, 13, or 17 digits.</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: ACADEMIC ENROLLMENT */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                    Academic Session Year
                  </label>
                  <input
                    type="text"
                    value={sharedData.session_year || "2026-2027"}
                    onChange={(e) => handleChange("session_year", e.target.value)}
                    placeholder="e.g. 2026-2027"
                    className="w-full px-4 py-3 min-h-[46px] rounded-2xl theme-bg-sub border theme-border text-xs sm:text-sm font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/20 transition-all"
                  />
                </div>

                <div>
                  <CustomSelect
                    label="Enrolling Class / Track *"
                    options={classes}
                    value={sharedData.student_class || ""}
                    onChange={(clsId) => {
                      const clsObj = classes.find((c) => c.value === clsId);
                      setSharedData((prev) => ({
                        ...prev,
                        student_class: clsId,
                        education_status: clsObj ? clsObj.name : "",
                      }));
                    }}
                    placeholder={classes.length > 0 ? "Select Institutional Class..." : "No classes found"}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Numeric Roll Number Input */}
                <div>
                  <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                    Class Roll Number (Optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={sharedData.roll_number || ""}
                    onChange={(e) => handleChange("roll_number", e.target.value)}
                    placeholder="e.g. 101 (Leave blank for auto sequential roll)"
                    className="w-full px-4 py-3 min-h-[46px] rounded-2xl theme-bg-sub border theme-border text-xs sm:text-sm font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/20 transition-all"
                  />
                  <span className="text-[10px] theme-text-secondary block mt-1.5 font-medium">
                    {sharedData.roll_number 
                      ? `Assigned Roll: #${sharedData.roll_number}` 
                      : "Automatic sequential roll number will be assigned if left blank."}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                    Admission Date
                  </label>
                  <ReusableCalendar
                    selectedDate={sharedData.admission_date || new Date().toISOString().split("T")[0]}
                    onSelectDate={(val) => handleChange("admission_date", val)}
                    placeholder="Select Admission Date"
                  />
                </div>
              </div>

              <div className="border-t theme-border pt-4">
                <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                  Previous School / Madrasa (Optional)
                </label>
                <input
                  type="text"
                  value={sharedData.previous_school_name || ""}
                  onChange={(e) => handleChange("previous_school_name", e.target.value)}
                  placeholder="e.g. Jamia Rahmania Madrasa"
                  className="w-full px-4 py-3 min-h-[46px] rounded-2xl theme-bg-sub border theme-border text-xs sm:text-sm font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/20 transition-all"
                />
              </div>
            </div>
          )}

          {/* STEP 3: GUARDIAN & DUAL RESIDENTIAL ADDRESS */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-fade-in">
              {/* Guardian Sibling Lookup Notification Banner */}
              {lookupLoading && (
                <div className="p-3.5 theme-bg-elevated border theme-border rounded-2xl text-xs theme-accent animate-pulse font-semibold">
                  Searching parent profile database...
                </div>
              )}
              {lookupResults && lookupResults.guardian && (
                <div className="p-4 theme-bg-accent-soft border theme-border rounded-2xl text-xs theme-accent flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
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
                    className="px-3.5 py-1.5 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold shadow-sm transition-all hover:opacity-90 cursor-pointer"
                  >
                    Auto-fill Parent Info
                  </button>
                </div>
              )}

              {/* Primary Guardian Phone & Hybrid Searchable Combobox */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                    Primary Guardian Phone <span className="theme-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={sharedData.guardian_phone || ""}
                    onChange={(e) => handleChange("guardian_phone", e.target.value.replace(/[^\d]/g, ""))}
                    required
                    placeholder="Official SMS mobile (e.g. 01712345678)"
                    className="w-full px-4 py-3 min-h-[46px] rounded-2xl theme-bg-sub border theme-border text-xs sm:text-sm font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/20 transition-all"
                  />
                  {sharedData.guardian_phone && !validateBDPhone(sharedData.guardian_phone) && (
                    <span className="text-[10px] theme-danger block mt-1.5 font-bold">Must be 11 digit mobile starting with 01.</span>
                  )}
                </div>

                {/* Single Smart Relation Combobox: Direct Typing + Dropdown List */}
                <div>
                  <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                    Guardian Relation <span className="theme-danger">*</span>
                  </label>
                  <RelationCombobox
                    value={sharedData.guardian_relation || ""}
                    onChange={(val) => handleChange("guardian_relation", val)}
                    placeholder="Type or pick relation (Father, Mother...)"
                  />
                </div>
              </div>

              {/* Parents Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 border-t theme-border pt-4">
                <div>
                  <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">Father Name</label>
                  <input
                    type="text"
                    value={sharedData.father_name || ""}
                    onChange={(e) => handleChange("father_name", e.target.value)}
                    placeholder="Father's Full Name"
                    className="w-full px-4 py-3 min-h-[46px] rounded-2xl theme-bg-sub border theme-border text-xs sm:text-sm font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">Father Phone</label>
                  <input
                    type="text"
                    value={sharedData.father_phone || ""}
                    onChange={(e) => handleChange("father_phone", e.target.value.replace(/[^\d]/g, ""))}
                    placeholder="Father's Phone"
                    className="w-full px-4 py-3 min-h-[46px] rounded-2xl theme-bg-sub border theme-border text-xs sm:text-sm font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">Father Occupation</label>
                  <input
                    type="text"
                    value={sharedData.father_occupation || ""}
                    onChange={(e) => handleChange("father_occupation", e.target.value)}
                    placeholder="Occupation"
                    className="w-full px-4 py-3 min-h-[46px] rounded-2xl theme-bg-sub border theme-border text-xs sm:text-sm font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/20 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">Mother Name</label>
                  <input
                    type="text"
                    value={sharedData.mother_name || ""}
                    onChange={(e) => handleChange("mother_name", e.target.value)}
                    placeholder="Mother's Full Name"
                    className="w-full px-4 py-3 min-h-[46px] rounded-2xl theme-bg-sub border theme-border text-xs sm:text-sm font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">Mother Phone</label>
                  <input
                    type="text"
                    value={sharedData.mother_phone || ""}
                    onChange={(e) => handleChange("mother_phone", e.target.value.replace(/[^\d]/g, ""))}
                    placeholder="Mother's Phone"
                    className="w-full px-4 py-3 min-h-[46px] rounded-2xl theme-bg-sub border theme-border text-xs sm:text-sm font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">Emergency Phone</label>
                  <input
                    type="text"
                    value={sharedData.emergency_contact_phone || ""}
                    onChange={(e) => handleChange("emergency_contact_phone", e.target.value.replace(/[^\d]/g, ""))}
                    placeholder="Emergency Alternate"
                    className="w-full px-4 py-3 min-h-[46px] rounded-2xl theme-bg-sub border theme-border text-xs sm:text-sm font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/20 transition-all"
                  />
                </div>
              </div>

              {/* DUAL ADDRESS SECTION: PRESENT & PERMANENT */}
              <div className="space-y-5 border-t theme-border pt-5">
                <h4 className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
                  Present Address
                </h4>

                {/* Map Location Picker for Present Address */}
                <AddressLocationPicker
                  label="Search & Pick Present Address on Map"
                  value={{
                    address: sharedData.street_address,
                    street_address: sharedData.street_address,
                    district: sharedData.district,
                    division: sharedData.division,
                    upazila_thana: sharedData.thana_or_upazila,
                    postal_code: sharedData.post_code,
                    latitude: sharedData.latitude,
                    longitude: sharedData.longitude,
                    map_place_id: sharedData.map_place_id,
                  }}
                  onChange={(loc) => {
                    setSharedData((prev) => ({
                      ...prev,
                      street_address: loc.street_address || loc.address || prev.street_address,
                      district: loc.district || prev.district,
                      division: loc.division || prev.division,
                      thana_or_upazila: loc.upazila_thana || prev.thana_or_upazila,
                      post_code: loc.postal_code || prev.post_code,
                      latitude: loc.latitude !== undefined ? loc.latitude : prev.latitude,
                      longitude: loc.longitude !== undefined ? loc.longitude : prev.longitude,
                      map_place_id: loc.map_place_id || prev.map_place_id,
                    }));
                  }}
                  placeholder="Type address or click 'Pick on Map' to auto-detect location"
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <CustomSelect
                      label="Division"
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
                    <CustomSelect
                      label="District"
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
                      searchable
                    />
                  </div>
                  <div>
                    <CustomSelect
                      label="Thana / Upazila"
                      options={getUpazilasForDistrict(sharedData.division, sharedData.district).map((u) => ({ label: u, value: u }))}
                      value={sharedData.thana_or_upazila || ""}
                      onChange={(val) => handleChange("thana_or_upazila", val)}
                      placeholder="Select Upazila..."
                      searchable
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                      Street Address / Village / House Details
                    </label>
                    <input
                      type="text"
                      value={sharedData.street_address || ""}
                      onChange={(e) => handleChange("street_address", e.target.value)}
                      placeholder="Street, Road, House, and Village detail"
                      className="w-full px-4 py-3 min-h-[46px] rounded-2xl theme-bg-sub border theme-border text-xs sm:text-sm font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      value={sharedData.post_code || ""}
                      onChange={(e) => handleChange("post_code", e.target.value)}
                      placeholder="Post Code"
                      className="w-full px-4 py-3 min-h-[46px] rounded-2xl theme-bg-sub border theme-border text-xs sm:text-sm font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/20 transition-all"
                    />
                  </div>
                </div>

                {/* Same Address Checkbox Toggle */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="sameAddressCheckbox"
                    checked={sameAddress}
                    onChange={(e) => handleAddressClone(e.target.checked)}
                    className="w-4 h-4 rounded theme-border text-[var(--accent-main)] focus:ring-[var(--accent-main)] cursor-pointer"
                  />
                  <label htmlFor="sameAddressCheckbox" className="text-xs font-bold theme-text-primary select-none cursor-pointer">
                    Permanent address is the same as present address
                  </label>
                </div>

                {/* Permanent Address Fields (Shown when unchecked) */}
                {!sameAddress && (
                  <div className="space-y-4 pt-3 border-t theme-border animate-fade-in">
                    <h4 className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
                      Permanent Address
                    </h4>

                    {/* Map Location Picker for Permanent Address */}
                    <AddressLocationPicker
                      label="Search & Pick Permanent Address on Map"
                      value={{
                        address: sharedData.perm_street,
                        street_address: sharedData.perm_street,
                        district: sharedData.perm_district,
                        division: sharedData.perm_division,
                        upazila_thana: sharedData.perm_thana,
                        postal_code: sharedData.perm_post_code,
                        latitude: sharedData.perm_latitude,
                        longitude: sharedData.perm_longitude,
                        map_place_id: sharedData.perm_map_place_id,
                      }}
                      onChange={(loc) => {
                        setSharedData((prev) => ({
                          ...prev,
                          perm_street: loc.street_address || loc.address || prev.perm_street,
                          perm_district: loc.district || prev.perm_district,
                          perm_division: loc.division || prev.perm_division,
                          perm_thana: loc.upazila_thana || prev.perm_thana,
                          perm_post_code: loc.postal_code || prev.perm_post_code,
                          perm_latitude: loc.latitude !== undefined ? loc.latitude : prev.perm_latitude,
                          perm_longitude: loc.longitude !== undefined ? loc.longitude : prev.perm_longitude,
                          perm_map_place_id: loc.map_place_id || prev.perm_map_place_id,
                        }));
                      }}
                      placeholder="Type permanent address or click 'Pick on Map'"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      <div>
                        <CustomSelect
                          label="Division"
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
                        <CustomSelect
                          label="District"
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
                          searchable
                        />
                      </div>
                      <div>
                        <CustomSelect
                          label="Thana / Upazila"
                          options={getUpazilasForDistrict(sharedData.perm_division, sharedData.perm_district).map((u) => ({ label: u, value: u }))}
                          value={sharedData.perm_thana || ""}
                          onChange={(val) => handleChange("perm_thana", val)}
                          placeholder="Select Upazila..."
                          searchable
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
                      <div className="sm:col-span-3">
                        <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                          Permanent Street / Village / House Details
                        </label>
                        <input
                          type="text"
                          value={sharedData.perm_street || ""}
                          onChange={(e) => handleChange("perm_street", e.target.value)}
                          placeholder="Permanent Street, Road, House, and Village"
                          className="w-full px-4 py-3 min-h-[46px] rounded-2xl theme-bg-sub border theme-border text-xs sm:text-sm font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/20 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                          Postal Code
                        </label>
                        <input
                          type="text"
                          value={sharedData.perm_post_code || ""}
                          onChange={(e) => handleChange("perm_post_code", e.target.value)}
                          placeholder="Post Code"
                          className="w-full px-4 py-3 min-h-[46px] rounded-2xl theme-bg-sub border theme-border text-xs sm:text-sm font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/20 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: DOCUMENT VAULT & REVIEW SUMMARY */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-fade-in">
              {/* Drag & Drop Document Vault */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider theme-text-secondary border-b theme-border pb-2">
                  Document Repository
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* File 1: Birth Cert */}
                  <div
                    onDragEnter={(e) => handleDrag(e, "birth_certificate")}
                    onDragOver={(e) => handleDrag(e, "birth_certificate")}
                    onDragLeave={(e) => handleDrag(e, "birth_certificate")}
                    onDrop={(e) => handleDrop(e, "birth_certificate")}
                    className={`p-5 rounded-3xl border-2 border-dashed text-center flex flex-col justify-center items-center transition-all ${
                      activeDragField === "birth_certificate" ? "border-[var(--accent-main)] theme-bg-accent-soft" : "theme-border hover:border-[var(--accent-main)]/60 theme-bg-sub/60"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center mb-2 shadow-inner">
                      <UploadIcon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold theme-text-primary">Birth Certificate</span>
                    <span className="text-[10px] theme-text-secondary mt-1">
                      {birthCertFile ? birthCertFile.name : "Drag & Drop or Browse"}
                    </span>
                    <input
                      type="file"
                      id="bc-input"
                      className="hidden"
                      onChange={(e) => setBirthCertFile(e.target.files && e.target.files[0])}
                    />
                    <label htmlFor="bc-input" className="mt-3 px-4 py-2 theme-bg-elevated theme-text-primary text-xs font-bold rounded-xl border theme-border hover:theme-bg-sub cursor-pointer shadow-xs">
                      Browse File
                    </label>
                  </div>

                  {/* File 2: Guardian NID */}
                  <div
                    onDragEnter={(e) => handleDrag(e, "guardian_nid")}
                    onDragOver={(e) => handleDrag(e, "guardian_nid")}
                    onDragLeave={(e) => handleDrag(e, "guardian_nid")}
                    onDrop={(e) => handleDrop(e, "guardian_nid")}
                    className={`p-5 rounded-3xl border-2 border-dashed text-center flex flex-col justify-center items-center transition-all ${
                      activeDragField === "guardian_nid" ? "border-[var(--accent-main)] theme-bg-accent-soft" : "theme-border hover:border-[var(--accent-main)]/60 theme-bg-sub/60"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center mb-2 shadow-inner">
                      <UploadIcon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold theme-text-primary">Guardian NID</span>
                    <span className="text-[10px] theme-text-secondary mt-1">
                      {guardianNidFile ? guardianNidFile.name : "Drag & Drop or Browse"}
                    </span>
                    <input
                      type="file"
                      id="gnid-input"
                      className="hidden"
                      onChange={(e) => setGuardianNidFile(e.target.files && e.target.files[0])}
                    />
                    <label htmlFor="gnid-input" className="mt-3 px-4 py-2 theme-bg-elevated theme-text-primary text-xs font-bold rounded-xl border theme-border hover:theme-bg-sub cursor-pointer shadow-xs">
                      Browse File
                    </label>
                  </div>
                </div>
              </div>

              {/* Information Summary Review */}
              <div className="space-y-4 border-t theme-border pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
                  Review &amp; Confirmation
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-medium">
                  {/* Column 1: Personal & Academic */}
                  <div className="theme-bg-surface border theme-border p-5 rounded-3xl space-y-2.5 shadow-xs">
                    <h5 className="font-bold theme-accent uppercase tracking-wider text-[11px] mb-2">Student &amp; Class</h5>
                    <div className="flex justify-between py-1 border-b theme-border">
                      <span className="theme-text-secondary">Student Name</span>
                      <span className="font-bold theme-text-primary">{sharedData.name || "--"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b theme-border">
                      <span className="theme-text-secondary">Native Name</span>
                      <span className="font-bold theme-text-primary">{sharedData.bangla_name || "--"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b theme-border">
                      <span className="theme-text-secondary">Class / Track</span>
                      <span className="font-bold theme-accent">{sharedData.education_status || "--"}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="theme-text-secondary">Class Roll</span>
                      <span className="font-bold theme-text-primary">
                        {sharedData.roll_number ? `#${sharedData.roll_number}` : "Auto Assigned"}
                      </span>
                    </div>
                  </div>

                  {/* Column 2: Guardian & Address */}
                  <div className="theme-bg-surface border theme-border p-5 rounded-3xl space-y-2.5 shadow-xs">
                    <h5 className="font-bold theme-accent uppercase tracking-wider text-[11px] mb-2">Guardian &amp; Contact</h5>
                    <div className="flex justify-between py-1 border-b theme-border">
                      <span className="theme-text-secondary">Guardian Phone</span>
                      <span className="font-bold theme-text-primary">{sharedData.guardian_phone || "--"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b theme-border">
                      <span className="theme-text-secondary">Relation</span>
                      <span className="theme-text-primary">{sharedData.guardian_relation || "--"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b theme-border">
                      <span className="theme-text-secondary">Father / Mother</span>
                      <span className="theme-text-primary">{sharedData.father_name || sharedData.mother_name || "--"}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="theme-text-secondary">Present Address</span>
                      <span className="theme-text-primary truncate max-w-[200px]" title={sharedData.street_address}>
                        {sharedData.street_address || sharedData.district || "--"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fixed Stationary Footer Buttons Dock */}
      <div className="flex justify-between items-center pt-4 border-t theme-border select-none mt-5 shrink-0">
        {currentStep > 1 ? (
          <button
            type="button"
            onClick={prevStep}
            disabled={loading}
            className="px-6 py-2.5 h-11 text-xs font-bold theme-bg-sub theme-text-primary rounded-2xl border theme-border hover:theme-bg-elevated transition cursor-pointer"
          >
            ← Back
          </button>
        ) : (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2.5 h-11 text-xs font-bold theme-bg-sub theme-text-secondary hover:theme-text-primary rounded-2xl transition cursor-pointer"
          >
            Cancel
          </button>
        )}

        {currentStep < 4 ? (
          <button
            type="button"
            onClick={nextStep}
            className="px-8 py-2.5 h-11 min-w-[160px] text-xs font-black theme-bg-accent theme-accent-text hover:opacity-90 rounded-2xl transition cursor-pointer shadow-md flex items-center justify-center gap-1.5"
          >
            <span>Next Step</span>
            <span>→</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-8 py-2.5 h-11 min-w-[160px] text-xs font-black theme-bg-accent theme-accent-text hover:opacity-90 rounded-2xl transition cursor-pointer disabled:opacity-50 shadow-xl flex items-center justify-center gap-2"
          >
            {loading ? "Registering Student..." : "Complete Student Enrollment"}
          </button>
        )}
      </div>
    </div>
  );
}
