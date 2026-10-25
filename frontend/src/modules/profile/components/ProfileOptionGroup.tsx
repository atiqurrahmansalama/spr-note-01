import React from 'react';

interface ProfileOptionGroupProps {
  title?: string;
  children: React.ReactNode;
}

export const ProfileOptionGroup: React.FC<ProfileOptionGroupProps> = ({ title, children }) => {
  return (
    <div className="space-y-2">
      {title && (
        <h2 className="text-xs font-bold uppercase tracking-wider theme-text-secondary px-1">
          {title}
        </h2>
      )}
      <div className="theme-bg-surface border theme-border rounded-2xl overflow-hidden shadow-xs divide-y divide-[var(--border-color)]">
        {children}
      </div>
    </div>
  );
};

export default ProfileOptionGroup;
