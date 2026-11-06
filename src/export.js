import { getWidgetInfo, getAllWidgetInfo } from "./registry.js";
import { layoutPropsReference, layoutPropsExtraReference, layoutCallbacksReference, hooksReference } from "./reference.js";

const COORDINATES =
  "Pixels. (0,0) is the top-left corner of the UI.Canvas. x grows to the right, y grows down. Values are relative to the canvas, not the browser window.";

export function toGeometry(el, store) {
  if (!el) return null;
  const rootPos = store && el.parentId ? store.getRootPosition(el.id) : (el.rootPosition ?? { x: el.x, y: el.y });
  return {
    id: el.id,
    type: el.type,
    position: { x: el.x, y: el.y },
    size: { width: el.width, height: el.height },
    isDraggable: el.isDraggable,
    isResizable: el.isResizable,
    deploy: el.deploy,
    hidden: !!el.hidden,
    solid: !!el.solid,
    parentId: el.parentId ?? null,
    parentRelativePosition: { x: el.x, y: el.y },
    rootPosition: rootPos,
  };
}

export function toJSXSnippet(el) {
  const info = getWidgetInfo(el.type);
  const tag = info && info.builtIn ? `UI.${el.type}` : el.type;
  const attrs = [];
  if (!el.isAutoId) attrs.push(`id="${el.id}"`);
  attrs.push(`position={{ x: ${el.x}, y: ${el.y} }}`);
  attrs.push(`size={{ width: ${el.width}, height: ${el.height} }}`);
  return `<${tag} ${attrs.join(" ")} />`;
}

export function buildExport(store, { includeReference = true } = {}) {
  const widgets = store.getElements().map((el) => {
    const info = getWidgetInfo(el.type) || {};
    const rootPos = el.parentId ? store.getRootPosition(el.id) : { x: el.x, y: el.y };
    const entry = {
      id: el.id,
      type: el.type,
      idIsAuto: !!el.isAutoId,
      geometry: {
        position: { x: el.x, y: el.y },
        size: { width: el.width, height: el.height },
        ...(el.parentId ? {
          parentId: el.parentId,
          parentRelativePosition: { x: el.x, y: el.y },
          rootPosition: rootPos,
        } : {}),
      },
      settings: { isDraggable: el.isDraggable, isResizable: el.isResizable, deploy: el.deploy },
      extras: { hidden: !!el.hidden, solid: !!el.solid }, // props added after 0.1.0
      jsx: toJSXSnippet(el),
    };
    if (includeReference) {
      const meta = info.meta || {};
      entry.reference = {
        description: meta.description || "",
        layoutProps: layoutPropsReference(info.defaults),
        layoutPropsExtra: layoutPropsExtraReference(),
        layoutCallbacks: layoutCallbacksReference,
        contentProps: meta.props || {},
        hooks: [...hooksReference(el.id), ...(meta.hooks || [])],
      };
    }
    return entry;
  });

  const out = {
    library: "@devcrish/headwind",
    exportedAt: new Date().toISOString(),
    coordinateSystem: COORDINATES,
    canvas: store.getCanvasSize(),
    pageDeployed: store.getPageDeployed(),
    master: store.getMaster(),
    widgets,
  };
  if (includeReference) {
    out.availableWidgetTypes = getAllWidgetInfo().map(([type, info]) => ({
      type,
      description: (info.meta && info.meta.description) || "",
      defaultSize: mergeSize(info.defaults),
    }));
  }
  return out;
}

function mergeSize(defaults = {}) {
  return { width: 240, height: 80, ...(defaults.size || {}) };
}

export async function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the old method */
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}
