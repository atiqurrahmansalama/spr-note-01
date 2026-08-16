import React, { createContext, useContext, useState, useCallback } from 'react';

const RightSidebarContext = createContext({
  isRightSidebarOpen: false,
  rightSidebarConfig: null,
  openRightSidebar: () => {},
  closeRightSidebar: () => {},
});

export function RightSidebarProvider({ children }) {
  const [rightSidebarConfig, setRightSidebarConfig] = useState(null);

  const openRightSidebar = useCallback(({ title, content, width = 600, onClose }) => {
    setRightSidebarConfig({
      title: title || 'Action Panel',
      content: content || null,
      width: width || 600,
      onClose: onClose || null,
    });
  }, []);

  const closeRightSidebar = useCallback(() => {
    if (rightSidebarConfig?.onClose) {
      try {
        rightSidebarConfig.onClose();
      } catch (err) {
        console.warn('Error during right sidebar onClose callback:', err);
      }
    }
    setRightSidebarConfig(null);
  }, [rightSidebarConfig]);

  const isRightSidebarOpen = Boolean(rightSidebarConfig);

  return (
    <RightSidebarContext.Provider
      value={{
        isRightSidebarOpen,
        rightSidebarConfig,
        openRightSidebar,
        closeRightSidebar,
      }}
    >
      {children}
    </RightSidebarContext.Provider>
  );
}

export function useRightSidebar() {
  const context = useContext(RightSidebarContext);
  if (!context) {
    return {
      isRightSidebarOpen: false,
      rightSidebarConfig: null,
      openRightSidebar: () => {},
      closeRightSidebar: () => {},
    };
  }
  return context;
}
