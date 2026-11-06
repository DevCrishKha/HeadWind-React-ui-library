import { useMemo, useSyncExternalStore } from "react";
import { useUIContext } from "./context.js";
import { defaultUIConfig, mergeLayoutConfig } from "./config.js";
import { buildExport, copyText, toGeometry } from "./export.js";

/** Live geometry of one widget: const g = useUIElement("heading"); g.position.x ... */
export function useUIElement(id) {
  const { store } = useUIContext();
  const el = useSyncExternalStore(store.subscribe, () => store.getElement(id));
  return useMemo(() => toGeometry(el, store), [el, store]);
}

/** All widgets on the canvas, selection, page deploy state and export helpers. */
export function useUILayout() {
  const { store } = useUIContext();
  useSyncExternalStore(store.subscribe, store.getVersion);
  return {
    elements: store.getElements().map((el) => toGeometry(el, store)),
    selectedId: store.getSelectedId(),
    select: store.select,
    pageDeployed: store.getPageDeployed(),
    master: store.getMaster(),
    setMaster: store.setMaster,
    exportGeometry: (options) => buildExport(store, options),
    exportJSON: (options) => JSON.stringify(buildExport(store, options), null, 2),
    copyJSON: (options) => copyText(JSON.stringify(buildExport(store, options), null, 2)),
  };
}

/** The global defaults (built-ins merged with <UIProvider config>). */
export function useUIConfig() {
  const { config } = useUIContext();
  return useMemo(() => mergeLayoutConfig(defaultUIConfig, config), [config]);
}
