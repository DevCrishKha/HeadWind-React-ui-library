// "Solid" layout logic. Pure functions, no React, no store access.
//
// A widget with `solid` makes room for itself: when it grows (or appears), every visible
// widget it would overlap is pushed aside, and anything those widgets then run into is
// pushed along in the same direction (like sliding blocks).
//
// Dragging is NOT affected: widgets can still be dragged on top of each other freely.
// This file only decides WHERE overlapping widgets should go. src/store.js applies the result.

export const SOLID_GAP = 0; // pixels left between a solid widget and the widgets it pushes
const MAX_STEPS = 500; // safety limit so a pathological layout can never loop forever

const overlaps = (a, b) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

// Pick the side with the smallest move. Ties prefer right, then down, then left, then up.
// Left / up are only allowed if the widget stays inside the canvas (x >= 0, y >= 0).
function pickDirection(p, w, gap) {
  const options = [
    { dir: "right", move: p.x + p.width + gap - w.x, ok: true },
    { dir: "down", move: p.y + p.height + gap - w.y, ok: true },
    { dir: "left", move: w.x + w.width + gap - p.x, ok: p.x - gap - w.width >= 0 },
    { dir: "up", move: w.y + w.height + gap - p.y, ok: p.y - gap - w.height >= 0 },
  ];
  let best = null;
  for (const o of options) if (o.ok && (best === null || o.move < best.move)) best = o;
  return best.dir; // "right" is always allowed, so best is never null
}

function shift(w, p, dir, gap) {
  if (dir === "right") w.x = p.x + p.width + gap;
  else if (dir === "left") w.x = Math.max(0, p.x - gap - w.width);
  else if (dir === "down") w.y = p.y + p.height + gap;
  else w.y = Math.max(0, p.y - gap - w.height);
}

/**
 * Works out which widgets must move so that `seedId` overlaps nobody.
 *
 * @param {Array<{id, x, y, width, height, hidden?}>} elements all widgets on the canvas
 * @param {string} seedId the solid widget that needs room (it never moves itself)
 * @returns {Map<string, {x, y}>} new positions, only for widgets that have to move
 *
 * Rules:
 *  - hidden widgets neither push nor get pushed;
 *  - the first widgets pushed go to the side that needs the smallest move;
 *  - a pushed widget then pushes whatever it hits in the SAME direction;
 *  - best effort: pushing left / up stops at the canvas edge (0), where overlap can remain.
 */
export function resolveSolid(elements, seedId, { gap = SOLID_GAP } = {}) {
  const rects = new Map();
  for (const e of elements) {
    rects.set(e.id, { id: e.id, x: e.x, y: e.y, width: e.width, height: e.height, hidden: !!e.hidden });
  }
  const seed = rects.get(seedId);
  const moved = new Map();
  if (!seed || seed.hidden) return moved;

  const queue = [{ id: seedId, dir: null }];
  let steps = 0;
  while (queue.length && steps < MAX_STEPS) {
    steps += 1;
    const { id, dir } = queue.shift();
    const p = rects.get(id);
    for (const w of rects.values()) {
      if (w.id === id || w.id === seedId || w.hidden) continue;
      if (!overlaps(p, w)) continue;
      const d = dir ?? pickDirection(p, w, gap);
      shift(w, p, d, gap);
      moved.set(w.id, { x: w.x, y: w.y });
      queue.push({ id: w.id, dir: d });
    }
  }
  return moved;
}
