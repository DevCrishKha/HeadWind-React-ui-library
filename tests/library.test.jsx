import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, screen, act } from "@testing-library/react";
import { UI, UIProvider, useUILayout, useUIElement, mergeLayoutConfig, defaultUIConfig } from "@devcrish/headwind";

// Renders widgets and gives back a function that reads the live layout.
function setup(children, { config, deploy = false } = {}) {
  let api;
  function Probe() { api = useUILayout(); return null; }
  const ui = (kids, dep, cfg) => (
    <UIProvider config={cfg}>
      <UI.Canvas deploy={dep}>{kids}</UI.Canvas>
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
const drag = (el, dx, dy, from = { x: 100, y: 100 }) => {
  fireEvent.pointerDown(el, { clientX: from.x, clientY: from.y, button: 0 });
  fireEvent.pointerMove(window, { clientX: from.x + dx, clientY: from.y + dy });
  fireEvent.pointerUp(window, { clientX: from.x + dx, clientY: from.y + dy });
};

describe("partial config merging", () => {
  it("keeps position.y when only x is overridden", () => {
    const r = mergeLayoutConfig({ position: { x: 1, y: 2 } }, { position: { x: 9 } });
    expect(r.position).toEqual({ x: 9, y: 2 });
  });
  it("keeps size.height when only width is overridden", () => {
    const r = mergeLayoutConfig(defaultUIConfig, { size: { width: 500 } });
    expect(r.size).toEqual({ width: 500, height: 80 });
  });
  it("ignores undefined and resets position with 'auto'", () => {
    const r = mergeLayoutConfig({ isDraggable: false, position: { x: 5, y: 5 } }, { isDraggable: undefined, position: "auto" });
    expect(r.isDraggable).toBe(false);
    expect(r.position).toEqual({});
  });
});

describe("defaults and precedence", () => {
  it("renders with no layout props and uses the widget's default size", () => {
    const t = setup(<UI.Text id="a" text="Hello" />);
    expect(screen.getByText("Hello")).toBeTruthy();
    expect(t.geo("a").size).toEqual({ width: 240, height: 40 });
    expect(t.geo("a").isDraggable).toBe(true);
    expect(t.geo("a").isResizable).toBe(true);
    expect(t.geo("a").deploy).toBe(false);
  });
  it("different widget types have different default sizes", () => {
    const t = setup(<><UI.Text id="t" /><UI.Button id="b" /></>);
    expect(t.geo("b").size).toEqual({ width: 140, height: 44 });
    expect(t.geo("t").size).not.toEqual(t.geo("b").size);
  });
  it("global provider config beats built-in defaults; props beat the provider", () => {
    const t = setup(
      <><UI.Text id="a" /><UI.Text id="b" isDraggable /></>,
      { config: { isDraggable: false, size: { width: 300 } } }
    );
    expect(t.geo("a").isDraggable).toBe(false);
    expect(t.geo("a").size).toEqual({ width: 300, height: 40 });
    expect(t.geo("b").isDraggable).toBe(true);
  });
});

describe("automatic placement", () => {
  it("gives every widget a real, different position (no overlap)", () => {
    const t = setup(<><UI.Text id="a" /><UI.Text id="b" /><UI.Button id="c" /></>);
    const [a, b, c] = ["a", "b", "c"].map(t.geo);
    expect(Number.isFinite(a.position.x) && Number.isFinite(a.position.y)).toBe(true);
    expect(b.position.y).toBeGreaterThanOrEqual(a.position.y + a.size.height);
    expect(c.position.y).toBeGreaterThanOrEqual(b.position.y + b.size.height);
  });
  it("only x given: y is still placed automatically", () => {
    const t = setup(<UI.Text id="a" position={{ x: 400 }} />);
    expect(t.geo("a").position.x).toBe(400);
    expect(Number.isFinite(t.geo("a").position.y)).toBe(true);
  });
  it("explicit position is used exactly", () => {
    const t = setup(<UI.Text id="a" position={{ x: 120, y: 80 }} size={{ width: 300 }} />);
    expect(t.geo("a").position).toEqual({ x: 120, y: 80 });
    expect(t.geo("a").size).toEqual({ width: 300, height: 40 });
  });
});

describe("dragging and resizing", () => {
  it("dragging moves the widget and reports geometry live", () => {
    const t = setup(<UI.Text id="a" position={{ x: 50, y: 60 }} />);
    drag(t.widget("a"), 30, 20);
    expect(t.geo("a").position).toEqual({ x: 80, y: 80 });
  });
  it("calls onPositionChange / onSizeChange / onLayoutChange", () => {
    const onPos = vi.fn(), onSize = vi.fn(), onLayout = vi.fn();
    const t = setup(<UI.Text id="a" position={{ x: 50, y: 60 }} onPositionChange={onPos} onSizeChange={onSize} onLayoutChange={onLayout} />);
    drag(t.widget("a"), 10, 0);
    expect(onPos).toHaveBeenLastCalledWith({ x: 60, y: 60 });
    expect(onSize).not.toHaveBeenCalled();
    fireEvent.pointerDown(t.widget("a")); // select -> handles show
    const se = screen.getByTestId("ui-handle-se");
    fireEvent.pointerDown(se, { clientX: 0, clientY: 0, button: 0 });
    fireEvent.pointerMove(window, { clientX: 20, clientY: 10 });
    fireEvent.pointerUp(window);
    expect(onSize).toHaveBeenLastCalledWith({ width: 260, height: 50 });
    expect(onLayout).toHaveBeenLastCalledWith({ position: { x: 60, y: 60 }, size: { width: 260, height: 50 } });
  });
  it("resizing from the west edge keeps the right edge in place", () => {
    const t = setup(<UI.Text id="a" position={{ x: 100, y: 100 }} />);
    fireEvent.pointerDown(t.widget("a"));
    fireEvent.pointerDown(screen.getByTestId("ui-handle-w"), { clientX: 0, clientY: 0, button: 0 });
    fireEvent.pointerMove(window, { clientX: -40, clientY: 0 });
    fireEvent.pointerUp(window);
    expect(t.geo("a").position.x).toBe(60);
    expect(t.geo("a").size.width).toBe(280);
  });
  it("isDraggable={false} blocks dragging but still allows resizing", () => {
    const t = setup(<UI.Text id="a" position={{ x: 50, y: 60 }} isDraggable={false} />);
    drag(t.widget("a"), 40, 40);
    expect(t.geo("a").position).toEqual({ x: 50, y: 60 });
    fireEvent.pointerDown(t.widget("a"));
    expect(screen.getByTestId("ui-handle-se")).toBeTruthy();
  });
  it("isResizable={false} removes the resize handles but still allows dragging", () => {
    const t = setup(<UI.Text id="a" position={{ x: 50, y: 60 }} isResizable={false} />);
    fireEvent.pointerDown(t.widget("a"));
    expect(screen.queryByTestId("ui-handle-se")).toBeNull();
    drag(t.widget("a"), 10, 10);
    expect(t.geo("a").position).toEqual({ x: 60, y: 70 });
  });
  it("can be switched on and off with React state", () => {
    const t = setup(<UI.Text id="a" position={{ x: 50, y: 60 }} isDraggable={false} />);
    drag(t.widget("a"), 10, 10);
    expect(t.geo("a").position.x).toBe(50);
    t.rerender(<UI.Text id="a" position={{ x: 50, y: 60 }} isDraggable />);
    drag(t.widget("a"), 10, 10);
    expect(t.geo("a").position.x).toBe(60);
  });
  it("a Button can still be clicked in edit mode, but a drag is not a click", () => {
    const onClick = vi.fn();
    const t = setup(<UI.Button id="b" text="Go" onClick={onClick} />);
    fireEvent.pointerDown(screen.getByText("Go"), { clientX: 5, clientY: 5, button: 0 });
    fireEvent.pointerUp(window);
    fireEvent.click(screen.getByText("Go"));
    expect(onClick).toHaveBeenCalledTimes(1);

    const before = t.geo("b").position.x;
    fireEvent.pointerDown(screen.getByText("Go"), { clientX: 5, clientY: 5, button: 0 });
    fireEvent.pointerMove(window, { clientX: 60, clientY: 5 });
    fireEvent.pointerUp(window);
    fireEvent.click(screen.getByText("Go"));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(t.geo("b").position.x).toBe(before + 55);
  });
});

describe("deployment", () => {
  it("a deployed widget hides tools, ignores drag, keeps geometry and content", () => {
    const t = setup(<UI.Text id="a" text="Keep me" position={{ x: 74, y: 32 }} size={{ width: 520, height: 64 }} deploy />);
    fireEvent.pointerDown(t.widget("a"));
    fireEvent.pointerEnter(t.widget("a"));
    expect(screen.queryByTestId("ui-overlay")).toBeNull();
    expect(screen.queryByTestId("ui-handle-se")).toBeNull();
    drag(t.widget("a"), 50, 50);
    expect(t.geo("a").position).toEqual({ x: 74, y: 32 });
    expect(t.geo("a").size).toEqual({ width: 520, height: 64 });
    expect(screen.getByText("Keep me")).toBeTruthy();
    expect(t.widget("a").style.left).toBe("74px");
  });
  it("selecting an editable widget shows the overlay with its numbers", () => {
    const t = setup(<UI.Text id="weather-card" position={{ x: 120, y: 80 }} size={{ width: 300, height: 160 }} />);
    fireEvent.pointerDown(t.widget("weather-card"));
    const text = screen.getByTestId("ui-overlay").textContent;
    expect(text).toContain("Widget: weather-card");
    expect(text).toContain("Position: x=120, y=80");
    expect(text).toContain("Size: width=300, height=160");
    expect(text).toContain("Deployed: false");
  });
  it("page deploy turns editing off for all widgets and back on again; deployed widgets stay locked", () => {
    const kids = (
      <>
        <UI.Text id="free" position={{ x: 10, y: 10 }} />
        <UI.Text id="locked" position={{ x: 10, y: 100 }} deploy />
      </>
    );
    const t = setup(kids, { deploy: true });
    drag(t.widget("free"), 20, 20);
    expect(t.geo("free").position).toEqual({ x: 10, y: 10 });
    expect(t.layout().pageDeployed).toBe(true);

    t.rerender(kids, { deploy: false });
    drag(t.widget("free"), 20, 20);
    expect(t.geo("free").position).toEqual({ x: 30, y: 30 });
    drag(t.widget("locked"), 20, 20);
    expect(t.geo("locked").position).toEqual({ x: 10, y: 100 }); // still deployed
  });
  it("page deploy beats widget deploy={false}", () => {
    const t = setup(<UI.Text id="a" position={{ x: 10, y: 10 }} deploy={false} />, { deploy: true });
    drag(t.widget("a"), 20, 20);
    expect(t.geo("a").position).toEqual({ x: 10, y: 10 });
  });
});

describe("content vs layout", () => {
  it("changing text keeps the dragged position and size", () => {
    const t = setup(<UI.Text id="a" text="one" position={{ x: 50, y: 60 }} />);
    drag(t.widget("a"), 25, 25);
    t.rerender(<UI.Text id="a" text="two" position={{ x: 50, y: 60 }} />);
    expect(screen.getByText("two")).toBeTruthy();
    expect(t.geo("a").position).toEqual({ x: 75, y: 85 });
  });
  it("pasting new position props moves the widget", () => {
    const t = setup(<UI.Text id="a" position={{ x: 50, y: 60 }} />);
    t.rerender(<UI.Text id="a" position={{ x: 200, y: 300 }} />);
    expect(t.geo("a").position).toEqual({ x: 200, y: 300 });
  });
  it("text from a backend is shown as plain text, not HTML", () => {
    setup(<UI.Text id="a" text="<b>hi</b>" />);
    expect(screen.getByText("<b>hi</b>")).toBeTruthy();
    expect(document.querySelector("b")).toBeNull();
  });
});

describe("geometry hooks and JSON export", () => {
  it("useUIElement returns live geometry", () => {
    let g;
    function Reader() { g = useUIElement("a"); return null; }
    render(
      <UIProvider>
        <UI.Canvas><UI.Text id="a" position={{ x: 5, y: 6 }} /></UI.Canvas>
        <Reader />
      </UIProvider>
    );
    expect(g.position).toEqual({ x: 5, y: 6 });
    drag(document.querySelector('[data-ui-id="a"]'), 10, 10);
    expect(g.position).toEqual({ x: 15, y: 16 });
  });
  it("exports geometry that matches the screen, with JSX and a full props/hooks reference", () => {
    const t = setup(<><UI.Text id="heading" text="Hi" position={{ x: 74, y: 32 }} /><UI.Button /></>);
    drag(t.widget("heading"), 6, 8);
    const data = t.layout().exportGeometry();
    const h = data.widgets.find((w) => w.id === "heading");
    expect(h.geometry).toEqual({ position: { x: 80, y: 40 }, size: { width: 240, height: 40 } });
    expect(h.settings).toEqual({ isDraggable: true, isResizable: true, deploy: false });
    expect(h.jsx).toBe('<UI.Text id="heading" position={{ x: 80, y: 40 }} size={{ width: 240, height: 40 }} />');
    expect(Object.keys(h.reference.layoutProps)).toEqual(["id", "position", "size", "isDraggable", "isResizable", "deploy"]);
    expect(Object.keys(h.reference.contentProps)).toContain("fontSize");
    expect(Object.keys(h.reference.layoutCallbacks)).toContain("onPositionChange");
    expect(h.reference.hooks.map((x) => x.name)).toEqual(["useUIElement", "useUILayout", "useUIConfig"]);
    expect(h.reference.hooks[0].usage).toBe('const geometry = useUIElement("heading");');
    const button = data.widgets.find((w) => w.type === "Button");
    expect(button.idIsAuto).toBe(true);
    expect(button.jsx.startsWith("<UI.Button position=")).toBe(true); // auto ids are left out
    expect(data.coordinateSystem).toMatch(/top-left/);
    expect(data.availableWidgetTypes.map((x) => x.type)).toEqual(expect.arrayContaining(["Text", "Button"]));
    expect(JSON.parse(t.layout().exportJSON()).widgets).toHaveLength(2);
  });
  it("exportGeometry({ includeReference: false }) gives the short version", () => {
    const t = setup(<UI.Text id="a" />);
    const data = t.layout().exportGeometry({ includeReference: false });
    expect(data.widgets[0].reference).toBeUndefined();
    expect(data.availableWidgetTypes).toBeUndefined();
  });
});

describe("MasterPanel", () => {
  const withPanel = (kids, canvasProps = {}) =>
    render(
      <UIProvider>
        <UI.Canvas {...canvasProps}>{kids}<UI.MasterPanel /></UI.Canvas>
      </UIProvider>
    );
  const at = (id) => document.querySelector(`[data-ui-id="${id}"]`);
  const left = (id) => at(id).style.left;

  it("shows three checkboxes, all with sensible starting values", () => {
    withPanel(<UI.Text id="a" />);
    expect(screen.getByLabelText("Dragging").checked).toBe(true);
    expect(screen.getByLabelText("Resizing").checked).toBe(true);
    expect(screen.getByLabelText("Deploy whole page").checked).toBe(false);
  });
  it("Dragging off stops every widget from moving, on brings it back", () => {
    withPanel(<><UI.Text id="a" position={{ x: 50, y: 60 }} /><UI.Button id="b" position={{ x: 50, y: 200 }} /></>);
    fireEvent.click(screen.getByLabelText("Dragging"));
    drag(at("a"), 30, 30); drag(at("b"), 30, 30);
    expect(left("a")).toBe("50px"); expect(left("b")).toBe("50px");
    fireEvent.click(screen.getByLabelText("Dragging"));
    drag(at("a"), 30, 30);
    expect(left("a")).toBe("80px");
  });
  it("Resizing off removes the handles", () => {
    withPanel(<UI.Text id="a" position={{ x: 50, y: 60 }} />);
    fireEvent.pointerDown(at("a"));
    expect(screen.getByTestId("ui-handle-se")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Resizing"));
    expect(screen.queryByTestId("ui-handle-se")).toBeNull();
  });
  it("Dragging on does NOT override a widget that has isDraggable={false}", () => {
    withPanel(<UI.Text id="a" position={{ x: 50, y: 60 }} isDraggable={false} />);
    fireEvent.click(screen.getByLabelText("Dragging")); // off
    fireEvent.click(screen.getByLabelText("Dragging")); // on again
    drag(at("a"), 30, 30);
    expect(left("a")).toBe("50px");
  });
  it("Deploy whole page hides tools and locks everything; the panel stays to switch back", () => {
    withPanel(<UI.Text id="a" position={{ x: 50, y: 60 }} />);
    fireEvent.click(screen.getByLabelText("Deploy whole page"));
    fireEvent.pointerDown(at("a"));
    expect(screen.queryByTestId("ui-overlay")).toBeNull();
    drag(at("a"), 30, 30);
    expect(left("a")).toBe("50px");
    expect(screen.getByTestId("ui-master-panel")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Deploy whole page"));
    drag(at("a"), 30, 30);
    expect(left("a")).toBe("80px");
  });
  it("hides itself when the Canvas is deployed in code", () => {
    withPanel(<UI.Text id="a" />, { deploy: true });
    expect(screen.queryByTestId("ui-master-panel")).toBeNull();
  });
});

describe("Canvas size", () => {
  const canvas = () => document.querySelector("[data-ui-canvas]");
  it("covers the whole page by default and keeps doing so after deploy", () => {
    const t = setup(<UI.Text id="a" position={{ x: 10, y: 10 }} />);
    expect(canvas().dataset.uiMode).toBe("page");
    expect(canvas().style.position).toBe("absolute");
    expect(canvas().style.width).toBe("100%");
    t.rerender(<UI.Text id="a" position={{ x: 10, y: 10 }} />, { deploy: true });
    expect(canvas().dataset.uiMode).toBe("page");
    expect(canvas().style.width).toBe("100%");
  });
  it("grows to fit widgets placed below / right of the screen", () => {
    setup(<><UI.Text id="a" position={{ x: 1382, y: 900 }} size={{ width: 140, height: 40 }} /></>);
    expect(canvas().style.height).toBe("940px");
    expect(canvas().style.minWidth).toBe("1522px");
  });
  it("uses a fixed scrolling box when you give it a height", () => {
    render(<UI.Canvas height={300}><UI.Text id="a" /></UI.Canvas>);
    expect(canvas().dataset.uiMode).toBe("box");
    expect(canvas().style.height).toBe("300px");
  });
});
