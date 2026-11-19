import React, { useState, useEffect } from 'react';
import CustomInput from '@/components/ui/CustomInput';
import CustomSelect from '@/components/ui/CustomSelect';
import { SignalIcon, SettingsIcon, CheckCircle2Icon } from '@/components/ui/Icons';
import { DrawerContainer, DrawerSection, DrawerFooter } from '@/components/layout';
import { createGateway, updateGateway } from '@/api/notifications';
import { useToast } from '@/context/ToastContext';
import { useFormAutoSave } from '@/hooks';
import type { NotificationGateway, GatewayFormData, GatewayType, ProviderName } from '@/types/notifications';

export interface GatewayConfigDrawerProps {
  gateway?: NotificationGateway | null;
  onSaveSuccess?: () => void;
  onCancel?: () => void;
}

const GATEWAY_TYPE_OPTIONS = [
  { value: 'SMS', label: 'SMS Gateway Provider' },
  { value: 'WHATSAPP', label: 'WhatsApp Cloud API (Meta)' },
  { value: 'SMTP_EMAIL', label: 'SMTP Email Server' },
  { value: 'TELEGRAM', label: 'Telegram Bot / Channel' },
  { value: 'PUSH_FCM', label: 'Firebase Push Notification (FCM)' },
];

const PROVIDER_OPTIONS: Record<GatewayType, { value: ProviderName; label: string }[]> = {
  SMS: [
    { value: 'SSL_WIRELESS', label: 'SSL Wireless (Bangladesh)' },
    { value: 'GREENWEB', label: 'Greenweb SMS Gateway' },
    { value: 'TWILIO', label: 'Twilio Global SMS' },
    { value: 'BULK_SMS_BD', label: 'BulkSMS BD Provider' },
    { value: 'GENERIC_REST', label: 'Custom HTTP Webhook / REST' },
  ],
  WHATSAPP: [
    { value: 'WHATSAPP_META', label: 'Meta WhatsApp Business Cloud API' },
    { value: 'TWILIO', label: 'Twilio WhatsApp API' },
  ],
  SMTP_EMAIL: [
    { value: 'SMTP_CUSTOM', label: 'Standard SMTP Server (Gmail, AWS SES, Custom)' },
  ],
  TELEGRAM: [
    { value: 'TELEGRAM_BOT', label: 'Telegram Bot API (Official)' },
  ],
  PUSH_FCM: [
    { value: 'GENERIC_REST', label: 'Firebase Cloud Messaging (FCM v1)' },
  ],
};

export default function GatewayConfigDrawer({
  gateway,
  onSaveSuccess,
  onCancel,
}: GatewayConfigDrawerProps) {
  const { showToast } = useToast();

  const [formData, setFormData] = useState<GatewayFormData>({
    gateway_type: gateway?.gateway_type || 'SMS',
    provider_name: gateway?.provider_name || 'SSL_WIRELESS',
    api_key: gateway?.api_key || '',
    api_secret_or_token: gateway?.api_secret_or_token || '',
    sender_id_or_phone: gateway?.sender_id_or_phone || '',
    api_url: gateway?.api_url || '',
    port: gateway?.port || 587,
    use_tls_ssl: gateway?.use_tls_ssl ?? true,
    is_active: gateway?.is_active ?? true,
    extra_headers_or_params: gateway?.extra_headers_or_params || {},
  });

  const [saving, setSaving] = useState<boolean>(false);

  const storageKey = `notification_gateway_form_${gateway?.id || 'new'}`;
  const { status: autoSaveStatus, lastSavedAt, clearDraft } = useFormAutoSave({
    storageKey,
    formData,
    setFormData,
    enabled: true,
  });

  useEffect(() => {
    if (gateway) {
      setFormData({
        gateway_type: gateway.gateway_type || 'SMS',
        provider_name: gateway.provider_name || 'SSL_WIRELESS',
        api_key: gateway.api_key || '',
        api_secret_or_token: gateway.api_secret_or_token || '',
        sender_id_or_phone: gateway.sender_id_or_phone || '',
        api_url: gateway.api_url || '',
        port: gateway.port || 587,
        use_tls_ssl: gateway.use_tls_ssl ?? true,
        is_active: gateway.is_active ?? true,
        extra_headers_or_params: gateway.extra_headers_or_params || {},
      });
    }
  }, [gateway]);

  const handleTypeChange = (typeVal: string) => {
    const gType = typeVal as GatewayType;
    const defaultProvider = PROVIDER_OPTIONS[gType]?.[0]?.value || 'SSL_WIRELESS';
    setFormData((prev) => ({
      ...prev,
      gateway_type: gType,
      provider_name: defaultProvider,
    }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    setSaving(true);

    try {
      if (gateway?.id) {
        await updateGateway(gateway.id, formData);
        showToast('Notification gateway updated successfully.', 'success');
      } else {
        await createGateway(formData);
        showToast('Notification gateway created successfully.', 'success');
      }
      clearDraft();
      onSaveSuccess?.();
    } catch (err: any) {
      showToast(err.message || 'Failed to save gateway config.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DrawerContainer padding="none" spacing="normal">
      <form onSubmit={handleSubmit} className="space-y-6">
        <DrawerSection title="Channel & Provider" icon={SignalIcon}>
          <div className="@container">
            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
              <div>
                <CustomSelect
                  label="Channel Type"
                  options={GATEWAY_TYPE_OPTIONS}
                  value={formData.gateway_type}
                  onChange={handleTypeChange}
                />
              </div>

              <div>
                <CustomSelect
                  label="Provider / Engine"
                  options={PROVIDER_OPTIONS[formData.gateway_type] || []}
                  value={formData.provider_name}
                  onChange={(val: string) =>
                    setFormData((prev) => ({ ...prev, provider_name: val as ProviderName }))
                  }
                />
              </div>
            </div>
          </div>
        </DrawerSection>

        <DrawerSection title="API Credentials & Authentication" icon={SettingsIcon}>
          <div className="@container">
            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
              {/* Dynamic Inputs Based on Gateway Type */}
              {formData.gateway_type === 'SMS' && (
                <>
                  <div className="@[480px]:col-span-2">
                    <CustomInput
                      label={
                        formData.provider_name === 'TWILIO'
                          ? 'Twilio Account SID'
                          : formData.provider_name === 'GREENWEB'
                          ? 'Greenweb Token'
                          : 'API Key / User ID'
                      }
                      placeholder="Enter API Key / Token"
                      value={formData.api_key}
                      onChange={(val: string) => setFormData((prev) => ({ ...prev, api_key: val }))}
                      required={formData.is_active}
                    />
                  </div>

                  {formData.provider_name === 'TWILIO' && (
                    <div className="@[480px]:col-span-2">
                      <CustomInput
                        label="Twilio Auth Token"
                        type="password"
                        placeholder="Enter Twilio Auth Token"
                        value={formData.api_secret_or_token}
                        onChange={(val: string) =>
                          setFormData((prev) => ({ ...prev, api_secret_or_token: val }))
                        }
                      />
                    </div>
                  )}

                  <div>
                    <CustomInput
                      label="Sender ID / Masking Name"
                      placeholder="e.g. SPRNOTE, 88096123456"
                      value={formData.sender_id_or_phone}
                      onChange={(val: string) =>
                        setFormData((prev) => ({ ...prev, sender_id_or_phone: val }))
                      }
                    />
                  </div>

                  <div>
                    <CustomInput
                      label="API Endpoint URL (Optional Override)"
                      placeholder="e.g. https://api.greenweb.com.bd/api.php"
                      value={formData.api_url}
                      onChange={(val: string) => setFormData((prev) => ({ ...prev, api_url: val }))}
                    />
                  </div>
                </>
              )}

              {formData.gateway_type === 'WHATSAPP' && (
                <>
                  <div className="@[480px]:col-span-2">
                    <CustomInput
                      label="Meta Phone Number ID (Not SIM number)"
                      placeholder="e.g. 10934823902349 (15-digit ID from Meta Dashboard)"
                      value={formData.api_key}
                      onChange={(val: string) => setFormData((prev) => ({ ...prev, api_key: val }))}
                      required={formData.is_active}
                    />
                    <span className="text-[10px] theme-text-secondary mt-1 block">
                      Found in Meta Developer Portal &gt; WhatsApp &gt; API Setup &gt; "Phone number ID".
                    </span>
                  </div>

                  <div className="@[480px]:col-span-2">
                    <CustomInput
                      label="Permanent System User Access Token"
                      type="password"
                      placeholder="EAAG..."
                      value={formData.api_secret_or_token}
                      onChange={(val: string) =>
                        setFormData((prev) => ({ ...prev, api_secret_or_token: val }))
                      }
                      required={formData.is_active}
                    />
                  </div>

                  <div className="@[480px]:col-span-2">
                    <CustomInput
                      label="Display Sender Phone Number"
                      placeholder="e.g. +8801611722538"
                      value={formData.sender_id_or_phone}
                      onChange={(val: string) =>
                        setFormData((prev) => ({ ...prev, sender_id_or_phone: val }))
                      }
                    />
                  </div>
                </>
              )}

              {formData.gateway_type === 'SMTP_EMAIL' && (
                <>
                  <div>
                    <CustomInput
                      label="SMTP Server Host"
                      placeholder="e.g. smtp.gmail.com, email-smtp.us-east-1.amazonaws.com"
                      value={formData.api_url}
                      onChange={(val: string) => setFormData((prev) => ({ ...prev, api_url: val }))}
                    />
                  </div>

                  <div>
                    <CustomInput
                      label="SMTP Port"
                      type="number"
                      placeholder="587 or 465"
                      value={formData.port}
                      onChange={(val: string | number) =>
                        setFormData((prev) => ({ ...prev, port: Number(val) || 587 }))
                      }
                    />
                  </div>

                  <div>
                    <CustomInput
                      label="Username / Email Address"
                      placeholder="e.g. notifications@sprnote.edu.bd"
                      value={formData.api_key}
                      onChange={(val: string) => setFormData((prev) => ({ ...prev, api_key: val }))}
                    />
                  </div>

                  <div>
                    <CustomInput
                      label="SMTP Password / App Key"
                      type="password"
                      placeholder="••••••••••••"
                      value={formData.api_secret_or_token}
                      onChange={(val: string) =>
                        setFormData((prev) => ({ ...prev, api_secret_or_token: val }))
                      }
                    />
                  </div>

                  <div>
                    <CustomInput
                      label="Sender From Name & Address"
                      placeholder="e.g. SPR Note <notice@sprnote.edu.bd>"
                      value={formData.sender_id_or_phone}
                      onChange={(val: string) =>
                        setFormData((prev) => ({ ...prev, sender_id_or_phone: val }))
                      }
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="use_tls_ssl"
                      checked={formData.use_tls_ssl}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, use_tls_ssl: e.target.checked }))
                      }
                      className="rounded border theme-border theme-text-primary"
                    />
                    <label htmlFor="use_tls_ssl" className="text-xs font-semibold theme-text-primary cursor-pointer">
                      Use TLS / SSL Encryption
                    </label>
                  </div>
                </>
              )}

              {formData.gateway_type === 'TELEGRAM' && (
                <>
                  <div className="@[480px]:col-span-2">
                    <CustomInput
                      label="Telegram Bot Token"
                      type="password"
                      placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                      value={formData.api_secret_or_token}
                      onChange={(val: string) =>
                        setFormData((prev) => ({ ...prev, api_secret_or_token: val }))
                      }
                      required={formData.is_active}
                    />
                    <span className="text-[10px] theme-text-secondary mt-1 block">
                      Obtain an official Bot Token from Telegram by opening <b>@BotFather</b> in Telegram and sending <code>/newbot</code>.
                    </span>
                  </div>

                  <div>
                    <CustomInput
                      label="Default Channel / Group / Chat ID"
                      placeholder="e.g. @spr_updates or -1001234567890"
                      value={formData.sender_id_or_phone}
                      onChange={(val: string) =>
                        setFormData((prev) => ({ ...prev, sender_id_or_phone: val }))
                      }
                    />
                    <span className="text-[10px] theme-text-secondary mt-1 block">
                      Channel username or group ID. Ensure the bot is added to the channel as Administrator with Post Messages permission.
                    </span>
                  </div>

                  <div>
                    <CustomInput
                      label="Bot Username (Display Reference)"
                      placeholder="e.g. @SPRNoteBot"
                      value={formData.api_key}
                      onChange={(val: string) => setFormData((prev) => ({ ...prev, api_key: val }))}
                    />
                    <span className="text-[10px] theme-text-secondary mt-1 block">
                      The public username of your Telegram Bot.
                    </span>
                  </div>
                </>
              )}

              {/* Active Toggle */}
              <div className="@[480px]:col-span-2 pt-2 border-t theme-border flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold theme-text-primary block">Active Gateway Status</span>
                  <span className="text-[11px] theme-text-secondary">
                    Enable to allow automated trigger rules to dispatch messages via this gateway.
                  </span>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-300 dark:bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:theme-bg-accent" />
                </label>
              </div>
            </div>
          </div>
        </DrawerSection>

        <DrawerFooter
          onCancel={onCancel}
          onSave={handleSubmit}
          isSubmitting={saving}
          saveLabel={gateway?.id ? 'Update Gateway' : 'Save Gateway'}
          autoSaveStatus={autoSaveStatus}
          lastSavedAt={lastSavedAt}
        />
      </form>
    </DrawerContainer>
  );
}
