import React from 'react';
import { PageContainer } from '@/components/layout';
import { ApprovalQueuePanel } from './components/ApprovalQueuePanel';
import { useApprovalsTranslation } from './locales';

export const ApprovalsHubView: React.FC = () => {
  const { t } = useApprovalsTranslation();

  return (
    <PageContainer className="pb-12 sm:pb-16 text-start">
      <ApprovalQueuePanel
        domain="ALL"
        title={t('queueTitle', 'Institutional Approvals Center')}
        subtitle={t(
          'queueSubtitle',
          'Review, adjust terms, and sanction incoming cross-domain applications and requests'
        )}
      />
    </PageContainer>
  );
};

export default ApprovalsHubView;

