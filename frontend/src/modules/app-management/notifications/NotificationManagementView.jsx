import React, { useState, useEffect } from 'react';
import {
  BellIcon,
  MailIcon,
  WhatsappIcon,
  MessageSquareIcon,
  SendIcon,
  RadioTowerIcon,
  TemplateIcon,
  SignalIcon,
  PlusIcon,
  CloseIcon,
  CheckCircle2Icon,
  SettingsIcon,
  SparklesIcon,
  TeacherIcon,
  GroupsIcon,
  BuildingOfficeIcon,
} from '../../../components/ui/Icons';
import {
  getGateways,
  createGateway,
  updateGateway,
  deleteGateway,
  testPingGateway,
  getGatewayBalance,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  seedDefaultTemplates,
  getTriggerRulesMatrix,
  batchUpdateTriggerRules,
  getDeliveryLogs,
  getDeliveryLogAnalytics,
  retryDeliveryLog,
  sendManualBroadcast,
} from '../../../api/notifications';
import { useToast } from '../../../context/ToastContext';
import { fetchWithAuth } from '../../../utils/authService';

const AVAILABLE_TAGS = [
  { tag: '{student_name}', label: 'Student Name' },
  { tag: '{class_name}', label: 'Class / Track' },
  { tag: '{roll_number}', label: 'Roll Number' },
  { tag: '{guardian_name}', label: 'Guardian Name' },
  { tag: '{institution_name}', label: 'Institution' },
  { tag: '{date}', label: 'Date' },
  { tag: '{time}', label: 'Time' },
  { tag: '{action_url}', label: 'Action Link' },
  { tag: '{staff_name}', label: 'Staff Name' },
];

export default function NotificationManagementView() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('gateways'); // 'gateways' | 'triggers' | 'templates' | 'broadcast' | 'logs'
  const [loading, setLoading] = useState(false);

  // Tab 1: Gateways State
  const [gateways, setGateways] = useState([]);
  const [editingGateway, setEditingGateway] = useState(null);
  const [isGatewayModalOpen, setIsGatewayModalOpen] = useState(false);
  const [pingModal, setPingModal] = useState({ isOpen: false, gateway: null, target: '', result: null, loading: false });

  // Tab 2: Trigger Rules State
  const [triggersMatrix, setTriggersMatrix] = useState([]);
  const [isSavingTriggers, setIsSavingTriggers] = useState(false);

  // Tab 3: Templates State
  const [templates, setTemplates] = useState([]);
  const [templateSearch, setTemplateSearch] = useState('');
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // Tab 4: Manual Broadcast State
  const [broadcastForm, setBroadcastForm] = useState({
    target_audience: 'ALL',
    class_id: '',
    channels: ['IN_APP', 'SMS'],
    title: 'Institutional Announcement',
    message: '',
    notification_type: 'INFO',
    action_url: '',
  });
  const [classesList, setClassesList] = useState([]);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Tab 5: Delivery Logs State
  const [logs, setLogs] = useState([]);
  const [logAnalytics, setLogAnalytics] = useState({ total_dispatched: 0, delivered: 0, failed: 0, simulated: 0, queued: 0, channel_counts: {} });
  const [logFilters, setLogFilters] = useState({ search: '', channel: 'ALL', status: 'ALL' });
  const [logDetailModal, setLogDetailModal] = useState({ isOpen: false, log: null });

  // Initial Data Fetching
  useEffect(() => {
    loadAllData();
  }, [activeTab]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'gateways') {
        const gwData = await getGateways();
        setGateways(gwData);
      } else if (activeTab === 'triggers') {
        const [matrix, tpls] = await Promise.all([getTriggerRulesMatrix(), getTemplates()]);
        setTriggersMatrix(matrix);
        setTemplates(tpls);
      } else if (activeTab === 'templates') {
        const tplData = await getTemplates();
        setTemplates(tplData);
      } else if (activeTab === 'broadcast') {
        fetchWithAuth('/api/v1/classes/')
          .then((res) => (res.ok ? res.json() : []))
          .then((data) => setClassesList(Array.isArray(data) ? data : (data.results || [])))
          .catch(() => {});
      } else if (activeTab === 'logs') {
        const [logsData, analytics] = await Promise.all([
          getDeliveryLogs(logFilters),
          getDeliveryLogAnalytics(),
        ]);
        setLogs(logsData);
        setLogAnalytics(analytics);
      }
    } catch (err) {
      console.error('Failed to load notification hub data:', err);
      showToast('Error loading notification data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // TAB 1: GATEWAYS HANDLERS
  // ==========================================

  const handleOpenGatewayModal = (gw = null) => {
    setEditingGateway(
      gw || {
        gateway_type: 'SMS',
        provider_name: 'SSL_WIRELESS',
        api_key: '',
        api_secret_or_token: '',
        sender_id_or_phone: '',
        api_url: '',
        port: 587,
        use_tls_ssl: true,
        is_active: true,
      }
    );
    setIsGatewayModalOpen(true);
  };

  const handleSaveGateway = async (e) => {
    e.preventDefault();
    try {
      if (editingGateway.id) {
        await updateGateway(editingGateway.id, editingGateway);
        showToast('Gateway configuration updated successfully', 'success');
      } else {
        await createGateway(editingGateway);
        showToast('New gateway credentials saved', 'success');
      }
      setIsGatewayModalOpen(false);
      const gwData = await getGateways();
      setGateways(gwData);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteGateway = async (id) => {
    if (!window.confirm('Are you sure you want to delete this gateway configuration?')) return;
    try {
      await deleteGateway(id);
      showToast('Gateway removed', 'success');
      setGateways((prev) => prev.filter((g) => g.id !== id));
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleToggleGatewayActive = async (gw) => {
    try {
      const updated = await updateGateway(gw.id, { is_active: !gw.is_active });
      setGateways((prev) => prev.map((g) => (g.id === gw.id ? updated : g)));
      showToast(`Gateway ${updated.is_active ? 'Activated' : 'Deactivated'}`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleOpenPingModal = (gw) => {
    setPingModal({
      isOpen: true,
      gateway: gw,
      target: gw.gateway_type === 'SMTP_EMAIL' ? 'test@example.com' : '01700000000',
      result: null,
      loading: false,
    });
  };

  const handleExecutePing = async () => {
    setPingModal((prev) => ({ ...prev, loading: true, result: null }));
    try {
      const res = await testPingGateway(pingModal.gateway.id, pingModal.target);
      setPingModal((prev) => ({ ...prev, result: res, loading: false }));
      showToast(`Ping Test: ${res.status}`, res.status === 'SUCCESS' ? 'success' : 'warning');
      const gwData = await getGateways();
      setGateways(gwData);
    } catch (err) {
      setPingModal((prev) => ({
        ...prev,
        result: { status: 'FAILED', error: err.message },
        loading: false,
      }));
      showToast(err.message, 'error');
    }
  };

  // ==========================================
  // TAB 2: TRIGGER RULES MATRIX HANDLERS
  // ==========================================

  const handleToggleTriggerChannel = (eventKey, channel) => {
    setTriggersMatrix((prev) =>
      prev.map((item) => {
        if (item.event_type === eventKey) {
          const currentChannels = item.channels || [];
          const exists = currentChannels.includes(channel);
          const nextChannels = exists
            ? currentChannels.filter((c) => c !== channel)
            : [...currentChannels, channel];
          return { ...item, channels: nextChannels };
        }
        return item;
      })
    );
  };

  const handleToggleTriggerActive = (eventKey) => {
    setTriggersMatrix((prev) =>
      prev.map((item) =>
        item.event_type === eventKey ? { ...item, is_enabled: !item.is_enabled } : item
      )
    );
  };

  const handleSelectTriggerTemplate = (eventKey, templateId) => {
    setTriggersMatrix((prev) =>
      prev.map((item) =>
        item.event_type === eventKey ? { ...item, template: templateId } : item
      )
    );
  };

  const handleSaveTriggersMatrix = async () => {
    setIsSavingTriggers(true);
    try {
      await batchUpdateTriggerRules(triggersMatrix);
      showToast('Automated trigger matrix updated successfully', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSavingTriggers(false);
    }
  };

  // ==========================================
  // TAB 3: MESSAGE TEMPLATES HANDLERS
  // ==========================================

  const handleOpenTemplateModal = (tpl = null) => {
    setEditingTemplate(
      tpl || {
        name: '',
        event_type: 'CUSTOM',
        subject: '',
        body: '',
        available_tags: ['student_name', 'class_name', 'date', 'institution_name'],
      }
    );
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    try {
      if (editingTemplate.id) {
        await updateTemplate(editingTemplate.id, editingTemplate);
        showToast('Template updated successfully', 'success');
      } else {
        await createTemplate(editingTemplate);
        showToast('New template created', 'success');
      }
      setIsTemplateModalOpen(false);
      const tpls = await getTemplates();
      setTemplates(tpls);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm('Delete this message template?')) return;
    try {
      await deleteTemplate(id);
      showToast('Template deleted', 'success');
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleSeedDefaultTemplates = async () => {
    try {
      const res = await seedDefaultTemplates();
      showToast(res.message, 'success');
      setTemplates(res.templates || []);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleInsertTag = (tag) => {
    if (!editingTemplate) return;
    setEditingTemplate((prev) => ({
      ...prev,
      body: `${prev.body || ''} ${tag} `.trimStart(),
    }));
  };

  // ==========================================
  // TAB 4: MANUAL BROADCAST HANDLERS
  // ==========================================

  const handleToggleBroadcastChannel = (channel) => {
    setBroadcastForm((prev) => {
      const exists = prev.channels.includes(channel);
      const next = exists
        ? prev.channels.filter((c) => c !== channel)
        : [...prev.channels, channel];
      return { ...prev, channels: next.length > 0 ? next : ['IN_APP'] };
    });
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastForm.message.trim()) {
      showToast('Please enter announcement message', 'warning');
      return;
    }
    if (!window.confirm(`Are you sure you want to dispatch this broadcast to '${broadcastForm.target_audience}' across [${broadcastForm.channels.join(', ')}]?`)) return;

    setIsBroadcasting(true);
    try {
      const res = await sendManualBroadcast(broadcastForm);
      showToast(res.message, 'success');
      setBroadcastForm({
        target_audience: 'ALL',
        class_id: '',
        channels: ['IN_APP', 'SMS'],
        title: 'Institutional Announcement',
        message: '',
        notification_type: 'INFO',
        action_url: '',
      });
      window.dispatchEvent(new CustomEvent('spr_notification_refresh'));
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsBroadcasting(false);
    }
  };

  // ==========================================
  // TAB 5: LOGS HANDLERS
  // ==========================================

  const handleFilterLogs = async () => {
    setLoading(true);
    try {
      const logsData = await getDeliveryLogs(logFilters);
      setLogs(logsData);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryLog = async (id) => {
    try {
      const res = await retryDeliveryLog(id);
      showToast(res.message, 'success');
      const [logsData, analytics] = await Promise.all([
        getDeliveryLogs(logFilters),
        getDeliveryLogAnalytics(),
      ]);
      setLogs(logsData);
      setLogAnalytics(analytics);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b theme-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center border theme-border shadow-sm">
              <RadioTowerIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black theme-text-primary tracking-tight">
                Notification Ecosystem & Control Hub
              </h1>
              <p className="text-xs sm:text-sm theme-text-secondary mt-0.5 font-medium">
                Multi-channel SMS gateways, WhatsApp Cloud API, event triggers, template studio & delivery audit logs.
              </p>
            </div>
          </div>
        </div>

        {/* Global Live Status Indicator */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="px-3.5 py-1.5 rounded-xl theme-bg-sub border theme-border flex items-center gap-2 text-xs font-bold theme-text-primary">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Dispatcher Engine Active</span>
          </div>
        </div>
      </div>

      {/* 5-Tab Navigation Bar */}
      <div className="flex border-b theme-border overflow-x-auto gap-1 sm:gap-2 custom-scrollbar">
        {[
          { id: 'gateways', label: 'Gateways & API Credentials', Icon: SignalIcon },
          { id: 'triggers', label: 'Automated Trigger Rules', Icon: SparklesIcon },
          { id: 'templates', label: 'Message Template Studio', Icon: TemplateIcon },
          { id: 'broadcast', label: 'Manual Broadcast Desk', Icon: SendIcon },
          { id: 'logs', label: 'Delivery Logs & Analytics', Icon: MessageSquareIcon },
        ].map((tab) => {
          const TabIcon = tab.Icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-3 px-3.5 sm:px-4 rounded-t-2xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer border-b-2 ${
                isActive
                  ? 'theme-bg-accent-soft theme-accent border-[var(--accent-main)]'
                  : 'border-transparent theme-text-secondary hover:theme-text-primary hover:theme-bg-sub'
              }`}
            >
              <TabIcon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: GATEWAYS & API CREDENTIALS                                         */}
      {/* ========================================================================= */}
      {activeTab === 'gateways' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider theme-text-primary">
                Configured Notification Gateways
              </h3>
              <p className="text-xs theme-text-secondary mt-0.5">
                Set up live API credentials for outbound SMS, WhatsApp Meta API, and SMTP email servers.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenGatewayModal()}
              className="px-4 py-2.5 rounded-2xl theme-bg-accent theme-accent-text text-xs font-bold shadow-md hover:opacity-90 transition-all flex items-center gap-2 cursor-pointer"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Configure New Gateway</span>
            </button>
          </div>

          {gateways.length === 0 ? (
            <div className="p-12 text-center rounded-3xl theme-bg-surface border theme-border">
              <div className="w-12 h-12 rounded-full theme-bg-sub flex items-center justify-center mx-auto mb-3 theme-text-secondary">
                <SignalIcon className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold theme-text-primary">No External Gateways Configured</h4>
              <p className="text-xs theme-text-secondary max-w-md mx-auto mt-1 mb-5">
                In-app bell notifications work out-of-the-box. Add SMS or WhatsApp credentials to send instant phone alerts.
              </p>
              <button
                type="button"
                onClick={() => handleOpenGatewayModal()}
                className="px-4 py-2 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold cursor-pointer hover:opacity-90"
              >
                Add First Gateway
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {gateways.map((gw) => (
                <div
                  key={gw.id}
                  className="rounded-3xl theme-bg-surface border theme-border p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all relative overflow-hidden"
                >
                  <div className="space-y-3">
                    {/* Card Top: Type, Provider, Status Toggle */}
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase theme-bg-accent-soft theme-accent border theme-border">
                        {gw.gateway_type_display}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleGatewayActive(gw)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                          gw.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'theme-bg-sub theme-text-secondary border theme-border'
                        }`}
                      >
                        {gw.is_active ? 'Active' : 'Disabled'}
                      </button>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold theme-text-primary">{gw.provider_name_display}</h4>
                      <p className="text-xs theme-text-secondary mt-0.5 truncate font-mono">
                        {gw.sender_id_or_phone ? `Sender: ${gw.sender_id_or_phone}` : (gw.api_url || 'Default Endpoint')}
                      </p>
                    </div>

                    {/* Metadata Pill Box */}
                    <div className="p-3 rounded-2xl theme-bg-sub border theme-border space-y-1.5 text-[11px]">
                      <div className="flex justify-between">
                        <span className="theme-text-secondary">API Key / Token:</span>
                        <span className="font-mono font-bold theme-text-primary">
                          {gw.api_key ? `${gw.api_key.substring(0, 6)}••••••` : '(Empty)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="theme-text-secondary">Secret Configured:</span>
                        <span className="font-bold theme-text-primary">
                          {gw.is_secret_configured ? 'Yes' : 'No'}
                        </span>
                      </div>
                      {gw.gateway_type === 'SMS' && (
                        <div className="flex justify-between">
                          <span className="theme-text-secondary">Cached Balance:</span>
                          <span className="font-bold theme-accent">
                            {gw.balance_cache != null ? `৳ ${gw.balance_cache}` : '--'}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="theme-text-secondary">Last Ping Status:</span>
                        <span className={`font-bold ${gw.last_ping_status === 'SUCCESS' ? 'text-emerald-400' : 'theme-text-secondary'}`}>
                          {gw.last_ping_status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex items-center justify-between gap-2 border-t theme-border pt-4 mt-4">
                    <button
                      type="button"
                      onClick={() => handleOpenPingModal(gw)}
                      className="px-3 py-1.5 rounded-xl theme-bg-elevated hover:theme-bg-sub border theme-border text-xs font-bold theme-text-primary transition cursor-pointer flex items-center gap-1.5"
                    >
                      <SignalIcon className="w-3.5 h-3.5 theme-accent" />
                      <span>Test Ping</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenGatewayModal(gw)}
                        className="p-1.5 rounded-xl theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition cursor-pointer"
                        title="Edit Credentials"
                      >
                        <SettingsIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteGateway(gw.id)}
                        className="p-1.5 rounded-xl theme-danger hover:bg-rose-500/10 transition cursor-pointer"
                        title="Delete Gateway"
                      >
                        <CloseIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AUTOMATED TRIGGER RULES                                            */}
      {/* ========================================================================= */}
      {activeTab === 'triggers' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider theme-text-primary">
                Event vs Channel Routing Matrix
              </h3>
              <p className="text-xs theme-text-secondary mt-0.5">
                Toggle channels and attach message templates for academic events.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveTriggersMatrix}
              disabled={isSavingTriggers}
              className="px-4 py-2.5 rounded-2xl theme-bg-accent theme-accent-text text-xs font-bold shadow-md hover:opacity-90 transition-all flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2Icon className="w-4 h-4" />
              <span>{isSavingTriggers ? 'Saving Matrix...' : 'Save Trigger Rules Matrix'}</span>
            </button>
          </div>

          <div className="rounded-3xl theme-bg-surface border theme-border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b theme-border theme-bg-sub/60 text-xs font-bold uppercase theme-text-secondary">
                    <th className="py-3.5 px-4">Event Trigger</th>
                    <th className="py-3.5 px-3 text-center">In-App</th>
                    <th className="py-3.5 px-3 text-center">SMS</th>
                    <th className="py-3.5 px-3 text-center">WhatsApp</th>
                    <th className="py-3.5 px-3 text-center">Email</th>
                    <th className="py-3.5 px-4">Attached Template</th>
                    <th className="py-3.5 px-4 text-center">Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y theme-border">
                  {triggersMatrix.map((item) => {
                    const currentChannels = item.channels || [];
                    return (
                      <tr key={item.event_type} className="hover:theme-bg-sub/30 transition">
                        <td className="py-4 px-4">
                          <div className="font-bold theme-text-primary text-xs sm:text-sm">
                            {item.event_type_display || item.event_type}
                          </div>
                          <div className="text-[10px] theme-text-secondary font-mono mt-0.5">
                            {item.event_type}
                          </div>
                        </td>

                        {/* In-App Checkbox */}
                        <td className="py-4 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={currentChannels.includes('IN_APP')}
                            onChange={() => handleToggleTriggerChannel(item.event_type, 'IN_APP')}
                            className="w-4 h-4 rounded theme-border text-[var(--accent-main)] cursor-pointer"
                          />
                        </td>

                        {/* SMS Checkbox */}
                        <td className="py-4 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={currentChannels.includes('SMS')}
                            onChange={() => handleToggleTriggerChannel(item.event_type, 'SMS')}
                            className="w-4 h-4 rounded theme-border text-[var(--accent-main)] cursor-pointer"
                          />
                        </td>

                        {/* WhatsApp Checkbox */}
                        <td className="py-4 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={currentChannels.includes('WHATSAPP')}
                            onChange={() => handleToggleTriggerChannel(item.event_type, 'WHATSAPP')}
                            className="w-4 h-4 rounded theme-border text-[var(--accent-main)] cursor-pointer"
                          />
                        </td>

                        {/* Email Checkbox */}
                        <td className="py-4 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={currentChannels.includes('EMAIL')}
                            onChange={() => handleToggleTriggerChannel(item.event_type, 'EMAIL')}
                            className="w-4 h-4 rounded theme-border text-[var(--accent-main)] cursor-pointer"
                          />
                        </td>

                        {/* Attached Template Selector */}
                        <td className="py-4 px-4 min-w-[200px]">
                          <select
                            value={item.template || ''}
                            onChange={(e) => handleSelectTriggerTemplate(item.event_type, e.target.value || null)}
                            className="w-full px-3 py-1.5 rounded-xl theme-bg-sub border theme-border text-xs font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] cursor-pointer"
                          >
                            <option value="">-- Default System Template --</option>
                            {templates
                              .filter((t) => t.event_type === item.event_type || t.event_type === 'CUSTOM')
                              .map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
                              ))}
                          </select>
                        </td>

                        {/* Active Switch */}
                        <td className="py-4 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleTriggerActive(item.event_type)}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold cursor-pointer transition ${
                              item.is_enabled
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'theme-bg-sub theme-text-secondary border theme-border'
                            }`}
                          >
                            {item.is_enabled ? 'Enabled' : 'Disabled'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MESSAGE TEMPLATE STUDIO                                            */}
      {/* ========================================================================= */}
      {activeTab === 'templates' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <input
                type="text"
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                placeholder="Search templates by title or content..."
                className="w-full sm:w-72 px-4 py-2 rounded-2xl theme-bg-surface border theme-border text-xs font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)]"
              />
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleSeedDefaultTemplates}
                className="px-3.5 py-2 rounded-2xl theme-bg-sub hover:theme-bg-elevated border theme-border text-xs font-bold theme-text-primary transition cursor-pointer"
              >
                Reset Default Presets
              </button>
              <button
                type="button"
                onClick={() => handleOpenTemplateModal()}
                className="px-4 py-2 rounded-2xl theme-bg-accent theme-accent-text text-xs font-bold shadow-md hover:opacity-90 transition flex items-center gap-2 cursor-pointer"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Create Template</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {templates
              .filter(
                (t) =>
                  !templateSearch ||
                  t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
                  t.body.toLowerCase().includes(templateSearch.toLowerCase())
              )
              .map((tpl) => {
                const charLen = (tpl.body || '').length;
                const smsParts = Math.ceil(charLen / 160) || 1;
                return (
                  <div
                    key={tpl.id}
                    className="rounded-3xl theme-bg-surface border theme-border p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition space-y-4"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase theme-bg-accent-soft theme-accent border theme-border">
                          {tpl.event_type_display || tpl.event_type}
                        </span>
                        {tpl.is_system_default && (
                          <span className="text-[10px] font-bold theme-text-secondary px-2 py-0.5 rounded-lg theme-bg-sub border theme-border">
                            System Default
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold theme-text-primary">{tpl.name}</h4>

                      {tpl.subject && (
                        <div className="text-xs font-semibold theme-text-secondary">
                          <span className="font-bold theme-text-primary">Subject:</span> {tpl.subject}
                        </div>
                      )}

                      <div className="p-3.5 rounded-2xl theme-bg-sub border theme-border text-xs leading-relaxed theme-text-primary whitespace-pre-wrap font-sans">
                        {tpl.body}
                      </div>

                      <div className="flex items-center justify-between text-[11px] theme-text-secondary pt-1">
                        <span>{charLen} characters</span>
                        <span>{smsParts} SMS part{smsParts > 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t theme-border pt-3">
                      <button
                        type="button"
                        onClick={() => handleOpenTemplateModal(tpl)}
                        className="px-3 py-1.5 rounded-xl theme-bg-sub hover:theme-bg-elevated border theme-border text-xs font-bold theme-text-primary cursor-pointer transition"
                      >
                        Edit Template
                      </button>
                      {!tpl.is_system_default && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(tpl.id)}
                          className="px-3 py-1.5 rounded-xl theme-danger hover:bg-rose-500/10 border border-transparent text-xs font-bold cursor-pointer transition"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MANUAL BROADCAST DESK                                              */}
      {/* ========================================================================= */}
      {activeTab === 'broadcast' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Left: Composer Form (2 Cols) */}
          <div className="lg:col-span-2 rounded-3xl theme-bg-surface border theme-border p-6 shadow-sm space-y-5">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider theme-text-primary">
                Multi-Channel Announcement Composer
              </h3>
              <p className="text-xs theme-text-secondary mt-0.5">
                Send manual mass notifications instantly to students, parents, or staff.
              </p>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-4">
              {/* Target Audience */}
              <div>
                <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-1.5">
                  Target Recipient Group
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'ALL', label: 'All Institution', Icon: BuildingOfficeIcon },
                    { id: 'STUDENTS', label: 'All Students', Icon: GroupsIcon },
                    { id: 'CLASS', label: 'Specific Class', Icon: GroupsIcon },
                    { id: 'TEACHERS', label: 'All Teachers', Icon: TeacherIcon },
                  ].map((aud) => {
                    const AudIcon = aud.Icon;
                    const isSelected = broadcastForm.target_audience === aud.id;
                    return (
                      <button
                        key={aud.id}
                        type="button"
                        onClick={() => setBroadcastForm((prev) => ({ ...prev, target_audience: aud.id }))}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                          isSelected
                            ? 'theme-bg-accent-soft theme-accent border-[var(--accent-main)]'
                            : 'theme-bg-sub theme-border theme-text-secondary hover:theme-text-primary'
                        }`}
                      >
                        <AudIcon className="w-4 h-4" />
                        <span className="text-xs font-bold theme-text-primary">{aud.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Specific Class Selector if CLASS selected */}
              {broadcastForm.target_audience === 'CLASS' && (
                <div className="animate-fade-in">
                  <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-1.5">
                    Select Target Class / Section
                  </label>
                  <select
                    value={broadcastForm.class_id}
                    onChange={(e) => setBroadcastForm((prev) => ({ ...prev, class_id: e.target.value }))}
                    required
                    className="w-full px-4 py-2.5 rounded-2xl theme-bg-sub border theme-border text-xs font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] cursor-pointer"
                  >
                    <option value="">-- Choose Class --</option>
                    {classesList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Target Channels */}
              <div>
                <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-1.5">
                  Dispatch Channels
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'IN_APP', label: 'In-App Bell', Icon: BellIcon },
                    { id: 'SMS', label: 'SMS Gateway', Icon: MessageSquareIcon },
                    { id: 'WHATSAPP', label: 'WhatsApp', Icon: WhatsappIcon },
                    { id: 'EMAIL', label: 'SMTP Email', Icon: MailIcon },
                  ].map((ch) => {
                    const ChIcon = ch.Icon;
                    const isChecked = broadcastForm.channels.includes(ch.id);
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => handleToggleBroadcastChannel(ch.id)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                          isChecked
                            ? 'theme-bg-accent-soft theme-accent border-[var(--accent-main)]'
                            : 'theme-bg-sub theme-border theme-text-secondary hover:theme-text-primary'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <ChIcon className="w-4 h-4" />
                          <span className="text-xs font-bold theme-text-primary">{ch.label}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-3.5 h-3.5 rounded pointer-events-none"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title / Subject */}
              <div>
                <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-1.5">
                  Notification Title / Subject
                </label>
                <input
                  type="text"
                  value={broadcastForm.title}
                  onChange={(e) => setBroadcastForm((prev) => ({ ...prev, title: e.target.value }))}
                  required
                  placeholder="e.g. Special Holiday Notice / Exam Routine"
                  className="w-full px-4 py-2.5 rounded-2xl theme-bg-sub border theme-border text-xs sm:text-sm font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)]"
                />
              </div>

              {/* Message Body */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider">
                    Broadcast Message Body
                  </label>
                  <span className="text-[11px] theme-text-secondary">
                    {broadcastForm.message.length} chars
                  </span>
                </div>
                <textarea
                  rows={5}
                  value={broadcastForm.message}
                  onChange={(e) => setBroadcastForm((prev) => ({ ...prev, message: e.target.value }))}
                  required
                  placeholder="Type your official announcement here..."
                  className="w-full p-4 rounded-2xl theme-bg-sub border theme-border text-xs sm:text-sm font-medium theme-text-primary focus:outline-none focus:border-[var(--accent-main)] leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={isBroadcasting}
                className="w-full py-3.5 rounded-2xl theme-bg-accent theme-accent-text text-sm font-bold shadow-lg hover:opacity-90 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <SendIcon className="w-4 h-4" />
                <span>{isBroadcasting ? 'Broadcasting Now...' : 'Send Broadcast Announcement'}</span>
              </button>
            </form>
          </div>

          {/* Right: Live Preview Box (1 Col) */}
          <div className="rounded-3xl theme-bg-surface border theme-border p-6 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
                Live Broadcast Preview
              </h3>

              {/* In-App Card Preview */}
              <div className="p-4 rounded-2xl theme-bg-sub border theme-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase">
                    IN-APP
                  </span>
                  <span className="text-[10px] theme-text-secondary">Just now</span>
                </div>
                <div className="text-xs font-bold theme-text-primary">
                  {broadcastForm.title || 'Announcement Title'}
                </div>
                <div className="text-xs theme-text-secondary leading-relaxed whitespace-pre-wrap">
                  {broadcastForm.message || 'Message content will preview here live as you type...'}
                </div>
              </div>

              {/* SMS Preview Pill */}
              <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-200 space-y-1.5 font-mono text-xs">
                <div className="text-[10px] text-zinc-500 uppercase font-bold">SMS Mobile Preview</div>
                <div className="text-zinc-300 leading-snug">
                  {broadcastForm.message || 'SPR Note: Your text message appears here...'}
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl theme-bg-sub border theme-border text-[11px] theme-text-secondary leading-normal">
              <span className="font-bold theme-text-primary">Note:</span> Outbound SMS & WhatsApp messages are sent based on active carrier credentials configured in Tab 1.
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: DELIVERY LOGS & ANALYTICS                                          */}
      {/* ========================================================================= */}
      {activeTab === 'logs' && (
        <div className="space-y-6 animate-fade-in">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-3xl theme-bg-surface border theme-border shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">Total Dispatched</span>
              <div className="text-2xl font-black theme-text-primary mt-1">{logAnalytics.total_dispatched}</div>
            </div>
            <div className="p-4 rounded-3xl theme-bg-surface border theme-border shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Delivered</span>
              <div className="text-2xl font-black text-emerald-400 mt-1">{logAnalytics.delivered}</div>
            </div>
            <div className="p-4 rounded-3xl theme-bg-surface border theme-border shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider theme-danger">Failed</span>
              <div className="text-2xl font-black theme-danger mt-1">{logAnalytics.failed}</div>
            </div>
            <div className="p-4 rounded-3xl theme-bg-surface border theme-border shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">In-App / Simulated</span>
              <div className="text-2xl font-black text-sky-400 mt-1">
                {(logAnalytics.channel_counts?.IN_APP || 0) + (logAnalytics.simulated || 0)}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-2.5 flex-1">
              <input
                type="text"
                value={logFilters.search}
                onChange={(e) => setLogFilters((prev) => ({ ...prev, search: e.target.value }))}
                placeholder="Search by phone, name, or message..."
                className="px-4 py-2 rounded-2xl theme-bg-surface border theme-border text-xs font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] flex-1 max-w-sm"
              />
              <select
                value={logFilters.channel}
                onChange={(e) => setLogFilters((prev) => ({ ...prev, channel: e.target.value }))}
                className="px-3 py-2 rounded-2xl theme-bg-surface border theme-border text-xs font-semibold theme-text-primary focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Channels</option>
                <option value="IN_APP">In-App</option>
                <option value="SMS">SMS</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="EMAIL">Email</option>
              </select>
              <select
                value={logFilters.status}
                onChange={(e) => setLogFilters((prev) => ({ ...prev, status: e.target.value }))}
                className="px-3 py-2 rounded-2xl theme-bg-surface border theme-border text-xs font-semibold theme-text-primary focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="DELIVERED">Delivered</option>
                <option value="SENT">Sent</option>
                <option value="FAILED">Failed</option>
                <option value="SIMULATED">Simulated</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleFilterLogs}
              className="px-4 py-2 rounded-2xl theme-bg-accent theme-accent-text text-xs font-bold cursor-pointer hover:opacity-90"
            >
              Apply Filters
            </button>
          </div>

          {/* Logs Audit Table */}
          <div className="rounded-3xl theme-bg-surface border theme-border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b theme-border theme-bg-sub/60 text-xs font-bold uppercase theme-text-secondary">
                    <th className="py-3.5 px-4">Recipient</th>
                    <th className="py-3.5 px-3">Channel</th>
                    <th className="py-3.5 px-3">Event</th>
                    <th className="py-3.5 px-4">Message Preview</th>
                    <th className="py-3.5 px-3">Status</th>
                    <th className="py-3.5 px-3">Dispatched At</th>
                    <th className="py-3.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y theme-border">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center theme-text-secondary">
                        No delivery logs match your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => {
                      let statusBadge = 'theme-bg-sub theme-text-secondary';
                      if (log.status === 'DELIVERED') statusBadge = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                      else if (log.status === 'FAILED') statusBadge = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
                      else if (log.status === 'SIMULATED') statusBadge = 'bg-sky-500/10 text-sky-400 border border-sky-500/20';

                      return (
                        <tr key={log.id} className="hover:theme-bg-sub/30 transition">
                          <td className="py-3.5 px-4">
                            <div className="font-bold theme-text-primary">{log.recipient_identifier}</div>
                            {log.recipient_name && (
                              <div className="text-[10px] theme-text-secondary">{log.recipient_name}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="font-bold theme-accent">{log.channel_display || log.channel}</span>
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="text-[11px] theme-text-secondary">{log.event_type || 'GENERAL'}</span>
                          </td>
                          <td className="py-3.5 px-4 max-w-xs truncate" title={log.message_body}>
                            {log.message_body}
                          </td>
                          <td className="py-3.5 px-3">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${statusBadge}`}>
                              {log.status_display || log.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-[11px] theme-text-secondary whitespace-nowrap">
                            {new Date(log.dispatched_at).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            {log.status === 'FAILED' && (
                              <button
                                type="button"
                                onClick={() => handleRetryLog(log.id)}
                                className="px-2.5 py-1 rounded-lg theme-bg-accent-soft theme-accent text-[11px] font-bold hover:opacity-80 cursor-pointer"
                              >
                                Retry
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: GATEWAY CONFIGURATION MODAL                                      */}
      {/* ========================================================================= */}
      {isGatewayModalOpen && editingGateway && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="rounded-3xl theme-bg-surface border theme-border shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b theme-border flex items-center justify-between theme-bg-sub/50">
              <h3 className="text-sm font-black theme-text-primary uppercase tracking-wide">
                {editingGateway.id ? 'Edit Gateway Credentials' : 'Add Notification Gateway'}
              </h3>
              <button
                type="button"
                onClick={() => setIsGatewayModalOpen(false)}
                className="p-1 rounded-xl theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated cursor-pointer"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGateway} className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold theme-text-secondary uppercase mb-1">Gateway Type</label>
                  <select
                    value={editingGateway.gateway_type}
                    onChange={(e) => setEditingGateway({ ...editingGateway, gateway_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl theme-bg-sub border theme-border text-xs font-semibold theme-text-primary"
                  >
                    <option value="SMS">SMS Gateway</option>
                    <option value="WHATSAPP">WhatsApp Cloud API</option>
                    <option value="SMTP_EMAIL">SMTP Email Server</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold theme-text-secondary uppercase mb-1">Provider</label>
                  <select
                    value={editingGateway.provider_name}
                    onChange={(e) => setEditingGateway({ ...editingGateway, provider_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl theme-bg-sub border theme-border text-xs font-semibold theme-text-primary"
                  >
                    {editingGateway.gateway_type === 'SMS' && (
                      <>
                        <option value="SSL_WIRELESS">SSL Wireless (BD)</option>
                        <option value="GREENWEB">Greenweb (BD)</option>
                        <option value="TWILIO">Twilio Global</option>
                        <option value="BULK_SMS_BD">BulkSMS BD</option>
                        <option value="GENERIC_REST">Custom REST API</option>
                      </>
                    )}
                    {editingGateway.gateway_type === 'WHATSAPP' && (
                      <option value="WHATSAPP_META">Meta Cloud API</option>
                    )}
                    {editingGateway.gateway_type === 'SMTP_EMAIL' && (
                      <option value="SMTP_CUSTOM">Custom SMTP Server</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold theme-text-secondary uppercase mb-1">
                  API Key / Username / Phone ID
                </label>
                <input
                  type="text"
                  value={editingGateway.api_key || ''}
                  onChange={(e) => setEditingGateway({ ...editingGateway, api_key: e.target.value })}
                  placeholder="e.g. SSL API Token, Twilio Account SID, or SMTP User"
                  className="w-full px-3.5 py-2.5 rounded-xl theme-bg-sub border theme-border text-xs font-semibold theme-text-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold theme-text-secondary uppercase mb-1">
                  API Secret / Password / Auth Token
                </label>
                <input
                  type="password"
                  value={editingGateway.api_secret_or_token || ''}
                  onChange={(e) => setEditingGateway({ ...editingGateway, api_secret_or_token: e.target.value })}
                  placeholder={editingGateway.is_secret_configured ? '(Secret configured - leave blank to keep unchanged)' : 'Enter Secret / Password'}
                  className="w-full px-3.5 py-2.5 rounded-xl theme-bg-sub border theme-border text-xs font-semibold theme-text-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold theme-text-secondary uppercase mb-1">
                    Sender ID / Masking
                  </label>
                  <input
                    type="text"
                    value={editingGateway.sender_id_or_phone || ''}
                    onChange={(e) => setEditingGateway({ ...editingGateway, sender_id_or_phone: e.target.value })}
                    placeholder="e.g. SPRNOTE or +14155552671"
                    className="w-full px-3.5 py-2.5 rounded-xl theme-bg-sub border theme-border text-xs font-semibold theme-text-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold theme-text-secondary uppercase mb-1">
                    Custom API / Host URL
                  </label>
                  <input
                    type="text"
                    value={editingGateway.api_url || ''}
                    onChange={(e) => setEditingGateway({ ...editingGateway, api_url: e.target.value })}
                    placeholder="e.g. smtp.gmail.com or custom URL"
                    className="w-full px-3.5 py-2.5 rounded-xl theme-bg-sub border theme-border text-xs font-semibold theme-text-primary"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="gwActiveCheck"
                  checked={editingGateway.is_active}
                  onChange={(e) => setEditingGateway({ ...editingGateway, is_active: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="gwActiveCheck" className="text-xs font-bold theme-text-primary cursor-pointer select-none">
                  Enable Gateway for Live Dispatches
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 border-t theme-border pt-4 mt-4">
                <button
                  type="button"
                  onClick={() => setIsGatewayModalOpen(false)}
                  className="px-4 py-2 rounded-xl theme-bg-sub hover:theme-bg-elevated border theme-border text-xs font-bold theme-text-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold shadow hover:opacity-90"
                >
                  Save Gateway
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: LIVE TEST PING MODAL                                             */}
      {/* ========================================================================= */}
      {pingModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="rounded-3xl theme-bg-surface border theme-border shadow-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b theme-border pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider theme-text-primary">
                Test Ping Connection
              </h3>
              <button
                type="button"
                onClick={() => setPingModal({ isOpen: false, gateway: null, target: '', result: null, loading: false })}
                className="p-1 rounded-xl theme-text-secondary hover:theme-text-primary"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold theme-text-secondary uppercase mb-1">
                Recipient Test Target (Phone / Email)
              </label>
              <input
                type="text"
                value={pingModal.target}
                onChange={(e) => setPingModal({ ...pingModal, target: e.target.value })}
                placeholder="e.g. 01712345678 or test@email.com"
                className="w-full px-3.5 py-2.5 rounded-xl theme-bg-sub border theme-border text-xs font-semibold theme-text-primary"
              />
            </div>

            {pingModal.result && (
              <div className={`p-3.5 rounded-2xl border text-xs space-y-1 font-mono ${
                pingModal.result.status === 'SUCCESS'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}>
                <div className="font-bold">Status: {pingModal.result.status}</div>
                {pingModal.result.error && <div>Error: {pingModal.result.error}</div>}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPingModal({ isOpen: false, gateway: null, target: '', result: null, loading: false })}
                className="px-4 py-2 rounded-xl theme-bg-sub border theme-border text-xs font-bold theme-text-secondary"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleExecutePing}
                disabled={pingModal.loading}
                className="px-4 py-2 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold shadow hover:opacity-90"
              >
                {pingModal.loading ? 'Pinging...' : 'Send Live Ping'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: TEMPLATE STUDIO MODAL                                            */}
      {/* ========================================================================= */}
      {isTemplateModalOpen && editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="rounded-3xl theme-bg-surface border theme-border shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b theme-border flex items-center justify-between theme-bg-sub/50">
              <h3 className="text-sm font-black theme-text-primary uppercase tracking-wide">
                {editingTemplate.id ? 'Edit Message Template' : 'Create Message Template'}
              </h3>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-1 rounded-xl theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold theme-text-secondary uppercase mb-1">Template Title</label>
                  <input
                    type="text"
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                    required
                    placeholder="e.g. Student Absence Notice"
                    className="w-full px-3.5 py-2.5 rounded-xl theme-bg-sub border theme-border text-xs font-semibold theme-text-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold theme-text-secondary uppercase mb-1">Event Category</label>
                  <select
                    value={editingTemplate.event_type}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, event_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl theme-bg-sub border theme-border text-xs font-semibold theme-text-primary"
                  >
                    <option value="STUDENT_ABSENT">Student Absent Alert</option>
                    <option value="STUDENT_LATE">Student Late Arrival</option>
                    <option value="GATE_BUNK_ALERT">Gate Discrepancy Alert</option>
                    <option value="NEW_ADMISSION">Student Admission</option>
                    <option value="DAILY_REPORT_SAVED">Daily Report Saved</option>
                    <option value="STAFF_LEAVE_ACTION">Staff Leave Action</option>
                    <option value="GENERAL_BROADCAST">General Broadcast</option>
                    <option value="CUSTOM">Custom Template</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold theme-text-secondary uppercase mb-1">Email Subject (Optional)</label>
                <input
                  type="text"
                  value={editingTemplate.subject || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                  placeholder="e.g. Absence Alert: {student_name}"
                  className="w-full px-3.5 py-2.5 rounded-xl theme-bg-sub border theme-border text-xs font-semibold theme-text-primary"
                />
              </div>

              {/* Dynamic Variable Chips */}
              <div>
                <span className="block text-xs font-bold theme-text-secondary uppercase mb-1.5">
                  Click to Insert Dynamic Tags
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_TAGS.map((t) => (
                    <button
                      key={t.tag}
                      type="button"
                      onClick={() => handleInsertTag(t.tag)}
                      className="px-2.5 py-1 rounded-xl theme-bg-accent-soft theme-accent hover:opacity-80 border theme-border text-[11px] font-bold cursor-pointer transition"
                    >
                      {t.tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold theme-text-secondary uppercase mb-1">
                  Message Body
                </label>
                <textarea
                  rows={4}
                  value={editingTemplate.body || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                  required
                  placeholder="Dear Guardian, {student_name} was marked ABSENT on {date}..."
                  className="w-full p-3.5 rounded-xl theme-bg-sub border theme-border text-xs leading-relaxed theme-text-primary font-medium focus:outline-none focus:border-[var(--accent-main)]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t theme-border pt-4">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-4 py-2 rounded-xl theme-bg-sub border theme-border text-xs font-bold theme-text-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold shadow hover:opacity-90"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
