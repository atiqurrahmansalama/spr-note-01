import React, { useState, useRef, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useFont } from '../../context/useFont';
import { DepartmentIcon, CheckCircleIcon, SearchIcon, PlusIcon, CloseIcon } from '../ui/Icons';
import { useNavigate } from 'react-router-dom';

export default function InstitutionSwitcher() {
  const { activeFont } = useFont();
  const {
    institutions,
    currentInstitution,
    activeTenantId,
    isMultiTenantAdmin,
    requestSwitchInstitution,
    isLoadingInstitutions,
  } = useTenant();

  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const filteredInstitutions = institutions.filter((inst) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (inst.name && inst.name.toLowerCase().includes(q)) ||
      (inst.bangla_name && inst.bangla_name.toLowerCase().includes(q)) ||
      (inst.district && inst.district.toLowerCase().includes(q)) ||
      (inst.slug && inst.slug.toLowerCase().includes(q))
    );
  });

  // Regular Institutional User Badge
  if (!isMultiTenantAdmin) {
    if (!currentInstitution) return null;
    return (
      <div 
        style={{ fontFamily: activeFont?.css }}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl theme-bg-sub border theme-border shadow-xs text-xs"
      >
        <div className="w-5 h-5 rounded-lg theme-bg-accent-soft border theme-border flex items-center justify-center theme-accent">
          <DepartmentIcon className="w-3.5 h-3.5" />
        </div>
        <div className="flex flex-col text-left">
          <span className="font-bold theme-text-primary text-[11px] leading-tight line-clamp-1">
            {currentInstitution.name}
          </span>
          <span className="text-[9px] theme-text-secondary leading-none">
            {currentInstitution.district || currentInstitution.institution_type || 'Academic Tenant'}
          </span>
        </div>
        {currentInstitution.is_verified && (
          <CheckCircleIcon className="w-3.5 h-3.5 theme-accent shrink-0 ml-0.5" />
        )}
      </div>
    );
  }

  // Super Admin Multi-Tenant Dropdown Switcher
  const isAllSelected = activeTenantId === 'ALL' || !currentInstitution;

  return (
    <div className="relative" ref={dropdownRef} style={{ fontFamily: activeFont?.css }}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer select-none text-xs font-medium ${
          isOpen
            ? 'theme-bg-elevated theme-border shadow-md ring-2 ring-[var(--accent-main)]/20'
            : 'theme-bg-sub theme-border hover:theme-bg-elevated'
        }`}
        title="Switch Institutional Context"
      >
        <div className="w-5 h-5 rounded-lg theme-bg-accent-soft border theme-border flex items-center justify-center theme-accent shrink-0">
          <DepartmentIcon className="w-3.5 h-3.5" />
        </div>

        <div className="flex flex-col text-left max-w-[140px] sm:max-w-[180px]">
          <span className="font-bold theme-text-primary text-[11px] leading-tight truncate">
            {isAllSelected
              ? 'All Institutions'
              : currentInstitution?.name || 'Select Institution'}
          </span>
          <span className="text-[9px] theme-accent font-mono leading-none flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full theme-bg-accent animate-pulse"></span>
            {isAllSelected ? 'Global Scope' : currentInstitution?.slug || 'Tenant'}
          </span>
        </div>

        <svg
          className={`w-3.5 h-3.5 theme-text-secondary transition-transform duration-200 ${
            isOpen ? 'rotate-180 theme-accent' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 sm:left-0 top-full mt-2 w-80 sm:w-96 rounded-2xl theme-bg-surface border theme-border shadow-2xl z-50 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="p-3 border-b theme-border theme-bg-sub flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DepartmentIcon className="w-4 h-4 theme-accent" />
              <div>
                <h4 className="text-xs font-bold theme-text-primary">Institution Switcher</h4>
                <p className="text-[10px] theme-text-secondary">Switch row-level data scope</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/app-management/institutions');
              }}
              className="px-2 py-1 rounded-lg theme-bg-accent-soft hover:opacity-90 theme-accent border theme-border text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <PlusIcon className="w-3 h-3" />
              <span>Manage</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="p-2.5 border-b theme-border theme-bg-sub">
            <div className="relative">
              <SearchIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 theme-text-secondary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, district, or slug..."
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl theme-bg-elevated border theme-border theme-text-primary placeholder:theme-text-secondary/60 focus:outline-none focus:border-[var(--accent-main)]"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 theme-text-secondary hover:theme-text-primary cursor-pointer"
                >
                  <CloseIcon className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* List options */}
          <div className="max-h-64 overflow-y-auto p-1.5 space-y-1">
            {/* Global All Institutions Option */}
            <button
              type="button"
              onClick={() => {
                requestSwitchInstitution('ALL');
                setIsOpen(false);
              }}
              className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between transition cursor-pointer ${
                isAllSelected
                  ? 'theme-bg-accent-soft border theme-border theme-accent font-semibold'
                  : 'hover:theme-bg-sub theme-text-primary border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg theme-bg-accent-soft border theme-border flex items-center justify-center theme-accent shrink-0">
                  <DepartmentIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <span>All Institutions</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono theme-bg-elevated theme-text-secondary border theme-border">
                      Global
                    </span>
                  </div>
                  <div className="text-[10px] theme-text-secondary">View aggregate data across all tenants</div>
                </div>
              </div>
              {isAllSelected && <CheckCircleIcon className="w-4 h-4 theme-accent shrink-0" />}
            </button>

            {isLoadingInstitutions ? (
              <div className="py-6 text-center text-xs theme-text-secondary flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-[var(--accent-main)] border-t-transparent rounded-full animate-spin"></div>
                <span>Loading institutions...</span>
              </div>
            ) : filteredInstitutions.length === 0 ? (
              <div className="py-6 text-center text-xs theme-text-secondary">
                No matching institutions found
              </div>
            ) : (
              filteredInstitutions.map((inst) => {
                const isSelected = String(activeTenantId) === String(inst.id);
                return (
                  <button
                    key={inst.id}
                    type="button"
                    onClick={() => {
                      requestSwitchInstitution(inst);
                      setIsOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between transition cursor-pointer ${
                      isSelected
                        ? 'theme-bg-accent-soft border theme-border theme-accent font-semibold'
                        : 'hover:theme-bg-sub theme-text-primary border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg theme-bg-elevated border theme-border flex items-center justify-center theme-text-primary shrink-0 font-bold text-xs">
                        {inst.logo_url ? (
                          <img src={inst.logo_url} alt="" className="w-full h-full rounded-lg object-cover" />
                        ) : (
                          inst.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold flex items-center gap-1.5 truncate">
                          <span className="truncate">{inst.name}</span>
                          {inst.is_verified && (
                            <CheckCircleIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
                          )}
                        </div>
                        <div className="text-[10px] theme-text-secondary flex items-center gap-1.5 truncate">
                          <span>{inst.district || 'Bangladesh'}</span>
                          <span>•</span>
                          <span className="font-mono theme-accent">{inst.slug}</span>
                          {inst.total_students_count !== undefined && (
                            <>
                              <span>•</span>
                              <span>{inst.total_students_count} students</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {isSelected && <CheckCircleIcon className="w-4 h-4 theme-accent shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
