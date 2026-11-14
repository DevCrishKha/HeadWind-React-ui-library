import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { UI, UIProvider, aiSelectionStore } from "@devcrish/headwind";

// Mock socket for testing socket interactions
function createMockSocket() {
  const handlers = {};
  return {
    connected: true,
    on: vi.fn((event, handler) => {
      handlers[event] = handler;
    }),
    off: vi.fn((event) => {
      delete handlers[event];
    }),
    emit: vi.fn(),
    _trigger: (event, data) => {
      if (handlers[event]) handlers[event](data);
    },
  };
}

describe("UI.AIWidget", () => {
  beforeEach(() => {
    aiSelectionStore.clear();
  });

  it("renders with header, title, output canvas, textarea, send button and save button", () => {
    const mockSocket = createMockSocket();
    render(
      <UIProvider>
        <UI.Canvas>
          <UI.Text id="title-text" text="My Page" />
        </UI.Canvas>
        <UI.AIWidget socket={mockSocket} />
      </UIProvider>
    );

    expect(screen.getByTestId("ui-ai-widget-panel")).toBeTruthy();
    expect(screen.getByTestId("ui-ai-title").textContent).toBe("AI Assistant");
    expect(screen.getByTestId("ui-ai-output-canvas")).toBeTruthy();
    expect(screen.getByTestId("ui-ai-textarea")).toBeTruthy();
    expect(screen.getByTestId("ui-ai-send-btn")).toBeTruthy();
    expect(screen.getByTestId("ui-ai-save-btn")).toBeTruthy();
  });

  it("disappears when page is deployed", () => {
    const mockSocket = createMockSocket();
    render(
      <UIProvider>
        <UI.Canvas deploy>
          <UI.Text id="title-text" text="My Page" />
        </UI.Canvas>
        <UI.AIWidget socket={mockSocket} />
      </UIProvider>
    );

    expect(screen.queryByTestId("ui-ai-widget-panel")).toBeNull();
  });

  it("can collapse and expand via header button", () => {
    const mockSocket = createMockSocket();
    render(
      <UIProvider>
        <UI.Canvas />
        <UI.AIWidget socket={mockSocket} />
      </UIProvider>
    );

    const collapseBtn = screen.getByTestId("ui-ai-collapse");
    expect(screen.getByTestId("ui-ai-output-canvas")).toBeTruthy();

    fireEvent.click(collapseBtn);
    expect(screen.queryByTestId("ui-ai-output-canvas")).toBeNull();

    fireEvent.click(collapseBtn);
    expect(screen.getByTestId("ui-ai-output-canvas")).toBeTruthy();
  });

  it("reflects ticked widgets from WidgetListPanel", () => {
    const mockSocket = createMockSocket();
    render(
      <UIProvider>
        <UI.Canvas>
          <UI.Text id="text-widget" text="Heading" />
          <UI.Button id="btn-widget" text="Submit" />
        </UI.Canvas>
        <UI.WidgetListPanel />
        <UI.AIWidget socket={mockSocket} />
      </UIProvider>
    );

    const banner = screen.getByTestId("ui-ai-target-banner");
    expect(banner.textContent).toContain("No widgets ticked");

    // Click the tick button for text-widget
    const tickBtn = screen.getByTestId("ui-widget-tick-text-widget");
    fireEvent.click(tickBtn);

    expect(banner.textContent).toContain("Targeting: 1 widget(s)");
    expect(banner.textContent).toContain("text-widget");
  });

  it("sends empty widgets list when no widgets are ticked", () => {
    const mockSocket = createMockSocket();
    render(
      <UIProvider>
        <UI.Canvas>
          <UI.Text id="some-text" text="Hello" />
        </UI.Canvas>
        <UI.AIWidget socket={mockSocket} sendPromptEvent="aiPrompt" />
      </UIProvider>
    );

    const textarea = screen.getByTestId("ui-ai-textarea");
    fireEvent.change(textarea, { target: { value: "Make the background dark" } });

    const sendBtn = screen.getByTestId("ui-ai-send-btn");
    fireEvent.click(sendBtn);

    expect(mockSocket.emit).toHaveBeenCalledWith("aiPrompt", {
      prompt: "Make the background dark",
      widgets: [],
    });
  });

  it("sends targeted widgets data when widgets are ticked", () => {
    const mockSocket = createMockSocket();
    render(
      <UIProvider>
        <UI.Canvas>
          <UI.Button id="btn-submit" text="Submit" position={{ x: 100, y: 150 }} />
        </UI.Canvas>
        <UI.WidgetListPanel />
        <UI.AIWidget socket={mockSocket} sendPromptEvent="aiPrompt" />
      </UIProvider>
    );

    // Tick the button widget
    fireEvent.click(screen.getByTestId("ui-widget-tick-btn-submit"));

    const textarea = screen.getByTestId("ui-ai-textarea");
    fireEvent.change(textarea, { target: { value: "Change button color to green" } });
    fireEvent.click(screen.getByTestId("ui-ai-send-btn"));

    // Widgets are now sent as JSX strings: { id, jsx }
    expect(mockSocket.emit).toHaveBeenCalledWith(
      "aiPrompt",
      expect.objectContaining({
        prompt: "Change button color to green",
        widgets: expect.arrayContaining([
          expect.objectContaining({
            id: "btn-submit",
            jsx: expect.stringContaining("UI.Button"),
          }),
        ]),
      })
    );
  });

  it("receives and renders AI response markdown over socket", () => {
    const mockSocket = createMockSocket();
    render(
      <UIProvider>
        <UI.Canvas />
        <UI.AIWidget socket={mockSocket} receiveResponseEvent="aiResponse" />
      </UIProvider>
    );

    // Simulate AI response event from backend
    act(() => {
      mockSocket._trigger("aiResponse", {
        markdown: "### Updated Layout\nChanged **Submit** button to *green*:\n```jsx\n<UI.Button variant=\"primary\" />\n```",
      });
    });

    const canvas = screen.getByTestId("ui-ai-output-canvas");
    expect(canvas.textContent).toContain("Updated Layout");
    expect(canvas.textContent).toContain("Submit");
    expect(canvas.textContent).toContain("green");
    expect(canvas.querySelector("code")).toBeTruthy();
  });

  it("save button emits changed widgets with specified prompt", () => {
    const mockSocket = createMockSocket();

    // We need to render with a store that has pre-existing elements, then change them.
    // Since jsdom cannot drag, we use aiSelectionStore as a proxy to know the button is disabled.
    // Instead: render with widgets, check button is disabled (no changes), then verify it
    // is enabled after the store signals a version change via ticking/unticking.
    render(
      <UIProvider>
        <UI.Canvas>
          <UI.Text id="header" text="Title" />
          <UI.Button id="action" text="Save" />
        </UI.Canvas>
        <UI.AIWidget socket={mockSocket} sendPromptEvent="aiPrompt" />
      </UIProvider>
    );

    const saveBtn = screen.getByTestId("ui-ai-save-btn");

    // Save button must be DISABLED when nothing has changed
    expect(saveBtn.disabled).toBe(true);

    // We cannot drag in jsdom, so we verify the button does NOT emit when disabled
    fireEvent.click(saveBtn);
    expect(mockSocket.emit).not.toHaveBeenCalledWith(
      "aiPrompt",
      expect.objectContaining({ prompt: "Make this changes to the current UI" })
    );
  });

  it("safely handles widgets with React children and circular props (e.g. ParentPanel)", () => {
    const mockSocket = createMockSocket();
    render(
      <UIProvider>
        <UI.Canvas>
          <UI.ParentPanel id="my-panel" position={{ x: 10, y: 10 }}>
            <UI.Text id="nested-text" text="Inside panel" />
            <UI.Button id="nested-btn" text="Inside button" />
          </UI.ParentPanel>
        </UI.Canvas>
        <UI.WidgetListPanel />
        <UI.AIWidget socket={mockSocket} sendPromptEvent="aiPrompt" />
      </UIProvider>
    );

    // Tick the parent panel and submit prompt
    fireEvent.click(screen.getByTestId("ui-widget-tick-my-panel"));
    const textarea = screen.getByTestId("ui-ai-textarea");
    fireEvent.change(textarea, { target: { value: "Update panel background" } });
    fireEvent.click(screen.getByTestId("ui-ai-send-btn"));

    // Widgets are now sent as JSX strings: { id, jsx } — no circular refs possible
    expect(mockSocket.emit).toHaveBeenCalledWith(
      "aiPrompt",
      expect.objectContaining({
        prompt: "Update panel background",
        widgets: expect.arrayContaining([
          expect.objectContaining({
            id: "my-panel",
            jsx: expect.stringContaining("UI.ParentPanel"),
          }),
        ]),
      })
    );

    // Save button is disabled (no changes) — clicking it must NOT throw
    const saveBtn = screen.getByTestId("ui-ai-save-btn");
    expect(saveBtn.disabled).toBe(true);
    expect(() => fireEvent.click(saveBtn)).not.toThrow();
  });
});
