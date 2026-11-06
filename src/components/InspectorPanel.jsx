import { useState, useSyncExternalStore } from "react";
import { useUIContext } from "../context.js";
import { copyText } from "../export.js";
import { getWidgetInfo } from "../registry.js";

const SPOTS = {
  "top-right": { top: 16, right: 16 },
  "top-left": { top: 16, left: 16 },
  "bottom-right": { bottom: 16, right: 16 },
  "bottom-left": { bottom: 16, left: 16 },
};

const btn = {
  font: "600 12px system-ui, sans-serif",
  padding: "5px 10px",
  borderRadius: 6,
  border: "1px solid #334155",
  background: "#1e293b",
  color: "#f1f5f9",
  cursor: "pointer",
};

export function toWidgetJSX(el) {
  if (!el) return "";
  const info = getWidgetInfo(el.type);
  const tag = info && info.builtIn ? `UI.${el.type}` : el.type;
  const attrs = [];
  if (!el.isAutoId) attrs.push(`id="${el.id}"`);
  attrs.push(`position={{ x: ${el.x}, y: ${el.y} }}`);
  attrs.push(`size={{ width: ${el.width}, height: ${el.height} }}`);
  if (el.solid) attrs.push("solid");
  if (el.hidden) attrs.push("hidden");
  if (!el.isDraggable) attrs.push("isDraggable={false}");
  if (!el.isResizable) attrs.push("isResizable={false}");
  if (el.deploy) attrs.push("deploy");

  // Format content props (e.g. variant="secondary", text="Submit", fontSize={40})
  if (el.props && typeof el.props === "object") {
    for (const [key, val] of Object.entries(el.props)) {
      if (val === undefined || key === "children") continue;
      if (typeof val === "string") {
        attrs.push(`${key}="${val}"`);
      } else if (typeof val === "boolean") {
        attrs.push(val ? key : `${key}={false}`);
      } else if (typeof val === "number") {
        attrs.push(`${key}={${val}}`);
      } else if (typeof val === "function") {
        attrs.push(`${key}={${val.name || "fn"}}`);
      } else if (typeof val === "object") {
        try {
          attrs.push(`${key}={${JSON.stringify(val)}}`);
        } catch {
          // ignore non-serializable objects
        }
      }
    }
  }

  return `<${tag} ${attrs.join(" ")} />`;
}

/**
 * InspectorPanel displays live geometry, layout properties, and content props
 * of the currently selected widget on the canvas. It allows viewing and copying
 * the JSX code to hardcode the widget into React source code.
 *
 * Props:
 *  - position: "bottom-left" (default) | "bottom-right" | "top-left" | "top-right"
 *  - style: extra inline styles
 */
export function InspectorPanel({ position = "bottom-left", style }) {
  const { store } = useUIContext();
  const [showJSX, setShowJSX] = useState(false);
  const [note, setNote] = useState("");

  const pageDeployed = useSyncExternalStore(store.subscribe, store.getPageDeployed);
  const selectedId = useSyncExternalStore(store.subscribe, store.getSelectedId);
  const el = useSyncExternalStore(store.subscribe, () => (selectedId ? store.getElement(selectedId) : null));

  if (pageDeployed) return null;

  const flash = (msg) => {
    setNote(msg);
    setTimeout(() => setNote(""), 1500);
  };

  const jsx = el ? toWidgetJSX(el) : "";

  const handleCopyJSX = async () => {
    if (!jsx) return;
    const ok = await copyText(jsx);
    flash(ok ? "JSX copied!" : "Copy failed");
  };

  const info = el ? getWidgetInfo(el.type) : null;
  const contentProps = el?.props ? Object.entries(el.props).filter(([k, v]) => k !== "children" && v !== undefined) : [];

  return (
    <div
      data-testid="ui-inspector-panel"
      style={{
        position: "fixed",
        zIndex: 2000,
        width: showJSX ? 380 : 310,
        maxWidth: "calc(100vw - 32px)",
        padding: "10px 14px",
        background: "#0f172a",
        color: "#e2e8f0",
        borderRadius: 10,
        boxShadow: "0 8px 30px rgba(0,0,0,.3)",
        font: "12px/1.4 system-ui, -apple-system, sans-serif",
        ...(SPOTS[position] || SPOTS["bottom-left"]),
        ...style,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: "#38bdf8", letterSpacing: "0.02em" }}>
          Inspector
        </span>
        {el && (
          <span style={{ font: "11px/1 ui-monospace, monospace", color: "#94a3b8", background: "#1e293b", padding: "3px 6px", borderRadius: 4 }}>
            {el.type}
          </span>
        )}
      </div>

      {!el ? (
        <div data-testid="ui-inspector-empty" style={{ color: "#64748b", padding: "6px 0", fontStyle: "italic" }}>
          Select a widget to inspect
        </div>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "2px 8px", font: "11px system-ui" }}>
            <span style={{ color: "#94a3b8" }}>ID:</span>
            <span style={{ fontFamily: "ui-monospace, monospace", color: "#f8fafc" }}>
              {el.id} {el.isAutoId && <span style={{ color: "#64748b" }}>(auto)</span>}
            </span>

            <span style={{ color: "#94a3b8" }}>Position:</span>
            <span style={{ fontFamily: "ui-monospace, monospace", color: "#f8fafc" }}>
              x: {el.x}, y: {el.y}
            </span>

            <span style={{ color: "#94a3b8" }}>Size:</span>
            <span style={{ fontFamily: "ui-monospace, monospace", color: "#f8fafc" }}>
              w: {el.width}, h: {el.height}
            </span>

            <span style={{ color: "#94a3b8" }}>Draggable:</span>
            <span style={{ color: el.isDraggable ? "#4ade80" : "#f87171" }}>
              {String(el.isDraggable)}
            </span>

            <span style={{ color: "#94a3b8" }}>Resizable:</span>
            <span style={{ color: el.isResizable ? "#4ade80" : "#f87171" }}>
              {String(el.isResizable)}
            </span>

            <span style={{ color: "#94a3b8" }}>Solid:</span>
            <span style={{ color: el.solid ? "#38bdf8" : "#94a3b8" }}>
              {String(!!el.solid)}
            </span>

            <span style={{ color: "#94a3b8" }}>Hidden:</span>
            <span style={{ color: el.hidden ? "#fbbf24" : "#94a3b8" }}>
              {String(!!el.hidden)}
            </span>

            <span style={{ color: "#94a3b8" }}>Deploy:</span>
            <span style={{ color: el.deploy ? "#fbbf24" : "#94a3b8" }}>
              {String(!!el.deploy)}
            </span>
          </div>

          {contentProps.length > 0 && (
            <div data-testid="ui-inspector-props" style={{ borderTop: "1px solid #1e293b", paddingTop: 4, marginTop: 2 }}>
              <div style={{ color: "#94a3b8", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>
                Component Props
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "2px 8px", font: "11px system-ui" }}>
                {contentProps.map(([k, v]) => (
                  <div key={k} style={{ display: "contents" }} data-testid={`ui-prop-${k}`}>
                    <span style={{ color: "#94a3b8" }}>{k}:</span>
                    <span style={{ fontFamily: "ui-monospace, monospace", color: "#a5f3fc", wordBreak: "break-all" }}>
                      {typeof v === "object" ? JSON.stringify(v) : String(v)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {info?.meta?.description && (
            <div style={{ color: "#64748b", fontSize: 11, borderTop: "1px solid #1e293b", paddingTop: 4 }}>
              {info.meta.description}
            </div>
          )}

          <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
            <button
              data-testid="ui-inspector-toggle-jsx"
              style={btn}
              onClick={() => setShowJSX(!showJSX)}
            >
              {showJSX ? "Hide JSX" : "Show JSX"}
            </button>
            <button
              data-testid="ui-inspector-copy-jsx"
              style={btn}
              onClick={handleCopyJSX}
            >
              Copy JSX
            </button>
            {note && <span data-testid="ui-inspector-note" style={{ font: "11px system-ui", color: "#86efac" }}>{note}</span>}
          </div>

          {showJSX && (
            <pre
              data-testid="ui-inspector-jsx"
              style={{
                margin: "4px 0 0",
                padding: "8px 10px",
                background: "#020617",
                borderRadius: 6,
                border: "1px solid #1e293b",
                overflow: "auto",
                maxHeight: 120,
                font: "11px/1.4 ui-monospace, Menlo, monospace",
                color: "#38bdf8",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              {jsx}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
