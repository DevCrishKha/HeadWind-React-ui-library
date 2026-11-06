import { useState } from "react";
import { useUILayout } from "../hooks.js";
import { copyText, toJSXSnippet } from "../export.js";
import { useUIContext } from "../context.js";

const btn = {
  font: "600 12px system-ui, sans-serif", padding: "6px 10px", borderRadius: 6,
  border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9", cursor: "pointer",
};

/**
 * A small floating panel: copy the layout as JSON (with every widget's props and hooks
 * described) or as ready-to-paste JSX. Hidden automatically when the page is deployed.
 * Place it inside <UIProvider> (or next to the Canvas), not inside the Canvas.
 */
export function ExportPanel({ style }) {
  const layout = useUILayout();
  const { store } = useUIContext();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  if (layout.pageDeployed) return null;

  const json = layout.exportJSON();
  const flash = (msg) => { setNote(msg); setTimeout(() => setNote(""), 1500); };
  const copyJSON = async () => flash((await copyText(json)) ? "JSON copied" : "Copy failed");
  const copyJSX = async () => {
    const text = store.getElements().map(toJSXSnippet).join("\n");
    flash((await copyText(text)) ? "JSX copied" : "Copy failed");
  };

  return (
    <div
      data-testid="ui-export-panel"
      style={{
        position: "fixed", right: 16, bottom: 16, zIndex: 2000, width: open ? 420 : "auto", maxWidth: "calc(100vw - 32px)",
        padding: 10, background: "#0f172a", color: "#e2e8f0", borderRadius: 10, boxShadow: "0 8px 30px rgba(0,0,0,.3)", ...style,
      }}
    >
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <button style={btn} onClick={copyJSON}>Copy layout JSON</button>
        <button style={btn} onClick={copyJSX}>Copy JSX</button>
        <button style={btn} onClick={() => setOpen(!open)}>{open ? "Hide" : "Preview"}</button>
        <span style={{ font: "12px system-ui", color: "#86efac" }}>{note}</span>
      </div>
      {open && (
        <pre style={{ margin: "8px 0 0", maxHeight: 280, overflow: "auto", font: "11px/1.4 ui-monospace, Menlo, monospace", whiteSpace: "pre-wrap" }}>
          {json}
        </pre>
      )}
    </div>
  );
}
