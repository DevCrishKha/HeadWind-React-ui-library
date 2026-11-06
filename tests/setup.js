import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom may not have PointerEvent; this version keeps clientX / clientY.
if (typeof window.PointerEvent === "undefined") {
  class PE extends MouseEvent {
    constructor(type, init = {}) { super(type, init); this.pointerId = init.pointerId ?? 1; }
  }
  window.PointerEvent = PE;
  globalThis.PointerEvent = PE;
}
afterEach(cleanup);
