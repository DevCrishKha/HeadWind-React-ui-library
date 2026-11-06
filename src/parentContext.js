import { createContext, useContext } from "react";

export const ParentContext = createContext(null);

export function useParentContext() {
  return useContext(ParentContext);
}

