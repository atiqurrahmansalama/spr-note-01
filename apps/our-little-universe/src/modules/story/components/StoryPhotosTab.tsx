import React, { useRef, useState } from 'react';
import { CustomButton, DataCardGrid, useToast } from '@repo/ui';
import {
  CheckIcon,
  ImageVaultIcon,
  PlusIcon,
  UploadIcon,
} from '../../../components/icons/UniverseIcons';
import type { UniverseMediaAsset } from '../../../types';
import { useStoryTranslation } from '../locales';

export interface StoryPhotosTabProps {
  assets: UniverseMediaAsset[];
  activeCoverAssetId: string | null;
  canEdit: boolean;
  onUploadPhoto: (file: File) => Promise<void>;
  onSetCoverAsset: (assetId: string) => Promise<void>;
  onAddChapterWithPhoto: (assetId: string) => void;
}

/**
 * Private Story Keepsakes Vault modeled after StudentDocumentsTab.tsx.
 * Drag-and-drop private photo upload + one-click Story Cover selection or chapter attachment.
 */
export const StoryPhotosTab: React.FC<StoryPhotosTabProps> = ({
  assets,
  activeCoverAssetId,
  canEdit,
  onUploadPhoto,
  onSetCoverAsset,
  onAddChapterWithPhoto,
}) => {
  const { t } = useStoryTranslation();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFileProcess = async (file?: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      await onUploadPhoto(file);
      showToast(t('photos.uploadedToast', 'Private photo added to your story!'), 'success');
    } catch (err: any) {
      showToast(err?.message || 'Upload failed.', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="@container space-y-6">
      {canEdit && (
        <div
          onDragEnter={(e) => {
            e.preventDefault();
            setIsDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragActive(false);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragActive(false);
            handleFileProcess(e.dataTransfer.files?.[0]);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`rounded-3xl p-7 text-center cursor-pointer transition-all border-0 shadow-xs flex flex-col items-center justify-center gap-3 ${
            isDragActive
              ? 'theme-bg-accent-soft theme-accent scale-[1.01]'
              : 'theme-bg-surface hover:theme-bg-elevated/40'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileProcess(e.target.files?.[0])}
          />
          <div className="w-12 h-12 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center">
            <UploadIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold theme-text-primary">
              {uploading
                ? t('photos.uploading', 'Uploading to Private Vault...')
                : t('photos.uploadTitle', 'Upload Private Story Photo')}
            </p>
            <p className="text-xs theme-text-secondary max-w-lg">
              {t(
                'photos.uploadSubtitle',
                'Photos are stored securely in Private Media Storage and linked directly to chapters or your Story Cover.'
              )}
            </p>
          </div>
        </div>
      )}

      <DataCardGrid
        data={assets}
        keyExtractor={(item: UniverseMediaAsset) => item.id}
        emptyIcon={ImageVaultIcon}
        emptyTitle={t('photos.empty', 'No story photos uploaded yet.')}
        gridClassName="grid grid-cols-1 @[480px]:grid-cols-2 @[820px]:grid-cols-3 gap-4"
        renderCard={(asset: UniverseMediaAsset) => {
          const isCover = asset.id === activeCoverAssetId;
          return (
            <div className="rounded-3xl theme-bg-surface overflow-hidden shadow-xs border-0 flex flex-col justify-between">
              <div className="aspect-[16/10] w-full theme-bg-app overflow-hidden">
                {asset.stream_url && (
                  <img
                    src={asset.stream_url}
                    alt={asset.title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold theme-text-primary truncate">{asset.title}</h4>
                  {isCover && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full theme-bg-accent-soft theme-accent shrink-0">
                      <CheckIcon className="w-3 h-3" />
                      <span>{t('photos.activeCover', 'Active Cover')}</span>
                    </span>
                  )}
                </div>

                {canEdit && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {!isCover && (
                      <CustomButton
                        size="xs"
                        variant="soft"
                        icon={CheckIcon}
                        onClick={() => onSetCoverAsset(asset.id)}
                      >
                        {t('photos.setAsCover', 'Set as Story Cover')}
                      </CustomButton>
                    )}
                    <CustomButton
                      size="xs"
                      variant="app"
                      icon={PlusIcon}
                      onClick={() => onAddChapterWithPhoto(asset.id)}
                    >
                      {t('photos.useInChapter', 'Add Chapter With Photo')}
                    </CustomButton>
                  </div>
                )}
              </div>
            </div>
          );
        }}
      />
    </div>
  );
};

export default StoryPhotosTab;
