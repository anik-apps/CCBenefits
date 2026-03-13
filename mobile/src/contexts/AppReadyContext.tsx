import React, { createContext, useContext } from 'react';

const AppReadyContext = createContext(false);

export const AppReadyProvider = AppReadyContext.Provider;
export const useAppReady = () => useContext(AppReadyContext);
