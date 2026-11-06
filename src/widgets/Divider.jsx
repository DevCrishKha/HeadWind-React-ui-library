import { useState, useRef, useEffect } from "react";
import { createWidget } from "../createWidget.jsx";
import { useUIContext } from "../context.js";

const VARIANTS = ["solid", "dashed", "dotted"];

/**
 * Normalizes edge strings: "right" | "left" | "top" | "bottom"
 */
function normalizeEdge(edge) {
  if (!edge || typeof edge !== "string") return null;
  const e = edge.toLowerCase().trim();
  if (e === "right" || e === "e" || e === "east") return "right";
  if (e === "left" || e === "w" || e === "west") return "left";
  if (e === "bottom" || e === "s" || e === "south") return "bottom";
  if (e === "top" || e === "n" || e === "north") return "top";
  return null;
}

/**
 * Normalizes axis strings: "x" | "y"
 */
function normalizeAxis(axis) {
  if (!axis || typeof axis !== "string") return null;
  const a = axis.toLowerCase().trim();
  if (a === "x" || a === "horizontal" || a === "h") return "x";
  if (a === "y" || a === "vertical" || a === "v") return "y";
  return null;
}

/**
 * Finds all panels linked to this divider.
 * Supports:
 * 1. Panels configured with `dividerId` / `dividerID` matching this divider's id.
 * 2. Panels explicitly specified via Divider props `panelBefore`, `panelAfter`, or `panels`.
 * 3. Auto-detected touching panels adjacent to this divider.
 */
function findLinkedPanels(store, myId, myParentId, orientation, props) {
  const myEl = store.getElement(myId);
  if (!myEl) return [];

  const allElements = store.getElements().filter(
    (e) =>
      e.id !== myId &&
      !e.hidden &&
      (e.parentId ?? null) === (myParentId ?? null)
  );

  // ── Method 1: Panels that have `dividerId` matching this divider ──
  const directlyLinked = allElements.filter((el) => {
    const p = el.props || {};
    return p.dividerId === myId || p.dividerID === myId;
  });

  if (directlyLinked.length > 0) {
    return directlyLinked.map((el) => {
      const p = el.props || {};
      const edge =
        normalizeEdge(p.dividerEdge) ||
        normalizeEdge(p.dividerPosition) ||
        // Auto-infer edge if not provided
        (orientation === "vertical"
          ? el.x < myEl.x
            ? "right"
            : "left"
          : el.y < myEl.y
          ? "bottom"
          : "top");

      const axis =
        normalizeAxis(p.resizeAxis) ||
        (edge === "left" || edge === "right" ? "x" : "y") ||
        (orientation === "vertical" ? "x" : "y");

      return {
        element: el,
        edge,
        axis,
      };
    });
  }

  // ── Method 2: Explicit panel props on Divider ──
  const beforeId =
    props.panelBefore ||
    props.firstPanel ||
    props.firstPanelId ||
    (Array.isArray(props.panels) ? props.panels[0] : null);
  const afterId =
    props.panelAfter ||
    props.secondPanel ||
    props.secondPanelId ||
    (Array.isArray(props.panels) ? props.panels[1] : null);

  if (beforeId && afterId) {
    const p1 = store.getElement(beforeId);
    const p2 = store.getElement(afterId);
    if (p1 && p2) {
      const isVert = orientation === "vertical";
      return [
        { element: p1, edge: isVert ? "right" : "bottom", axis: isVert ? "x" : "y" },
        { element: p2, edge: isVert ? "left" : "top", axis: isVert ? "x" : "y" },
      ];
    }
  }

  // ── Method 3: Auto-detection based on touching geometry ──
  const isVertical = orientation === "vertical";
  const TOLERANCE = 24;

  if (isVertical) {
    let bestBefore = null;
    let bestAfter = null;
    let minBeforeDist = Infinity;
    let minAfterDist = Infinity;

    for (const el of allElements) {
      const rightEdge = el.x + el.width;
      const distToLeft = Math.abs(rightEdge - myEl.x);
      if (
        rightEdge <= myEl.x + TOLERANCE &&
        distToLeft < minBeforeDist &&
        distToLeft <= TOLERANCE
      ) {
        minBeforeDist = distToLeft;
        bestBefore = el;
      }

      const leftEdge = el.x;
      const distToRight = Math.abs(leftEdge - (myEl.x + myEl.width));
      const distToSeam = Math.abs(leftEdge - myEl.x);
      const rightDist = Math.min(distToRight, distToSeam);
      if (
        leftEdge >= myEl.x - TOLERANCE &&
        rightDist < minAfterDist &&
        rightDist <= TOLERANCE
      ) {
        minAfterDist = rightDist;
        bestAfter = el;
      }
    }

    if (bestBefore && bestAfter && bestBefore.id !== bestAfter.id) {
      return [
        { element: bestBefore, edge: "right", axis: "x" },
        { element: bestAfter, edge: "left", axis: "x" },
      ];
    }

    // Pairwise check: two panels touching directly
    for (let i = 0; i < allElements.length; i++) {
      for (let j = 0; j < allElements.length; j++) {
        if (i === j) continue;
        const e1 = allElements[i];
        const e2 = allElements[j];
        const touchDist = Math.abs(e1.x + e1.width - e2.x);
        if (touchDist <= TOLERANCE) {
          const yOverlap =
            Math.min(e1.y + e1.height, e2.y + e2.height) -
            Math.max(e1.y, e2.y);
          if (yOverlap > 0) {
            const seamX = e2.x;
            if (
              Math.abs(myEl.x - seamX) <= TOLERANCE * 2 ||
              Math.abs(myEl.x + myEl.width - seamX) <= TOLERANCE * 2
            ) {
              return [
                { element: e1, edge: "right", axis: "x" },
                { element: e2, edge: "left", axis: "x" },
              ];
            }
          }
        }
      }
    }
  } else {
    // Horizontal divider
    let bestBefore = null;
    let bestAfter = null;
    let minBeforeDist = Infinity;
    let minAfterDist = Infinity;

    for (const el of allElements) {
      const bottomEdge = el.y + el.height;
      const distToTop = Math.abs(bottomEdge - myEl.y);
      if (
        bottomEdge <= myEl.y + TOLERANCE &&
        distToTop < minBeforeDist &&
        distToTop <= TOLERANCE
      ) {
        minBeforeDist = distToTop;
        bestBefore = el;
      }

      const topEdge = el.y;
      const distToBottom = Math.abs(topEdge - (myEl.y + myEl.height));
      const distToSeam = Math.abs(topEdge - myEl.y);
      const bottomDist = Math.min(distToBottom, distToSeam);
      if (
        topEdge >= myEl.y - TOLERANCE &&
        bottomDist < minAfterDist &&
        bottomDist <= TOLERANCE
      ) {
        minAfterDist = bottomDist;
        bestAfter = el;
      }
    }

    if (bestBefore && bestAfter && bestBefore.id !== bestAfter.id) {
      return [
        { element: bestBefore, edge: "bottom", axis: "y" },
        { element: bestAfter, edge: "top", axis: "y" },
      ];
    }

    // Pairwise check: two panels touching vertically
    for (let i = 0; i < allElements.length; i++) {
      for (let j = 0; j < allElements.length; j++) {
        if (i === j) continue;
        const e1 = allElements[i];
        const e2 = allElements[j];
        const touchDist = Math.abs(e1.y + e1.height - e2.y);
        if (touchDist <= TOLERANCE) {
          const xOverlap =
            Math.min(e1.x + e1.width, e2.x + e2.width) -
            Math.max(e1.x, e2.x);
          if (xOverlap > 0) {
            const seamY = e2.y;
            if (
              Math.abs(myEl.y - seamY) <= TOLERANCE * 2 ||
              Math.abs(myEl.y + myEl.height - seamY) <= TOLERANCE * 2
            ) {
              return [
                { element: e1, edge: "bottom", axis: "y" },
                { element: e2, edge: "top", axis: "y" },
              ];
            }
          }
        }
      }
    }
  }

  return [];
}

function DividerContent({
  orientation = "horizontal",
  color = "#cbd5e1",
  hoverColor = "#3b82f6",
  activeColor = "#2563eb",
  thickness = 2,
  variant = "solid",
  text,
  children,
  showHandle = true,
  handleColor = "#94a3b8",
  resizableSections = true,
  interactive = true,
  panelBefore,
  panelAfter,
  firstPanel,
  secondPanel,
  firstPanelId,
  secondPanelId,
  panels,
  minSizeBefore,
  minSizeAfter,
  onResize,
  style,
  className,
  widget,
}) {
  const { store } = useUIContext();
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const activeCleanupRef = useRef(null);

  useEffect(() => {
    return () => {
      if (activeCleanupRef.current) activeCleanupRef.current();
    };
  }, []);

  const safeVariant = VARIANTS.includes(variant) ? variant : "solid";
  const myEl = store.getElement(widget?.id);
  const effectiveOrientation =
    orientation ||
    (widget?.size?.height > widget?.size?.width ? "vertical" : "horizontal");
  const isVertical = effectiveOrientation === "vertical";

  // Check if linked panels exist
  const linked = findLinkedPanels(
    store,
    widget?.id,
    myEl?.parentId ?? null,
    effectiveOrientation,
    {
      panelBefore,
      panelAfter,
      firstPanel,
      secondPanel,
      firstPanelId,
      secondPanelId,
      panels,
    }
  );

  const canResizeSections = resizableSections && interactive && linked.length > 0;

  // Determine effective resize axis for cursor
  const primaryAxis =
    linked.length > 0
      ? linked[0].axis
      : isVertical
      ? "x"
      : "y";

  const cursorStyle = canResizeSections
    ? primaryAxis === "x"
      ? "col-resize"
      : "row-resize"
    : undefined;

  const handlePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;

    // Refresh linked panels at pointer down
    const currentLinked = findLinkedPanels(
      store,
      widget?.id,
      myEl?.parentId ?? null,
      effectiveOrientation,
      {
        panelBefore,
        panelAfter,
        firstPanel,
        secondPanel,
        firstPanelId,
        secondPanelId,
        panels,
      }
    );

    if (!resizableSections || !interactive || currentLinked.length === 0) {
      // Normal widget behavior: let pointer event bubble to wrapper
      return;
    }

    // Acting as a splitter between linked panels!
    e.stopPropagation();
    store.select(widget?.id);

    const startX = e.clientX;
    const startY = e.clientY;
    const startDiv = store.getElement(widget?.id);
    if (!startDiv) return;

    // Snapshot start geometries
    const snapshots = currentLinked.map((item) => {
      const el = store.getElement(item.element.id);
      return {
        id: item.element.id,
        edge: item.edge,
        axis: item.axis,
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        minWidth: el.minWidth ?? 20,
        maxWidth: el.maxWidth ?? Infinity,
        minHeight: el.minHeight ?? 20,
        maxHeight: el.maxHeight ?? Infinity,
      };
    });

    const axis = currentLinked[0].axis;
    setIsDragging(true);
    document.body.style.userSelect = "none";
    document.body.style.cursor = axis === "x" ? "col-resize" : "row-resize";

    const onPointerMove = (ev) => {
      const deltaX = ev.clientX - startX;
      const deltaY = ev.clientY - startY;
      const rawDelta = axis === "x" ? deltaX : deltaY;

      // Calculate bounds for delta based on every linked panel's min/max sizes
      let minDelta = -Infinity;
      let maxDelta = Infinity;

      snapshots.forEach((snap, idx) => {
        const customMin =
          idx === 0
            ? minSizeBefore
            : idx === 1
            ? minSizeAfter
            : undefined;

        if (snap.axis === "x") {
          const effectiveMinW = customMin ?? snap.minWidth;
          if (snap.edge === "right") {
            // width = startWidth + delta => delta >= minW - startWidth
            minDelta = Math.max(minDelta, effectiveMinW - snap.width);
            maxDelta = Math.min(maxDelta, snap.maxWidth - snap.width);
          } else if (snap.edge === "left") {
            // width = startWidth - delta => delta <= startWidth - minW
            maxDelta = Math.min(maxDelta, snap.width - effectiveMinW);
            minDelta = Math.max(minDelta, snap.width - snap.maxWidth);
          }
        } else if (snap.axis === "y") {
          const effectiveMinH = customMin ?? snap.minHeight;
          if (snap.edge === "bottom") {
            // height = startHeight + delta => delta >= minH - startHeight
            minDelta = Math.max(minDelta, effectiveMinH - snap.height);
            maxDelta = Math.min(maxDelta, snap.maxHeight - snap.height);
          } else if (snap.edge === "top") {
            // height = startHeight - delta => delta <= startHeight - minH
            maxDelta = Math.min(maxDelta, snap.height - effectiveMinH);
            minDelta = Math.max(minDelta, snap.height - snap.maxHeight);
          }
        }
      });

      if (minDelta > maxDelta) return;
      const clampedDelta = Math.max(minDelta, Math.min(maxDelta, rawDelta));

      // Apply updates to each linked panel according to its dividerEdge
      snapshots.forEach((snap) => {
        if (snap.axis === "x") {
          if (snap.edge === "right") {
            // Left, top, height constant; right edge / width changes
            store.update(snap.id, {
              width: Math.round(snap.width + clampedDelta),
            });
          } else if (snap.edge === "left") {
            // Right edge (x + width), top, height constant; left edge / x & width change
            store.update(snap.id, {
              x: Math.round(snap.x + clampedDelta),
              width: Math.round(snap.width - clampedDelta),
            });
          }
        } else if (snap.axis === "y") {
          if (snap.edge === "bottom") {
            // Top, left, width constant; bottom edge / height changes
            store.update(snap.id, {
              height: Math.round(snap.height + clampedDelta),
            });
          } else if (snap.edge === "top") {
            // Bottom edge (y + height), left, width constant; top edge / y & height change
            store.update(snap.id, {
              y: Math.round(snap.y + clampedDelta),
              height: Math.round(snap.height - clampedDelta),
            });
          }
        }
      });

      // Shift the divider itself along the active axis
      if (axis === "x") {
        store.update(widget.id, { x: Math.round(startDiv.x + clampedDelta) });
      } else {
        store.update(widget.id, { y: Math.round(startDiv.y + clampedDelta) });
      }

      const resizeInfo = {
        delta: clampedDelta,
        axis,
        panels: snapshots.map((s) => s.id),
      };
      if (snapshots.length >= 2) {
        const s0 = snapshots[0];
        const s1 = snapshots[1];
        resizeInfo.beforeId = s0.id;
        resizeInfo.afterId = s1.id;
        resizeInfo.beforeSize =
          s0.axis === "x"
            ? Math.round(s0.edge === "right" ? s0.width + clampedDelta : s0.width - clampedDelta)
            : Math.round(s0.edge === "bottom" ? s0.height + clampedDelta : s0.height - clampedDelta);
        resizeInfo.afterSize =
          s1.axis === "x"
            ? Math.round(s1.edge === "right" ? s1.width + clampedDelta : s1.width - clampedDelta)
            : Math.round(s1.edge === "bottom" ? s1.height + clampedDelta : s1.height - clampedDelta);
      }

      onResize?.(resizeInfo);
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      setIsDragging(false);
      activeCleanupRef.current = null;
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    activeCleanupRef.current = onPointerUp;
  };

  const currentColor = isDragging
    ? activeColor
    : isHovered && canResizeSections
    ? hoverColor
    : color;

  const currentHandleColor = isDragging
    ? activeColor
    : isHovered && canResizeSections
    ? hoverColor
    : handleColor;

  const content = children ?? text;

  return (
    <div
      data-ui-divider={widget?.id}
      data-testid="ui-divider"
      className={className}
      onPointerDown={handlePointerDown}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: isVertical ? "column" : "row",
        cursor: cursorStyle,
        userSelect: "none",
        touchAction: canResizeSections ? "none" : undefined,
        ...style,
      }}
    >
      {isVertical ? (
        <>
          <div
            data-testid="divider-line-start"
            style={{
              flex: 1,
              width: `${thickness}px`,
              borderLeft: `${thickness}px ${safeVariant} ${currentColor}`,
              transition: "border-color 0.15s ease",
            }}
          />
          {content ? (
            <span
              style={{
                padding: "8px 0",
                fontSize: 12,
                color: "#64748b",
                fontFamily: "system-ui, sans-serif",
                writingMode: "vertical-rl",
                textOrientation: "mixed",
              }}
            >
              {content}
            </span>
          ) : showHandle && canResizeSections ? (
            <div
              data-testid="divider-handle"
              style={{
                width: `${Math.max(4, thickness + 2)}px`,
                height: "24px",
                borderRadius: "3px",
                backgroundColor: currentHandleColor,
                margin: "4px 0",
                transition: "background-color 0.15s ease",
              }}
            />
          ) : null}
          <div
            data-testid="divider-line-end"
            style={{
              flex: 1,
              width: `${thickness}px`,
              borderLeft: `${thickness}px ${safeVariant} ${currentColor}`,
              transition: "border-color 0.15s ease",
            }}
          />
        </>
      ) : (
        <>
          <div
            data-testid="divider-line-start"
            style={{
              flex: 1,
              height: `${thickness}px`,
              borderTop: `${thickness}px ${safeVariant} ${currentColor}`,
              transition: "border-color 0.15s ease",
            }}
          />
          {content ? (
            <span
              style={{
                padding: "0 8px",
                fontSize: 12,
                color: "#64748b",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {content}
            </span>
          ) : showHandle && canResizeSections ? (
            <div
              data-testid="divider-handle"
              style={{
                width: "24px",
                height: `${Math.max(4, thickness + 2)}px`,
                borderRadius: "3px",
                backgroundColor: currentHandleColor,
                margin: "0 4px",
                transition: "background-color 0.15s ease",
              }}
            />
          ) : null}
          <div
            data-testid="divider-line-end"
            style={{
              flex: 1,
              height: `${thickness}px`,
              borderTop: `${thickness}px ${safeVariant} ${currentColor}`,
              transition: "border-color 0.15s ease",
            }}
          />
        </>
      )}
    </div>
  );
}

export const Divider = createWidget({
  type: "Divider",
  builtIn: true,
  defaults: {
    size: { width: 300, height: 12 },
    isDraggable: true,
    isResizable: true,
  },
  meta: {
    description:
      "Horizontal or vertical separator line. When linked to panels (via dividerId, resizeAxis, dividerPosition, dividerEdge on the panels) or touching adjacent panels, acts as an interactive splitter to increase or decrease their sizes like two resizable sections.",
    props: {
      orientation: {
        type: '"horizontal" | "vertical"',
        default: '"horizontal"',
        description: "Orientation of the divider line.",
      },
      color: {
        type: "string (CSS color)",
        default: '"#cbd5e1"',
        description: "Color of the divider line.",
      },
      hoverColor: {
        type: "string (CSS color)",
        default: '"#3b82f6"',
        description: "Color of the divider when hovered.",
      },
      activeColor: {
        type: "string (CSS color)",
        default: '"#2563eb"',
        description: "Color of the divider when actively resizing sections.",
      },
      thickness: {
        type: "number",
        default: 2,
        description: "Thickness of the separator line in pixels.",
      },
      variant: {
        type: '"solid" | "dashed" | "dotted"',
        default: '"solid"',
        description: "Line style variant.",
      },
      text: {
        type: "string",
        default: "undefined",
        description: "Optional text rendered at the center of the divider.",
      },
      showHandle: {
        type: "boolean",
        default: true,
        description:
          "Show a subtle grip handle pill in the center when resizing sections.",
      },
      handleColor: {
        type: "string (CSS color)",
        default: '"#94a3b8"',
        description: "Color of the grip handle pill.",
      },
      resizableSections: {
        type: "boolean",
        default: true,
        description:
          "Whether dragging the divider resizes adjacent touching panels.",
      },
      interactive: {
        type: "boolean",
        default: true,
        description:
          "Enable or disable section-resizing interactivity.",
      },
      panelBefore: {
        type: "string",
        default: "undefined",
        description: "ID of the first / left / top panel to resize.",
      },
      panelAfter: {
        type: "string",
        default: "undefined",
        description: "ID of the second / right / bottom panel to resize.",
      },
      panels: {
        type: "[string, string]",
        default: "undefined",
        description: "Array of two panel IDs [panelBefore, panelAfter].",
      },
      minSizeBefore: {
        type: "number",
        default: "undefined",
        description: "Override minimum size for the first panel.",
      },
      minSizeAfter: {
        type: "number",
        default: "undefined",
        description: "Override minimum size for the second panel.",
      },
      onResize: {
        type: "(info) => void",
        default: "undefined",
        description: "Callback invoked during section resizing.",
      },
      style: {
        type: "object",
        default: "{}",
        description: "Extra inline styles.",
      },
      className: {
        type: "string",
        default: '""',
        description: "Extra CSS class.",
      },
    },
  },
  render: DividerContent,
});
