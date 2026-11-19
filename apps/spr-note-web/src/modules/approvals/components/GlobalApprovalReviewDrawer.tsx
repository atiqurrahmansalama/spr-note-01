import React, { useState, useEffect, useCallback } from 'react';
import { DrawerContainer } from '@/components/layout';
import { SpinnerIcon, AlertCircleIcon, RefreshIcon } from '@/components/ui/Icons';
import CustomButton from '@/components/ui/CustomButton';
import { useToast } from '@/context/ToastContext';
import {
  getApprovalDetail,
  approveApprovalRequest,
  rejectApprovalRequest,
  type ApprovalDecisionPayload,
} from '@/api/approvals';
import { ApprovalReviewDrawer } from './ApprovalReviewDrawer';
import { useApprovalsTranslation } from '../locales';
import type { ApprovalRequestItem } from '../types';

export interface GlobalApprovalReviewDrawerProps {
  requestId?: string;
  onClose?: () => void;
  onResolved?: () => void;
}

export const GlobalApprovalReviewDrawer: React.FC<GlobalApprovalReviewDrawerProps> = ({
  requestId,
  onClose,
  onResolved,
}) => {
  const { t } = useApprovalsTranslation();
  const { showToast } = useToast();

  const [request, setRequest] = useState<ApprovalRequestItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!requestId) {
      setError(t('missingRequestId', 'No approval request ID specified.'));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getApprovalDetail(requestId);
      setRequest(data);
    } catch (err: any) {
      setError(err?.message || t('errorLoadingDetail', 'Failed to load approval request details.'));
    } finally {
      setLoading(false);
    }
  }, [requestId, t]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleApprove = async (id: string, payload: ApprovalDecisionPayload) => {
    try {
      const result = await approveApprovalRequest(id, payload);
      showToast(
        result.message || t('requestApprovedToast', 'Approval request approved successfully.'),
        'success'
      );
      onResolved?.();
      onClose?.();
      return result;
    } catch (err: any) {
      showToast(err?.message || t('approveFailedToast', 'Failed to approve request.'), 'error');
      throw err;
    }
  };

  const handleReject = async (id: string, payload: ApprovalDecisionPayload) => {
    try {
      const result = await rejectApprovalRequest(id, payload);
      showToast(
        result.message || t('requestRejectedToast', 'Approval request rejected.'),
        'info'
      );
      onResolved?.();
      onClose?.();
      return result;
    } catch (err: any) {
      showToast(err?.message || t('rejectFailedToast', 'Failed to reject request.'), 'error');
      throw err;
    }
  };

  if (loading) {
    return (
      <DrawerContainer padding="none" spacing="normal">
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-center">
          <SpinnerIcon className="w-8 h-8 animate-spin theme-accent" />
          <p className="text-sm font-semibold theme-text-secondary">
            {t('loadingDetail', 'Loading approval request...')}
          </p>
        </div>
      </DrawerContainer>
    );
  }

  if (error || !request) {
    return (
      <DrawerContainer padding="none" spacing="normal">
        <div className="p-6 rounded-3xl theme-bg-surface border-0 space-y-4 text-center my-8">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center">
            <AlertCircleIcon className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-bold theme-text-primary">
              {t('errorLoadingDetailTitle', 'Unable to Load Request')}
            </h4>
            <p className="text-xs theme-text-secondary mt-1 max-w-xs mx-auto">
              {error || t('requestNotFound', 'The requested record could not be found.')}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <CustomButton
              type="button"
              variant="outline"
              size="sm"
              icon={RefreshIcon}
              onClick={loadDetail}
            >
              {t('retry', 'Retry')}
            </CustomButton>
            {onClose && (
              <CustomButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                {t('close', 'Close')}
              </CustomButton>
            )}
          </div>
        </div>
      </DrawerContainer>
    );
  }

  return (
    <ApprovalReviewDrawer
      key={`global-drawer-inner-${request.id}`}
      request={request}
      onApprove={handleApprove}
      onReject={handleReject}
      onClose={onClose}
    />
  );
};

export default GlobalApprovalReviewDrawer;

