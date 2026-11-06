import { describe, it, expect, vi } from "vitest";
import { render, act, renderHook } from "@testing-library/react";
import { UI, UIProvider, useUILayout, useMqttUI, matchesMqttTopic } from "@devcrish/headwind";

// Helper to create a fake MQTT client
function createMockMqttClient({ connected = true } = {}) {
  const handlers = {};
  const subscriptions = new Set();

  return {
    connected,
    handlers,
    subscriptions,
    subscribe: vi.fn((topic, cb) => {
      subscriptions.add(topic);
      if (cb) cb(null);
    }),
    unsubscribe: vi.fn((topic) => {
      subscriptions.delete(topic);
    }),
    on: vi.fn((event, cb) => {
      handlers[event] = handlers[event] || [];
      handlers[event].push(cb);
    }),
    off: vi.fn((event, cb) => {
      if (handlers[event]) {
        handlers[event] = handlers[event].filter((h) => h !== cb);
      }
    }),
    removeListener: vi.fn((event, cb) => {
      if (handlers[event]) {
        handlers[event] = handlers[event].filter((h) => h !== cb);
      }
    }),
    emit(event, ...args) {
      if (handlers[event]) {
        handlers[event].forEach((cb) => cb(...args));
      }
    },
    emitMessage(topic, payload) {
      const message = typeof payload === "string" ? payload : JSON.stringify(payload);
      if (handlers["message"]) {
        handlers["message"].forEach((cb) => cb(topic, message));
      }
    },
    end: vi.fn(),
  };
}

function setup(children, { client, mqttTopic, topic } = {}) {
  let api;
  function Probe() {
    api = useUILayout();
    return null;
  }
  function MqttConsumer() {
    useMqttUI({ client, mqttTopic: mqttTopic || topic });
    return null;
  }

  const result = render(
    <UIProvider>
      <UI.Canvas>
        <MqttConsumer />
        {children}
      </UI.Canvas>
      <Probe />
    </UIProvider>
  );

  return {
    layout: () => api,
    geo: (id) => api.elements.find((e) => e.id === id),
    widget: (id) => document.querySelector(`[data-ui-id="${id}"]`),
    unmount: result.unmount,
  };
}

describe("matchesMqttTopic helper", () => {
  it("matches exact topics", () => {
    expect(matchesMqttTopic("renderReactUI", "renderReactUI")).toBe(true);
    expect(matchesMqttTopic("renderReactUI", "otherTopic")).toBe(false);
  });

  it("matches wildcard + and # topics", () => {
    expect(matchesMqttTopic("#", "any/topic/here")).toBe(true);
    expect(matchesMqttTopic("device/+/ui", "device/123/ui")).toBe(true);
    expect(matchesMqttTopic("device/+/ui", "device/123/status")).toBe(false);
    expect(matchesMqttTopic("sensors/#", "sensors/temp/livingroom")).toBe(true);
  });
});

describe("MQTT UI Synchronization (useMqttUI)", () => {
  it("subscribes to default topic 'renderReactUI' when no topic specified", () => {
    const client = createMockMqttClient();
    setup(<UI.Text id="heading" text="Hello" />, { client });

    expect(client.subscribe).toHaveBeenCalledWith("renderReactUI", expect.any(Function));
    expect(client.subscriptions.has("renderReactUI")).toBe(true);
  });

  it("subscribes to custom topic specified via mqttTopic", () => {
    const client = createMockMqttClient();
    setup(<UI.Text id="heading" text="Hello" />, { client, mqttTopic: "custom/mqtt/ui" });

    expect(client.subscribe).toHaveBeenCalledWith("custom/mqtt/ui", expect.any(Function));
    expect(client.subscriptions.has("custom/mqtt/ui")).toBe(true);
    expect(client.subscriptions.has("renderReactUI")).toBe(false);
  });

  it("subscribes to custom topic specified via topic alias", () => {
    const client = createMockMqttClient();
    setup(<UI.Text id="heading" text="Hello" />, { client, topic: "sensors/panel" });

    expect(client.subscribe).toHaveBeenCalledWith("sensors/panel", expect.any(Function));
    expect(client.subscriptions.has("sensors/panel")).toBe(true);
  });

  it("updates existing component properties and preserves untouched properties", () => {
    const client = createMockMqttClient();
    const t = setup(
      <UI.Text
        id="heading"
        text="Original Title"
        color="#ff0000"
        fontSize={20}
        fontWeight={400}
      />,
      { client }
    );

    const elBefore = t.widget("heading");
    const textNodeBefore = elBefore.firstElementChild.firstElementChild;
    expect(textNodeBefore.textContent).toBe("Original Title");
    expect(textNodeBefore.style.color).toBe("rgb(255, 0, 0)");
    expect(textNodeBefore.style.fontSize).toBe("20px");
    expect(textNodeBefore.style.fontWeight).toBe("400");
    expect(t.geo("heading").solid).toBe(false);

    // Emit MQTT message on default topic
    act(() => {
      client.emitMessage("renderReactUI", [
        {
          id: "heading",
          fontSize: 48,
          fontWeight: 700,
          solid: true,
        },
      ]);
    });

    const elAfter = t.widget("heading");
    const textNodeAfter = elAfter.firstElementChild.firstElementChild;
    // Updated properties
    expect(textNodeAfter.style.fontSize).toBe("48px");
    expect(textNodeAfter.style.fontWeight).toBe("700");
    expect(t.geo("heading").solid).toBe(true);
    // Preserved untouched properties
    expect(textNodeAfter.textContent).toBe("Original Title");
    expect(textNodeAfter.style.color).toBe("rgb(255, 0, 0)");
  });

  it("creates dynamic widgets if element does not exist on canvas", () => {
    const client = createMockMqttClient();
    const t = setup(<UI.Text id="heading" text="Hello" />, { client });

    expect(t.widget("dynamicMqttBtn")).toBeNull();

    act(() => {
      client.emitMessage("renderReactUI", [
        {
          id: "dynamicMqttBtn",
          type: "Button",
          text: "Click Me",
          variant: "primary",
          position: { x: 50, y: 150 },
          size: { width: 140, height: 44 },
        },
      ]);
    });

    const btn = t.widget("dynamicMqttBtn");
    expect(btn).not.toBeNull();
    expect(btn.textContent).toContain("Click Me");
    expect(t.geo("dynamicMqttBtn").position.x).toBe(50);
    expect(t.geo("dynamicMqttBtn").position.y).toBe(150);
  });

  it("ignores messages sent to different topics", () => {
    const client = createMockMqttClient();
    const t = setup(
      <UI.Text id="heading" text="Original" color="#000000" />,
      { client, mqttTopic: "specificTopic" }
    );

    act(() => {
      client.emitMessage("otherTopic", [
        { id: "heading", text: "Should Not Apply" },
      ]);
    });

    const textNode = t.widget("heading").firstElementChild.firstElementChild;
    expect(textNode.textContent).toBe("Original");
  });

  it("handles Buffer and Object message payloads without crashing", () => {
    const client = createMockMqttClient();
    const t = setup(<UI.Text id="heading" text="Original" />, { client });

    // Simulate Buffer with .toString()
    const bufferLike = {
      toString: () => JSON.stringify([{ id: "heading", text: "Buffer Updated" }]),
    };

    act(() => {
      client.emit("message", "renderReactUI", bufferLike);
    });

    const textNode = t.widget("heading").firstElementChild.firstElementChild;
    expect(textNode.textContent).toBe("Buffer Updated");
  });

  it("gracefully handles invalid JSON message payloads", () => {
    const client = createMockMqttClient();
    const t = setup(<UI.Text id="heading" text="Original" />, { client });

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    act(() => {
      client.emit("message", "renderReactUI", "NOT_JSON{{{");
    });

    expect(warnSpy).toHaveBeenCalled();
    const textNode = t.widget("heading").firstElementChild.firstElementChild;
    expect(textNode.textContent).toBe("Original");

    warnSpy.mockRestore();
  });

  it("tracks isConnected state on connect and close / offline events", () => {
    const client = createMockMqttClient({ connected: false });
    let hookResult;

    function TestComp() {
      hookResult = useMqttUI({ client });
      return null;
    }

    render(
      <UIProvider>
        <TestComp />
      </UIProvider>
    );

    expect(hookResult.isConnected).toBe(false);

    act(() => {
      client.connected = true;
      client.emit("connect");
    });

    expect(hookResult.isConnected).toBe(true);

    act(() => {
      client.connected = false;
      client.emit("close");
    });

    expect(hookResult.isConnected).toBe(false);
  });

  it("unsubscribes and cleans up event listeners on unmount", () => {
    const client = createMockMqttClient();
    const t = setup(<UI.Text id="heading" text="Hello" />, { client });

    expect(client.subscriptions.has("renderReactUI")).toBe(true);

    act(() => {
      t.unmount();
    });

    expect(client.unsubscribe).toHaveBeenCalledWith("renderReactUI");
    expect(client.subscriptions.has("renderReactUI")).toBe(false);
  });
});

describe("UI.Canvas MQTT Integration via Canvas Props", () => {
  function setupCanvas(children, { mqttClient, mqttUrl, mqttTopic, topic } = {}) {
    let api;
    function Probe() {
      api = useUILayout();
      return null;
    }

    const result = render(
      <UIProvider>
        <UI.Canvas mqttClient={mqttClient} mqttUrl={mqttUrl} mqttTopic={mqttTopic} topic={topic}>
          {children}
        </UI.Canvas>
        <Probe />
      </UIProvider>
    );

    return {
      layout: () => api,
      geo: (id) => api.elements.find((e) => e.id === id),
      widget: (id) => document.querySelector(`[data-ui-id="${id}"]`),
      unmount: result.unmount,
    };
  }

  it("subscribes to default topic 'renderReactUI' when mqttClient is passed to UI.Canvas", () => {
    const mqttClient = createMockMqttClient();
    setupCanvas(<UI.Text id="heading" text="Hello" />, { mqttClient });

    expect(mqttClient.subscribe).toHaveBeenCalledWith("renderReactUI", expect.any(Function));
    expect(mqttClient.subscriptions.has("renderReactUI")).toBe(true);
  });

  it("subscribes to custom mqttTopic specified on UI.Canvas", () => {
    const mqttClient = createMockMqttClient();
    setupCanvas(<UI.Text id="heading" text="Hello" />, {
      mqttClient,
      mqttTopic: "custom/mqtt/canvas",
    });

    expect(mqttClient.subscribe).toHaveBeenCalledWith("custom/mqtt/canvas", expect.any(Function));
    expect(mqttClient.subscriptions.has("custom/mqtt/canvas")).toBe(true);
    expect(mqttClient.subscriptions.has("renderReactUI")).toBe(false);
  });

  it("updates canvas widgets when receiving MQTT messages via UI.Canvas", () => {
    const mqttClient = createMockMqttClient();
    const t = setupCanvas(
      <UI.Text id="title" text="Initial Title" color="#000000" fontSize={16} />,
      { mqttClient }
    );

    act(() => {
      mqttClient.emitMessage("renderReactUI", [
        {
          id: "title",
          text: "Updated From MQTT Canvas",
          color: "#3b82f6",
          fontSize: 32,
        },
      ]);
    });

    const el = t.widget("title").firstElementChild.firstElementChild;
    expect(el.textContent).toBe("Updated From MQTT Canvas");
    expect(el.style.color).toBe("rgb(59, 130, 246)");
    expect(el.style.fontSize).toBe("32px");
  });
});
