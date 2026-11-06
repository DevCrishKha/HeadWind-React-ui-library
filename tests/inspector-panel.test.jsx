import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import { UI, UIProvider, InspectorPanel } from "@devcrish/headwind";

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

const pos = (x, y) => ({ x, y });
const sz = (width, height) => ({ width, height });

describe("InspectorPanel", () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("is exported both as UI.InspectorPanel and named InspectorPanel", () => {
    expect(UI.InspectorPanel).toBeDefined();
    expect(InspectorPanel).toBeDefined();
    expect(UI.InspectorPanel).toBe(InspectorPanel);
  });

  it("renders with empty message when no widget is selected", () => {
    setup(<UI.Text id="txt-1" />);
    const panel = screen.getByTestId("ui-inspector-panel");
    expect(panel).toBeTruthy();
    expect(screen.getByTestId("ui-inspector-empty").textContent).toContain("Select a widget to inspect");
  });

  it("shows widget props and geometry when a widget is selected", () => {
    const { container } = setup(
      <UI.Text id="my-text" position={pos(50, 60)} size={sz(200, 80)} solid />
    );

    // Click/pointerDown the widget to select it
    const widget = container.querySelector('[data-ui-id="my-text"]');
    fireEvent.pointerDown(widget, { clientX: 55, clientY: 65, button: 0 });
    fireEvent.pointerUp(window);

    const panel = screen.getByTestId("ui-inspector-panel");
    expect(panel.textContent).toContain("my-text");
    expect(panel.textContent).toContain("Text");
    expect(panel.textContent).toContain("x: 50, y: 60");
    expect(panel.textContent).toContain("w: 200, h: 80");
    expect(panel.textContent).toContain("Solid:true");
    expect(panel.textContent).toContain("Draggable:true");
    expect(panel.textContent).toContain("Resizable:true");
  });

  it("shows content properties like variant on Button and includes them in JSX", () => {
    const { container } = setup(
      <UI.Button id="action-btn" variant="secondary" text="Save Now" position={pos(30, 40)} size={sz(150, 45)} />
    );

    const widget = container.querySelector('[data-ui-id="action-btn"]');
    fireEvent.pointerDown(widget, { clientX: 35, clientY: 45, button: 0 });
    fireEvent.pointerUp(window);

    const panel = screen.getByTestId("ui-inspector-panel");
    expect(panel.textContent).toContain("Component Props");
    expect(panel.textContent).toContain("variant");
    expect(panel.textContent).toContain("secondary");
    expect(panel.textContent).toContain("text");
    expect(panel.textContent).toContain("Save Now");

    // Click Show JSX
    const toggleBtn = screen.getByTestId("ui-inspector-toggle-jsx");
    fireEvent.click(toggleBtn);

    const jsxBlock = screen.getByTestId("ui-inspector-jsx");
    expect(jsxBlock.textContent).toContain('variant="secondary"');
    expect(jsxBlock.textContent).toContain('text="Save Now"');
    expect(jsxBlock.textContent).toContain('<UI.Button id="action-btn" position={{ x: 30, y: 40 }} size={{ width: 150, height: 45 }} variant="secondary" text="Save Now" />');
  });

  it("shows custom props like fontSize, fontWeight, and number props in JSX", () => {
    const { container } = setup(
      <UI.Text id="heading" text="Big Title" fontSize={32} fontWeight={700} position={pos(10, 20)} size={sz(200, 60)} />
    );

    const widget = container.querySelector('[data-ui-id="heading"]');
    fireEvent.pointerDown(widget, { clientX: 15, clientY: 25, button: 0 });
    fireEvent.pointerUp(window);

    const panel = screen.getByTestId("ui-inspector-panel");
    expect(panel.textContent).toContain("fontSize");
    expect(panel.textContent).toContain("32");
    expect(panel.textContent).toContain("fontWeight");
    expect(panel.textContent).toContain("700");

    const toggleBtn = screen.getByTestId("ui-inspector-toggle-jsx");
    fireEvent.click(toggleBtn);

    const jsxBlock = screen.getByTestId("ui-inspector-jsx");
    expect(jsxBlock.textContent).toContain('text="Big Title"');
    expect(jsxBlock.textContent).toContain("fontSize={32}");
    expect(jsxBlock.textContent).toContain("fontWeight={700}");
  });

  it("toggles JSX snippet visibility when 'Show JSX' is clicked", () => {
    const { container } = setup(
      <UI.Text id="my-heading" position={pos(100, 200)} size={sz(300, 50)} />
    );

    const widget = container.querySelector('[data-ui-id="my-heading"]');
    fireEvent.pointerDown(widget, { clientX: 105, clientY: 205, button: 0 });
    fireEvent.pointerUp(window);

    // Initially JSX pre block is not displayed
    expect(screen.queryByTestId("ui-inspector-jsx")).toBeNull();

    const toggleBtn = screen.getByTestId("ui-inspector-toggle-jsx");
    expect(toggleBtn.textContent).toBe("Show JSX");

    // Click Show JSX
    fireEvent.click(toggleBtn);
    expect(toggleBtn.textContent).toBe("Hide JSX");

    const jsxBlock = screen.getByTestId("ui-inspector-jsx");
    expect(jsxBlock).toBeTruthy();
    expect(jsxBlock.textContent).toContain('<UI.Text id="my-heading" position={{ x: 100, y: 200 }} size={{ width: 300, height: 50 }} />');

    // Click Hide JSX
    fireEvent.click(toggleBtn);
    expect(screen.queryByTestId("ui-inspector-jsx")).toBeNull();
    expect(toggleBtn.textContent).toBe("Show JSX");
  });

  it("copies JSX code to clipboard and flashes feedback message", async () => {
    const { container } = setup(
      <UI.Button id="btn-action" variant="danger" position={pos(40, 40)} size={sz(120, 40)} />
    );

    const widget = container.querySelector('[data-ui-id="btn-action"]');
    fireEvent.pointerDown(widget, { clientX: 45, clientY: 45, button: 0 });
    fireEvent.pointerUp(window);

    const copyBtn = screen.getByTestId("ui-inspector-copy-jsx");
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      '<UI.Button id="btn-action" position={{ x: 40, y: 40 }} size={{ width: 120, height: 40 }} variant="danger" />'
    );
    await waitFor(() => {
      expect(screen.getByTestId("ui-inspector-note").textContent).toBe("JSX copied!");
    });
  });

  it("hides automatically when the page is deployed", () => {
    setup(<UI.Text id="txt" />, { deploy: true });
    expect(screen.queryByTestId("ui-inspector-panel")).toBeNull();
  });
});
