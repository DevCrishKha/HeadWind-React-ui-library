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

<<<<<<< HEAD
=======
const PALETTE_SWATCHES = [
  ["#ffffff", "#f8fafc", "#e2e8f0", "#94a3b8", "#64748b", "#334155", "#1e293b", "#0f172a", "#000000"],
  ["#ef4444", "#f97316", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6", "#6366f1", "#a855f7", "#ec4899"],
  ["#991b1b", "#c2410c", "#b45309", "#047857", "#0e7490", "#1d4ed8", "#4338ca", "#7e22ce", "#be185d"],
];

>>>>>>> Version2.1.1
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
<<<<<<< HEAD
=======
  const [openColorField, setOpenColorField] = useState(null); // "color" | "backgroundColor" | null
>>>>>>> Version2.1.1

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
<<<<<<< HEAD
  const contentProps = el?.props ? Object.entries(el.props).filter(([k, v]) => k !== "children" && v !== undefined) : [];
=======
  const contentProps = el?.props
    ? Object.entries(el.props).filter(
        ([k, v]) => k !== "children" && v !== undefined && k !== "color" && k !== "backgroundColor"
      )
    : [];
>>>>>>> Version2.1.1

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

<<<<<<< HEAD
=======
          {/* ── VS Code Style Colors Section ── */}
          <div data-testid="ui-inspector-colors" style={{ borderTop: "1px solid #1e293b", paddingTop: 4, marginTop: 2 }}>
            <div style={{ color: "#94a3b8", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
              Colors
            </div>

            {[
              { label: "color", key: "color" },
              { label: "background-color", key: "backgroundColor" },
            ].map(({ label, key }) => {
              const val = el?.props?.[key] || "";
              const isOpen = openColorField === key;
              const hasVal = Boolean(val && val !== "transparent");

              return (
                <div key={key} style={{ marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {/* Small square showing the shade of the color */}
                      <button
                        type="button"
                        data-testid={`ui-color-square-${key}`}
                        title={`Click to open palette for ${label}`}
                        onClick={() => setOpenColorField(isOpen ? null : key)}
                        style={{
                          width: 13,
                          height: 13,
                          padding: 0,
                          borderRadius: 2,
                          border: "1px solid #475569",
                          backgroundColor: hasVal ? val : "transparent",
                          backgroundImage: !hasVal
                            ? "linear-gradient(45deg, #334155 25%, transparent 25%), linear-gradient(-45deg, #334155 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #334155 75%), linear-gradient(-45deg, transparent 75%, #334155 75%)"
                            : "none",
                          backgroundSize: "6px 6px",
                          backgroundPosition: "0 0, 0 3px, 3px -3px, -3px 0px",
                          cursor: "pointer",
                          boxShadow: isOpen ? "0 0 0 2px #38bdf8" : "none",
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ color: "#94a3b8" }}>{label}:</span>
                    </div>
                    <span style={{ fontFamily: "ui-monospace, monospace", color: hasVal ? "#a5f3fc" : "#64748b" }}>
                      {val || "(none)"}
                    </span>
                  </div>

                  {/* Expandable VS Code Style Color Palette */}
                  {isOpen && (
                    <div
                      data-testid={`ui-color-palette-${key}`}
                      style={{
                        marginTop: 4,
                        marginBottom: 4,
                        padding: 6,
                        background: "#020617",
                        border: "1px solid #334155",
                        borderRadius: 6,
                        display: "flex",
                        flexDirection: "column",
                        gap: 5,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input
                          type="color"
                          data-testid={`ui-color-picker-${key}`}
                          value={hasVal && val.startsWith("#") && val.length === 7 ? val : "#38bdf8"}
                          onChange={(e) => store.applySocketUpdates({ id: el.id, [key]: e.target.value })}
                          style={{ width: 22, height: 22, padding: 0, border: "1px solid #334155", borderRadius: 3, cursor: "pointer", background: "none" }}
                        />
                        <input
                          type="text"
                          data-testid={`ui-color-input-${key}`}
                          placeholder="#hex or css color"
                          value={val}
                          onChange={(e) => store.applySocketUpdates({ id: el.id, [key]: e.target.value || undefined })}
                          style={{
                            flex: 1,
                            background: "#0b1120",
                            border: "1px solid #334155",
                            borderRadius: 4,
                            color: "#a5f3fc",
                            padding: "2px 6px",
                            fontSize: 11,
                            fontFamily: "ui-monospace, monospace",
                          }}
                        />
                        <button
                          type="button"
                          data-testid={`ui-color-clear-${key}`}
                          title="Clear color"
                          onClick={() => store.applySocketUpdates({ id: el.id, [key]: undefined })}
                          style={{ fontSize: 10, background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", borderRadius: 4, padding: "2px 5px", cursor: "pointer" }}
                        >
                          Clear
                        </button>
                      </div>

                      {/* Swatches Matrix */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: 2 }}>
                        {PALETTE_SWATCHES.flat().map((c) => (
                          <button
                            key={c}
                            type="button"
                            title={c}
                            data-testid={`ui-swatch-${c.replace("#", "")}`}
                            onClick={() => store.applySocketUpdates({ id: el.id, [key]: c })}
                            style={{ width: "100%", height: 13, background: c, border: val === c ? "2px solid #38bdf8" : "1px solid rgba(255,255,255,0.12)", borderRadius: 2, cursor: "pointer" }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

>>>>>>> Version2.1.1
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
