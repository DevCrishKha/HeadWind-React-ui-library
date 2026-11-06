import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { useUIContext } from "./context.js";
import { defaultUIConfig, mergeLayoutConfig } from "./config.js";
import { registerWidget } from "./registry.js";
import { useParentContext } from "./parentContext.js";

const DRAG_THRESHOLD = 4; // pixels the pointer must move before a press becomes a drag
const MIN_SIZE = 20;
const HANDLES = {
  n: { left: "50%", top: -5, marginLeft: -5, cursor: "ns-resize" },
  s: { left: "50%", bottom: -5, marginLeft: -5, cursor: "ns-resize" },
  e: { right: -5, top: "50%", marginTop: -5, cursor: "ew-resize" },
  w: { left: -5, top: "50%", marginTop: -5, cursor: "ew-resize" },
  ne: { right: -5, top: -5, cursor: "nesw-resize" },
  nw: { left: -5, top: -5, cursor: "nwse-resize" },
  se: { right: -5, bottom: -5, cursor: "nwse-resize" },
  sw: { left: -5, bottom: -5, cursor: "nesw-resize" },
};

/**
 * Turns a plain React component into a layout-aware widget.
 * All dragging / resizing / inspection / deploy logic lives here, once.
 *
 *   createWidget({ type: "Clock", defaults: { size: {width: 200, height: 60} }, meta, render: ClockContent })
 *
 * `render` is a React component. It receives the widget's own props plus `widget`
 * ({ id, position, size, editable }). Layout props are handled for you.
 */
export function createWidget({ type, defaults = {}, meta = {}, render: Render, builtIn = false }) {
  function Widget(props) {
    const {
      id: idProp, position, size, isDraggable, isResizable, deploy, hidden, solid,
      resizableX, resizableY, minWidth, minHeight, maxWidth, maxHeight,
      onPositionChange, onSizeChange, onLayoutChange,
      ...content
    } = props;

    const { store, config } = useUIContext();
    const parentCtx = useParentContext();
    const parentId = parentCtx?.parentId ?? null;
    const parentMode = parentCtx?.mode ?? null;
    const reactId = useId();
    const isAutoId = idProp === undefined;
    const id = idProp ?? store.nameFor(reactId, type);

    // Precedence: built-in -> widget defaults -> provider config -> props.
    const cfg = mergeLayoutConfig(defaultUIConfig, defaults, config, {
      position, size, isDraggable, isResizable, deploy, hidden, solid,
    });
    const spot = store.allocate(id, cfg.position, cfg.size);
    const initial = {
      id, type, isAutoId, parentId,
      x: spot.x, y: spot.y, width: cfg.size.width, height: cfg.size.height,
      isDraggable: cfg.isDraggable, isResizable: cfg.isResizable, deploy: cfg.deploy,
      hidden: !!cfg.hidden, solid: !!cfg.solid,
      resizableX: resizableX ?? defaults.resizableX ?? true,
      resizableY: resizableY ?? defaults.resizableY ?? true,
      minWidth: minWidth ?? defaults.minWidth ?? MIN_SIZE,
      minHeight: minHeight ?? defaults.minHeight ?? MIN_SIZE,
      maxWidth: maxWidth ?? defaults.maxWidth ?? Infinity,
      maxHeight: maxHeight ?? defaults.maxHeight ?? Infinity,
      props: content,
    };
    store.ensure(id, initial);

    const el = useSyncExternalStore(store.subscribe, () => store.getElement(id)) ?? initial;
    const pageDeployed = useSyncExternalStore(store.subscribe, store.getPageDeployed);
    const masterDrag = useSyncExternalStore(store.subscribe, store.getMasterDrag);
    const masterResize = useSyncExternalStore(store.subscribe, store.getMasterResize);
    const selected = useSyncExternalStore(store.subscribe, () => store.isSelected(id));
    const [hovered, setHovered] = useState(false);
    const [active, setActive] = useState(false);

    const liveHidden = el.hidden ?? cfg.hidden;
    const liveSolid = el.solid ?? cfg.solid;
    const liveDraggable = el.isDraggable ?? cfg.isDraggable;
    const liveResizable = el.isResizable ?? cfg.isResizable;
    const liveDeploy = el.deploy ?? cfg.deploy;
    const liveResizableX = el.resizableX ?? resizableX ?? defaults.resizableX ?? true;
    const liveResizableY = el.resizableY ?? resizableY ?? defaults.resizableY ?? true;
    const minW = el.minWidth ?? minWidth ?? defaults.minWidth ?? MIN_SIZE;
    const minH = el.minHeight ?? minHeight ?? defaults.minHeight ?? MIN_SIZE;
    const maxW = el.maxWidth ?? maxWidth ?? defaults.maxWidth ?? Infinity;
    const maxH = el.maxHeight ?? maxHeight ?? defaults.maxHeight ?? Infinity;

    // Page deploy always wins: a deployed page never exposes editing, whatever the widget says.
    // A hidden widget is never editable (and has no tools to show).
    const editable = !pageDeployed && !liveDeploy && !liveHidden;
    // The master panel can only switch things OFF for everyone; it never forces a widget
    // that has isDraggable={false} to become draggable.
    const canDrag = editable && liveDraggable && masterDrag;
    const canResize = editable && liveResizable && masterResize && (liveResizableX || liveResizableY);

    useEffect(() => store.mount(id), [store, id]);
    useLayoutEffect(() => {
      store.update(id, {
        isDraggable: cfg.isDraggable, isResizable: cfg.isResizable, deploy: cfg.deploy,
        hidden: !!cfg.hidden, solid: !!cfg.solid,
        resizableX: liveResizableX, resizableY: liveResizableY,
        minWidth: minW, minHeight: minH, maxWidth: maxW, maxHeight: maxH,
        parentId,
        props: content,
      });
    }, [
      store, id, cfg.isDraggable, cfg.isResizable, cfg.deploy, cfg.hidden, cfg.solid,
      liveResizableX, liveResizableY, minW, minH, maxW, maxH, parentId, content,
    ]);

    // Hiding clears a stale hover / selection so nothing is stuck on when the widget comes back.
    useEffect(() => {
      if (!liveHidden) return;
      setHovered(false);
      if (store.isSelected(id)) store.select(null);
    }, [store, id, liveHidden]);

    // If the position / size PROPS change (for example you pasted new numbers), follow them.
    // Changing content props (text, value...) never touches layout.
    const px = typeof position === "object" && position ? position.x : undefined;
    const py = typeof position === "object" && position ? position.y : undefined;
    const sw = size && typeof size === "object" ? size.width : undefined;
    const sh = size && typeof size === "object" ? size.height : undefined;
    const firstRun = useRef(true);
    useEffect(() => {
      if (firstRun.current) { firstRun.current = false; return; }
      const patch = {};
      if (px !== undefined) patch.x = px;
      if (py !== undefined) patch.y = py;
      if (sw !== undefined) patch.width = sw;
      if (sh !== undefined) patch.height = sh;
      store.update(id, patch);
    }, [store, id, px, py, sw, sh]);

    // Callbacks (always call the latest function).
    const callbacks = useRef({});
    callbacks.current = { onPositionChange, onSizeChange, onLayoutChange };
    const prev = useRef(null);
    useEffect(() => {
      const last = prev.current;
      if (last) {
        const moved = last.x !== el.x || last.y !== el.y;
        const resized = last.width !== el.width || last.height !== el.height;
        const position = { x: el.x, y: el.y };
        const size = { width: el.width, height: el.height };
        if (moved) callbacks.current.onPositionChange?.(position);
        if (resized) callbacks.current.onSizeChange?.(size);
        if (moved || resized) callbacks.current.onLayoutChange?.({ position, size });
      }
      prev.current = { x: el.x, y: el.y, width: el.width, height: el.height };
    }, [el.x, el.y, el.width, el.height]);

    // ---- dragging and resizing ----
    const stopRef = useRef(null);
    const suppressClick = useRef(false);
    useEffect(() => () => stopRef.current?.(), []);

    function begin(e, mode) {
      if (e.button !== undefined && e.button !== 0) return;
      const geo = store.getElement(id) || initial;
      const start = { sx: e.clientX, sy: e.clientY, x: geo.x, y: geo.y, w: geo.width, h: geo.height, moved: false };
      const threshold = mode === "move" ? DRAG_THRESHOLD : 0;

      const onMove = (ev) => {
        const dx = ev.clientX - start.sx;
        const dy = ev.clientY - start.sy;
        if (!start.moved) {
          if (Math.hypot(dx, dy) < threshold) return;
          start.moved = true;
          setActive(true);
          document.body.style.userSelect = "none";
        }
        if (mode === "move") {
          store.update(id, {
            x: Math.max(0, Math.round(start.x + dx)),
            y: Math.max(0, Math.round(start.y + dy)),
          });
          return;
        }
        let { x, y, w, h } = start;
        if (mode.includes("e") && liveResizableX) w = Math.min(maxW, Math.max(minW, start.w + dx));
        if (mode.includes("s") && liveResizableY) h = Math.min(maxH, Math.max(minH, start.h + dy));
        if (mode.includes("w") && liveResizableX) {
          const nw = Math.min(maxW, Math.max(minW, start.w - dx));
          x = start.x + (start.w - nw);
          w = nw;
        }
        if (mode.includes("n") && liveResizableY) {
          const nh = Math.min(maxH, Math.max(minH, start.h - dy));
          y = start.y + (start.h - nh);
          h = nh;
        }
        store.update(id, { x: Math.round(x), y: Math.round(y), width: Math.round(w), height: Math.round(h) });
      };
      const stop = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        document.body.style.userSelect = "";
        stopRef.current = null;
      };
      const onUp = () => {
        stop();
        if (start.moved) {
          setActive(false);
          // A drag must not also count as a click (for example on a Button).
          suppressClick.current = true;
          setTimeout(() => { suppressClick.current = false; }, 0);
        }
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
      stopRef.current = stop;
    }

    const onWrapperDown = (e) => {
      e.stopPropagation();
      store.select(id);
      if (canDrag) begin(e, "move");
    };
    const showTools = editable && (hovered || selected || active);

    const activeHandles = Object.entries(HANDLES).filter(([dir]) => {
      const isX = dir.includes("e") || dir.includes("w");
      const isY = dir.includes("n") || dir.includes("s");
      if (!liveResizableX && isX) return false;
      if (!liveResizableY && isY) return false;
      return true;
    });

    const lines = [
      `Widget: ${el.id}`,
      `Position: x=${el.x}, y=${el.y}`,
      `Size: width=${el.width}, height=${el.height}`,
      `Draggable: ${liveDraggable && masterDrag}`,
      `Resizable: ${liveResizable && masterResize}`,
      `Deployed: ${liveDeploy}`,
    ];

    return (
      <div
        data-ui-widget={type}
        data-ui-id={id}
        onPointerDown={editable ? onWrapperDown : undefined}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onClickCapture={(e) => {
          if (suppressClick.current) { e.stopPropagation(); e.preventDefault(); }
        }}
        style={{
          position: parentMode === "reflow" ? "relative" : "absolute",
          ...(parentMode === "reflow" ? {} : { left: el.x, top: el.y }),
          width: el.width,
          height: el.height,
          boxSizing: "border-box",
          ...(liveHidden ? { display: "none" } : {}),
          cursor: canDrag ? (active ? "grabbing" : "grab") : undefined,
          touchAction: canDrag ? "none" : undefined,
          zIndex: showTools ? 1000 : undefined,
          outline: !editable ? "none" : selected ? "2px solid #2563eb" : hovered ? "1px dashed #3b82f6" : "none",
        }}
      >
        <div style={{
          width: "100%",
          height: "100%",
          overflow: type === "ParentPanel"
            ? (content.overflow ?? (content.childResizeMode === "fixed" ? "visible" : "hidden"))
            : "hidden",
        }}>
          <Render
            {...content}
            {...(el.props || {})}
            widget={{
              id,
              position: { x: el.x, y: el.y },
              size: { width: el.width, height: el.height },
              editable,
              canDrag,
              canResize,
              beginDrag: (e) => { store.select(id); if (canDrag) begin(e, "move"); },
            }}
          />
        </div>

        {showTools && (
          <pre
            data-testid="ui-overlay"
            style={{
              position: "absolute", left: 0, padding: "6px 8px", pointerEvents: "none",
              ...(el.y >= 110 ? { bottom: "100%", margin: "0 0 6px 0" } : { top: "100%", margin: "6px 0 0 0" }),
              background: "#0f172a", color: "#e2e8f0", borderRadius: 6, whiteSpace: "pre",
              font: "11px/1.5 ui-monospace, Menlo, Consolas, monospace",
            }}
          >
            {lines.join("\n")}
          </pre>
        )}

        {showTools && canResize &&
          activeHandles.map(([dir, pos]) => (
            <div
              key={dir}
              data-ui-handle={dir}
              data-testid={`ui-handle-${dir}`}
              onPointerDown={(e) => { e.stopPropagation(); store.select(id); begin(e, dir); }}
              style={{
                position: "absolute", width: 10, height: 10, boxSizing: "border-box",
                background: "#fff", border: "2px solid #2563eb", borderRadius: 2, touchAction: "none", ...pos,
              }}
            />
          ))}
      </div>
    );
  }

  Widget.displayName = `UI.${type}`;
  Widget.widgetType = type;
  Widget.meta = meta;
  registerWidget(type, { defaults, meta, builtIn, component: Widget });
  return Widget;
}
