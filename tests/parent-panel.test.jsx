import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, screen, act } from "@testing-library/react";
import { useState } from "react";
import {
  UI,
  UIProvider,
  ParentPanel,
  useUILayout,
  useUIElement,
} from "@devcrish/headwind";

function setup(children, { config, deploy = false, socket } = {}) {
  let api;
  function Probe() {
    api = useUILayout();
    return null;
  }
  const ui = (kids, dep, cfg, sock) => (
    <UIProvider config={cfg}>
      <UI.Canvas deploy={dep} socket={sock}>{kids}</UI.Canvas>
      <Probe />
    </UIProvider>
  );
  const result = render(ui(children, deploy, config, socket));
  return {
    layout: () => api,
    geo: (id) => api.elements.find((e) => e.id === id),
    rerender: (kids, o = {}) =>
      result.rerender(ui(kids, o.deploy ?? deploy, o.config ?? config, o.socket ?? socket)),
    widget: (id) => document.querySelector(`[data-ui-id="${id}"]`),
  };
}

const drag = (el, dx, dy, from = { x: 100, y: 100 }) => {
  fireEvent.pointerDown(el, { clientX: from.x, clientY: from.y, button: 0 });
  fireEvent.pointerMove(window, { clientX: from.x + dx, clientY: from.y + dy });
  fireEvent.pointerUp(window, { clientX: from.x + dx, clientY: from.y + dy });
};

function resizeBy(t, id, handle, dx, dy) {
  fireEvent.pointerDown(t.widget(id), { clientX: 1, clientY: 1, button: 0 });
  fireEvent.pointerUp(window);
  const h = document.querySelector(
    `[data-ui-id="${id}"] [data-testid="ui-handle-${handle}"]`
  );
  if (!h) return false;
  fireEvent.pointerDown(h, { clientX: 500, clientY: 500, button: 0 });
  fireEvent.pointerMove(window, { clientX: 500 + dx, clientY: 500 + dy });
  fireEvent.pointerUp(window);
  return true;
}

describe("UI.ParentPanel: Basic API and defaults", () => {
  it("is exported as UI.ParentPanel and named export ParentPanel (not UI.Panel)", () => {
    expect(UI.ParentPanel).toBeDefined();
    expect(ParentPanel).toBeDefined();
    expect(UI.ParentPanel).toBe(ParentPanel);
    expect(UI.Panel).toBeUndefined();
  });

  it("renders with no layout props, getting default size 800x500 and default childResizeMode='clip'", () => {
    const t = setup(
      <UI.ParentPanel id="p1">
        <UI.Text id="txt" text="Child Text" />
      </UI.ParentPanel>
    );

    const geo = t.geo("p1");
    expect(geo.size).toEqual({ width: 800, height: 500 });
    expect(t.widget("p1")).toBeTruthy();
    expect(screen.getByText("Child Text")).toBeTruthy();

    const contentArea = screen.getByTestId("parent-panel-content");
    expect(contentArea.style.overflow).toBe("hidden");
  });

  it("auto-placement allocates a valid, non-overlapping position", () => {
    const t = setup(
      <>
        <UI.ParentPanel id="p1" />
        <UI.ParentPanel id="p2" />
      </>
    );

    const g1 = t.geo("p1");
    const g2 = t.geo("p2");
    expect(g1.position.x).toBe(24);
    expect(g1.position.y).toBe(24);
    expect(g2.position.x).toBe(24);
    expect(g2.position.y).toBe(24 + 500 + 16); // 540
  });
});

describe("UI.ParentPanel: Independent child editing & drag interactions", () => {
  it("child widget is draggable independently in edit mode", () => {
    const t = setup(
      <UI.ParentPanel id="panel" position={{ x: 50, y: 50 }} size={{ width: 600, height: 400 }}>
        <UI.Text id="child1" position={{ x: 20, y: 30 }} />
      </UI.ParentPanel>
    );

    expect(t.geo("child1").position).toEqual({ x: 20, y: 30 });
    drag(t.widget("child1"), 40, 50, { x: 70, y: 80 });

    // Child moved locally
    expect(t.geo("child1").position).toEqual({ x: 60, y: 80 });
    // Parent did NOT move
    expect(t.geo("panel").position).toEqual({ x: 50, y: 50 });
  });

  it("child widget is resizable independently subject to its own permissions", () => {
    const t = setup(
      <UI.ParentPanel id="panel" position={{ x: 50, y: 50 }} size={{ width: 600, height: 400 }}>
        <UI.Text id="child1" position={{ x: 20, y: 30 }} size={{ width: 240, height: 40 }} />
      </UI.ParentPanel>
    );

    resizeBy(t, "child1", "se", 60, 20);
    expect(t.geo("child1").size).toEqual({ width: 300, height: 60 });
    // Parent size unchanged
    expect(t.geo("panel").size).toEqual({ width: 600, height: 400 });
  });

  it("dragging the parent moves the entire group while preserving child local coordinates", () => {
    const t = setup(
      <UI.ParentPanel id="panel" position={{ x: 100, y: 100 }} size={{ width: 600, height: 400 }}>
        <UI.Text id="child1" position={{ x: 30, y: 40 }} />
        <UI.Button id="child2" position={{ x: 30, y: 100 }} />
      </UI.ParentPanel>
    );

    const handle = screen.getByTestId("parent-drag-handle");
    drag(handle, 50, 70, { x: 120, y: 110 });

    // Parent moved
    expect(t.geo("panel").position).toEqual({ x: 150, y: 170 });
    // Children local coordinates preserved
    expect(t.geo("child1").position).toEqual({ x: 30, y: 40 });
    expect(t.geo("child2").position).toEqual({ x: 30, y: 100 });
    // Root positions reflect parent move
    expect(t.geo("child1").rootPosition).toEqual({ x: 180, y: 210 });
    expect(t.geo("child2").rootPosition).toEqual({ x: 180, y: 270 });
  });

  it("dragging a child widget does not accidentally drag the parent", () => {
    const t = setup(
      <UI.ParentPanel id="panel" position={{ x: 40, y: 40 }} size={{ width: 500, height: 300 }}>
        <UI.Text id="c1" position={{ x: 10, y: 10 }} />
      </UI.ParentPanel>
    );

    drag(t.widget("c1"), 30, 30, { x: 50, y: 50 });
    expect(t.geo("panel").position).toEqual({ x: 40, y: 40 });
    expect(t.geo("c1").position).toEqual({ x: 40, y: 40 });
  });

  it("setting isDraggable={false} on a child stops that child from moving without affecting parent", () => {
    const t = setup(
      <UI.ParentPanel id="panel" position={{ x: 50, y: 50 }}>
        <UI.Text id="lockedChild" position={{ x: 10, y: 10 }} isDraggable={false} />
      </UI.ParentPanel>
    );

    drag(t.widget("lockedChild"), 50, 50);
    expect(t.geo("lockedChild").position).toEqual({ x: 10, y: 10 });

    const handle = screen.getByTestId("parent-drag-handle");
    drag(handle, 20, 20);
    expect(t.geo("panel").position).toEqual({ x: 70, y: 70 });
  });
});

describe("UI.ParentPanel: Parent resize modes", () => {
  it("childResizeMode='clip' (default) clips content outside visible bounds without resetting child geometry", () => {
    function StateCounter() {
      const [count, setCount] = useState(42);
      return (
        <button data-testid="counter-btn" onClick={() => setCount((c) => c + 1)}>
          Count: {count}
        </button>
      );
    }

    const t = setup(
      <UI.ParentPanel id="panel" position={{ x: 0, y: 0 }} size={{ width: 500, height: 400 }} childResizeMode="clip">
        <UI.Text id="farChild" position={{ x: 350, y: 250 }} size={{ width: 100, height: 50 }}>
          <StateCounter />
        </UI.Text>
      </UI.ParentPanel>
    );

    // Initial state
    expect(screen.getByTestId("counter-btn").textContent).toBe("Count: 42");
    fireEvent.click(screen.getByTestId("counter-btn"));
    expect(screen.getByTestId("counter-btn").textContent).toBe("Count: 43");

    // Shrink panel so child is outside visible area
    t.rerender(
      <UI.ParentPanel id="panel" position={{ x: 0, y: 0 }} size={{ width: 200, height: 200 }} childResizeMode="clip">
        <UI.Text id="farChild" position={{ x: 350, y: 250 }} size={{ width: 100, height: 50 }}>
          <StateCounter />
        </UI.Text>
      </UI.ParentPanel>
    );

    // Geometry is intact and inspectable
    expect(t.geo("farChild").position).toEqual({ x: 350, y: 250 });
    // State is preserved!
    expect(screen.getByTestId("counter-btn").textContent).toBe("Count: 43");

    // Enlarging panel brings child back into view
    t.rerender(
      <UI.ParentPanel id="panel" position={{ x: 0, y: 0 }} size={{ width: 600, height: 500 }} childResizeMode="clip">
        <UI.Text id="farChild" position={{ x: 350, y: 250 }} size={{ width: 100, height: 50 }}>
          <StateCounter />
        </UI.Text>
      </UI.ParentPanel>
    );
    expect(screen.getByTestId("counter-btn").textContent).toBe("Count: 43");
    expect(t.geo("farChild").position).toEqual({ x: 350, y: 250 });
  });

  it("childResizeMode='fixed' allows overflow visible or scroll without rearranging children", () => {
    const t = setup(
      <UI.ParentPanel id="panel" size={{ width: 300, height: 200 }} childResizeMode="fixed" overflow="visible">
        <UI.Text id="c1" position={{ x: 350, y: 250 }} size={{ width: 100, height: 50 }} text="Outside" />
      </UI.ParentPanel>
    );

    const contentArea = screen.getByTestId("parent-panel-content");
    expect(contentArea.style.overflow).toBe("visible");
    expect(t.geo("c1").position).toEqual({ x: 350, y: 250 });

    // Scrolling overflow behavior
    t.rerender(
      <UI.ParentPanel id="panel" size={{ width: 300, height: 200 }} childResizeMode="fixed" overflow="auto">
        <UI.Text id="c1" position={{ x: 350, y: 250 }} size={{ width: 100, height: 50 }} text="Outside" />
      </UI.ParentPanel>
    );
    expect(screen.getByTestId("parent-panel-content").style.overflow).toBe("auto");
  });

  it("childResizeMode='reflow' supports flex/grid layout and configurable gaps and alignment", () => {
    const t = setup(
      <UI.ParentPanel
        id="panel"
        size={{ width: 600, height: 400 }}
        childResizeMode="reflow"
        gap={20}
        alignItems="center"
        justifyContent="space-between"
      >
        <UI.Text id="t1" text="Item 1" size={{ width: 120, height: 40 }} />
        <UI.Button id="b1" text="Item 2" size={{ width: 100, height: 40 }} />
      </UI.ParentPanel>
    );

    const contentArea = screen.getByTestId("parent-panel-content");
    expect(contentArea.style.display).toBe("flex");
    expect(contentArea.style.flexWrap).toBe("wrap");
    expect(contentArea.style.gap).toBe("20px");
    expect(contentArea.style.alignItems).toBe("center");
    expect(contentArea.style.justifyContent).toBe("space-between");

    // Children are rendered and rendered in relative positioning inside reflow container
    expect(t.widget("t1").style.position).toBe("relative");
    expect(t.widget("b1").style.position).toBe("relative");
  });
});

describe("UI.ParentPanel: Independent resize permissions and bounds", () => {
  it("resizableX={false} on parent prevents horizontal resize handles but allows vertical", () => {
    const t = setup(
      <UI.ParentPanel id="panel" position={{ x: 0, y: 0 }} size={{ width: 400, height: 300 }} resizableX={false} resizableY={true}>
        <UI.Text id="child" position={{ x: 10, y: 10 }} size={{ width: 100, height: 40 }} />
      </UI.ParentPanel>
    );

    // Select panel
    fireEvent.pointerDown(t.widget("panel"), { clientX: 1, clientY: 1, button: 0 });
    fireEvent.pointerUp(window);

    // Horizontal handle 'e' should NOT exist
    expect(document.querySelector('[data-ui-id="panel"] [data-testid="ui-handle-e"]')).toBeNull();
    // Vertical handle 's' should exist
    expect(document.querySelector('[data-ui-id="panel"] [data-testid="ui-handle-s"]')).toBeTruthy();

    // Setting resizableX={false} on parent does NOT disable child horizontal resizing!
    fireEvent.pointerDown(t.widget("child"), { clientX: 15, clientY: 15, button: 0 });
    fireEvent.pointerUp(window);
    expect(document.querySelector('[data-ui-id="child"] [data-testid="ui-handle-e"]')).toBeTruthy();
  });

  it("isResizable={false} on child does not prevent parent from being resized", () => {
    const t = setup(
      <UI.ParentPanel id="panel" position={{ x: 0, y: 0 }} size={{ width: 400, height: 300 }}>
        <UI.Text id="child" position={{ x: 10, y: 10 }} isResizable={false} />
      </UI.ParentPanel>
    );

    resizeBy(t, "panel", "se", 50, 50);
    expect(t.geo("panel").size).toEqual({ width: 450, height: 350 });

    // Child has no resize handles
    fireEvent.pointerDown(t.widget("child"), { clientX: 15, clientY: 15, button: 0 });
    fireEvent.pointerUp(window);
    expect(document.querySelector('[data-ui-id="child"] [data-testid="ui-handle-se"]')).toBeNull();
  });

  it("parent respects minWidth, minHeight, maxWidth, maxHeight constraints", () => {
    const t = setup(
      <UI.ParentPanel
        id="panel"
        position={{ x: 0, y: 0 }}
        size={{ width: 300, height: 200 }}
        minWidth={200}
        maxWidth={400}
        minHeight={150}
        maxHeight={250}
      />
    );

    // Try to shrink below minWidth / minHeight
    resizeBy(t, "panel", "se", -200, -100);
    expect(t.geo("panel").size).toEqual({ width: 200, height: 150 });

    // Try to grow above maxWidth / maxHeight
    resizeBy(t, "panel", "se", 300, 200);
    expect(t.geo("panel").size).toEqual({ width: 400, height: 250 });
  });
});

describe("UI.ParentPanel: Hidden & Descendant Preservation", () => {
  it("hidden={true} on parent hides parent and all descendants without deleting them", () => {
    const t = setup(
      <UI.ParentPanel id="panel" position={{ x: 20, y: 20 }} hidden={true}>
        <UI.Text id="child" position={{ x: 10, y: 10 }} text="Mounted child" />
      </UI.ParentPanel>
    );

    expect(t.widget("panel").style.display).toBe("none");
    // Text node is still mounted in DOM
    expect(screen.getByText("Mounted child")).toBeTruthy();
    // Geometry still in store
    expect(t.geo("panel").hidden).toBe(true);
    expect(t.geo("child").position).toEqual({ x: 10, y: 10 });

    // Re-show parent
    t.rerender(
      <UI.ParentPanel id="panel" position={{ x: 20, y: 20 }} hidden={false}>
        <UI.Text id="child" position={{ x: 10, y: 10 }} text="Mounted child" />
      </UI.ParentPanel>
    );
    expect(t.widget("panel").style.display).not.toBe("none");
    expect(t.geo("panel").hidden).toBe(false);
    expect(t.geo("child").position).toEqual({ x: 10, y: 10 });
  });
});

describe("UI.ParentPanel: Nested ParentPanels & Geometry API", () => {
  it("supports arbitrarily nested ParentPanels with recursive root coordinates", () => {
    const t = setup(
      <UI.ParentPanel id="outer" position={{ x: 100, y: 100 }} size={{ width: 600, height: 400 }}>
        <UI.ParentPanel id="inner" position={{ x: 40, y: 50 }} size={{ width: 300, height: 200 }}>
          <UI.Text id="deepChild" position={{ x: 15, y: 25 }} text="Deep" />
        </UI.ParentPanel>
      </UI.ParentPanel>
    );

    const outerGeo = t.geo("outer");
    const innerGeo = t.geo("inner");
    const childGeo = t.geo("deepChild");

    expect(outerGeo.parentId).toBeNull();
    expect(outerGeo.position).toEqual({ x: 100, y: 100 });
    expect(outerGeo.rootPosition).toEqual({ x: 100, y: 100 });

    expect(innerGeo.parentId).toBe("outer");
    expect(innerGeo.position).toEqual({ x: 40, y: 50 });
    expect(innerGeo.parentRelativePosition).toEqual({ x: 40, y: 50 });
    expect(innerGeo.rootPosition).toEqual({ x: 140, y: 150 });

    expect(childGeo.parentId).toBe("inner");
    expect(childGeo.position).toEqual({ x: 15, y: 25 });
    expect(childGeo.parentRelativePosition).toEqual({ x: 15, y: 25 });
    expect(childGeo.rootPosition).toEqual({ x: 155, y: 175 });

    // Drag outer: both inner and deepChild root coordinates translate visually
    const outerHandle = document.querySelector('[data-ui-id="outer"] [data-testid="parent-drag-handle"]');
    drag(outerHandle, 30, 40, { x: 110, y: 110 });

    expect(t.geo("outer").position).toEqual({ x: 130, y: 140 });
    expect(t.geo("inner").position).toEqual({ x: 40, y: 50 });
    expect(t.geo("deepChild").position).toEqual({ x: 15, y: 25 });

    expect(t.geo("inner").rootPosition).toEqual({ x: 170, y: 190 });
    expect(t.geo("deepChild").rootPosition).toEqual({ x: 185, y: 215 });

    // Drag inner: only deepChild root position moves, inner moves inside outer
    const innerHandle = document.querySelector('[data-ui-id="inner"] [data-testid="parent-drag-handle"]');
    drag(innerHandle, 20, 10, { x: 180, y: 200 });

    expect(t.geo("inner").position).toEqual({ x: 60, y: 60 });
    expect(t.geo("deepChild").position).toEqual({ x: 15, y: 25 });
    expect(t.geo("deepChild").rootPosition).toEqual({ x: 205, y: 225 });
  });

  it("geometry export includes parent metadata and root coordinates", () => {
    const t = setup(
      <UI.ParentPanel id="workspace" position={{ x: 50, y: 60 }}>
        <UI.Text id="t1" position={{ x: 20, y: 30 }} />
      </UI.ParentPanel>
    );

    const exportData = t.layout().exportGeometry();
    const parentEntry = exportData.widgets.find((w) => w.id === "workspace");
    const childEntry = exportData.widgets.find((w) => w.id === "t1");

    expect(parentEntry).toBeDefined();
    expect(parentEntry.type).toBe("ParentPanel");

    expect(childEntry).toBeDefined();
    expect(childEntry.geometry.parentId).toBe("workspace");
    expect(childEntry.geometry.parentRelativePosition).toEqual({ x: 20, y: 30 });
    expect(childEntry.geometry.rootPosition).toEqual({ x: 70, y: 90 });
  });

  it("deployed mode turns off editing for parent while content remains interactive", () => {
    let clicked = false;
    const t = setup(
      <UI.ParentPanel id="p1" deploy={true}>
        <UI.Button id="b1" text="Click Me" onClick={() => { clicked = true; }} />
      </UI.ParentPanel>
    );

    // Parent tools are hidden
    expect(document.querySelector('[data-ui-id="p1"] [data-testid="parent-drag-handle"]')).toBeNull();
    expect(document.querySelector('[data-ui-id="p1"] [data-testid="ui-handle-se"]')).toBeNull();

    // Button works
    fireEvent.click(screen.getByText("Click Me"));
    expect(clicked).toBe(true);
  });
});

describe("UI.ParentPanel: Socket.IO synchronization & dynamic creation", () => {
  function createMockSocket() {
    const handlers = {};
    return {
      on: vi.fn((event, cb) => {
        handlers[event] = handlers[event] || [];
        handlers[event].push(cb);
      }),
      off: vi.fn((event, cb) => {
        if (handlers[event]) {
          handlers[event] = handlers[event].filter((h) => h !== cb);
        }
      }),
      emitEvent(event, data) {
        if (handlers[event]) {
          handlers[event].forEach((cb) => cb(data));
        }
      },
      handlers,
      connected: true,
    };
  }

  it("updates an existing ParentPanel over Socket.IO", () => {
    const socket = createMockSocket();
    const t = setup(
      <UI.ParentPanel id="workspace" backgroundColor="#111111" childResizeMode="clip">
        <UI.Text id="txt" text="Inside" />
      </UI.ParentPanel>,
      { socket }
    );

    act(() => {
      socket.emitEvent("renderReactUI", [
        {
          id: "workspace",
          backgroundColor: "#172554",
          childResizeMode: "reflow",
        },
      ]);
    });

    const panelEl = document.querySelector('[data-ui-parent-panel="workspace"]');
    expect(panelEl.style.backgroundColor).toBe("rgb(23, 37, 84)"); // #172554
    expect(document.querySelector('[data-testid="parent-panel-content"]').style.display).toBe("flex"); // reflow mode
  });

  it("creates a new ParentPanel dynamically from backend over Socket.IO", () => {
    const socket = createMockSocket();
    const t = setup(<div />, { socket });

    act(() => {
      socket.emitEvent("renderReactUI", [
        {
          id: "dynamicWorkspace",
          type: "ParentPanel",
          title: "Dynamic Panel",
          backgroundColor: "#0284c7",
          x: 60,
          y: 80,
          width: 700,
          height: 450,
        },
      ]);
    });

    const createdPanel = t.widget("dynamicWorkspace");
    expect(createdPanel).toBeTruthy();
    expect(createdPanel.style.left).toBe("60px");
    expect(createdPanel.style.top).toBe("80px");
    expect(createdPanel.style.width).toBe("700px");
    expect(createdPanel.style.height).toBe("450px");
    expect(screen.getByText("Dynamic Panel")).toBeTruthy();
  });

  it("creates dynamic child widgets inside a dynamic ParentPanel over Socket.IO", () => {
    const socket = createMockSocket();
    const t = setup(<div />, { socket });

    act(() => {
      socket.emitEvent("renderReactUI", [
        {
          id: "dashPanel",
          type: "ParentPanel",
          title: "Dashboard",
          x: 100,
          y: 100,
          width: 500,
          height: 300,
        },
        {
          id: "dashChildBtn",
          type: "Button",
          parentId: "dashPanel",
          text: "Dynamic Child Button",
          variant: "secondary",
          x: 30,
          y: 40,
        },
      ]);
    });

    const panel = t.widget("dashPanel");
    expect(panel).toBeTruthy();

    const childBtn = t.widget("dashChildBtn");
    expect(childBtn).toBeTruthy();
    expect(childBtn.closest('[data-ui-id="dashPanel"]')).toBeTruthy();
    expect(screen.getByText("Dynamic Child Button")).toBeTruthy();
  });
});

