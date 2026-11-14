import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { UI, UIProvider } from "@devcrish/headwind";

function setup(children, { deploy = false, config } = {}) {
  return render(
    <UIProvider config={config}>
      <UI.Canvas deploy={deploy}>
        {children}
        <UI.InspectorPanel />
      </UI.Canvas>
    </UIProvider>
  );
}

describe("InspectorPanel Color Palette Feature", () => {
  it("renders small color square indicators for color and background-color", () => {
    const { container } = setup(
      <UI.Text id="txt-demo" text="Hello" color="#ef4444" backgroundColor="#1e293b" />
    );

    // Select the widget
    const widget = container.querySelector('[data-ui-id="txt-demo"]');
    fireEvent.pointerDown(widget, { clientX: 30, clientY: 30, button: 0 });
    fireEvent.pointerUp(window);

    const colorsSection = screen.getByTestId("ui-inspector-colors");
    expect(colorsSection).toBeTruthy();
    expect(colorsSection.textContent).toContain("color");
    expect(colorsSection.textContent).toContain("#ef4444");
    expect(colorsSection.textContent).toContain("background-color");
    expect(colorsSection.textContent).toContain("#1e293b");

    const colorSquare = screen.getByTestId("ui-color-square-color");
    const bgSquare = screen.getByTestId("ui-color-square-backgroundColor");
    expect(colorSquare).toBeTruthy();
    expect(bgSquare).toBeTruthy();
  });

  it("clicking the color square opens the palette popover", () => {
    const { container } = setup(
      <UI.Text id="txt-demo2" text="Sample" />
    );

    const widget = container.querySelector('[data-ui-id="txt-demo2"]');
    fireEvent.pointerDown(widget, { clientX: 30, clientY: 30, button: 0 });
    fireEvent.pointerUp(window);

    // Initially palette is closed
    expect(screen.queryByTestId("ui-color-palette-color")).toBeNull();

    // Click color square
    fireEvent.click(screen.getByTestId("ui-color-square-color"));
    expect(screen.getByTestId("ui-color-palette-color")).toBeTruthy();
    expect(screen.getByTestId("ui-color-picker-color")).toBeTruthy();
    expect(screen.getByTestId("ui-color-input-color")).toBeTruthy();

    // Click again to close
    fireEvent.click(screen.getByTestId("ui-color-square-color"));
    expect(screen.queryByTestId("ui-color-palette-color")).toBeNull();
  });

  it("picking a color swatch updates the widget color, square, and JSX", () => {
    const { container } = setup(
      <UI.Button id="btn-colored" text="Click Me" />
    );

    const widget = container.querySelector('[data-ui-id="btn-colored"]');
    fireEvent.pointerDown(widget, { clientX: 30, clientY: 30, button: 0 });
    fireEvent.pointerUp(window);

    // Open color palette
    fireEvent.click(screen.getByTestId("ui-color-square-color"));

    // Click a swatch: #3b82f6 (blue)
    const swatch = screen.getByTestId("ui-swatch-3b82f6");
    fireEvent.click(swatch);

    // Inspector section should show the updated color
    const colorsSection = screen.getByTestId("ui-inspector-colors");
    expect(colorsSection.textContent).toContain("#3b82f6");

    // Open Show JSX and verify color="#3b82f6" is in the generated JSX
    fireEvent.click(screen.getByTestId("ui-inspector-toggle-jsx"));
    const jsxBlock = screen.getByTestId("ui-inspector-jsx");
    expect(jsxBlock.textContent).toContain('color="#3b82f6"');
  });

  it("editing color via text input updates backgroundColor and JSX", () => {
    const { container } = setup(
      <UI.Button id="btn-bg-test" text="Submit" />
    );

    const widget = container.querySelector('[data-ui-id="btn-bg-test"]');
    fireEvent.pointerDown(widget, { clientX: 30, clientY: 30, button: 0 });
    fireEvent.pointerUp(window);

    // Open background-color palette
    fireEvent.click(screen.getByTestId("ui-color-square-backgroundColor"));

    // Type custom color into text input
    const input = screen.getByTestId("ui-color-input-backgroundColor");
    fireEvent.change(input, { target: { value: "#10b981" } });

    // Open Show JSX and check backgroundColor="#10b981"
    fireEvent.click(screen.getByTestId("ui-inspector-toggle-jsx"));
    const jsxBlock = screen.getByTestId("ui-inspector-jsx");
    expect(jsxBlock.textContent).toContain('backgroundColor="#10b981"');
  });

  it("clearing color resets it and removes it from JSX", () => {
    const { container } = setup(
      <UI.Text id="txt-clear" text="Clearable" color="#ef4444" />
    );

    const widget = container.querySelector('[data-ui-id="txt-clear"]');
    fireEvent.pointerDown(widget, { clientX: 30, clientY: 30, button: 0 });
    fireEvent.pointerUp(window);

    // Open color palette
    fireEvent.click(screen.getByTestId("ui-color-square-color"));

    // Click Clear
    fireEvent.click(screen.getByTestId("ui-color-clear-color"));

    // Check JSX does not contain color="#ef4444"
    fireEvent.click(screen.getByTestId("ui-inspector-toggle-jsx"));
    const jsxBlock = screen.getByTestId("ui-inspector-jsx");
    expect(jsxBlock.textContent).not.toContain('color=');
  });

  it("changing a widget color via InspectorPanel enables AIWidget save button", () => {
    const mockSocket = {
      connected: true,
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    };

    const { container } = render(
      <UIProvider>
        <UI.Canvas>
          <UI.Text id="txt-sync" text="Sync Text" />
          <UI.InspectorPanel />
        </UI.Canvas>
        <UI.AIWidget socket={mockSocket} />
      </UIProvider>
    );

    const saveBtn = screen.getByTestId("ui-ai-save-btn");
    // Initially no changes -> Save button is disabled
    expect(saveBtn.disabled).toBe(true);

    // Select the widget in InspectorPanel
    const widget = container.querySelector('[data-ui-id="txt-sync"]');
    fireEvent.pointerDown(widget, { clientX: 30, clientY: 30, button: 0 });
    fireEvent.pointerUp(window);

    // Click color square to open palette
    fireEvent.click(screen.getByTestId("ui-color-square-color"));

    // Click a swatch: #ef4444
    fireEvent.click(screen.getByTestId("ui-swatch-ef4444"));

    // AIWidget detects the JSX change from InspectorPanel and enables the Save button!
    expect(saveBtn.disabled).toBe(false);
    expect(saveBtn.textContent).toContain("Save 1 Change(s) to App.jsx");

    // Click Save button in AIWidget
    fireEvent.click(saveBtn);

    // Verify socket emitted the updated JSX with color="#ef4444"
    expect(mockSocket.emit).toHaveBeenCalledWith(
      "aiPrompt",
      expect.objectContaining({
        prompt: "Make this changes to the current UI",
        widgets: expect.arrayContaining([
          expect.objectContaining({
            id: "txt-sync",
            jsx: expect.stringContaining('color="#ef4444"'),
          }),
        ]),
      })
    );

    // After save, the save button is disabled again!
    expect(saveBtn.disabled).toBe(true);
  });
});
