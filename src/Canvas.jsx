import { useContext, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { UIContext, useUIContext } from "./context.js";
import { UIProvider } from "./UIProvider.jsx";
import { useSocketUI } from "./useSocketUI.js";
import { useMqttUI } from "./useMqttUI.js";
import { getWidgetComponent } from "./registry.js";

/**
 * The root coordinate system. Every widget inside is positioned in pixels from this
 * canvas's top-left corner.
 *
 * Two modes:
 *  - Full page (default, when you give no width/height): the canvas covers the whole
 *    browser page, edge to edge. If a widget sits further down or right than the screen,
 *    the canvas grows so the page scrolls normally. Deploying does not change its size.
 *  - Fixed box (when you pass width and/or height): a box of that size that scrolls inside.
 *
 * `deploy` turns the whole page's editing tools off.
 */
export function Canvas(props) {
  const parent = useContext(UIContext);
  if (parent) return <CanvasInner {...props} />;
  return (
    <UIProvider>
      <CanvasInner {...props} />
    </UIProvider>
  );
}

function CanvasInner({ children, width, height, fullPage, deploy = false, showGrid = true, background = "#ffffff", socket, socketUrl, socketEvent, event, mqttClient, mqttUrl, mqttTopic, topic, mqttOptions, style, className }) {
  const { store } = useUIContext();
  useSocketUI({ socket, socketUrl, socketEvent, event });
  useMqttUI({ client: mqttClient, mqttUrl, mqttTopic: mqttTopic || topic, mqttOptions });
  const ref = useRef(null);
  const page = fullPage ?? (width === undefined && height === undefined);
  const pageDeployed = useSyncExternalStore(store.subscribe, store.getPageDeployed);
  const maxBottom = useSyncExternalStore(store.subscribe, store.getMaxBottom);
  const maxRight = useSyncExternalStore(store.subscribe, store.getMaxRight);
  const dynamicElements = useSyncExternalStore(store.subscribe, store.getDynamicElements);

  useLayoutEffect(() => {
    store.setCanvasElement(ref.current);
    return () => store.setCanvasElement(null);
  }, [store]);
  useLayoutEffect(() => { store.setPageDeployed(deploy); }, [store, deploy]);

  const layout = page
    ? {
        // Pinned to the top-left of the page so page padding / centering from other CSS
        // cannot leave gaps around it. Grows to fit the widgets, never shrinks below the screen.
        position: "absolute", top: 0, left: 0, width: "100%", minWidth: maxRight || undefined,
        minHeight: "100dvh", height: maxBottom || undefined, overflow: "visible",
      }
    : { position: "relative", width: width ?? "100%", height: height ?? 600, overflow: "auto" };

  return (
    <div
      ref={ref}
      data-ui-canvas
      data-ui-mode={page ? "page" : "box"}
      className={className}
      onPointerDown={(e) => { if (e.target === e.currentTarget) store.select(null); }}
      style={{
        boxSizing: "border-box", background,
        backgroundImage: !pageDeployed && showGrid ? "radial-gradient(#cbd5e1 1px, transparent 1px)" : undefined,
        backgroundSize: "20px 20px",
        ...layout, ...style,
      }}
    >
      {children}
      {dynamicElements?.filter((el) => !el.parentId).map((el) => {
        const Comp = getWidgetComponent(el.type);
        return Comp ? <Comp key={el.id} id={el.id} {...el.props} /> : null;
      })}
    </div>
  );
}
