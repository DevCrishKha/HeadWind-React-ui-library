import { describe, it, expect, vi } from "vitest";
import { render, act, fireEvent } from "@testing-library/react";
import { UI, UIProvider, useUILayout, useSocketUI, createWidget } from "@devcrish/headwind";

// Helper to create a fake socket
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

function setup(children, { socket } = {}) {
  let api;
  function Probe() {
    api = useUILayout();
    return null;
  }
  const result = render(
    <UIProvider>
      <UI.Canvas socket={socket}>
        {children}
      </UI.Canvas>
      <Probe />
    </UIProvider>
  );
  return {
    layout: () => api,
    geo: (id) => api.elements.find((e) => e.id === id),
    widget: (id) => document.querySelector(`[data-ui-id="${id}"]`),
  };
}

describe("Socket.IO UI Synchronization", () => {
  it("listens on the 'renderReactUI' event via Canvas socket prop", () => {
    const socket = createMockSocket();
    setup(<UI.Text id="heading" text="Hello" />, { socket });

    expect(socket.on).toHaveBeenCalledWith("renderReactUI", expect.any(Function));
  });

  it("updates specific component properties and leaves all other properties unchanged", () => {
    const socket = createMockSocket();
    const t = setup(
      <UI.Text
        id="heading"
        text="My Title"
        color="#ff0000"
        fontSize={20}
        fontWeight={400}
      />,
      { socket }
    );

    const elBefore = t.widget("heading");
    const textNodeBefore = elBefore.firstElementChild.firstElementChild;
    expect(textNodeBefore.textContent).toBe("My Title");
    expect(textNodeBefore.style.color).toBe("rgb(255, 0, 0)");
    expect(textNodeBefore.style.fontSize).toBe("20px");
    expect(textNodeBefore.style.fontWeight).toBe("400");
    expect(t.geo("heading").solid).toBe(false);

    // Emit renderReactUI with partial properties
    act(() => {
      socket.emitEvent("renderReactUI", [
        {
          id: "heading",
          fontSize: 50,
          fontWeight: 300,
          solid: true,
        },
      ]);
    });

    const elAfter = t.widget("heading");
    const textNodeAfter = elAfter.firstElementChild.firstElementChild;
    // Updated properties
    expect(textNodeAfter.style.fontSize).toBe("50px");
    expect(textNodeAfter.style.fontWeight).toBe("300");
    expect(t.geo("heading").solid).toBe(true);
    // Untouched properties MUST stay exactly as they were
    expect(textNodeAfter.textContent).toBe("My Title");
    expect(textNodeAfter.style.color).toBe("rgb(255, 0, 0)");
  });

  it("updates Button text and variant/varient (Danger -> #dc2626)", () => {
    const socket = createMockSocket();
    const t = setup(
      <UI.Button id="formSubmitBtn" text="Old Button" variant="secondary" />,
      { socket }
    );

    const btnBefore = t.widget("formSubmitBtn").querySelector("button");
    expect(btnBefore.textContent).toBe("Old Button");
    expect(btnBefore.style.background).toBe("rgb(226, 232, 240)"); // secondary

    act(() => {
      socket.emitEvent("renderReactUI", [
        {
          id: "formSubmitBtn",
          varient: "Danger",
          text: "Submit",
        },
      ]);
    });

    const btnAfter = t.widget("formSubmitBtn").querySelector("button");
    expect(btnAfter.textContent).toBe("Submit");
    expect(btnAfter.style.background).toBe("rgb(220, 38, 38)"); // danger (#dc2626)
  });

  it("handles the exact payload format from user prompt for multiple components", () => {
    const socket = createMockSocket();
    const t = setup(
      <>
        <UI.Text id="heading" text="Original Heading" fontSize={16} />
        <UI.Button id="formSubmitBtn" text="Cancel" variant="primary" />
      </>,
      { socket }
    );

    act(() => {
      socket.emitEvent("renderReactUI", [
        {
          id: "heading",
          fontSize: 50,
          fontWeight: 300,
          solid: true,
        },
        {
          id: "formSubmitBtn",
          varient: "Danger",
          text: "Submit",
        },
      ]);
    });

    // Check heading
    const heading = t.widget("heading").firstElementChild.firstElementChild;
    expect(heading.textContent).toBe("Original Heading");
    expect(heading.style.fontSize).toBe("50px");
    expect(heading.style.fontWeight).toBe("300");
    expect(t.geo("heading").solid).toBe(true);

    // Check button
    const btn = t.widget("formSubmitBtn").querySelector("button");
    expect(btn.textContent).toBe("Submit");
    expect(btn.style.background).toBe("rgb(220, 38, 38)");
  });

  it("automatically creates a new component if it does not exist on the Canvas", () => {
    const socket = createMockSocket();
    const t = setup(
      <UI.Text id="existingWidget" text="I am already here" />,
      { socket }
    );

    expect(t.widget("dynamicWidget")).toBeNull();

    // Send a component that does NOT exist
    act(() => {
      socket.emitEvent("renderReactUI", [
        {
          id: "dynamicWidget",
          text: "Created from backend",
          color: "#059669",
        },
      ]);
    });

    // New component must be created and rendered on Canvas
    const dynamicEl = t.widget("dynamicWidget");
    expect(dynamicEl).not.toBeNull();
    const dynamicContent = dynamicEl.firstElementChild.firstElementChild;
    expect(dynamicContent.textContent).toBe("Created from backend");
    expect(dynamicContent.style.color).toBe("rgb(5, 150, 105)");
    expect(t.geo("dynamicWidget")).toBeDefined();
  });

  it("creates a new Button widget when id or props indicate button", () => {
    const socket = createMockSocket();
    const t = setup(<div />, { socket });

    act(() => {
      socket.emitEvent("renderReactUI", [
        {
          id: "actionBtn",
          text: "Click Me",
          varient: "Danger",
        },
      ]);
    });

    const btn = t.widget("actionBtn")?.querySelector("button");
    expect(btn).not.toBeNull();
    expect(btn.textContent).toBe("Click Me");
    expect(btn.style.background).toBe("rgb(220, 38, 38)");
  });

  it("updates layout properties like hidden and solid push-aside through socket", () => {
    const socket = createMockSocket();
    const t = setup(
      <>
        <UI.Text id="w1" position={{ x: 0, y: 0 }} size={{ width: 100, height: 100 }} solid={false} />
        <UI.Text id="w2" position={{ x: 50, y: 0 }} size={{ width: 100, height: 100 }} solid={false} />
      </>,
      { socket }
    );

    expect(t.geo("w2").position.x).toBe(50);

    // Make w1 solid through socket
    act(() => {
      socket.emitEvent("renderReactUI", [
        {
          id: "w1",
          solid: true,
        },
      ]);
    });

    expect(t.geo("w1").solid).toBe(true);
    // Overlapping neighbour w2 should be pushed aside to 100 + SOLID_GAP (100 + 0 = 100)
    expect(t.geo("w2").position.x).toBe(100);

    // Hide w1 through socket
    act(() => {
      socket.emitEvent("renderReactUI", [
        {
          id: "w1",
          hidden: true,
        },
      ]);
    });

    expect(t.widget("w1").style.display).toBe("none");
    expect(t.geo("w1").hidden).toBe(true);
  });

  it("works seamlessly with custom widgets built via createWidget", () => {
    const socket = createMockSocket();

    function Card({ title = "Card Title", count = 0 }) {
      return (
        <div data-testid="card-inner">
          <span data-testid="card-title">{title}</span>
          <span data-testid="card-count">{count}</span>
        </div>
      );
    }
    const CustomCard = createWidget({
      type: "CustomCard",
      defaults: { size: { width: 200, height: 100 } },
      render: Card,
    });

    const t = setup(
      <CustomCard id="card1" title="Initial Title" count={1} />,
      { socket }
    );

    const titleEl = document.querySelector('[data-ui-id="card1"] [data-testid="card-title"]');
    const countEl = document.querySelector('[data-ui-id="card1"] [data-testid="card-count"]');
    expect(titleEl.textContent).toBe("Initial Title");
    expect(countEl.textContent).toBe("1");

    // Update custom card property count only via socket
    act(() => {
      socket.emitEvent("renderReactUI", [
        {
          id: "card1",
          count: 99,
        },
      ]);
    });

    expect(titleEl.textContent).toBe("Initial Title"); // untouched
    expect(countEl.textContent).toBe("99"); // updated

    // Update title via socket
    act(() => {
      socket.emitEvent("renderReactUI", [
        {
          id: "card1",
          title: "New Socket Title",
        },
      ]);
    });

    expect(titleEl.textContent).toBe("New Socket Title");
    expect(countEl.textContent).toBe("99"); // preserved
  });

  it("widget remains draggable after socket updates its position", () => {
    const socket = createMockSocket();
    const t = setup(
      <UI.Text id="drag-me" text="Drag Test" position={{ x: 50, y: 50 }} />,
      { socket }
    );

    // Socket sets a new position
    act(() => {
      socket.emitEvent("renderReactUI", [
        { id: "drag-me", x: 200, y: 200 },
      ]);
    });

    expect(t.geo("drag-me").position).toEqual({ x: 200, y: 200 });

    // User drags the widget â€” it must actually move
    const el = t.widget("drag-me");
    fireEvent.pointerDown(el, { clientX: 200, clientY: 200, button: 0 });
    fireEvent.pointerMove(window, { clientX: 250, clientY: 260 });
    fireEvent.pointerUp(window);

    expect(t.geo("drag-me").position.x).toBe(250);
    expect(t.geo("drag-me").position.y).toBe(260);
  });

  it("widget remains resizable after socket updates its size", () => {
    const socket = createMockSocket();
    const t = setup(
      <UI.Text id="resize-me" text="Resize Test" position={{ x: 10, y: 10 }} size={{ width: 200, height: 100 }} />,
      { socket }
    );

    // Socket sets a new size
    act(() => {
      socket.emitEvent("renderReactUI", [
        { id: "resize-me", width: 300, height: 150 },
      ]);
    });

    expect(t.geo("resize-me").size).toEqual({ width: 300, height: 150 });

    // Select the widget so handles appear, then drag the SE resize handle
    const el = t.widget("resize-me");
    fireEvent.pointerDown(el, { clientX: 1, clientY: 1, button: 0 });
    fireEvent.pointerUp(window);

    const handle = document.querySelector('[data-ui-id="resize-me"] [data-testid="ui-handle-se"]');
    expect(handle).not.toBeNull();

    fireEvent.pointerDown(handle, { clientX: 500, clientY: 500, button: 0 });
    fireEvent.pointerMove(window, { clientX: 600, clientY: 550 });
    fireEvent.pointerUp(window);

    // Both width and height must have changed from the socket-set values
    expect(t.geo("resize-me").size.width).toBe(400);  // 300 + 100
    expect(t.geo("resize-me").size.height).toBe(200);  // 150 + 50
  });

  it("widget remains resizable after socket updates only height", () => {
    const socket = createMockSocket();
    const t = setup(
      <UI.Text id="h-only" text="Height Test" position={{ x: 10, y: 10 }} size={{ width: 200, height: 80 }} />,
      { socket }
    );

    // Socket only updates height
    act(() => {
      socket.emitEvent("renderReactUI", [
        { id: "h-only", height: 200 },
      ]);
    });

    expect(t.geo("h-only").size.height).toBe(200);

    // Select, then resize SE handle
    const el = t.widget("h-only");
    fireEvent.pointerDown(el, { clientX: 1, clientY: 1, button: 0 });
    fireEvent.pointerUp(window);

    const handle = document.querySelector('[data-ui-id="h-only"] [data-testid="ui-handle-se"]');
    fireEvent.pointerDown(handle, { clientX: 500, clientY: 500, button: 0 });
    fireEvent.pointerMove(window, { clientX: 500, clientY: 570 });
    fireEvent.pointerUp(window);

    expect(t.geo("h-only").size.height).toBe(270); // 200 + 70
    expect(t.geo("h-only").size.width).toBe(200); // unchanged
  });
});
