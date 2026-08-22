import React from 'react';

export default function DataCardGrid({
  data = [],
  renderCard,
  keyExtractor = (item, idx) => item?.id ?? idx,
  isLoading = false,
  loadingMessage = 'Loading records...',
  emptyTitle = 'No Records Found',
  emptySubMessage = 'No matching cards available to display.',
  emptyIcon: EmptyIcon,
  gridClassName = 'grid grid-cols-1 @lg:grid-cols-2 @4xl:grid-cols-3 gap-3.5 @md:gap-5',
  wrapperClassName = '',
}) {
  if (isLoading) {
    return (
      <div className={`theme-bg-surface border theme-border rounded-2xl p-12 text-center shadow-xs ${wrapperClassName}`}>
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin theme-accent"></div>
          <span className="text-xs font-semibold theme-text-secondary">{loadingMessage}</span>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={`theme-bg-surface border theme-border rounded-2xl p-12 text-center shadow-xs space-y-3 ${wrapperClassName}`}>
        {EmptyIcon && (
          <div className="w-12 h-12 rounded-2xl theme-bg-sub border theme-border flex items-center justify-center mx-auto theme-text-muted">
            <EmptyIcon className="w-6 h-6" />
          </div>
        )}
        <h3 className="text-sm font-bold theme-text-primary">{emptyTitle}</h3>
        {emptySubMessage && (
          <p className="text-xs theme-text-secondary max-w-sm mx-auto leading-relaxed">
            {emptySubMessage}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`${gridClassName} ${wrapperClassName}`}>
      {data.map((item, index) => {
        const key = keyExtractor(item, index);
        return (
          <React.Fragment key={key}>
            {renderCard ? renderCard(item, index) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
}
