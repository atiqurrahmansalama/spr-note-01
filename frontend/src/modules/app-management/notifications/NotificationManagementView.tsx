import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '@/components/ui/PageHeader';
import TabSwitcher from '@/components/ui/TabSwitcher';
import CustomButton from '@/components/ui/CustomButton';
import { PageContainer } from '@/components/layout';
import DeleteImpactModal from '@/components/common/DeleteImpactModal';
import {
  RadioTowerIcon,
  SignalIcon,
  SparklesIcon,
  TemplateIcon,
  SendIcon,
  MessageSquareIcon,
  PlusIcon,
} from '@/components/ui/Icons';
import { useToast } from '@/context/ToastContext';
import { useRightSidebar, useDrawerRegistration } from '@/context/RightSidebarContext';
import {
  GatewaysTab,
  GatewayConfigDrawer,
  GatewayPingModal,
} from './gateways';
import {
  TriggerRulesTab,
} from './triggers';
import {
  TemplateStudioTab,
  TemplateEditorDrawer,
} from './templates';
import {
  ManualBroadcastTab,
} from './broadcast';
import {
  DeliveryLogsTab,
  LogDetailDrawer,
} from './logs';
import {
  getGateways,
  deleteGateway,
  getTemplates,
  deleteTemplate,
  getDeliveryLogs,
  getDeliveryLogAnalytics,
  retryDeliveryLog,
} from '@/api/notifications';
import type {
  NotificationGateway,
  NotificationTemplate,
  NotificationDispatchLog,
  DeliveryLogAnalytics,
  DeliveryLogFilterParams,
} from '@/types/notifications';

const TABS = [
  { id: 'gateways', label: 'Gateways & API Credentials', icon: SignalIcon },
  { id: 'triggers', label: 'Automated Trigger Rules', icon: SparklesIcon },
  { id: 'templates', label: 'Message Template Studio', icon: TemplateIcon },
  { id: 'broadcast', label: 'Manual Broadcast Desk', icon: SendIcon },
  { id: 'logs', label: 'Delivery Logs & Analytics', icon: MessageSquareIcon },
];

interface DeletingItem {
  id: string;
  name: string;
  type: 'GATEWAY' | 'TEMPLATE';
}

/**
 * NotificationManagementView — Master Console Orchestrator
 * ========================================================
 * High-performance enterprise hub for multi-channel messaging,
 * automated trigger rules, template studio, broadcast desk, and delivery audit logs.
 */
export default function NotificationManagementView() {
  const { showToast } = useToast();
  const { openDrawer, closeDrawer } = useRightSidebar();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get('tab') || 'gateways';

  const setActiveTab = (tabId: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', tabId);
        return next;
      },
      { replace: true }
    );
  };

  // ─── Data States ───────────────────────────────────────────────────────────
  const [gateways, setGateways] = useState<NotificationGateway[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [logs, setLogs] = useState<NotificationDispatchLog[]>([]);
  const [logAnalytics, setLogAnalytics] = useState<DeliveryLogAnalytics>({
    total_dispatched: 0,
    delivered: 0,
    failed: 0,
    simulated: 0,
    queued: 0,
    channel_counts: {},
  });
  const [logFilters, setLogFilters] = useState<DeliveryLogFilterParams>({});
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [pingingGateway, setPingingGateway] = useState<NotificationGateway | null>(null);
  const [deletingItem, setDeletingItem] = useState<DeletingItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'gateways') {
        const gwData = await getGateways();
        setGateways(gwData);
      } else if (activeTab === 'templates') {
        const tplData = await getTemplates();
        setTemplates(tplData);
      } else if (activeTab === 'logs') {
        const [logsData, analytics] = await Promise.all([
          getDeliveryLogs(logFilters),
          getDeliveryLogAnalytics(),
        ]);
        setLogs(logsData);
        setLogAnalytics(analytics);
      }
    } catch {
      showToast('Failed to load notification records', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, logFilters, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Drawer Handlers ───────────────────────────────────────────────────────
  const handleOpenGatewayDrawer = (gwObj: NotificationGateway | null = null) => {
    openDrawer('gateway_config', {
      mode: gwObj ? 'edit' : 'add',
      id: gwObj?.id || '',
    });
  };

  const handleOpenTemplateDrawer = (tplObj: NotificationTemplate | null = null) => {
    openDrawer('template_editor', {
      mode: tplObj ? 'edit' : 'add',
      id: tplObj?.id || '',
    });
  };

  const handleOpenLogDetails = (logObj: NotificationDispatchLog) => {
    openDrawer('log_detail', {
      id: logObj.id,
    });
  };

  // ─── Drawer Registrations ──────────────────────────────────────────────────
  useDrawerRegistration('gateway_config', (params: URLSearchParams) => {
    const mode = params.get('mode') || 'add';
    const gwId = params.get('id');
    const found = gwId ? gateways.find((g) => String(g.id) === String(gwId)) : null;

    return {
      title: mode === 'add' ? 'Configure Gateway Provider' : `Edit: ${found?.provider_name.replace(/_/g, ' ') || 'Gateway'}`,
      category: 'Notification Ecosystem',
      size: 'md',
      content: (
        <GatewayConfigDrawer
          key={`gw_config_${mode}_${gwId || 'new'}`}
          gateway={found}
          onSaveSuccess={() => {
            closeDrawer();
            loadData();
          }}
          onCancel={closeDrawer}
        />
      ),
    };
  });

  useDrawerRegistration('template_editor', (params: URLSearchParams) => {
    const mode = params.get('mode') || 'add';
    const tplId = params.get('id');
    const found = tplId ? templates.find((t) => String(t.id) === String(tplId)) : null;

    return {
      title: mode === 'add' ? 'Create Message Template' : `Edit: ${found?.name || 'Template'}`,
      category: 'Notification Ecosystem',
      size: 'md',
      content: (
        <TemplateEditorDrawer
          key={`tpl_editor_${mode}_${tplId || 'new'}`}
          template={found}
          onSaveSuccess={() => {
            closeDrawer();
            loadData();
          }}
          onCancel={closeDrawer}
        />
      ),
    };
  });

  useDrawerRegistration('log_detail', (params: URLSearchParams) => {
    const logId = params.get('id');
    const found = logId ? logs.find((l) => String(l.id) === String(logId)) : null;

    return {
      title: `Dispatch Audit: ${found?.channel || ''} Log`,
      category: 'Notification Ecosystem',
      size: 'md',
      content: (
        <LogDetailDrawer
          key={`log_detail_${logId || 'new'}`}
          log={found}
          onRetry={async (logItem) => {
            try {
              const res = await retryDeliveryLog(logItem.id);
              showToast(res.message || 'Retry dispatched', 'success');
              closeDrawer();
              loadData();
            } catch (err: any) {
              showToast(err.message || 'Retry failed', 'error');
            }
          }}
          onClose={closeDrawer}
        />
      ),
    };
  });

  // ─── Delete Handlers ───────────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      if (deletingItem.type === 'GATEWAY') {
        await deleteGateway(deletingItem.id);
        showToast(`Gateway ${deletingItem.name} removed`, 'success');
      } else if (deletingItem.type === 'TEMPLATE') {
        await deleteTemplate(deletingItem.id);
        showToast(`Template ${deletingItem.name} removed`, 'success');
      }
      setDeletingItem(null);
      loadData();
    } catch {
      showToast('Failed to delete record', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <PageContainer>
      {/* ─── 1. Header Overview ────────────────────────────────────────────── */}
      <div className="print:hidden">
        <PageHeader
          icon={RadioTowerIcon}
          title="Notification Ecosystem & Control Hub"
          subtitle="Enterprise master console for multi-channel messaging gateways (SMS, WhatsApp, SMTP), automated trigger rules, template studio, and delivery audit logs."
        />
      </div>

      {/* ─── 2. Top Tab Switcher with Quick Action ──────────────────────────── */}
      <div className="print:hidden">
        <TabSwitcher
          tabs={TABS}
          activeTab={activeTab}
          onChange={setActiveTab}
          rightContent={
            activeTab === 'gateways' ? (
              <CustomButton
                type="button"
                variant="primary"
                size="sm"
                icon={PlusIcon}
                onClick={() => handleOpenGatewayDrawer(null)}
              >
                <span className="hidden sm:inline">Add Gateway</span>
              </CustomButton>
            ) : activeTab === 'templates' ? (
              <CustomButton
                type="button"
                variant="primary"
                size="sm"
                icon={PlusIcon}
                onClick={() => handleOpenTemplateDrawer(null)}
              >
                <span className="hidden sm:inline">Create Template</span>
              </CustomButton>
            ) : null
          }
        />
      </div>

      {/* ─── 3. Dynamic Tab Workspaces ─────────────────────────────────────── */}
      {activeTab === 'gateways' && (
        <GatewaysTab
          gateways={gateways}
          loading={loading}
          onOpenGatewayDrawer={handleOpenGatewayDrawer}
          onOpenPingModal={(gw) => setPingingGateway(gw)}
          onDeleteGateway={(gw) =>
            setDeletingItem({
              id: gw.id,
              name: gw.provider_name.replace(/_/g, ' '),
              type: 'GATEWAY',
            })
          }
          onRefreshData={loadData}
        />
      )}

      {activeTab === 'triggers' && (
        <TriggerRulesTab />
      )}

      {activeTab === 'templates' && (
        <TemplateStudioTab
          templates={templates}
          loading={loading}
          onOpenTemplateDrawer={handleOpenTemplateDrawer}
          onDeleteTemplate={(tpl) =>
            setDeletingItem({
              id: tpl.id,
              name: tpl.name,
              type: 'TEMPLATE',
            })
          }
          onRefreshData={loadData}
        />
      )}

      {activeTab === 'broadcast' && (
        <ManualBroadcastTab />
      )}

      {activeTab === 'logs' && (
        <DeliveryLogsTab
          logs={logs}
          analytics={logAnalytics}
          loading={loading}
          onFilterChange={(newFilters) => {
            setLogFilters(newFilters);
          }}
          onOpenLogDetails={handleOpenLogDetails}
          onRetryLog={async (logItem) => {
            try {
              const res = await retryDeliveryLog(logItem.id);
              showToast(res.message || 'Retry dispatched', 'success');
              loadData();
            } catch (err: any) {
              showToast(err.message || 'Retry failed', 'error');
            }
          }}
        />
      )}

      {/* ─── Gateway Ping Test Modal ───────────────────────────────────────── */}
      {pingingGateway && (
        <GatewayPingModal
          isOpen={Boolean(pingingGateway)}
          onClose={() => setPingingGateway(null)}
          gateway={pingingGateway}
          onSuccess={loadData}
        />
      )}

      {/* ─── Delete Impact Modal ──────────────────────────────────────────── */}
      <DeleteImpactModal
        isOpen={Boolean(deletingItem)}
        onClose={() => !isDeleting && setDeletingItem(null)}
        onConfirm={handleConfirmDelete}
        onDirectDelete={handleConfirmDelete}
        title={`Remove ${deletingItem?.type === 'GATEWAY' ? 'Gateway Provider' : 'Message Template'}`}
        subtitle={`You are about to remove "${deletingItem?.name}".`}
        entityName={deletingItem?.name || ''}
        itemName={deletingItem?.name || ''}
        entityType={deletingItem?.type === 'GATEWAY' ? 'Notification Gateway' : 'Message Template'}
        itemType={deletingItem?.type === 'GATEWAY' ? 'Notification Gateway' : 'Message Template'}
        impactData={null}
        onMigrate={undefined}
        onMigrateOpen={undefined}
        requireAck={false}
        requireNameMatch={false}
        isDeleting={isDeleting}
        confirmButtonText="Confirm Removal"
        warningMessage="Removing this record may affect automated event notifications dispatched through this configuration."
      />
    </PageContainer>
  );
}
