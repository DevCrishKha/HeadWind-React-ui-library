import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { UI, UIProvider, useUILayout } from "@devcrish/headwind";

// â”€â”€â”€ Helpers (copied from library.test.jsx) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function setup(children, { config, deploy = false } = {}) {
  let api;
  function Probe() {
    api = useUILayout();
    return null;
  }
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
    rerender: (kids, o = {}) =>
      result.rerender(ui(kids, o.deploy ?? deploy, o.config ?? config)),
    widget: (id) => document.querySelector(`[data-ui-id="${id}"]`),
  };
}

const drag = (el, dx, dy, from = { x: 100, y: 100 }) => {
  fireEvent.pointerDown(el, { clientX: from.x, clientY: from.y, button: 0 });
  fireEvent.pointerMove(window, { clientX: from.x + dx, clientY: from.y + dy });
  fireEvent.pointerUp(window, { clientX: from.x + dx, clientY: from.y + dy });
};

describe("UI.Divider â€” Basic rendering and defaults", () => {
  it("renders with no layout props and gets its default size (300x12)", () => {
    const t = setup(<UI.Divider id="d1" />);
    expect(t.geo("d1").size).toEqual({ width: 300, height: 12 });
  });

  it("renders horizontal divider lines by default", () => {
    setup(<UI.Divider id="d" />);
    expect(screen.getByTestId("divider-line-start")).toBeTruthy();
    expect(screen.getByTestId("divider-line-end")).toBeTruthy();
  });

  it("renders vertical divider lines when orientation='vertical'", () => {
    setup(
      <UI.Divider
        id="d"
        orientation="vertical"
        size={{ width: 12, height: 300 }}
      />,
    );
    expect(screen.getByTestId("divider-line-start")).toBeTruthy();
    expect(screen.getByTestId("divider-line-end")).toBeTruthy();
  });

  it("renders optional text or children at the center", () => {
    setup(<UI.Divider id="d" text="OR" />);
    expect(screen.getByText("OR")).toBeTruthy();
  });

  it("renders custom children at the center", () => {
    setup(
      <UI.Divider id="d">
        <span data-testid="custom-label">Section Break</span>
      </UI.Divider>,
    );
    expect(screen.getByTestId("custom-label")).toBeTruthy();
  });

  it("auto-placement gives it a real, non-overlapping position", () => {
    const t = setup(
      <>
        <UI.Divider id="a" />
        <UI.Divider id="b" />
      </>,
    );
    const a = t.geo("a"),
      b = t.geo("b");
    expect(Number.isFinite(a.position.x) && Number.isFinite(a.position.y)).toBe(
      true,
    );
    expect(b.position.y).toBeGreaterThanOrEqual(a.position.y + a.size.height);
  });

  it("isDraggable={false} blocks dragging when standalone", () => {
    const t = setup(
      <UI.Divider id="d" position={{ x: 50, y: 60 }} isDraggable={false} />,
    );
    drag(t.widget("d"), 30, 30);
    expect(t.geo("d").position).toEqual({ x: 50, y: 60 });
  });

  it("isResizable={false} removes the resize handles", () => {
    const t = setup(
      <UI.Divider id="d" position={{ x: 50, y: 60 }} isResizable={false} />,
    );
    fireEvent.pointerDown(t.widget("d"));
    expect(screen.queryByTestId("ui-handle-se")).toBeNull();
  });

  it("deploy hides editing tools", () => {
    const t = setup(<UI.Divider id="d" position={{ x: 74, y: 32 }} deploy />);
    expect(screen.queryByTestId("ui-overlay")).toBeNull();
    expect(screen.queryByTestId("ui-handle-se")).toBeNull();
  });

  it("changing color, thickness, or text does not alter geometry", () => {
    const t = setup(
      <UI.Divider
        id="d"
        position={{ x: 50, y: 60 }}
        color="#cbd5e1"
        thickness={2}
        text="A"
      />,
    );
    const origSize = { ...t.geo("d").size };
    const origPos = { ...t.geo("d").position };
    t.rerender(
      <UI.Divider
        id="d"
        position={{ x: 50, y: 60 }}
        color="#dc2626"
        thickness={4}
        text="B"
      />,
    );
    expect(t.geo("d").size).toEqual(origSize);
    expect(t.geo("d").position).toEqual(origPos);
  });
});

describe("UI.Divider â€” Resizing touching UI.ParentPanel sections", () => {
  it("resizes two horizontally adjacent ParentPanels when dragging a vertical Divider", () => {
    const t = setup(
      <>
        <UI.ParentPanel
          id="leftPanel"
          position={{ x: 0, y: 0 }}
          size={{ width: 200, height: 300 }}
        />
        <UI.Divider
          id="vDivider"
          orientation="vertical"
          position={{ x: 200, y: 0 }}
          size={{ width: 10, height: 300 }}
        />
        <UI.ParentPanel
          id="rightPanel"
          position={{ x: 210, y: 0 }}
          size={{ width: 200, height: 300 }}
        />
      </>,
    );

    const dividerContent = t
      .widget("vDivider")
      .querySelector("[data-ui-divider]");
    expect(dividerContent).toBeTruthy();

    // Drag divider 40px to the right
    fireEvent.pointerDown(dividerContent, {
      clientX: 205,
      clientY: 100,
      button: 0,
    });
    fireEvent.pointerMove(window, { clientX: 245, clientY: 100 });
    fireEvent.pointerUp(window);

    // Left panel width grew by +40px
    expect(t.geo("leftPanel").size.width).toBe(240);
    expect(t.geo("leftPanel").position.x).toBe(0);

    // Divider shifted by +40px
    expect(t.geo("vDivider").position.x).toBe(240);

    // Right panel shifted by +40px and width shrank by -40px
    expect(t.geo("rightPanel").position.x).toBe(250);
    expect(t.geo("rightPanel").size.width).toBe(160);

    // Total width 0 to 410 is preserved!
    expect(
      t.geo("rightPanel").position.x + t.geo("rightPanel").size.width,
    ).toBe(410);
  });

  it("resizes two vertically adjacent ParentPanels when dragging a horizontal Divider", () => {
    const t = setup(
      <>
        <UI.ParentPanel
          id="topPanel"
          position={{ x: 0, y: 0 }}
          size={{ width: 400, height: 150 }}
        />
        <UI.Divider
          id="hDivider"
          orientation="horizontal"
          position={{ x: 0, y: 150 }}
          size={{ width: 400, height: 10 }}
        />
        <UI.ParentPanel
          id="bottomPanel"
          position={{ x: 0, y: 160 }}
          size={{ width: 400, height: 150 }}
        />
      </>,
    );

    const dividerContent = t
      .widget("hDivider")
      .querySelector("[data-ui-divider]");

    // Drag divider 30px upwards (deltaY = -30)
    fireEvent.pointerDown(dividerContent, {
      clientX: 200,
      clientY: 155,
      button: 0,
    });
    fireEvent.pointerMove(window, { clientX: 200, clientY: 125 });
    fireEvent.pointerUp(window);

    // Top panel height shrank by -30px
    expect(t.geo("topPanel").size.height).toBe(120);
    expect(t.geo("topPanel").position.y).toBe(0);

    // Divider moved up by -30px
    expect(t.geo("hDivider").position.y).toBe(120);

    // Bottom panel moved up by -30px and grew by +30px
    expect(t.geo("bottomPanel").position.y).toBe(130);
    expect(t.geo("bottomPanel").size.height).toBe(180);

    // Total vertical span 0 to 310 is preserved!
    expect(
      t.geo("bottomPanel").position.y + t.geo("bottomPanel").size.height,
    ).toBe(310);
  });

  it("detects two ParentPanels touching each other directly at seam", () => {
    const t = setup(
      <>
        <UI.ParentPanel
          id="p1"
          position={{ x: 0, y: 0 }}
          size={{ width: 250, height: 300 }}
        />
        <UI.ParentPanel
          id="p2"
          position={{ x: 250, y: 0 }}
          size={{ width: 250, height: 300 }}
        />
        <UI.Divider
          id="seamDivider"
          orientation="vertical"
          position={{ x: 245, y: 0 }}
          size={{ width: 10, height: 300 }}
        />
      </>,
    );

    const dividerContent = t
      .widget("seamDivider")
      .querySelector("[data-ui-divider]");
    // Drag by -50px (left)
    fireEvent.pointerDown(dividerContent, {
      clientX: 250,
      clientY: 100,
      button: 0,
    });
    fireEvent.pointerMove(window, { clientX: 200, clientY: 100 });
    fireEvent.pointerUp(window);

    expect(t.geo("p1").size.width).toBe(200);
    expect(t.geo("p2").position.x).toBe(200);
    expect(t.geo("p2").size.width).toBe(300);
  });

  it("resizes panels explicitly specified via panelBefore and panelAfter", () => {
    const t = setup(
      <>
        <UI.ParentPanel
          id="panelAlpha"
          position={{ x: 10, y: 10 }}
          size={{ width: 180, height: 200 }}
        />
        <UI.Divider
          id="div"
          orientation="vertical"
          panelBefore="panelAlpha"
          panelAfter="panelBeta"
          position={{ x: 200, y: 10 }}
          size={{ width: 12, height: 200 }}
        />
        <UI.ParentPanel
          id="panelBeta"
          position={{ x: 220, y: 10 }}
          size={{ width: 180, height: 200 }}
        />
      </>,
    );

    const dividerContent = t.widget("div").querySelector("[data-ui-divider]");
    fireEvent.pointerDown(dividerContent, {
      clientX: 206,
      clientY: 50,
      button: 0,
    });
    fireEvent.pointerMove(window, { clientX: 226, clientY: 50 });
    fireEvent.pointerUp(window);

    expect(t.geo("panelAlpha").size.width).toBe(200);
    expect(t.geo("panelBeta").size.width).toBe(160);
  });

  it("resizes panels explicitly specified via panels array alias", () => {
    const t = setup(
      <>
        <UI.ParentPanel
          id="a"
          position={{ x: 0, y: 0 }}
          size={{ width: 100, height: 200 }}
        />
        <UI.Divider
          id="d"
          orientation="vertical"
          panels={["a", "b"]}
          position={{ x: 100, y: 0 }}
          size={{ width: 10, height: 200 }}
        />
        <UI.ParentPanel
          id="b"
          position={{ x: 110, y: 0 }}
          size={{ width: 100, height: 200 }}
        />
      </>,
    );

    const dividerContent = t.widget("d").querySelector("[data-ui-divider]");
    fireEvent.pointerDown(dividerContent, {
      clientX: 105,
      clientY: 50,
      button: 0,
    });
    fireEvent.pointerMove(window, { clientX: 125, clientY: 50 });
    fireEvent.pointerUp(window);

    expect(t.geo("a").size.width).toBe(120);
    expect(t.geo("b").size.width).toBe(80);
  });

  it("triggers onResize callback with delta and updated sizes", () => {
    const onResize = vi.fn();
    const t = setup(
      <>
        <UI.ParentPanel
          id="p1"
          position={{ x: 0, y: 0 }}
          size={{ width: 200, height: 200 }}
        />
        <UI.Divider
          id="d"
          orientation="vertical"
          panelBefore="p1"
          panelAfter="p2"
          position={{ x: 200, y: 0 }}
          size={{ width: 10, height: 200 }}
          onResize={onResize}
        />
        <UI.ParentPanel
          id="p2"
          position={{ x: 210, y: 0 }}
          size={{ width: 200, height: 200 }}
        />
      </>,
    );

    const dividerContent = t.widget("d").querySelector("[data-ui-divider]");
    fireEvent.pointerDown(dividerContent, {
      clientX: 205,
      clientY: 50,
      button: 0,
    });
    fireEvent.pointerMove(window, { clientX: 235, clientY: 50 });
    fireEvent.pointerUp(window);

    expect(onResize).toHaveBeenCalled();
    expect(onResize).toHaveBeenLastCalledWith(
      expect.objectContaining({
        delta: 30,
        beforeId: "p1",
        afterId: "p2",
        beforeSize: 230,
        afterSize: 170,
      }),
    );
  });

  it("respects minSizeBefore and minSizeAfter boundaries", () => {
    const t = setup(
      <>
        <UI.ParentPanel
          id="p1"
          position={{ x: 0, y: 0 }}
          size={{ width: 100, height: 200 }}
        />
        <UI.Divider
          id="d"
          orientation="vertical"
          panelBefore="p1"
          panelAfter="p2"
          minSizeBefore={50}
          minSizeAfter={50}
          position={{ x: 100, y: 0 }}
          size={{ width: 10, height: 200 }}
        />
        <UI.ParentPanel
          id="p2"
          position={{ x: 110, y: 0 }}
          size={{ width: 100, height: 200 }}
        />
      </>,
    );

    const dividerContent = t.widget("d").querySelector("[data-ui-divider]");
    // Try to drag 100px left (delta = -100). p1 minSize is 50, so max left move is -50px
    fireEvent.pointerDown(dividerContent, {
      clientX: 105,
      clientY: 50,
      button: 0,
    });
    fireEvent.pointerMove(window, { clientX: 5, clientY: 50 });
    fireEvent.pointerUp(window);

    expect(t.geo("p1").size.width).toBe(50);
    expect(t.geo("p2").size.width).toBe(150);
  });

  it("works inside a UI.ParentPanel container", () => {
    const t = setup(
      <UI.ParentPanel
        id="container"
        position={{ x: 0, y: 0 }}
        size={{ width: 600, height: 400 }}
      >
        <UI.ParentPanel
          id="inner1"
          position={{ x: 10, y: 10 }}
          size={{ width: 150, height: 200 }}
        />
        <UI.Divider
          id="innerDiv"
          orientation="vertical"
          panelBefore="inner1"
          panelAfter="inner2"
          position={{ x: 160, y: 10 }}
          size={{ width: 10, height: 200 }}
        />
        <UI.ParentPanel
          id="inner2"
          position={{ x: 170, y: 10 }}
          size={{ width: 150, height: 200 }}
        />
      </UI.ParentPanel>,
    );

    const dividerContent = t
      .widget("innerDiv")
      .querySelector("[data-ui-divider]");
    fireEvent.pointerDown(dividerContent, {
      clientX: 165,
      clientY: 50,
      button: 0,
    });
    fireEvent.pointerMove(window, { clientX: 185, clientY: 50 });
    fireEvent.pointerUp(window);

    expect(t.geo("inner1").size.width).toBe(170);
    expect(t.geo("inner2").size.width).toBe(130);
  });

  it("allows interactive section resizing even when canvas is deployed", () => {
    const t = setup(
      <>
        <UI.ParentPanel
          id="p1"
          position={{ x: 0, y: 0 }}
          size={{ width: 200, height: 300 }}
        />
        <UI.Divider
          id="div"
          orientation="vertical"
          position={{ x: 200, y: 0 }}
          size={{ width: 10, height: 300 }}
        />
        <UI.ParentPanel
          id="p2"
          position={{ x: 210, y: 0 }}
          size={{ width: 200, height: 300 }}
        />
      </>,
      { deploy: true },
    );

    const dividerContent = t.widget("div").querySelector("[data-ui-divider]");
    fireEvent.pointerDown(dividerContent, {
      clientX: 205,
      clientY: 50,
      button: 0,
    });
    fireEvent.pointerMove(window, { clientX: 235, clientY: 50 });
    fireEvent.pointerUp(window);

    expect(t.geo("p1").size.width).toBe(230);
    expect(t.geo("p2").size.width).toBe(170);
  });

  it("disables section resizing when resizableSections={false}", () => {
    const t = setup(
      <>
        <UI.ParentPanel
          id="p1"
          position={{ x: 0, y: 0 }}
          size={{ width: 200, height: 300 }}
        />
        <UI.Divider
          id="div"
          orientation="vertical"
          resizableSections={false}
          position={{ x: 200, y: 0 }}
          size={{ width: 10, height: 300 }}
        />
        <UI.ParentPanel
          id="p2"
          position={{ x: 210, y: 0 }}
          size={{ width: 200, height: 300 }}
        />
      </>,
    );

    const dividerContent = t.widget("div").querySelector("[data-ui-divider]");
    fireEvent.pointerDown(dividerContent, {
      clientX: 205,
      clientY: 50,
      button: 0,
    });
    fireEvent.pointerMove(window, { clientX: 235, clientY: 50 });
    fireEvent.pointerUp(window);

    // Panels remain unchanged
    expect(t.geo("p1").size.width).toBe(200);
    expect(t.geo("p2").size.width).toBe(200);
  });
});

describe("UI.Divider â€” Linking via panel properties (dividerId, resizeAxis, dividerPosition, dividerEdge)", () => {
  it("links panels using dividerId, resizeAxis, dividerPosition, dividerEdge in deployed mode", () => {
    const t = setup(
      <>
        <UI.Divider
          id="splitDiv"
          orientation="vertical"
          position={{ x: 300, y: 50 }}
          size={{ width: 10, height: 400 }}
        />
        <UI.ParentPanel
          id="leftSection"
          dividerId="splitDiv"
          resizeAxis="x"
          dividerPosition="right"
          dividerEdge="right"
          position={{ x: 50, y: 50 }}
          size={{ width: 250, height: 400 }}
        />
        <UI.ParentPanel
          id="rightSection"
          dividerId="splitDiv"
          resizeAxis="x"
          dividerPosition="left"
          dividerEdge="left"
          position={{ x: 310, y: 50 }}
          size={{ width: 250, height: 400 }}
        />
      </>,
      { deploy: true },
    );

    const dividerContent = t
      .widget("splitDiv")
      .querySelector("[data-ui-divider]");
    expect(dividerContent).toBeTruthy();

    // Drag divider 60px to the right in deployed mode
    fireEvent.pointerDown(dividerContent, {
      clientX: 305,
      clientY: 150,
      button: 0,
    });
    fireEvent.pointerMove(window, { clientX: 365, clientY: 150 });
    fireEvent.pointerUp(window);

    const left = t.geo("leftSection");
    const right = t.geo("rightSection");
    const div = t.geo("splitDiv");

    // Left section: dividerEdge="right"
    // Left edge (x=50), top (y=50), height (400) remain strictly CONSTANT
    expect(left.position.x).toBe(50);
    expect(left.position.y).toBe(50);
    expect(left.size.height).toBe(400);
    // Width increases by +60px from the right edge
    expect(left.size.width).toBe(310);

    // Divider position shifts by +60px
    expect(div.position.x).toBe(360);

    // Right section: dividerEdge="left"
    // Right edge (x + width = 310 + 250 = 560), top (y=50), height (400) remain strictly CONSTANT
    expect(right.position.y).toBe(50);
    expect(right.size.height).toBe(400);
    expect(right.position.x).toBe(370);
    expect(right.size.width).toBe(190);
    expect(right.position.x + right.size.width).toBe(560);
  });

  it("links top and bottom panels using dividerEdge='bottom' and dividerEdge='top' along resizeAxis='y'", () => {
    const t = setup(
      <>
        <UI.Divider
          id="hSplit"
          orientation="horizontal"
          position={{ x: 20, y: 200 }}
          size={{ width: 500, height: 10 }}
        />
        <UI.ParentPanel
          id="topSection"
          dividerId="hSplit"
          resizeAxis="y"
          dividerPosition="bottom"
          dividerEdge="bottom"
          position={{ x: 20, y: 20 }}
          size={{ width: 500, height: 180 }}
        />
        <UI.ParentPanel
          id="bottomSection"
          dividerId="hSplit"
          resizeAxis="y"
          dividerPosition="top"
          dividerEdge="top"
          position={{ x: 20, y: 210 }}
          size={{ width: 500, height: 180 }}
        />
      </>,
      { deploy: true },
    );

    const dividerContent = t
      .widget("hSplit")
      .querySelector("[data-ui-divider]");

    // Drag divider 40px downwards in deployed mode
    fireEvent.pointerDown(dividerContent, {
      clientX: 200,
      clientY: 205,
      button: 0,
    });
    fireEvent.pointerMove(window, { clientX: 200, clientY: 245 });
    fireEvent.pointerUp(window);

    const top = t.geo("topSection");
    const bottom = t.geo("bottomSection");
    const div = t.geo("hSplit");

    // Top section: dividerEdge="bottom"
    // Top (y=20), left (x=20), width (500) remain strictly CONSTANT
    expect(top.position.x).toBe(20);
    expect(top.position.y).toBe(20);
    expect(top.size.width).toBe(500);
    // Height increases by +40px
    expect(top.size.height).toBe(220);

    // Divider shifts down by +40px
    expect(div.position.y).toBe(240);

    // Bottom section: dividerEdge="top"
    // Bottom edge (y + height = 210 + 180 = 390), left (x=20), width (500) remain strictly CONSTANT
    expect(bottom.position.x).toBe(20);
    expect(bottom.size.width).toBe(500);
    expect(bottom.position.y).toBe(250);
    expect(bottom.size.height).toBe(140);
    expect(bottom.position.y + bottom.size.height).toBe(390);
  });
});
