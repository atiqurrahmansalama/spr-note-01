import React, { useState, useMemo } from 'react';
import { ROUTE_TITLE_MAP } from '../../../../../components/layout/routeMeta';
import { useTranslation } from '../../../../../i18n';
import {
  CloseIcon,
  SearchIcon,
  PinIcon,
  PinSolidIcon,
  CheckIcon,
  BookmarkIcon,
} from '../../../../../components/ui/Icons';
import type { PinnedPageItem } from './quickDeskTypes';

export interface PinPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  pinnedPages: PinnedPageItem[];
  onTogglePin: (item: Omit<PinnedPageItem, 'id' | 'pinnedAt'>) => void;
  onRemovePin: (path: string) => void;
}

export const PinPageModal: React.FC<PinPageModalProps> = ({
  isOpen,
  onClose,
  pinnedPages,
  onTogglePin,
  onRemovePin,
}) => {
  const { t } = useTranslation('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract all searchable routes from ROUTE_TITLE_MAP
  const searchableRoutes = useMemo(() => {
    const list: Array<{ path: string; title: string; category: string; subCategory?: string }> = [];
    const seen = new Set<string>();

    Object.entries(ROUTE_TITLE_MAP).forEach(([path, meta]) => {
      // Exclude base root and utility routes
      if (
        path === '/' ||
        path.startsWith('/dashboard') ||
        path.startsWith('/login') ||
        path.startsWith('/register') ||
        meta.isDashboard
      ) {
        return;
      }
      if (!seen.has(path)) {
        seen.add(path);
        list.push({
          path,
          title: meta.title,
          category: meta.category,
          subCategory: meta.subCategory,
        });
      }
    });

    return list.sort((a, b) => a.title.localeCompare(b.title));
  }, []);

  const filteredRoutes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return searchableRoutes;
    return searchableRoutes.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        (r.subCategory && r.subCategory.toLowerCase().includes(q)) ||
        r.path.toLowerCase().includes(q)
    );
  }, [searchableRoutes, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-lg theme-bg-surface rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[85vh] border-0">
        {/* Header */}
        <div className="p-5 pb-3 flex items-center justify-between border-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
              <BookmarkIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold theme-text-primary">
                {t('pinPagesToDesk', 'Pin Pages to Command Desk')}
              </h3>
              <p className="text-[11px] theme-text-secondary">
                {t('pinPagesSub', 'Search and pin any application page for instant one-click access')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl theme-bg-sub/60 hover:theme-bg-elevated theme-text-secondary flex items-center justify-center transition-colors cursor-pointer"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="px-5 pb-3">
          <div className="relative">
            <SearchIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 theme-text-secondary pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPagesPlaceholder', 'Search pages, modules or routes...')}
              className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl theme-bg-app border-0 ring-0 focus:outline-hidden theme-text-primary placeholder:theme-text-secondary/70 shadow-2xs"
              autoFocus
            />
          </div>
        </div>

        {/* Routes List */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2">
          {filteredRoutes.length === 0 ? (
            <div className="py-12 text-center text-xs theme-text-secondary">
              {t('noMatchingPages', 'No matching pages found.')}
            </div>
          ) : (
            filteredRoutes.map((route) => {
              const isPinned = pinnedPages.some((p) => p.path === route.path);

              return (
                <div
                  key={route.path}
                  className={`p-3 rounded-2xl flex items-center justify-between gap-3 transition-colors ${
                    isPinned ? 'theme-bg-accent-soft/30' : 'theme-bg-sub/60 hover:theme-bg-sub'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold theme-text-primary truncate">{route.title}</h4>
                      {isPinned && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full theme-bg-accent theme-accent-text font-bold">
                          Pinned
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] theme-text-secondary truncate mt-0.5">
                      {route.category} {route.subCategory && `• ${route.subCategory}`}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (isPinned) {
                        onRemovePin(route.path);
                      } else {
                        onTogglePin({
                          path: route.path,
                          title: route.title,
                          category: route.category,
                          subCategory: route.subCategory,
                        });
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border-0 shrink-0 ${
                      isPinned
                        ? 'theme-bg-elevated theme-text-secondary hover:text-rose-500'
                        : 'theme-bg-accent theme-accent-text shadow-2xs hover:opacity-95'
                    }`}
                  >
                    {isPinned ? (
                      <>
                        <CheckIcon className="w-3.5 h-3.5" />
                        <span>Unpin</span>
                      </>
                    ) : (
                      <>
                        <PinIcon className="w-3.5 h-3.5" />
                        <span>Pin to Desk</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default PinPageModal;
