import { useMemo, useState } from "react";
import { UIContext } from "./context.js";
import { createLayoutStore } from "./store.js";

/**
 * Shares global defaults (`config`) with every widget below it and owns the layout store.
 * One provider = one canvas. Use a second <UIProvider> for a second canvas.
 */
export function UIProvider({ config, children }) {
  const [store] = useState(createLayoutStore);
  const value = useMemo(() => ({ store, config: config || {} }), [store, config]);
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}
