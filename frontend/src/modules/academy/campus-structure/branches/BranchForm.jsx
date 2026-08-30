import React, { useState, useEffect, useMemo } from 'react';
import { fetchWithAuth } from '../../../../utils/authService';
import { useToast } from '../../../../context/ToastContext';
import { useTenant } from '../../../../context/TenantContext';
import {
  BuildingOfficeIcon,
  TeacherIcon,
} from '../../../../components/ui/Icons';
import CustomInput from '../../../../components/ui/CustomInput';
import CustomSelect from '../../../../components/ui/CustomSelect';
import { TeacherSelect } from '../../../../components/selectors';
import AddressPickerInput from '../../../../components/ui/AddressPickerInput';
import { createBranch, updateBranch } from '../../../../api/academy';
import { DrawerContainer, DrawerSection, DrawerFooter } from '../../../../components/layout';
import { branchCategoriesStore } from '../../../../utils/localStore';

export default function BranchForm({ branch = null, editingBranch = null, onSaved, onCancel }) {
  const activeBranchData = branch || editingBranch;
  const { showToast } = useToast();
  const { activeTenantId, institutions, isMultiTenantAdmin, currentInstitution } = useTenant();
  const isEdit = Boolean(activeBranchData?.id);

  const [branchTypeOptions, setBranchTypeOptions] = useState(() =>
    branchCategoriesStore.getCategoryOptions(activeTenantId)
  );

  useEffect(() => {
    const handleUpdate = () => {
      setBranchTypeOptions(branchCategoriesStore.getCategoryOptions(activeTenantId));
    };
    handleUpdate();
    window.addEventListener('spr_branch_categories_updated', handleUpdate);
    window.addEventListener('spr_tenant_changed', handleUpdate);
    return () => {
      window.removeEventListener('spr_branch_categories_updated', handleUpdate);
      window.removeEventListener('spr_tenant_changed', handleUpdate);
    };
  }, [activeTenantId]);

  const initialValues = useMemo(() => {
    const defaultInstId =
      activeBranchData?.institution ||
      (activeTenantId !== 'ALL' ? activeTenantId : '') ||
      (currentInstitution?.id || '');

    if (activeBranchData) {
      return {
        institution: defaultInstId,
        branch_name: activeBranchData.branch_name || activeBranchData.name || '',
        branch_code: activeBranchData.branch_code || activeBranchData.code || '',
        branch_type: activeBranchData.branch_type || 'MAIN_CAMPUS',
        in_charge_staff: activeBranchData.in_charge_staff || '',
        contact_phone: activeBranchData.contact_phone || '',
        contact_email: activeBranchData.contact_email || '',
        address: activeBranchData.address || '',
        district: activeBranchData.district || '',
        division: activeBranchData.division || '',
        maps_location_query: activeBranchData.address
          ? `${activeBranchData.address}, ${activeBranchData.district || ''}`
          : '',
        is_active: activeBranchData.is_active ?? true,
      };
    }
    return {
      institution: defaultInstId,
      branch_name: '',
      branch_code: '',
      branch_type: 'MAIN_CAMPUS',
      in_charge_staff: '',
      contact_phone: '',
      contact_email: '',
      address: '',
      district: '',
      division: '',
      maps_location_query: '',
      is_active: true,
    };
  }, [activeBranchData, activeTenantId, currentInstitution]);

  const [formData, setFormData] = useState(initialValues);
  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setFormData(initialValues);
  }, [initialValues]);

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    setLoadingStaff(true);
    try {
      const res = await fetchWithAuth('/api/v1/staff/');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.results || [];
        setStaffList(list.filter((s) => !s.is_deleted && s.is_active));
      }
    } catch {
      // Fallback
    } finally {
      setLoadingStaff(false);
    }
  };

  // Selected parent institution & branch quota calculation
  const selectedInst = useMemo(() => {
    if (formData.institution) {
      return institutions.find((i) => String(i.id) === String(formData.institution)) || currentInstitution;
    }
    return currentInstitution;
  }, [formData.institution, institutions, currentInstitution]);

  const branchQuotaLimit = selectedInst?.max_branches || 1;
  const currentBranchCount = selectedInst?.total_branches_count || 0;
  const isQuotaReached = !isEdit && currentBranchCount >= branchQuotaLimit && !isMultiTenantAdmin;

  // Determine if form has been modified by the user
  const isDirty = useMemo(() => {
    return Object.keys(initialValues).some((key) => formData[key] !== initialValues[key]);
  }, [formData, initialValues]);

  const isFormValid = formData.branch_name.trim().length > 0;
  const canSave = isDirty && isFormValid && !submitting && !isQuotaReached;

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isQuotaReached) {
      showToast(`Branch quota limit of ${branchQuotaLimit} reached for this academy.`, 'error');
      return;
    }
    if (!formData.branch_name.trim()) {
      showToast('Branch Name is required.', 'warning');
      return;
    }
    const targetInstId =
      formData.institution ||
      (activeTenantId !== 'ALL' ? activeTenantId : '') ||
      currentInstitution?.id ||
      (institutions[0]?.id ? String(institutions[0].id) : undefined);

    setSubmitting(true);
    const payload = {
      institution: targetInstId || undefined,
      branch_name: formData.branch_name.trim(),
      branch_code: formData.branch_code.trim().toUpperCase(),
      branch_type: formData.branch_type,
      in_charge_staff: formData.in_charge_staff || null,
      contact_phone: formData.contact_phone.trim(),
      contact_email: formData.contact_email.trim(),
      address: formData.address.trim(),
      district: formData.district || '',
      division: formData.division || '',
      is_active: formData.is_active,
    };

    try {
      if (isEdit) {
        await updateBranch(activeBranchData.id, payload);
        showToast('Academic Branch updated successfully!', 'success');
      } else {
        await createBranch(payload);
        showToast('Academic Branch registered successfully!', 'success');
      }
      onSaved?.();
    } catch (err) {
      showToast(err.message || 'Failed to save branch.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DrawerContainer padding="none" spacing="normal">
      <form onSubmit={handleSubmit} className="space-y-8 pt-3">
        {/* Quota Limit Notice */}
        {isQuotaReached && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-start gap-2.5 animate-fade-in">
            <BuildingOfficeIcon className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Branch Quota Limit Reached ({currentBranchCount}/{branchQuotaLimit})</p>
              <p className="opacity-90 text-[11px] mt-0.5">
                This academy has allocated all {branchQuotaLimit} allowed branch campuses. To create additional branches, update the academy's branch quota limit.
              </p>
            </div>
          </div>
        )}

        {/* Section 1: Basic Campus Profile */}
        <DrawerSection title="Campus Information" icon={BuildingOfficeIcon} className="pt-1">
          <div className="@container">
            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
              <div className="@[480px]:col-span-2">
                <CustomInput
                  label="Branch Name"
                  required
                  placeholder="e.g. Uttara Main Campus, Mirpur Sub-Branch"
                  value={formData.branch_name}
                  onChange={(val) => setFormData({ ...formData, branch_name: val })}
                />
              </div>

              <div>
                <CustomInput
                  label="Branch Code"
                  placeholder="e.g. UTT-01"
                  value={formData.branch_code}
                  onChange={(val) => setFormData({ ...formData, branch_code: val.toUpperCase() })}
                />
              </div>

              <div>
                <CustomSelect
                  label="Campus Category"
                  options={branchTypeOptions}
                  value={formData.branch_type}
                  onChange={(val) => setFormData({ ...formData, branch_type: val })}
                  placeholder="Select Campus Type"
                />
              </div>
            </div>
          </div>
        </DrawerSection>

        {/* Section 2: Geo Location & Google Maps Intelligence */}
        <div className="pt-2">
          <AddressPickerInput
            value={{
              division: formData.division,
              district: formData.district,
              street_address: formData.address,
              coordinates: formData.maps_location_query,
            }}
            onChange={(addr) => {
              setFormData((prev) => ({
                ...prev,
                division: addr.division,
                district: addr.district,
                address: addr.street_address || addr.address || '',
                maps_location_query: addr.coordinates || addr.maps_location_query || '',
              }));
            }}
            title="Campus Location & Google Map"
            subTitle="Pick exact campus pin on Google Map or select division, district and address"
            showUpazila={true}
            showPostCode={true}
          />
        </div>

        {/* Section 3: Campus Leadership & Contacts */}
        <DrawerSection title="Leadership & Contact" icon={TeacherIcon}>
          <div className="@container">
            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
              <div className="@[480px]:col-span-2">
                <TeacherSelect
                  label="Campus In-Charge"
                  teachers={staffList}
                  value={formData.in_charge_staff}
                  onChange={(val) => setFormData({ ...formData, in_charge_staff: val })}
                  allowAll={true}
                  allLabel="No Staff Assigned"
                  placeholder="Assign Staff In-Charge"
                  disabled={loadingStaff}
                />
              </div>

              <div>
                <CustomInput
                  type="phone"
                  label="Contact Phone"
                  placeholder="e.g. 01711223344"
                  value={formData.contact_phone}
                  onChange={(val) => setFormData({ ...formData, contact_phone: val })}
                />
              </div>

              <div>
                <CustomInput
                  type="email"
                  label="Contact Email"
                  placeholder="e.g. campus@institution.edu"
                  value={formData.contact_email}
                  onChange={(val) => setFormData({ ...formData, contact_email: val })}
                />
              </div>
            </div>
          </div>
        </DrawerSection>

        {/* Action Buttons */}
        <DrawerFooter
          onCancel={onCancel}
          isSubmitting={submitting}
          isSaveDisabled={!canSave}
          saveLabel={isEdit ? 'Save Changes' : 'Register Branch'}
          onSubmit={true}
        />
      </form>
    </DrawerContainer>
  );
}
