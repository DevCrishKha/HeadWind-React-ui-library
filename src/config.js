// Built-in defaults. Every widget starts from this, then its own defaults, then the
// provider config, then its own props (later layers win).
export const defaultUIConfig = {
  position: "auto", // "auto" = the library picks a real x/y when the widget appears
  size: { width: 240, height: 80 },
  isDraggable: true,
  isResizable: true,
  deploy: false,
  hidden: false, // true = the widget is not shown (its geometry is still kept)
  solid: false, // true = the widget pushes overlapping widgets aside when it grows or appears
};

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const definedOnly = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

/**
 * Merge config layers. Later layers win. Rules:
 *  - `undefined` never overrides anything.
 *  - `position` / `size` merge per key, so { x: 10 } keeps the old y,
 *    and { width: 300 } keeps the old height.
 *  - position: "auto" clears x and y so the library places the widget.
 * Result always has `position` ({x?, y?}) and `size` ({width?, height?}) objects.
 */
export function mergeLayoutConfig(...layers) {
  const result = { position: {}, size: {} };
  for (const layer of layers) {
    if (!layer) continue;
    for (const [key, value] of Object.entries(layer)) {
      if (value === undefined) continue;
      if (key === "position") {
        if (value === "auto") result.position = {};
        else if (isObject(value)) result.position = { ...result.position, ...definedOnly(value) };
      } else if (key === "size") {
        if (isObject(value)) result.size = { ...result.size, ...definedOnly(value) };
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}
