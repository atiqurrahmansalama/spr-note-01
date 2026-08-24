import React, { useState, useEffect, useRef } from "react";
import { fetchWithAuth } from "../../../utils/authService";
import { useToast } from "../../../context/ToastContext";
import CustomInput from "../../../components/ui/CustomInput";
import CustomSelect from "../../../components/ui/CustomSelect";
import CustomCheckbox from "../../../components/ui/CustomCheckbox";
import { ClassSelect } from "../../../components/selectors";
import Stepper from "../../../components/ui/Stepper";
import ReusableCalendar from "../../../components/common/ReusableCalendar";
import { BD_GEO_DATA } from "../../../utils/bangladeshGeoData";
import { calculateAge, validateBDPhone, validateBRN, validateNID } from "../../../utils/inputValidators";
import { CameraIcon, UploadIcon, ChevronIcon, CheckCircleIcon, IdentificationIcon } from "../../../components/ui/Icons";
import AddressPickerInput from "../../../components/ui/AddressPickerInput";
import MultiDocumentManager from "../../../components/ui/MultiDocumentManager";
import DocumentFilePicker from "../../../components/ui/DocumentFilePicker";
import { classAdmissionRequirementsStore } from "../../../utils/localStore";
import { useTenant } from "../../../context/TenantContext";

const ADMISSION_STEPS = [
  { id: 1, label: "Profile & Photo" },
  { id: 2, label: "Academic" },
  { id: 3, label: "Guardian & Address" },
  { id: 4, label: "Vault & Review" },
];

const RELATION_OPTIONS = [
  "Father",
  "Mother",
  "Brother",
  "Sister",
  "Uncle",
  "Aunt",
  "Grandfather",
  "Grandmother",
  "Other",
];

const SESSION_YEAR_OPTIONS = [
  { label: "2026-2027 (Current Session)", value: "2026-2027" },
  { label: "2025-2026 (Previous Session)", value: "2025-2026" },
  { label: "2027-2028 (Upcoming Session)", value: "2027-2028" },
  { label: "2028-2029", value: "2028-2029" },
  { label: "2024-2025", value: "2024-2025" },
];

const IDENTITY_DOC_OPTIONS = [
  { label: "Birth Certificate", value: "BRN" },
  { label: "National ID", value: "NID" },
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

export default function FullAdmissionWizard({
  onCancel,
  onSuccess,
  sharedData: propSharedData,
  setSharedData: propSetSharedData,
  isPublicOnlineMode = false,
  tokenMeta = null,
  token = null,
}) {
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);

  // Internal state fallback if not managed by parent container
  const [internalSharedData, setInternalSharedData] = useState({
    name: "",
    bangla_name: "",
    gender: "MALE",
    dob: "",
    blood_group: "",
    birth_certificate_no: "",
    nid_no: "",
    student_class: tokenMeta?.target_class_id || "",
    education_status: tokenMeta?.target_class_name || "",
    session_year: tokenMeta?.session_year || "2026-2027",
    admission_date: new Date().toISOString().split("T")[0],
    previous_school_name: "",
    previous_school_address: "",
    previous_class: "",
    previous_roll_number: "",
    previous_result: "",
    previous_passing_year: "",
    previous_study_details: "",
    tc_number: "",
    father_name: "",
    father_phone: "",
    father_occupation: "",
    mother_name: "",
    mother_phone: "",
    mother_occupation: "",
    primary_guardian_name: "",
    guardian_phone: "",
    guardian_relation: "Father",
    guardian_nid: "",
    emergency_contact_phone: "",
    street_address: "",
    post_code: "",
    thana_or_upazila: "",
    district: "",
    division: "",
    latitude: null,
    longitude: null,
    map_place_id: "",
    perm_street: "",
    perm_post_code: "",
    perm_thana: "",
    perm_district: "",
    perm_division: "",
    perm_latitude: null,
    perm_longitude: null,
    perm_map_place_id: "",
  });

  const sharedData = propSharedData || internalSharedData;
  const setSharedData = propSetSharedData || setInternalSharedData;

  // Unified Identity Document Selection State (BRN or NID)
  const [identityDocType, setIdentityDocType] = useState(() => {
    if (sharedData.nid_no) return "NID";
    return "BRN";
  });

  // Photo Input Ref
  const photoInputRef = useRef(null);

  // File objects for document vault
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  
  // Reusable multi-document repository state
  const [studentDocuments, setStudentDocuments] = useState(() => [
    {
      id: "doc_req_0_brn",
      title: "Birth Registration Certificate (BRN)",
      is_required: true,
      file_url: "",
      file_name: "",
      file_size: "",
    },
    {
      id: "doc_req_1_gnid",
      title: "Guardian National ID (NID)",
      is_required: true,
      file_url: "",
      file_name: "",
      file_size: "",
    },
  ]);

  const [identityDocFile, setIdentityDocFile] = useState(null);
  const [guardianNidFile, setGuardianNidFile] = useState(null);

  // Drag and drop states
  const [activeDragField, setActiveDragField] = useState(null);

  // Address checkbox
  const [sameAddress, setSameAddress] = useState(true);

  // Guardian Sibling Lookup State
  const [lookupResults, setLookupResults] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  // Dynamic class admission document requirements synchronization
  const tenantContext = useTenant ? useTenant() : {};
  const activeTenantId = tenantContext?.activeTenantId || "default";

  useEffect(() => {
    const requiredTitles = classAdmissionRequirementsStore.getRequiredDocsForClass(
      activeTenantId,
      sharedData.student_class,
      sharedData.education_status
    );

    setStudentDocuments((prevDocs) => {
      const existing = Array.isArray(prevDocs) ? prevDocs : [];

      // Build required docs preserving existing uploaded files
      const requiredDocs = requiredTitles.map((title, idx) => {
        const found = existing.find((d) => d.title === title);
        if (found) {
          return { ...found, is_required: true };
        }
        return {
          id: `doc_req_${idx}_${title.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 15)}`,
          title,
          is_required: true,
          file_url: "",
          file_name: "",
          file_size: "",
        };
      });

      // Keep user-added custom optional documents that are not in the mandatory list
      const customDocs = existing.filter((d) => !requiredTitles.includes(d.title) && !d.is_required);

      return [...requiredDocs, ...customDocs];
    });
  }, [activeTenantId, sharedData.student_class, sharedData.education_status]);

  // Fetch institution dynamic classes (or use tokenMeta available classes)
  useEffect(() => {
    if (tokenMeta && Array.isArray(tokenMeta.available_classes) && tokenMeta.available_classes.length > 0) {
      setClasses(tokenMeta.available_classes.map((c) => ({ label: c.name, value: c.id, name: c.name })));
      if (tokenMeta.target_class_id && !sharedData.student_class) {
        setSharedData((prev) => ({
          ...prev,
          student_class: tokenMeta.target_class_id,
          education_status: tokenMeta.target_class_name || prev.education_status,
        }));
      }
      return;
    }

    fetchWithAuth("/api/v1/classes/")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.results || []);
        setClasses(list.map((c) => ({ label: c.name, value: c.id, name: c.name })));
      })
      .catch((err) => {
        console.error("Failed to load classes", err);
      });
  }, [tokenMeta]);

  // Guardian Debounce Sibling Lookup
  useEffect(() => {
    const phone = sharedData?.guardian_phone || "";
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

  // Handler for unified identity number (either BRN or NID)
  const handleIdentityNumberChange = (val) => {
    if (identityDocType === "BRN") {
      handleChange("birth_certificate_no", val);
      handleChange("nid_no", "");
    } else {
      handleChange("nid_no", val);
      handleChange("birth_certificate_no", "");
    }
  };

  const handleIdentityTypeSwitch = (type) => {
    setIdentityDocType(type);
    const existingVal = sharedData.birth_certificate_no || sharedData.nid_no || "";
    if (type === "BRN") {
      handleChange("birth_certificate_no", existingVal);
      handleChange("nid_no", "");
    } else {
      handleChange("nid_no", existingVal);
      handleChange("birth_certificate_no", "");
    }
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
        showToast("Student Name (English) is required", "warning");
        return;
      }
      if (identityDocType === "BRN" && sharedData.birth_certificate_no) {
        if (!validateBRN(sharedData.birth_certificate_no)) {
          showToast("Birth Certificate Number must be exactly 17 digits", "warning");
          return;
        }
      }
      if (identityDocType === "NID" && sharedData.nid_no) {
        if (!validateNID(sharedData.nid_no)) {
          showToast("National ID (NID) must be 10, 13, or 17 digits", "warning");
          return;
        }
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
      if (field === "identity_doc") setIdentityDocFile(file);
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

    const academicData = {
      session_year: sharedData.session_year || "2026-2027",
      admission_date: sharedData.admission_date || new Date().toISOString().split("T")[0],
      previous_school_name: sharedData.previous_school_name || "",
      previous_school_address: sharedData.previous_school_address || "",
      previous_class: sharedData.previous_class || "",
      previous_roll_number: sharedData.previous_roll_number || "",
      previous_result: sharedData.previous_result || "",
      previous_passing_year: sharedData.previous_passing_year || "",
      previous_study_details: sharedData.previous_study_details || "",
      tc_number: sharedData.tc_number || "",
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
      student_class: sharedData.student_class || null,
      education_status: selectedClassObj ? selectedClassObj.name : (sharedData.education_status || ""),
      present_address_data: presentAddressData,
      permanent_address_data: permanentAddressData,
      academic_data: academicData,
      guardian_data: guardianData,
    };

    if (token) {
      payload.admission_token = token;
      payload.token = token;
    }

    // Validate that all mandatory documents have files uploaded
    const missingDocs = (studentDocuments || []).filter(
      (doc) => doc.is_required && !doc.file_url
    );
    if (missingDocs.length > 0) {
      showToast(
        `Please attach all mandatory required documents: ${missingDocs.map((d) => d.title).join(", ")}`,
        "error"
      );
      setCurrentStep(4);
      return;
    }

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

      // 3. Upload all attached student documents from MultiDocumentManager
      if (Array.isArray(studentDocuments)) {
        for (const doc of studentDocuments) {
          if (doc.file_url) {
            try {
              const docType = (doc.title || "STUDENT_DOCUMENT").toUpperCase().replace(/\s+/g, '_').slice(0, 30);
              const docFormData = new FormData();
              docFormData.append("doc_type", docType);
              docFormData.append("title", doc.title || `Document of ${sharedData.name}`);
              
              if (doc.file) {
                docFormData.append("file", doc.file);
              } else if (doc.file_url.startsWith("data:")) {
                const blob = await fetch(doc.file_url).then(r => r.blob());
                docFormData.append("file", blob, doc.file_name || "document.pdf");
              }

              await fetchWithAuth(`/api/v1/students/${studentId}/upload-document/`, {
                method: "POST",
                body: docFormData,
              }).catch((e) => console.warn("Document upload warning:", e));
            } catch (docErr) {
              console.warn("Document upload error:", docErr);
            }
          }
        }
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

  const currentIdentityValue = identityDocType === "BRN" 
    ? (sharedData.birth_certificate_no || "")
    : (sharedData.nid_no || "");

  return (
    <div className="w-full select-none text-left space-y-6">
      {/* Modern Minimal Stepper Progress Bar */}
      <div className="pb-1 sm:pb-2">
        <Stepper
          steps={ADMISSION_STEPS}
          currentStep={currentStep}
          onStepClick={(stepNum) => {
            if (stepNum < currentStep) {
              setCurrentStep(stepNum);
            }
          }}
          clickable={true}
          size="md"
        />
      </div>

      {/* Step Body */}
      <div className="w-full">
        {/* STEP 1: PERSONAL INFORMATION & PHOTO */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fade-in">
            {/* Top Row: Names in 2 Lines (Left, Bottom-Aligned) + Large Photo Card (Far Right) */}
            <div className="flex flex-col-reverse md:flex-row items-center md:items-end justify-between gap-6 md:gap-10 lg:gap-12">
              {/* Left Side: English & Bangla Full Names in 2 Clean Stacked Lines (Reduced Width on Large Screens) */}
              <div className="w-full space-y-4 sm:space-y-4.5 max-w-md">
                <div>
                  <CustomInput
                    label="Full Name (English)"
                    required
                    value={sharedData.name || ""}
                    onChange={(val) => handleChange("name", val)}
                    placeholder="e.g. Abdullah Bin Arif"
                  />
                </div>

                <div>
                  <CustomInput
                    label="Full Name (Native)"
                    value={sharedData.bangla_name || ""}
                    onChange={(val) => handleChange("bangla_name", val)}
                    placeholder="উদা: আব্দুল্লাহ বিন আরিফ"
                  />
                </div>
              </div>

              {/* Right Side: Larger Photo Upload Card on the Far Right */}
              <div className="shrink-0 flex flex-col items-center md:items-end">
                <div
                  onClick={() => photoInputRef.current && photoInputRef.current.click()}
                  onDragEnter={(e) => handleDrag(e, "photo")}
                  onDragOver={(e) => handleDrag(e, "photo")}
                  onDragLeave={(e) => handleDrag(e, "photo")}
                  onDrop={(e) => handleDrop(e, "photo")}
                  className="relative w-40 sm:w-44 md:w-48 h-48 sm:h-52 md:h-56 rounded-2xl border-2 border-dashed theme-border overflow-hidden theme-bg-sub hover:border-[var(--accent-main)] transition-all duration-200 flex flex-col items-center justify-center cursor-pointer shadow-xs group"
                  title="Click to select student photo"
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
                    <div className="flex flex-col items-center justify-center p-4 text-center space-y-2">
                      <div className="w-11 h-11 rounded-2xl theme-bg-accent-soft theme-accent border theme-border flex items-center justify-center shadow-inner">
                        <CameraIcon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold theme-text-primary">Upload Photo</span>
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

            {/* Gender, Date of Birth, Blood Group */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 border-t theme-border pt-5">
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
                    { label: "Unknown", value: "" },
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

            {/* Unified Identity Document Section: BRN or NID */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 border-t theme-border pt-5">
              <div>
                <CustomSelect
                  label="Identity Document Type"
                  options={IDENTITY_DOC_OPTIONS}
                  value={identityDocType}
                  onChange={(val) => handleIdentityTypeSwitch(val)}
                />
              </div>

              <div className="sm:col-span-2">
                <CustomInput
                  type={identityDocType === "BRN" ? "brn" : "nid"}
                  label={identityDocType === "BRN" ? "Birth Registration Number (BRN)" : "National ID Number (NID)"}
                  value={currentIdentityValue}
                  onChange={(val) => handleIdentityNumberChange(val)}
                  placeholder={identityDocType === "BRN" ? "17-digit birth certificate number" : "10, 13, or 17-digit NID number"}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: ACADEMIC ENROLLMENT */}
        {currentStep === 2 && (
          <div className="space-y-5 animate-fade-in">
            {/* Session Year Dropdown, Class Select & Admission Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              <div>
                <CustomSelect
                  label="Academic Session Year"
                  options={SESSION_YEAR_OPTIONS}
                  value={sharedData.session_year || "2026-2027"}
                  onChange={(val) => handleChange("session_year", val)}
                  required
                />
              </div>

              <div>
                <ClassSelect
                  label="Enrolling Class"
                  value={sharedData.student_class || ""}
                  onChange={(clsId, clsObj) => {
                    setSharedData((prev) => ({
                      ...prev,
                      student_class: clsId,
                      education_status: clsObj ? clsObj.name : "",
                    }));
                  }}
                  allowAll={false}
                  placeholder="Select Institutional Class..."
                  required={true}
                />
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

            {/* Previous Academic Background */}
            <div className="border-t theme-border pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <CustomInput
                    label="Previous Academy Name"
                    value={sharedData.previous_school_name || ""}
                    onChange={(val) => handleChange("previous_school_name", val)}
                    placeholder="e.g. Jamia Rahmania Madrasa"
                  />
                </div>
                <div>
                  <CustomInput
                    label="Previous Academy Address"
                    value={sharedData.previous_school_address || ""}
                    onChange={(val) => handleChange("previous_school_address", val)}
                    placeholder="e.g. Mirpur, Dhaka"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                <div>
                  <CustomInput
                    label="Previous Class"
                    value={sharedData.previous_class || ""}
                    onChange={(val) => handleChange("previous_class", val)}
                    placeholder="e.g. Class 4 / Hifz 15 Para / Nazera"
                  />
                </div>
                <div>
                  <CustomInput
                    label="Previous Exam Roll Number"
                    value={sharedData.previous_roll_number || ""}
                    onChange={(val) => handleChange("previous_roll_number", val)}
                    placeholder="e.g. 15"
                  />
                </div>
                <div>
                  <CustomInput
                    label="Previous Exam Result & Average"
                    value={sharedData.previous_result || ""}
                    onChange={(val) => handleChange("previous_result", val)}
                    placeholder="e.g. Mumtaz / 88% "
                  />
                </div>
              </div>

              <div>
                <CustomInput
                  label="Academic & Study Details"
                  value={sharedData.previous_study_details || ""}
                  onChange={(val) => handleChange("previous_study_details", val)}
                  placeholder="e.g. Completed 10 Paras Hifz with Tajweed."
                />
              </div>
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
                <CustomInput
                  type="phone"
                  label="Primary Guardian Phone"
                  required
                  value={sharedData.guardian_phone || ""}
                  onChange={(val) => handleChange("guardian_phone", val)}
                  placeholder="Official SMS mobile (e.g. 01712345678)"
                />
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
                <CustomInput
                  label="Father Name"
                  value={sharedData.father_name || ""}
                  onChange={(val) => handleChange("father_name", val)}
                  placeholder="Father's Full Name"
                />
              </div>
              <div>
                <CustomInput
                  type="phone"
                  label="Father Phone"
                  value={sharedData.father_phone || ""}
                  onChange={(val) => handleChange("father_phone", val)}
                  placeholder="Father's Phone"
                />
              </div>
              <div>
                <CustomInput
                  label="Father Occupation"
                  value={sharedData.father_occupation || ""}
                  onChange={(val) => handleChange("father_occupation", val)}
                  placeholder="e.g. Business, Teacher"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <CustomInput
                  label="Mother Name"
                  value={sharedData.mother_name || ""}
                  onChange={(val) => handleChange("mother_name", val)}
                  placeholder="Mother's Full Name"
                />
              </div>
              <div>
                <CustomInput
                  type="phone"
                  label="Mother Phone"
                  value={sharedData.mother_phone || ""}
                  onChange={(val) => handleChange("mother_phone", val)}
                  placeholder="Mother's Phone"
                />
              </div>
              <div>
                <CustomInput
                  type="phone"
                  label="Emergency Phone"
                  value={sharedData.emergency_contact_phone || ""}
                  onChange={(val) => handleChange("emergency_contact_phone", val)}
                  placeholder="Emergency Alternate"
                />
              </div>
            </div>

            {/* DUAL ADDRESS SECTION: PRESENT & PERMANENT */}
            <div className="space-y-5 border-t theme-border pt-5">
              <AddressPickerInput
                value={{
                  division: sharedData.division,
                  district: sharedData.district,
                  upazila: sharedData.thana_or_upazila,
                  post_code: sharedData.post_code,
                  street_address: sharedData.street_address,
                  coordinates: sharedData.latitude && sharedData.longitude ? `${sharedData.latitude}, ${sharedData.longitude}` : '',
                }}
                onChange={(addr) => {
                  setSharedData((prev) => ({
                    ...prev,
                    division: addr.division,
                    district: addr.district,
                    thana_or_upazila: addr.upazila || addr.thana_or_upazila || '',
                    post_code: addr.post_code || '',
                    street_address: addr.street_address || '',
                  }));
                }}
                title="Present Address & Geolocation"
                required
              />

              {/* Standard Theme-Aware Same Address CustomCheckbox */}
              <div className="p-3.5 rounded-2xl theme-bg-sub border theme-border">
                <CustomCheckbox
                  checked={sameAddress}
                  onChange={(checked) => handleAddressClone(checked)}
                  label="Permanent address is the same as present address"
                  size="md"
                />
              </div>

              {/* Permanent Address Fields (Shown when unchecked) */}
              {!sameAddress && (
                <div className="space-y-4 pt-3 border-t theme-border animate-fade-in">
                  <AddressPickerInput
                    value={{
                      division: sharedData.perm_division,
                      district: sharedData.perm_district,
                      upazila: sharedData.perm_thana,
                      post_code: sharedData.perm_post_code,
                      street_address: sharedData.perm_street,
                      coordinates: sharedData.perm_latitude && sharedData.perm_longitude ? `${sharedData.perm_latitude}, ${sharedData.perm_longitude}` : '',
                    }}
                    onChange={(addr) => {
                      setSharedData((prev) => ({
                        ...prev,
                        perm_division: addr.division,
                        perm_district: addr.district,
                        perm_thana: addr.upazila || addr.thana_or_upazila || '',
                        perm_post_code: addr.post_code || '',
                        perm_street: addr.street_address || '',
                      }));
                    }}
                    title="Permanent Address"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: DOCUMENT VAULT & REVIEW SUMMARY */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-fade-in">
            {/* Reusable Multi-Document List Manager */}
            <MultiDocumentManager
              title="STUDENT DOCUMENTS & CREDENTIALS"
              subTitle="Attach official documents, birth certificate, transfer certificate, or marksheets"
              addButtonLabel="+ Add Document"
              itemLabelPrefix="DOCUMENT"
              documents={studentDocuments}
              onChange={(docs) => setStudentDocuments(docs)}
            />

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
                    <span className="theme-text-secondary">Academic Session</span>
                    <span className="font-bold theme-text-primary">{sharedData.session_year || "--"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b theme-border">
                    <span className="theme-text-secondary">Class / Track</span>
                    <span className="font-bold theme-accent">{sharedData.education_status || "--"}</span>
                  </div>
                  {sharedData.previous_school_name && (
                    <div className="flex justify-between py-1 border-b theme-border">
                      <span className="theme-text-secondary">Previous Academy</span>
                      <span className="font-bold theme-text-primary">
                        {sharedData.previous_school_name} {sharedData.previous_class ? `(${sharedData.previous_class})` : ''}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-1">
                    <span className="theme-text-secondary">Identity ({identityDocType})</span>
                    <span className="font-bold font-mono theme-text-primary">
                      {currentIdentityValue || "Not Provided"}
                    </span>
                  </div>
                </div>

                {/* Column 2: Guardian & Address */}
                <div className="theme-bg-surface border theme-border p-5 rounded-3xl space-y-2.5 shadow-xs">
                  <h5 className="font-bold theme-accent uppercase tracking-wider text-[11px] mb-2">Guardian &amp; Address</h5>
                  <div className="flex justify-between py-1 border-b theme-border">
                    <span className="theme-text-secondary">Guardian Phone</span>
                    <span className="font-bold font-mono theme-text-primary">{sharedData.guardian_phone || "--"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b theme-border">
                    <span className="theme-text-secondary">Relation</span>
                    <span className="font-bold theme-text-primary">{sharedData.guardian_relation || "--"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b theme-border">
                    <span className="theme-text-secondary">Father / Mother</span>
                    <span className="font-bold theme-text-primary">
                      {sharedData.father_name || sharedData.mother_name || "--"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="theme-text-secondary">Present Location</span>
                    <span className="font-bold theme-text-primary truncate max-w-[200px]">
                      {[sharedData.thana_or_upazila, sharedData.district, sharedData.division].filter(Boolean).join(", ") || "--"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Wizard Actions Footer */}
      <div className="flex items-center justify-between pt-6 border-t theme-border">
        <div>
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              disabled={loading}
              className="px-5 py-2.5 rounded-2xl border theme-border hover:theme-bg-sub text-xs font-bold theme-text-primary transition cursor-pointer disabled:opacity-50"
            >
              Back
            </button>
          ) : onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-5 py-2.5 rounded-2xl border theme-border hover:theme-bg-sub text-xs font-bold theme-text-secondary hover:theme-text-primary transition cursor-pointer"
            >
              Cancel
            </button>
          ) : <div />}
        </div>

        <div>
          {currentStep < 4 ? (
            <button
              type="button"
              onClick={nextStep}
              className="px-6 py-2.5 rounded-2xl theme-bg-accent font-bold text-xs theme-text-on-accent hover:opacity-90 transition cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <span>Next</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-7 py-3 rounded-2xl theme-bg-accent font-bold text-xs theme-text-on-accent hover:opacity-90 transition cursor-pointer shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-white animate-spin" />
                  <span>Enrolling Student...</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>Confirm &amp; Complete Admission</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
