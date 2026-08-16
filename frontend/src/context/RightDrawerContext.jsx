import React, { createContext, useContext, useState, useCallback } from 'react';

const RightDrawerContext = createContext({
  isRightDrawerOpen: false,
  registerRightDrawer: () => {},
});

export function RightDrawerProvider({ children }) {
  const [openDrawersCount, setOpenDrawersCount] = useState(0);

  const registerRightDrawer = useCallback((isOpen) => {
    setOpenDrawersCount((prev) => {
      if (isOpen) {
        return prev + 1;
      } else {
        return Math.max(0, prev - 1);
      }
    });
  }, []);

  const isRightDrawerOpen = openDrawersCount > 0;

  return (
    <RightDrawerContext.Provider value={{ isRightDrawerOpen, registerRightDrawer }}>
      {children}
    </RightDrawerContext.Provider>
  );
}

export function useRightDrawer() {
  const context = useContext(RightDrawerContext);
  if (!context) {
    return {
      isRightDrawerOpen: false,
      registerRightDrawer: () => {},
    };
  }
  return context;
}
