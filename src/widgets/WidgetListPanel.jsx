import { useState, useRef, useCallback, useSyncExternalStore } from "react";
import { useUIContext } from "../context.js";

/* ───────────────────────────────────────────────────────
   WidgetListPanel  –  a special panel (like MasterPanel
   and InspectorPanel) that lists every widget on the
   canvas, showing ID and type, and lets the user toggle
   each widget's visibility with an eye icon.

   Special features:
   • Disappears entirely in deploy mode (Canvas deploy or Master deploy)
   • Collapsible: collapses so only the name 'Widget List'
     and the drag handle are visible
   • Draggable: can be dragged anywhere on the page
   • Blender-style eye icon to show/hide widgets
   • Shows widget ID and type for every widget
   • Click row to select widget on the canvas
   ─────────────────────────────────────────────────────── */

/* ── visual constants ─────────────────────────────────── */
const PANEL_W = 260;
const HEAD_H  = 36;

const COLORS = {
  bg:       "#0f172a",
  head:     "#1e293b",
  accent:   "#38bdf8",
  text:     "#e2e8f0",
  dim:      "#94a3b8",
  border:   "#334155",
  rowHover: "#334155",
  hidden:   "#64748b",
  eyeOn:    "#4ade80",
  eyeOff:   "#f87171",
  typeBg:   "#0f172a",
};

/* ── Eye SVG icons ────────────────────────────────────── */
function EyeOpen({ color = COLORS.eyeOn, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeClosed({ color = COLORS.eyeOff, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    </svg>
  );
}

/* ── Drag-handle grip icon ────────────────────────────── */
function GripIcon({ color = COLORS.dim, size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ display: "block" }}>
      <circle cx="9"  cy="5"  r="1.5" />
      <circle cx="15" cy="5"  r="1.5" />
      <circle cx="9"  cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9"  cy="19" r="1.5" />
      <circle cx="15" cy="19" r="1.5" />
    </svg>
  );
}

/* ── Main component ───────────────────────────────────── */
export function WidgetListPanel({ style, defaultPosition = { x: 16, y: 70 } }) {
  const { store } = useUIContext();

  /* ── store subscriptions (all hooks unconditional) ── */
  const pageDeployed = useSyncExternalStore(store.subscribe, store.getPageDeployed);
  useSyncExternalStore(store.subscribe, store.getVersion);
  const selectedId   = useSyncExternalStore(store.subscribe, store.getSelectedId);

  /* ── local UI state ──────────────────────────────── */
  const [collapsed, setCollapsed] = useState(false);
  const [pos, setPos]             = useState(defaultPosition);
  const dragging                  = useRef(false);
  const dragOff                   = useRef({ x: 0, y: 0 });

  /* ── panel drag (pointer-capture on header) ──────── */
  const onPointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    if (e.target.closest("button")) return;
    dragging.current = true;
    dragOff.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [pos]);

  const onPointerMove = useCallback((e) => {
    if (!dragging.current) return;
    setPos({
      x: Math.max(0, e.clientX - dragOff.current.x),
      y: Math.max(0, e.clientY - dragOff.current.y),
    });
  }, []);

  const onPointerUp = useCallback((e) => {
    if (dragging.current) {
      dragging.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  }, []);

  /* ── toggle visibility of a widget ───────────────── */
  const toggleHidden = useCallback((id) => {
    const el = store.getElement(id);
    if (!el) return;
    const nextHidden = !el.hidden;
    store.update(id, {
      hidden: nextHidden,
      dynamicFlags: { ...(el.dynamicFlags || {}), hidden: nextHidden },
    });
  }, [store]);

  /* ── select a widget on click ────────────────────── */
  const selectWidget = useCallback((id) => {
    store.select(id);
  }, [store]);

  /* ── if deployed → render nothing (after all hooks) ── */
  if (pageDeployed) return null;

  /* ── get active widgets from store ───────────────── */
  const widgets = store.getElements().filter((el) => el && el.id);

  /* ── render ──────────────────────────────────────── */
  return (
    <div
      data-testid="ui-widget-list-panel"
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: PANEL_W,
        zIndex: 2000,
        background: COLORS.bg,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 10,
        color: COLORS.text,
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        fontSize: 12,
        boxShadow: "0 8px 30px rgba(0,0,0,.3)",
        userSelect: "none",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* ── header / drag handle ── */}
      <div
        data-testid="ui-widget-list-header"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          display: "flex",
          alignItems: "center",
          height: HEAD_H,
          background: COLORS.head,
          padding: "0 10px",
          cursor: "grab",
          borderBottom: collapsed ? "none" : `1px solid ${COLORS.border}`,
        }}
      >
        <span
          data-testid="ui-widget-list-drag-handle"
          style={{ display: "flex", alignItems: "center", cursor: "grab", paddingRight: 6 }}
        >
          <GripIcon />
        </span>
        <span
          data-testid="ui-widget-list-title"
          style={{
            flex: 1,
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: "0.02em",
            color: COLORS.accent,
          }}
        >
          Widget List
        </span>
        {!collapsed && (
          <span
            data-testid="ui-widget-list-count"
            style={{
              fontSize: 11,
              color: COLORS.dim,
              marginRight: 8,
              background: COLORS.typeBg,
              padding: "1px 6px",
              borderRadius: 10,
            }}
          >
            {widgets.length}
          </span>
        )}
        <button
          data-testid="ui-widget-list-collapse"
          onClick={() => setCollapsed((c) => !c)}
          style={{
            background: "none",
            border: "none",
            color: COLORS.dim,
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
            padding: "2px 4px",
            display: "flex",
            alignItems: "center",
          }}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? "▸" : "▾"}
        </button>
      </div>

      {/* ── body: widget list ── */}
      {!collapsed && (
        <div
          data-testid="ui-widget-list-body"
          style={{
            maxHeight: 360,
            overflowY: "auto",
            padding: "4px 0",
          }}
        >
          {widgets.length === 0 ? (
            <div
              data-testid="ui-widget-list-empty"
              style={{
                color: COLORS.dim,
                fontStyle: "italic",
                textAlign: "center",
                padding: "16px 10px",
              }}
            >
              No widgets on the canvas
            </div>
          ) : (
            widgets.map((el) => (
              <WidgetRow
                key={el.id}
                el={el}
                isSelected={el.id === selectedId}
                onToggle={toggleHidden}
                onSelect={selectWidget}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ── Single widget row ─────────────────────────────── */
function WidgetRow({ el, isSelected, onToggle, onSelect }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      data-testid={`ui-widget-row-${el.id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(el.id)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        marginBottom: 1,
        cursor: "pointer",
        background: isSelected
          ? "rgba(56, 189, 248, 0.15)"
          : hovered
            ? COLORS.rowHover
            : "transparent",
        borderLeft: isSelected ? `3px solid ${COLORS.accent}` : "3px solid transparent",
        opacity: el.hidden ? 0.45 : 1,
        transition: "background 0.15s, opacity 0.15s",
      }}
    >
      {/* eye toggle button */}
      <button
        data-testid={`ui-widget-eye-${el.id}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggle(el.id);
        }}
        title={el.hidden ? "Show widget" : "Hide widget"}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 2,
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        {el.hidden ? <EyeClosed /> : <EyeOpen />}
      </button>

      {/* widget id */}
      <span
        data-testid={`ui-widget-id-${el.id}`}
        style={{
          flex: 1,
          fontFamily: "ui-monospace, Consolas, monospace",
          fontSize: 11,
          color: el.hidden ? COLORS.hidden : COLORS.text,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          textDecoration: el.hidden ? "line-through" : "none",
        }}
        title={el.id}
      >
        {el.id}
      </span>

      {/* widget type badge */}
      <span
        data-testid={`ui-widget-type-${el.id}`}
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: COLORS.dim,
          background: COLORS.typeBg,
          padding: "2px 6px",
          borderRadius: 4,
          flexShrink: 0,
          textTransform: "capitalize",
        }}
      >
        {el.type || "–"}
      </span>
    </div>
  );
}

