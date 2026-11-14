<<<<<<< HEAD
﻿import { createContext, useContext } from "react";
=======
import { createContext, useContext } from "react";
>>>>>>> Version2.1.1

export const UIContext = createContext(null);

export function useUIContext() {
  const ctx = useContext(UIContext);
  if (!ctx) {
    throw new Error("@devcrish/headwind: widgets and hooks must be used inside <UI.Canvas> or <UIProvider>.");
  }
  return ctx;
}
