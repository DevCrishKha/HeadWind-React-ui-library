import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { UI, UIProvider, useUILayout, resolveSolid } from "@devcrish/headwind";

// Same helper pattern as tests/library.test.jsx (copied, not imported).
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
    rerender: (kids, o = {}) =>
      result.rerender(ui(kids, o.deploy ?? deploy, o.config ?? config)),
    widget: (id) => document.querySelector(`[data-ui-id="${id}"]`),
  };
}
const pos = (x, y) => ({ x, y });
const sz = (width, height) => ({ width, height });

// Resize through a handle: select first so handles appear, then drag the handle.
function resizeBy(t, id, handle, dx, dy) {
  fireEvent.pointerDown(t.widget(id), { clientX: 1, clientY: 1, button: 0 });
  fireEvent.pointerUp(window);
  const h = document.querySelector(
    `[data-ui-id="${id}"] [data-testid="ui-handle-${handle}"]`,
  );
  fireEvent.pointerDown(h, { clientX: 500, clientY: 500, button: 0 });
  fireEvent.pointerMove(window, { clientX: 500 + dx, clientY: 500 + dy });
  fireEvent.pointerUp(window);
}
function dragBy(t, id, dx, dy) {
  fireEvent.pointerDown(t.widget(id), {
    clientX: 100,
    clientY: 100,
    button: 0,
  });
  fireEvent.pointerMove(window, { clientX: 100 + dx, clientY: 100 + dy });
  fireEvent.pointerUp(window);
}

describe("hidden", () => {
  it("is false by default and the widget is displayed", () => {
    const t = setup(<UI.Text id="a" />);
    expect(t.widget("a").style.display).not.toBe("none");
    expect(t.geo("a").hidden).toBe(false);
  });

  it("hidden hides the widget but keeps geometry, content and state mounted", () => {
    const t = setup(
      <UI.Text id="a" text="Hello" position={pos(40, 50)} hidden />,
    );
    expect(t.widget("a").style.display).toBe("none");
    expect(t.widget("a").textContent).toContain("Hello"); // still mounted
    expect(t.geo("a").position).toEqual(pos(40, 50)); // geometry still readable
    expect(t.geo("a").hidden).toBe(true);
  });

  it("can be switched with React state, and the widget comes back where it was", () => {
    const t = setup(<UI.Text id="a" position={pos(40, 50)} hidden />);
    t.rerender(<UI.Text id="a" position={pos(40, 50)} hidden={false} />);
    expect(t.widget("a").style.display).not.toBe("none");
    expect(t.geo("a").position).toEqual(pos(40, 50));
  });

  it("can be a global default from the provider, and a widget can override it", () => {
    const t = setup(
      <>
        <UI.Text id="a" />
        <UI.Text id="b" hidden={false} />
      </>,
      { config: { hidden: true } },
    );
    expect(t.widget("a").style.display).toBe("none");
    expect(t.widget("b").style.display).not.toBe("none");
  });

  it("a hidden widget cannot be dragged and shows no tools", () => {
    const t = setup(<UI.Text id="a" position={pos(10, 10)} hidden />);
    dragBy(t, "a", 50, 50);
    expect(t.geo("a").position).toEqual(pos(10, 10));
    expect(document.querySelector('[data-testid="ui-overlay"]')).toBeNull();
  });

  it("hiding clears the selection", () => {
    const t = setup(<UI.Text id="a" position={pos(10, 10)} />);
    fireEvent.pointerDown(t.widget("a"), { clientX: 1, clientY: 1, button: 0 });
    fireEvent.pointerUp(window);
    expect(t.layout().selectedId).toBe("a");
    t.rerender(<UI.Text id="a" position={pos(10, 10)} hidden />);
    expect(t.layout().selectedId).toBe(null);
  });

  it("a hidden widget does not make the full-page canvas grow", () => {
    const t = setup(
      <>
        <UI.Text id="a" position={pos(0, 0)} />
        <UI.Text id="far" position={pos(0, 2000)} hidden />
      </>,
    );
    const canvas = document.querySelector("[data-ui-canvas]");
    expect(parseInt(canvas.style.height || "0", 10)).toBeLessThan(2000);
    t.rerender(
      <>
        <UI.Text id="a" position={pos(0, 0)} />
        <UI.Text id="far" position={pos(0, 2000)} />
      </>,
    );
    expect(parseInt(canvas.style.height, 10)).toBeGreaterThanOrEqual(2040);
  });

  it("keeps working on a deployed page and the button inside a visible widget still works", () => {
    const onClick = vi.fn();
    const t = setup(
      <>
        <UI.Button id="b" text="Go" onClick={onClick} />
        <UI.Text id="h" hidden />
      </>,
      { deploy: true },
    );
    fireEvent.click(t.widget("b").querySelector("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(t.widget("h").style.display).toBe("none");
  });
});

describe("solid: pure function resolveSolid", () => {
  const box = (id, x, y, width, height, extra = {}) => ({
    id,
    x,
    y,
    width,
    height,
    ...extra,
  });

  it("returns nothing when nobody overlaps", () => {
    expect(
      resolveSolid([box("s", 0, 0, 100, 100), box("a", 200, 0, 50, 50)], "s")
        .size,
    ).toBe(0);
  });
  it("pushes the overlapped widget to the nearest side (right)", () => {
    const m = resolveSolid(
      [box("s", 0, 0, 120, 100), box("a", 100, 0, 50, 50)],
      "s",
    );
    expect(m.get("a")).toEqual(pos(120, 0));
  });
  it("pushes down when that is the smaller move", () => {
    const m = resolveSolid(
      [box("s", 0, 0, 100, 120), box("a", 0, 100, 50, 50)],
      "s",
    );
    expect(m.get("a")).toEqual(pos(0, 120));
  });
  it("pushes left when the widget is on the left, and never below 0", () => {
    const m = resolveSolid(
      [box("s", 90, 0, 100, 100), box("a", 50, 0, 50, 50)],
      "s",
    );
    expect(m.get("a")).toEqual(pos(40, 0));
    const edge = resolveSolid(
      [box("s", 10, 0, 100, 100), box("a", 0, 0, 50, 50)],
      "s",
    );
    expect(edge.get("a").x).toBeGreaterThanOrEqual(0);
    expect(edge.get("a").y).toBeGreaterThanOrEqual(0);
  });
  it("cascades: a pushed widget pushes the next one in the same direction", () => {
    const m = resolveSolid(
      [
        box("s", 0, 0, 120, 50),
        box("a", 100, 0, 50, 50),
        box("b", 160, 0, 50, 50),
      ],
      "s",
    );
    expect(m.get("a")).toEqual(pos(120, 0));
    expect(m.get("b")).toEqual(pos(170, 0));
  });
  it("ignores hidden widgets and never moves the seed", () => {
    const m = resolveSolid(
      [box("s", 0, 0, 120, 100), box("a", 100, 0, 50, 50, { hidden: true })],
      "s",
    );
    expect(m.size).toBe(0);
    expect(
      resolveSolid(
        [box("s", 0, 0, 10, 10, { hidden: true }), box("a", 0, 0, 50, 50)],
        "s",
      ).size,
    ).toBe(0);
  });
  it("terminates on crowded layouts", () => {
    const els = Array.from({ length: 30 }, (_, i) =>
      box(`w${i}`, i * 5, i * 5, 80, 80),
    );
    expect(() => resolveSolid(els, "w0")).not.toThrow();
  });
});

describe("solid: in the UI", () => {
  const two = (solid, size = sz(100, 60)) => (
    <>
      <UI.Text id="s" solid={solid} position={pos(0, 0)} size={size} />
      <UI.Text id="a" position={pos(110, 0)} size={sz(80, 60)} />
    </>
  );

  it("is false by default: growing over a neighbour does NOT move it (old behaviour)", () => {
    const t = setup(two(false));
    resizeBy(t, "s", "e", 60, 0);
    expect(t.geo("s").size.width).toBe(160);
    expect(t.geo("a").position).toEqual(pos(110, 0));
  });

  it("resizing a solid widget pushes the neighbour aside", () => {
    const t = setup(two(true));
    resizeBy(t, "s", "e", 60, 0);
    expect(t.geo("s").size.width).toBe(160);
    expect(t.geo("a").position).toEqual(pos(160, 0));
  });

  it("keeps pushing as you keep resizing, and the neighbour stays put when you shrink", () => {
    const t = setup(two(true));
    resizeBy(t, "s", "e", 60, 0);
    resizeBy(t, "s", "e", 40, 0);
    expect(t.geo("a").position.x).toBe(200);
    resizeBy(t, "s", "e", -100, 0);
    expect(t.geo("s").size.width).toBe(100);
    expect(t.geo("a").position.x).toBe(200);
  });

  it("growing downward pushes a widget below", () => {
    const t = setup(
      <>
        <UI.Text id="s" solid position={pos(0, 0)} size={sz(100, 60)} />
        <UI.Text id="b" position={pos(0, 70)} size={sz(100, 40)} />
      </>,
    );
    resizeBy(t, "s", "s", 0, 30);
    expect(t.geo("b").position).toEqual(pos(0, 90));
  });

  it("growing from the west handle pushes a widget on the left to the left", () => {
    const t = setup(
      <>
        <UI.Text id="l" position={pos(0, 0)} size={sz(100, 60)} />
        <UI.Text id="s" solid position={pos(110, 0)} size={sz(100, 60)} />
      </>,
    );
    resizeBy(t, "s", "w", -40, 0);
    expect(t.geo("s").position.x).toBe(70);
    expect(t.geo("l").position.x).toBe(-30 < 0 ? 0 : -30); // clamped at the canvas edge
    expect(t.geo("l").position.x).toBeGreaterThanOrEqual(0);
  });

  it("dragging a solid widget over another pushes it aside", () => {
    const t = setup(two(true));
    dragBy(t, "s", 50, 0);
    expect(t.geo("s").position.x).toBe(50);
    expect(t.geo("a").position).toEqual(pos(150, 0));
  });

  it("pushed widgets are still pushed when they are not draggable or are deployed individually", () => {
    const t = setup(
      <>
        <UI.Text id="s" solid position={pos(0, 0)} size={sz(100, 60)} />
        <UI.Text
          id="a"
          isDraggable={false}
          deploy
          position={pos(110, 0)}
          size={sz(80, 60)}
        />
      </>,
    );
    resizeBy(t, "s", "e", 60, 0);
    expect(t.geo("a").position.x).toBe(160);
  });

  it("reports pushed widgets through onPositionChange", () => {
    const onPositionChange = vi.fn();
    const t = setup(
      <>
        <UI.Text id="s" solid position={pos(0, 0)} size={sz(100, 60)} />
        <UI.Text
          id="a"
          position={pos(110, 0)}
          size={sz(80, 60)}
          onPositionChange={onPositionChange}
        />
      </>,
    );
    resizeBy(t, "s", "e", 60, 0);
    expect(onPositionChange).toHaveBeenLastCalledWith(pos(160, 0));
  });

  it("hidden widgets are not pushed", () => {
    const t = setup(
      <>
        <UI.Text id="s" solid position={pos(0, 0)} size={sz(100, 60)} />
        <UI.Text id="a" hidden position={pos(110, 0)} size={sz(80, 60)} />
      </>,
    );
    resizeBy(t, "s", "e", 60, 0);
    expect(t.geo("a").position).toEqual(pos(110, 0));
  });
});

describe("solid: in React code", () => {
  const tree = (width, solid = true) => (
    <>
      <UI.Text id="s" solid={solid} position={pos(0, 0)} size={sz(width, 60)} />
      <UI.Text id="a" position={pos(110, 0)} size={sz(80, 60)} />
      <UI.Text id="b" position={pos(200, 0)} size={sz(80, 60)} />
    </>
  );

  it("increasing the size prop pushes neighbours, and cascades", () => {
    const t = setup(tree(100));
    t.rerender(tree(150)); // s now ends at 150, overlapping a (110..190)
    expect(t.geo("a").position.x).toBe(150);
    expect(t.geo("b").position.x).toBe(230); // a now ends at 230 and bumped b
  });

  it("decreasing the size prop moves nothing", () => {
    const t = setup(tree(100));
    t.rerender(tree(150));
    t.rerender(tree(80));
    expect(t.geo("a").position.x).toBe(150);
  });

  it("works while the page is deployed", () => {
    const t = setup(tree(100), { deploy: true });
    t.rerender(tree(150), { deploy: true });
    expect(t.geo("a").position.x).toBe(150);
  });

  it("without solid, a bigger size prop does not move anything", () => {
    const t = setup(tree(100, false));
    t.rerender(tree(150, false));
    expect(t.geo("a").position.x).toBe(110);
  });

  it("a solid widget that loads overlapping others makes room for itself", () => {
    const t = setup(tree(150));
    expect(t.geo("s").position).toEqual(pos(0, 0));
    expect(t.geo("a").position.x).toBe(150);
    expect(t.geo("b").position.x).toBe(230);
  });

  it("turning solid on, or showing a hidden solid widget, makes room", () => {
    const t = setup(tree(150, false));
    expect(t.geo("a").position.x).toBe(110);
    t.rerender(tree(150, true));
    expect(t.geo("a").position.x).toBe(150);

    const h = setup(
      <>
        <UI.Text id="s" solid hidden position={pos(0, 0)} size={sz(150, 60)} />
        <UI.Text id="a" position={pos(110, 0)} size={sz(80, 60)} />
      </>,
    );
    expect(h.geo("a").position.x).toBe(110); // hidden: takes no space
    h.rerender(
      <>
        <UI.Text
          id="s"
          solid
          hidden={false}
          position={pos(0, 0)}
          size={sz(150, 60)}
        />
        <UI.Text id="a" position={pos(110, 0)} size={sz(80, 60)} />
      </>,
    );
    expect(h.geo("a").position.x).toBe(150);
  });

  it("the global provider default solid applies to every widget unless overridden", () => {
    const t = setup(
      <>
        <UI.Text id="s" position={pos(0, 0)} size={sz(150, 60)} />
        <UI.Text
          id="a"
          position={pos(110, 0)}
          size={sz(80, 60)}
          solid={false}
        />
      </>,
      { config: { solid: true } },
    );
    expect(t.geo("s").solid).toBe(true);
    expect(t.geo("a").solid).toBe(false);
    expect(t.geo("a").position.x).toBe(150); // s is solid, so it pushed a
  });

  it("changing content props never changes layout", () => {
    const t = setup(<UI.Text id="a" solid text="one" position={pos(5, 6)} />);
    t.rerender(<UI.Text id="a" solid text="two" position={pos(5, 6)} />);
    expect(t.geo("a").position).toEqual(pos(5, 6));
  });
});

describe("export and hooks include the new props", () => {
  it("geometry, extras and reference mention hidden and solid; the original blocks are unchanged", () => {
    const t = setup(<UI.Text id="a" solid hidden />);
    const data = t.layout().exportGeometry();
    const w = data.widgets[0];
    expect(w.extras).toEqual({ hidden: true, solid: true });
    expect(w.settings).toEqual({
      isDraggable: true,
      isResizable: true,
      deploy: false,
    });
    expect(Object.keys(w.reference.layoutProps)).toEqual([
      "id",
      "position",
      "size",
      "isDraggable",
      "isResizable",
      "deploy",
    ]);
    expect(Object.keys(w.reference.layoutPropsExtra)).toEqual([
      "hidden",
      "solid",
    ]);
    expect(t.geo("a")).toMatchObject({ hidden: true, solid: true });
  });
});
