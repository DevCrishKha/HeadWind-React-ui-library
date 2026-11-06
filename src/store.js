// The layout store holds the live geometry of every widget on a canvas.
// It lives outside React state so that dragging only re-renders the widget being moved.
import { resolveSolid } from "./solid.js";

export const MARGIN = 24; // left margin used by auto placement
export const GAP = 16; // vertical gap used by auto placement

function isEqual(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => a[k] === b[k]);
}

export function createLayoutStore() {
  const elements = new Map(); // id -> element (replaced with a new object on every change)
  const listeners = new Set();
  const allocations = new Map(); // id -> {x, y} chosen by auto placement
  const names = new Map(); // React id -> readable auto id
  const counters = new Map();
  const mounts = new Map();
  const dynamicIds = new Set();
  const EMPTY_DYNAMIC = [];
  let cachedDynamic = EMPTY_DYNAMIC;
  let version = 0;
  let selectedId = null;
  let canvasDeploy = false; // set by <UI.Canvas deploy>
  let master = { isDraggable: true, isResizable: true, deploy: false }; // set by <UI.MasterPanel>
  let cursorY = MARGIN;
  let canvasEl = null;

  const emit = () => {
    version += 1;
    listeners.forEach((l) => l());
  };

  // Applies solid.js's answer to the stored geometry. Returns true if anything moved.
  // Does not emit; callers do.
  function pushAside(seedId) {
    const seed = elements.get(seedId);
    const targetParentId = seed ? (seed.parentId ?? null) : null;
    const siblings = Array.from(elements.values()).filter(
      (e) => (e.parentId ?? null) === targetParentId
    );
    const moves = resolveSolid(siblings, seedId);
    let any = false;
    moves.forEach((pos, otherId) => {
      const cur = elements.get(otherId);
      if (cur && (cur.x !== pos.x || cur.y !== pos.y)) {
        elements.set(otherId, { ...cur, x: pos.x, y: pos.y });
        any = true;
      }
    });
    return any;
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getVersion: () => version,
    getElement: (id) => elements.get(id),
    getElements: () => Array.from(elements.values()),
    getRootPosition(id) {
      const el = elements.get(id);
      if (!el) return { x: 0, y: 0 };
      let rx = el.x;
      let ry = el.y;
      let pid = el.parentId;
      while (pid) {
        const parent = elements.get(pid);
        if (!parent) break;
        rx += parent.x;
        ry += parent.y;
        pid = parent.parentId;
      }
      return { x: rx, y: ry };
    },
    getSelectedId: () => selectedId,
    isSelected: (id) => selectedId === id,
    // The page is deployed if the Canvas says so OR the master panel says so.
    getPageDeployed: () => canvasDeploy || master.deploy,
    getCanvasDeployed: () => canvasDeploy,
    getMaster: () => master,
    getMasterDrag: () => master.isDraggable,
    getMasterResize: () => master.isResizable,
    getMasterDeploy: () => master.deploy,
    // Hidden widgets and nested widgets do not make the root canvas grow.
    getMaxBottom: () => Math.max(0, ...Array.from(elements.values()).filter((e) => !e.hidden && !e.parentId).map((e) => e.y + e.height)),
    getMaxRight: () => Math.max(0, ...Array.from(elements.values()).filter((e) => !e.hidden && !e.parentId).map((e) => e.x + e.width)),
    getDynamicElements: () => cachedDynamic,
    emit,

    setPageDeployed(value) {
      const next = !!value;
      if (next === canvasDeploy) return;
      canvasDeploy = next;
      if (next) selectedId = null;
      emit();
    },
    // Runtime switches from the master panel: { isDraggable?, isResizable?, deploy? }
    setMaster(patch) {
      const next = { ...master, ...patch };
      if (Object.keys(next).every((k) => next[k] === master[k])) return;
      master = next;
      if (master.deploy) selectedId = null;
      emit();
    },
    select(id) {
      if (id === selectedId) return;
      selectedId = id;
      emit();
    },
    setCanvasElement(el) {
      canvasEl = el;
    },
    getCanvasSize() {
      return canvasEl
        ? { width: canvasEl.clientWidth, height: canvasEl.clientHeight }
        : { width: 0, height: 0 };
    },

    // Readable auto id like "text-1", stable for one React component instance.
    nameFor(reactId, type) {
      if (!names.has(reactId)) {
        const n = (counters.get(type) || 0) + 1;
        counters.set(type, n);
        names.set(reactId, `${type.toLowerCase()}-${n}`);
      }
      return names.get(reactId);
    },

    // Auto placement: explicit x / y are kept; a missing y goes below the previous auto widget.
    allocate(id, position, size) {
      if (allocations.has(id)) return allocations.get(id);
      const x = position.x ?? MARGIN;
      let y = position.y;
      if (y === undefined) {
        y = cursorY;
        cursorY += size.height + GAP;
      }
      const spot = { x, y };
      allocations.set(id, spot);
      return spot;
    },

    // Safe to call during render: it never notifies subscribers.
    ensure(id, initial) {
      if (!elements.has(id)) elements.set(id, { ...initial });
      return elements.get(id);
    },
    update(id, patch) {
      const old = elements.get(id);
      if (!old) return;
      // dynamicFlags preserves socket-set layout flags (hidden, solid, deploy,
      // isDraggable, isResizable) so that React's useLayoutEffect re-render
      // does not overwrite them with the static JSX prop values.
      // It intentionally does NOT include x/y/width/height so that the user
      // can still freely drag and resize after a socket update.
      if (old.dynamicFlags) {
        patch = { ...patch, ...old.dynamicFlags };
      }
      if (patch.props && old.dynamicProps) {
        patch.props = { ...patch.props, ...old.dynamicProps };
      }
      const changed = Object.keys(patch).some((k) => !isEqual(old[k], patch[k]));
      if (!changed) return;
      const next = { ...old, ...patch };
      elements.set(id, next);
      // Solid widgets make room when they GROW, APPEAR or MOVE.
      if (next.solid && !next.hidden) {
        const grew = next.width > old.width || next.height > old.height;
        const appeared = !old.solid || !!old.hidden;
        const moved = next.x !== old.x || next.y !== old.y;
        if (grew || appeared || moved) pushAside(id);
      }
      if (dynamicIds.has(id)) {
        cachedDynamic = Array.from(dynamicIds).map((i) => elements.get(i)).filter(Boolean);
      }
      emit();
    },
    applySocketUpdates(payload) {
      const items = Array.isArray(payload) ? payload : [payload];
      let anyChange = false;

      items.forEach((item) => {
        if (!item || item.id === undefined || item.id === null) return;
        const id = String(item.id);
        const { id: _id, type: itemType, position, size, ...rawProps } = item;

        // Content props vs layout props
        const contentProps = {};
        const layoutPatch = {};

        for (const [key, val] of Object.entries(rawProps)) {
          if (
            key === "x" || key === "y" || key === "width" || key === "height" ||
            key === "isDraggable" || key === "isResizable" || key === "deploy" ||
            key === "hidden" || key === "solid" || key === "parentId"
          ) {
            layoutPatch[key] = val;
          } else {
            contentProps[key] = val;
          }
        }

        // Support position: { x, y } and size: { width, height }
        if (position && typeof position === "object") {
          if (position.x !== undefined) layoutPatch.x = position.x;
          if (position.y !== undefined) layoutPatch.y = position.y;
        }
        if (size && typeof size === "object") {
          if (size.width !== undefined) layoutPatch.width = size.width;
          if (size.height !== undefined) layoutPatch.height = size.height;
        }

        // Handle variant / varient aliases nicely
        if (contentProps.varient !== undefined && contentProps.variant === undefined) {
          contentProps.variant = typeof contentProps.varient === "string" ? contentProps.varient.toLowerCase() : contentProps.varient;
        } else if (typeof contentProps.variant === "string") {
          contentProps.variant = contentProps.variant.toLowerCase();
        }

        const old = elements.get(id);
        if (old) {
          const nextDynamicProps = { ...(old.dynamicProps || {}), ...contentProps };
          // dynamicFlags: only layout FLAGS that useLayoutEffect would overwrite.
          // x/y/width/height are NOT stored here so drag/resize still works.
          const flagKeys = ["hidden", "solid", "deploy", "isDraggable", "isResizable", "parentId"];
          const flagPatch = {};
          for (const k of flagKeys) {
            if (layoutPatch[k] !== undefined) flagPatch[k] = layoutPatch[k];
          }
          const nextDynamicFlags = { ...(old.dynamicFlags || {}), ...flagPatch };
          const nextProps = { ...(old.props || {}), ...contentProps };
          const next = { ...old, ...layoutPatch, props: nextProps, dynamicProps: nextDynamicProps, dynamicFlags: nextDynamicFlags };
          elements.set(id, next);

          if (next.solid && !next.hidden) {
            const grew = next.width > old.width || next.height > old.height;
            const appeared = !old.solid || !!old.hidden;
            const moved = next.x !== old.x || next.y !== old.y;
            if (grew || appeared || moved || (!old.solid && next.solid)) pushAside(id);
          }
          anyChange = true;
        } else {
          // If the component does not exist, create a new one with the same config
          let widgetType = itemType;
          if (!widgetType) {
            if (
              contentProps.childResizeMode !== undefined ||
              /panel|parent/i.test(id)
            ) {
              widgetType = "ParentPanel";
            } else if (
              contentProps.variant || contentProps.varient ||
              contentProps.onClick || contentProps.loading ||
              /btn|button|submit/i.test(id)
            ) {
              widgetType = "Button";
            } else {
              widgetType = "Text";
            }
          }

          let defaultSize = { width: 240, height: 40 };
          if (widgetType === "Button") {
            defaultSize = { width: 140, height: 44 };
          } else if (widgetType === "ParentPanel") {
            defaultSize = { width: 800, height: 500 };
          }
          const width = layoutPatch.width ?? defaultSize.width;
          const height = layoutPatch.height ?? defaultSize.height;

          const pos = { x: layoutPatch.x, y: layoutPatch.y };
          const spot = allocations.has(id)
            ? allocations.get(id)
            : {
                x: pos.x ?? MARGIN,
                y: pos.y !== undefined ? pos.y : cursorY,
              };
          if (!allocations.has(id)) {
            allocations.set(id, spot);
            if (pos.y === undefined) cursorY += height + GAP;
          }

          const created = {
            id,
            type: widgetType,
            isAutoId: false,
            isDynamic: true,
            parentId: layoutPatch.parentId ?? null,
            x: layoutPatch.x ?? spot.x,
            y: layoutPatch.y ?? spot.y,
            width,
            height,
            isDraggable: layoutPatch.isDraggable ?? true,
            isResizable: layoutPatch.isResizable ?? true,
            deploy: !!layoutPatch.deploy,
            hidden: !!layoutPatch.hidden,
            solid: !!layoutPatch.solid,
            props: contentProps,
            dynamicProps: contentProps,
            dynamicFlags: {
              ...(layoutPatch.hidden !== undefined ? { hidden: layoutPatch.hidden } : {}),
              ...(layoutPatch.solid !== undefined ? { solid: layoutPatch.solid } : {}),
              ...(layoutPatch.deploy !== undefined ? { deploy: layoutPatch.deploy } : {}),
              ...(layoutPatch.isDraggable !== undefined ? { isDraggable: layoutPatch.isDraggable } : {}),
              ...(layoutPatch.isResizable !== undefined ? { isResizable: layoutPatch.isResizable } : {}),
              ...(layoutPatch.parentId !== undefined ? { parentId: layoutPatch.parentId } : {}),
            },
          };
          elements.set(id, created);
          dynamicIds.add(id);
          if (created.solid && !created.hidden) {
            pushAside(id);
          }
          anyChange = true;
        }
      });

      if (anyChange) {
        if (dynamicIds.size > 0) {
          cachedDynamic = Array.from(dynamicIds).map((id) => elements.get(id)).filter(Boolean);
        } else {
          cachedDynamic = EMPTY_DYNAMIC;
        }
        emit();
      }
      return anyChange;
    },
    // Counts mounts so React StrictMode's mount-unmount-mount does not lose the widget.
    mount(id) {
      mounts.set(id, (mounts.get(id) || 0) + 1);
      // A solid widget that is on screen from the start also makes room for itself.
      const first = elements.get(id);
      if (first && first.solid && !first.hidden && pushAside(id)) emit();
      return () => {
        mounts.set(id, mounts.get(id) - 1);
        queueMicrotask(() => {
          if ((mounts.get(id) || 0) <= 0) {
            mounts.delete(id);
            if (dynamicIds.delete(id)) {
              cachedDynamic = Array.from(dynamicIds).map((i) => elements.get(i)).filter(Boolean);
            }
            if (elements.delete(id)) emit();
          }
        });
      };
    },
  };
}
