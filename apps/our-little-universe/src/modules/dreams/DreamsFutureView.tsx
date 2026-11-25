import React from 'react';
import { CollapsiblePageHeader, CustomButton } from '@repo/ui';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftNavIcon, SparklesIcon } from '../../components/icons/UniverseIcons';

export const DreamsFutureView: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="@container max-w-4xl w-full mx-auto p-4 sm:p-8 pb-20 space-y-6">
      <CollapsiblePageHeader
        title="Dream World & Future"
        subtitle="Shared bucket list, future wishes, and milestones waiting to be lived."
        icon={SparklesIcon}
        badge="Dream World"
        collapsible={false}
      />

      <div className="p-8 rounded-3xl theme-bg-surface shadow-xs text-center space-y-4 border-0">
        <div className="w-14 h-14 mx-auto rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center">
          <SparklesIcon className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold theme-text-primary">Our Shared Future Canvas</h3>
        <p className="text-xs theme-text-secondary max-w-md mx-auto leading-relaxed">
          This chamber is ready inside your Module Registry and will grow with shared wishes, travel dreams, and milestone goals.
        </p>
        <div className="pt-1">
          <CustomButton variant="soft" size="sm" icon={ArrowLeftNavIcon} onClick={() => navigate('/dashboard')}>
            Back to Love Map
          </CustomButton>
        </div>
      </div>
    </div>
  );
};

export default DreamsFutureView;
