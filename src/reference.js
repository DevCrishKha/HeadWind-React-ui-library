import { defaultUIConfig, mergeLayoutConfig } from "./config.js";

// Documentation that gets embedded in the exported JSON, so you never have to remember
// which props and hooks exist.
export function layoutPropsReference(widgetDefaults = {}) {
  const d = mergeLayoutConfig(defaultUIConfig, widgetDefaults);
  const pos = "auto";
  return {
    id: { type: "string", default: 'auto-generated, e.g. "text-1"', description: "Name used in the overlay, the export and useUIElement(id). Give important widgets a stable id." },
    position: { type: '"auto" | { x?: number, y?: number }', default: pos, description: "Pixels from the canvas top-left corner. You can give only x or only y; the other one is placed automatically." },
    size: { type: "{ width?: number, height?: number }", default: d.size, description: "Size in pixels. You can give only width or only height." },
    isDraggable: { type: "boolean", default: d.isDraggable, description: "Allow dragging in edit mode." },
    isResizable: { type: "boolean", default: d.isResizable, description: "Show resize handles in edit mode." },
    deploy: { type: "boolean", default: d.deploy, description: "true = hide all editing tools for this widget. Position, size and behaviour stay the same." },
  };
}

export const layoutCallbacksReference = {
  onPositionChange: { signature: "(position: { x, y }) => void", description: "Called while the widget moves." },
  onSizeChange: { signature: "(size: { width, height }) => void", description: "Called while the widget is resized." },
  onLayoutChange: { signature: "({ position, size }) => void", description: "Called when position or size changes." },
};

export function hooksReference(id) {
  return [
    { name: "useUIElement", usage: `const geometry = useUIElement("${id}");`, returns: "{ id, type, position: {x,y}, size: {width,height}, isDraggable, isResizable, deploy } or null", description: "Live geometry and settings of this widget. Re-renders as it moves." },
    { name: "useUILayout", usage: "const layout = useUILayout();", returns: "{ elements, selectedId, select(id), pageDeployed, master, setMaster({isDraggable,isResizable,deploy}), exportGeometry(), exportJSON(), copyJSON() }", description: "Everything on the canvas at once, plus export helpers." },
    { name: "useUIConfig", usage: "const config = useUIConfig();", returns: "the global defaults given to <UIProvider config={...}>", description: "Read the shared defaults." },
  ];
}

// Documentation for the layout props added after version 0.1.0. They live in their own
// block (not inside layoutProps) so the original layoutProps list stays unchanged.
export function layoutPropsExtraReference() {
  return {
    hidden: { type: "boolean", default: false, description: "true = the widget is not shown. Its geometry is kept and readable, its content stays mounted, and it neither pushes nor gets pushed by solid widgets." },
    solid: { type: "boolean", default: false, description: "true = when this widget grows (resize handles or a changed size prop), appears, or loads overlapping others, it pushes those widgets aside. Dragging is never blocked." },
  };
}
