import { useId, useSyncExternalStore } from "react";
import { useUIContext } from "../context.js";

const SPOTS = {
  "top-right": { top: 16, right: 16 },
  "top-left": { top: 16, left: 16 },
  "bottom-right": { bottom: 16, right: 16 },
  "bottom-left": { bottom: 16, left: 16 },
};

/**
 * One panel with the three master switches: Dragging, Resizing, Deploy whole page.
 *
 *  - Dragging / Resizing OFF stops it for every widget. ON does not override a widget
 *    that has isDraggable={false} / isResizable={false} itself.
 *  - Deploy whole page hides all editing tools. The panel stays so you can switch back.
 *  - If you deploy with <UI.Canvas deploy> in your code, this panel hides itself.
 *
 * Props: position ("top-right" default | "top-left" | "bottom-right" | "bottom-left"), style.
 */
export function MasterPanel({ position = "top-right", style }) {
  const { store } = useUIContext();
  const uid = useId();
  const drag = useSyncExternalStore(store.subscribe, store.getMasterDrag);
  const resize = useSyncExternalStore(store.subscribe, store.getMasterResize);
  const deploy = useSyncExternalStore(store.subscribe, store.getMasterDeploy);
  const canvasDeployed = useSyncExternalStore(store.subscribe, store.getCanvasDeployed);
  if (canvasDeployed) return null;

  const row = { display: "flex", gap: 8, alignItems: "center", font: "13px system-ui, sans-serif", cursor: "pointer" };
  const Check = ({ name, label, checked, onChange }) => (
    <label htmlFor={`${uid}-${name}`} style={row}>
      <input id={`${uid}-${name}`} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );

  return (
    <div
      data-testid="ui-master-panel"
      style={{
        position: "fixed", zIndex: 2000, display: "grid", gap: 8, padding: "10px 12px",
        background: "#0f172a", color: "#e2e8f0", borderRadius: 10, boxShadow: "0 8px 30px rgba(0,0,0,.3)",
        ...(SPOTS[position] || SPOTS["top-right"]), ...style,
      }}
    >
      <Check name="drag" label="Dragging" checked={drag} onChange={(v) => store.setMaster({ isDraggable: v })} />
      <Check name="resize" label="Resizing" checked={resize} onChange={(v) => store.setMaster({ isResizable: v })} />
      <Check name="deploy" label="Deploy whole page" checked={deploy} onChange={(v) => store.setMaster({ deploy: v })} />
    </div>
  );
}
