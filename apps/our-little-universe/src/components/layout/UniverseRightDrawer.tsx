import React from 'react';
import {
  RightSidebarPanel,
  useDrawerResizing,
  useRightSidebar,
} from '@repo/ui';

/**
 * App-level Right Drawer Host for Our Little Universe.
 * Renders as a docked resizable sidebar on desktop (lg+) and full-height slide-over on smaller screens.
 */
export const UniverseRightDrawer: React.FC = () => {
  const {
    isRightSidebarOpen,
    rightSidebarConfig,
    drawerWidth,
    setDrawerWidth,
    closeRightSidebar,
  } = useRightSidebar();

  const {
    isDrawerResizing,
    drawerContainerRef,
    startDrawerResizing,
    handleDrawerResizerDoubleClick,
  } = useDrawerResizing({
    drawerWidth,
    setDrawerWidth,
    rightSidebarConfig,
    storageKeyPrefix: 'olu_right_drawer_width',
  });

  if (!isRightSidebarOpen || !rightSidebarConfig) {
    return null;
  }

  return (
    <>
      {/* Desktop Docked Resizable Drawer */}
      <div
        ref={drawerContainerRef}
        style={{ width: `${drawerWidth}px` }}
        className="hidden lg:block shrink-0 h-full overflow-hidden z-30"
      >
        <RightSidebarPanel
          key={rightSidebarConfig._renderKey}
          title={rightSidebarConfig.title}
          subtitle={rightSidebarConfig.subtitle}
          category={rightSidebarConfig.category}
          parentTitle={rightSidebarConfig.parentTitle}
          icon={rightSidebarConfig.icon}
          size={rightSidebarConfig.size}
          width={drawerWidth}
          isResizing={isDrawerResizing}
          onStartResize={startDrawerResizing}
          onResetResize={handleDrawerResizerDoubleClick}
          onClose={() => closeRightSidebar(false)}
          onBack={rightSidebarConfig.onBack || undefined}
          showCloseButton={rightSidebarConfig.showCloseButton !== false}
          headerRight={rightSidebarConfig.headerRight}
          footer={rightSidebarConfig.footer}
          formId={rightSidebarConfig.formId}
          onSave={rightSidebarConfig.onSave}
          onCancel={rightSidebarConfig.onCancel}
          saveLabel={rightSidebarConfig.saveLabel}
          cancelLabel={rightSidebarConfig.cancelLabel}
          isSubmitting={rightSidebarConfig.isSubmitting}
          isSaveDisabled={rightSidebarConfig.isSaveDisabled}
        >
          {rightSidebarConfig.content}
        </RightSidebarPanel>
      </div>

      {/* Mobile & Tablet Overlay Slide-over Drawer */}
      <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs"
          onClick={() => closeRightSidebar(false)}
          aria-hidden="true"
        />
        <div className="relative z-10 w-full max-w-[520px] h-full shadow-2xl">
          <RightSidebarPanel
            key={`${rightSidebarConfig._renderKey}-mobile`}
            title={rightSidebarConfig.title}
            subtitle={rightSidebarConfig.subtitle}
            category={rightSidebarConfig.category}
            parentTitle={rightSidebarConfig.parentTitle}
            icon={rightSidebarConfig.icon}
            size={rightSidebarConfig.size}
            onClose={() => closeRightSidebar(false)}
            onBack={rightSidebarConfig.onBack || undefined}
            showCloseButton={rightSidebarConfig.showCloseButton !== false}
            headerRight={rightSidebarConfig.headerRight}
            footer={rightSidebarConfig.footer}
            formId={rightSidebarConfig.formId}
            onSave={rightSidebarConfig.onSave}
            onCancel={rightSidebarConfig.onCancel}
            saveLabel={rightSidebarConfig.saveLabel}
            cancelLabel={rightSidebarConfig.cancelLabel}
            isSubmitting={rightSidebarConfig.isSubmitting}
            isSaveDisabled={rightSidebarConfig.isSaveDisabled}
          >
            {rightSidebarConfig.content}
          </RightSidebarPanel>
        </div>
      </div>
    </>
  );
};

export default UniverseRightDrawer;
