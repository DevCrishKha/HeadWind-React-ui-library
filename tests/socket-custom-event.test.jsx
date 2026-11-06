import { describe, it, expect, vi } from "vitest";
import { render, act } from "@testing-library/react";
import { useState } from "react";
import { UI, UIProvider, useUILayout, useSocketUI } from "@devcrish/headwind";

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

function setup(children, { socket, socketEvent, event } = {}) {
  let api;
  function Probe() {
    api = useUILayout();
    return null;
  }
  const result = render(
    <UIProvider>
      <UI.Canvas socket={socket} socketEvent={socketEvent} event={event}>
        {children}
      </UI.Canvas>
      <Probe />
    </UIProvider>
  );
  return {
    layout: () => api,
    geo: (id) => api.elements.find((e) => e.id === id),
    widget: (id) => document.querySelector(`[data-ui-id="${id}"]`),
    rerender: result.rerender,
  };
}

describe("Configurable Socket.IO Event Synchronization", () => {
  it("defaults to listening on 'renderReactUI' when no custom event is specified", () => {
    const socket = createMockSocket();
    setup(<UI.Text id="heading" text="Default Event" />, { socket });

    expect(socket.on).toHaveBeenCalledWith("renderReactUI", expect.any(Function));
  });

  it("listens on a custom socket event specified via Canvas socketEvent prop", () => {
    const socket = createMockSocket();
    const t = setup(
      <UI.Text id="title" text="Original Title" color="#000000" />,
      { socket, socketEvent: "customUIUpdate" }
    );

    // Should NOT listen on renderReactUI
    expect(socket.on).not.toHaveBeenCalledWith("renderReactUI", expect.any(Function));
    // Should listen on customUIUpdate
    expect(socket.on).toHaveBeenCalledWith("customUIUpdate", expect.any(Function));

    // Emitting on renderReactUI does nothing
    act(() => {
      socket.emitEvent("renderReactUI", [
        { id: "title", text: "Should Not Update" },
      ]);
    });
    expect(t.widget("title").textContent).toBe("Original Title");

    // Emitting on customUIUpdate updates component
    act(() => {
      socket.emitEvent("customUIUpdate", [
        { id: "title", text: "Updated Title via Custom Event", color: "#2563eb" },
      ]);
    });

    const el = t.widget("title").firstElementChild.firstElementChild;
    expect(el.textContent).toBe("Updated Title via Custom Event");
    expect(el.style.color).toBe("rgb(37, 99, 235)");
  });

  it("listens on a custom socket event specified via Canvas event prop alias", () => {
    const socket = createMockSocket();
    const t = setup(
      <UI.Button id="actionBtn" text="Save" variant="primary" />,
      { socket, event: "app:syncWidgets" }
    );

    expect(socket.on).toHaveBeenCalledWith("app:syncWidgets", expect.any(Function));

    act(() => {
      socket.emitEvent("app:syncWidgets", [
        { id: "actionBtn", text: "Saved!", variant: "secondary" },
      ]);
    });

    const btn = t.widget("actionBtn").querySelector("button");
    expect(btn.textContent).toBe("Saved!");
    expect(btn.style.background).toBe("rgb(226, 232, 240)"); // secondary
  });

  it("prioritizes socketEvent when both socketEvent and event are passed to Canvas", () => {
    const socket = createMockSocket();
    setup(<UI.Text id="test" text="Hello" />, {
      socket,
      socketEvent: "primaryEvent",
      event: "fallbackEvent",
    });

    expect(socket.on).toHaveBeenCalledWith("primaryEvent", expect.any(Function));
    expect(socket.on).not.toHaveBeenCalledWith("fallbackEvent", expect.any(Function));
  });

  it("automatically creates new widgets via custom socket event", () => {
    const socket = createMockSocket();
    const t = setup(<div />, { socket, socketEvent: "adminStream" });

    expect(t.widget("streamedText")).toBeNull();

    act(() => {
      socket.emitEvent("adminStream", [
        {
          id: "streamedText",
          text: "Created via adminStream",
          fontSize: 28,
        },
      ]);
    });

    const el = t.widget("streamedText");
    expect(el).not.toBeNull();
    expect(el.textContent).toBe("Created via adminStream");
  });

  it("supports custom socketEvent option directly in useSocketUI hook", () => {
    const socket = createMockSocket();
    let hookResult;

    function TestComponent() {
      hookResult = useSocketUI({ socket, socketEvent: "hookEvent" });
      return null;
    }

    render(
      <UIProvider>
        <TestComponent />
      </UIProvider>
    );

    expect(socket.on).toHaveBeenCalledWith("hookEvent", expect.any(Function));
    expect(hookResult.socket).toBe(socket);
  });

  it("supports custom event option alias directly in useSocketUI hook", () => {
    const socket = createMockSocket();

    function TestComponent() {
      useSocketUI({ socket, event: "hookAliasEvent" });
      return null;
    }

    render(
      <UIProvider>
        <TestComponent />
      </UIProvider>
    );

    expect(socket.on).toHaveBeenCalledWith("hookAliasEvent", expect.any(Function));
  });

  it("cleans up old event listener and attaches to new event when socketEvent changes", () => {
    const socket = createMockSocket();

    function DynamicContainer({ currentEvent }) {
      return (
        <UIProvider>
          <UI.Canvas socket={socket} socketEvent={currentEvent}>
            <UI.Text id="dyn" text="Dynamic" />
          </UI.Canvas>
        </UIProvider>
      );
    }

    const { rerender } = render(<DynamicContainer currentEvent="channelA" />);
    expect(socket.on).toHaveBeenCalledWith("channelA", expect.any(Function));

    rerender(<DynamicContainer currentEvent="channelB" />);

    expect(socket.off).toHaveBeenCalledWith("channelA", expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith("channelB", expect.any(Function));
  });
});

