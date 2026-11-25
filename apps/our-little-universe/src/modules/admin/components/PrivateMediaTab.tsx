import React, { useRef, useState } from 'react';
import { CustomButton, CustomInput, CustomSelect, EmptyState, useToast } from '@repo/ui';
import type { UniverseMediaAsset } from '../../../types';
import { useAdminTranslation } from '../locales';
import { ImageVaultIcon, TrashIcon, UploadIcon } from '../../../components/icons/UniverseIcons';

interface PrivateMediaTabProps {
  assets: UniverseMediaAsset[];
  onUpload: (formData: FormData) => Promise<unknown>;
  onDelete: (assetId: string) => Promise<unknown>;
}

const CATEGORIES = [
  { value: 'welcome', label: 'Welcome' },
  { value: 'memory', label: 'Memory' },
  { value: 'letter', label: 'Letter' },
  { value: 'audio', label: 'Audio' },
  { value: 'gift', label: 'Gift' },
  { value: 'general', label: 'General' },
];

export const PrivateMediaTab: React.FC<PrivateMediaTabProps> = ({
  assets,
  onUpload,
  onDelete,
}) => {
  const { t, formatDate } = useAdminTranslation();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('welcome');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim() || file.name);
      formData.append('category', category);
      formData.append('file', file);
      await onUpload(formData);
      setTitle('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      showToast(t('media.uploaded', 'Private asset uploaded securely.'), 'success');
    } catch (err: any) {
      showToast(err?.message || 'Upload failed.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (assetId: string) => {
    try {
      await onDelete(assetId);
      showToast(t('media.deleted', 'Private asset removed.'), 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete asset.', 'error');
    }
  };

  return (
    <div className="@container space-y-6">
      <form
        onSubmit={handleUpload}
        className="rounded-3xl theme-bg-surface p-6 space-y-4 shadow-xs border-0"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ImageVaultIcon className="w-4 h-4 theme-accent" />
            <h3 className="text-base font-bold theme-text-primary">
              {t('media.title', 'Private Media Vault')}
            </h3>
          </div>
          <p className="text-xs theme-text-secondary">
            {t(
              'media.subtitle',
              'Files are stored in isolated private storage and streamed only via signed member tokens.'
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
          <CustomInput
            variant="app"
            label={t('media.assetTitle', 'Media Title')}
            value={title}
            onChange={(val: string) => setTitle(val)}
          />
          <CustomSelect
            label={t('media.category', 'Category')}
            value={category}
            onChange={(val: string) => setCategory(val)}
            options={CATEGORIES}
          />
        </div>

        <div className="p-4 rounded-2xl theme-bg-app flex flex-col @[480px]:flex-row @[480px]:items-center justify-between gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,audio/*,video/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-xs theme-text-secondary file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:cursor-pointer"
          />
          <CustomButton
            type="submit"
            variant="primary"
            loading={uploading}
            requireAll={[file]}
            icon={UploadIcon}
          >
            {t('media.uploadButton', 'Upload to Private Vault')}
          </CustomButton>
        </div>
      </form>

      <div className="rounded-3xl theme-bg-surface p-6 shadow-xs border-0">
        {assets.length === 0 ? (
          <EmptyState
            icon={ImageVaultIcon}
            title={t('media.emptyMedia', 'No private media assets uploaded yet.')}
          />
        ) : (
          <div className="grid grid-cols-1 @[580px]:grid-cols-2 @[900px]:grid-cols-3 gap-4">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="p-4 rounded-2xl theme-bg-app space-y-3 flex flex-col justify-between border-0"
              >
                <div className="space-y-2">
                  {asset.media_type === 'image' && asset.stream_url && (
                    <img
                      src={asset.stream_url}
                      alt={asset.title}
                      className="w-full h-36 object-cover rounded-xl"
                      loading="lazy"
                    />
                  )}
                  {asset.media_type === 'audio' && asset.stream_url && (
                    <audio controls src={asset.stream_url} className="w-full" />
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-bold theme-text-primary truncate">{asset.title}</div>
                      <div className="text-[11px] theme-text-secondary">
                        {asset.category} • {Math.max(1, Math.round(asset.file_size / 1024))} KB •{' '}
                        {formatDate(asset.created_at)}
                      </div>
                    </div>
                    <CustomButton
                      size="icon-xs"
                      variant="danger-soft"
                      icon={TrashIcon}
                      onClick={() => handleDelete(asset.id)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
