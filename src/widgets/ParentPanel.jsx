import { useRef, useLayoutEffect, useSyncExternalStore } from "react";
import { createWidget } from "../createWidget.jsx";
import { ParentContext } from "../parentContext.js";
import { useUIContext } from "../context.js";
import { getWidgetComponent } from "../registry.js";

/**
 * ParentPanelContent renders the interior of a ParentPanel widget.
 * It provides an explicit parent drag handle, manages child resize modes
 * ("clip", "fixed", "reflow"), and hosts child widgets with independent editing.
 */
function ParentPanelContent({
  children,
  childResizeMode = "clip",
  backgroundColor = "#ffffff",
  opacity = 1,
  overflow,
  title,
  showDragHandle = true,
  dragHandle,
  gap = 16,
  alignItems = "flex-start",
  justifyContent = "flex-start",
  minChildWidth = 150,
  padding = 16,
  borderRadius = 8,
  border = "1px solid #cbd5e1",
  boxShadow = "0 1px 3px rgba(0,0,0,0.1)",
  style,
  className,
  widget,
}) {
  const containerRef = useRef(null);
  const { store } = useUIContext();

  // In reflow mode, sync children's layout offsets to the store so geometry inspection
  // and export report the live reflowed positions.
  useLayoutEffect(() => {
    if (childResizeMode !== "reflow" || !containerRef.current) return;
    const container = containerRef.current;
    const syncPositions = () => {
      const childNodes = container.querySelectorAll(":scope > [data-ui-id]");
      childNodes.forEach((node) => {
        const childId = node.getAttribute("data-ui-id");
        if (childId) {
          const x = Math.round(node.offsetLeft);
          const y = Math.round(node.offsetTop);
          const cur = store.getElement(childId);
          if (cur && (cur.x !== x || cur.y !== y)) {
            store.update(childId, { x, y });
          }
        }
      });
    };

    syncPositions();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => syncPositions());
      ro.observe(container);
      return () => ro.disconnect();
    }
  }, [store, childResizeMode, widget?.size?.width, widget?.size?.height, children]);

  const showHandle = widget?.editable && showDragHandle !== false;
  const handleHeight = 28;

  const dynamicElements = useSyncExternalStore(store.subscribe, store.getDynamicElements);
  const dynamicChildren = dynamicElements?.filter((el) => el.parentId === widget?.id);

  // Determine effective overflow for content container
  let contentOverflow = "hidden";
  if (childResizeMode === "fixed") {
    contentOverflow = overflow ?? "visible";
  } else if (childResizeMode === "clip") {
    contentOverflow = "hidden";
  } else if (childResizeMode === "reflow") {
    contentOverflow = overflow ?? "auto";
  }

  return (
    <div
      data-ui-parent-panel={widget?.id}
      className={className}
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        backgroundColor,
        opacity,
        borderRadius: typeof borderRadius === "number" ? `${borderRadius}px` : borderRadius,
        border,
        boxShadow,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        ...style,
      }}
    >
      {/* Explicit parent drag handle */}
      {showHandle && (
        dragHandle ? (
          <div
            data-testid="parent-drag-handle"
            data-ui-parent-drag-handle
            onPointerDown={(e) => {
              e.stopPropagation();
              widget?.beginDrag?.(e);
            }}
          >
            {dragHandle}
          </div>
        ) : (
          <div
            data-testid="parent-drag-handle"
            data-ui-parent-drag-handle
            onPointerDown={(e) => {
              e.stopPropagation();
              widget?.beginDrag?.(e);
            }}
            style={{
              height: `${handleHeight}px`,
              minHeight: `${handleHeight}px`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 10px",
              background: "rgba(0, 0, 0, 0.08)",
              borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
              cursor: "grab",
              userSelect: "none",
              fontSize: "12px",
              color: "#334155",
              fontFamily: "system-ui, -apple-system, sans-serif",
              borderTopLeftRadius: typeof borderRadius === "number" ? `${borderRadius}px` : borderRadius,
              borderTopRightRadius: typeof borderRadius === "number" ? `${borderRadius}px` : borderRadius,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
              <span style={{ fontSize: "14px", lineHeight: 1, opacity: 0.6 }}>⠿</span>
              <span>{title || widget?.id || "ParentPanel"}</span>
            </div>
            <div style={{ fontSize: "10px", opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {childResizeMode}
            </div>
          </div>
        )
      )}

      {/* Children content area */}
      <ParentContext.Provider value={{ parentId: widget?.id, mode: childResizeMode }}>
        <div
          ref={containerRef}
          data-ui-parent-content={widget?.id}
          data-testid="parent-panel-content"
          style={{
            position: "relative",
            flex: 1,
            width: "100%",
            height: showHandle ? `calc(100% - ${handleHeight}px)` : "100%",
            boxSizing: "border-box",
            padding: typeof padding === "number" ? `${padding}px` : padding,
            overflow: contentOverflow,
            ...(childResizeMode === "reflow" ? {
              display: "flex",
              flexWrap: "wrap",
              gap: typeof gap === "number" ? `${gap}px` : gap,
              alignItems,
              justifyContent,
            } : {}),
          }}
        >
          {children}
          {dynamicChildren?.map((el) => {
            const Comp = getWidgetComponent(el.type);
            return Comp ? <Comp key={el.id} id={el.id} {...el.props} /> : null;
          })}
        </div>
      </ParentContext.Provider>
    </div>
  );
}

export const ParentPanel = createWidget({
  type: "ParentPanel",
  builtIn: true,
  defaults: {
    size: { width: 800, height: 500 },
    isDraggable: true,
    isResizable: true,
    resizableX: true,
    resizableY: true,
  },
  meta: {
    description: "A container widget that supports nested, independently draggable and resizable child widgets with configurable child resize modes (clip, fixed, reflow).",
    props: {
      childResizeMode: { type: '"clip" | "fixed" | "reflow"', default: '"clip"', description: "How child widgets behave when the parent changes dimensions." },
      resizableX: { type: "boolean", default: true, description: "Allow or prevent horizontal resizing." },
      resizableY: { type: "boolean", default: true, description: "Allow or prevent vertical resizing." },
      minWidth: { type: "number", default: 20, description: "Minimum allowed width." },
      minHeight: { type: "number", default: 20, description: "Minimum allowed height." },
      maxWidth: { type: "number", default: "Infinity", description: "Maximum allowed width." },
      maxHeight: { type: "number", default: "Infinity", description: "Maximum allowed height." },
      overflow: { type: '"clip" | "visible" | "auto" | "scroll" | "hidden"', default: '"clip"', description: "Overflow behavior." },
      backgroundColor: { type: "string", default: '"#ffffff"', description: "Background color." },
      opacity: { type: "number", default: 1, description: "Panel opacity." },
      showDragHandle: { type: "boolean", default: true, description: "Show dedicated drag handle bar in edit mode." },
      title: { type: "string", default: '""', description: "Title displayed in drag handle bar." },
      gap: { type: "number | string", default: 16, description: "Gap between children in reflow mode." },
      alignItems: { type: "string", default: '"flex-start"', description: "Flexbox alignment in reflow mode." },
      justifyContent: { type: "string", default: '"flex-start"', description: "Flexbox alignment in reflow mode." },
      minChildWidth: { type: "number", default: 150, description: "Minimum child width for reflow layout." },
      padding: { type: "number | string", default: 16, description: "Internal padding." },
      style: { type: "object", default: "{}", description: "Custom inline styles." },
      className: { type: "string", default: '""', description: "Custom CSS class." },
    },
  },
  render: ParentPanelContent,
});

