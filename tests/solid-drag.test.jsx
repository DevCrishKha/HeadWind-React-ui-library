import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { UI, UIProvider, useUILayout } from "@devcrish/headwind";

// Same helper pattern as tests/library.test.jsx (copied, not imported)
function setup(children, { config, deploy = false, canvasProps = {} } = {}) {
  let api;
  function Probe() {
    api = useUILayout();
    return null;
  }
  const ui = (kids, dep, cfg) => (
    <UIProvider config={cfg}>
      <UI.Canvas deploy={dep} {...canvasProps}>
        {kids}
      </UI.Canvas>
      <Probe />
    </UIProvider>
  );
  const result = render(ui(children, deploy, config));
  return {
    layout: () => api,
    geo: (id) => api.elements.find((e) => e.id === id),
    rerender: (kids, o = {}) => result.rerender(ui(kids, o.deploy ?? deploy, o.config ?? config)),
    widget: (id) => document.querySelector(`[data-ui-id="${id}"]`),
  };
}

const pos = (x, y) => ({ x, y });
const sz = (width, height) => ({ width, height });

function dragBy(t, id, dx, dy) {
  fireEvent.pointerDown(t.widget(id), { clientX: 100, clientY: 100, button: 0 });
  fireEvent.pointerMove(window, { clientX: 100 + dx, clientY: 100 + dy });
  fireEvent.pointerUp(window);
}

function dragInSteps(t, id, steps) {
  fireEvent.pointerDown(t.widget(id), { clientX: 100, clientY: 100, button: 0 });
  for (const [dx, dy] of steps) {
    fireEvent.pointerMove(window, { clientX: 100 + dx, clientY: 100 + dy });
  }
  fireEvent.pointerUp(window);
}

describe("solid widget dragging", () => {
  it("dragging a solid widget pushes a neighbouring widget to the right", () => {
    const t = setup(
      <>
        <UI.Text id="s" solid position={pos(0, 0)} size={sz(100, 60)} />
        <UI.Text id="a" position={pos(110, 0)} size={sz(80, 60)} />
      </>,
    );
    dragBy(t, "s", 50, 0);
    expect(t.geo("s").position).toEqual(pos(50, 0));
    expect(t.geo("a").position).toEqual(pos(150, 0));
  });

  it("non-solid widget does NOT push neighbours when dragged", () => {
    const t = setup(
      <>
        <UI.Text id="non" solid={false} position={pos(0, 0)} size={sz(100, 60)} />
        <UI.Text id="a" position={pos(110, 0)} size={sz(80, 60)} />
      </>,
    );
    dragBy(t, "non", 50, 0);
    expect(t.geo("non").position).toEqual(pos(50, 0));
    expect(t.geo("a").position).toEqual(pos(110, 0)); // untouched
  });

  it("continuous dragging in steps keeps pushing the neighbour ahead", () => {
    const t = setup(
      <>
        <UI.Text id="s" solid position={pos(0, 0)} size={sz(100, 60)} />
        <UI.Text id="a" position={pos(110, 0)} size={sz(80, 60)} />
      </>,
    );
    dragInSteps(t, "s", [
      [30, 0],
      [60, 0],
      [90, 0],
      [120, 0],
    ]);
    expect(t.geo("s").position.x).toBe(120);
    expect(t.geo("a").position.x).toBe(220);
  });

  it("cascades: dragging pushes widget A which in turn pushes widget B", () => {
    const t = setup(
      <>
        <UI.Text id="s" solid position={pos(0, 0)} size={sz(100, 60)} />
        <UI.Text id="a" position={pos(110, 0)} size={sz(80, 60)} />
        <UI.Text id="b" position={pos(195, 0)} size={sz(80, 60)} />
      </>,
    );
    dragBy(t, "s", 50, 0);
    // s moves to 50, right edge is 150.
    // a is pushed from 110 to 150. a's right edge is 230.
    // b was at 195, so b is pushed in turn to 230.
    expect(t.geo("s").position).toEqual(pos(50, 0));
    expect(t.geo("a").position).toEqual(pos(150, 0));
    expect(t.geo("b").position).toEqual(pos(230, 0));
  });

  it("respects edge boundaries when pushing towards screen edge 0 (just like solid.js)", () => {
    const t = setup(
      <>
        <UI.Text id="a" position={pos(20, 0)} size={sz(80, 60)} />
        <UI.Text id="s" solid position={pos(110, 0)} size={sz(100, 60)} />
      </>,
    );
    // Drag s left by 15px so s is at 95. a's right edge is 100 > 95, so a is pushed left to 15.
    dragBy(t, "s", -15, 0);
    expect(t.geo("s").position.x).toBe(95);
    expect(t.geo("a").position.x).toBe(15);
    expect(t.geo("a").position.x).toBeGreaterThanOrEqual(0);

    // If pushed further where left would go negative (< 0), solid.js routes it to an allowed direction
    dragBy(t, "s", -30, 0); // s moves to 65. a would need x = 65 - 80 = -15 (< 0), so it shifts down instead
    expect(t.geo("a").position.x).toBeGreaterThanOrEqual(0);
    expect(t.geo("a").position.y).toBeGreaterThanOrEqual(0);
  });

  it("reports pushed widgets through onPositionChange callback", () => {
    const onPositionChange = vi.fn();
    const t = setup(
      <>
        <UI.Text id="s" solid position={pos(0, 0)} size={sz(100, 60)} />
        <UI.Text id="a" position={pos(110, 0)} size={sz(80, 60)} onPositionChange={onPositionChange} />
      </>,
    );
    dragBy(t, "s", 50, 0);
    expect(onPositionChange).toHaveBeenLastCalledWith(pos(150, 0));
  });

  it("pushed widgets are pushed even if non-draggable or deployed", () => {
    const t = setup(
      <>
        <UI.Text id="s" solid position={pos(0, 0)} size={sz(100, 60)} />
        <UI.Text id="a" isDraggable={false} deploy position={pos(110, 0)} size={sz(80, 60)} />
      </>,
    );
    dragBy(t, "s", 50, 0);
    expect(t.geo("a").position).toEqual(pos(150, 0));
  });

  it("hidden widgets are not pushed when dragging a solid widget over them", () => {
    const t = setup(
      <>
        <UI.Text id="s" solid position={pos(0, 0)} size={sz(100, 60)} />
        <UI.Text id="a" hidden position={pos(110, 0)} size={sz(80, 60)} />
      </>,
    );
    dragBy(t, "s", 50, 0);
    expect(t.geo("a").position).toEqual(pos(110, 0));
  });
});

