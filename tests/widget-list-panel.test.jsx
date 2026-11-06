import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { UI, UIProvider, useUILayout } from "@devcrish/headwind";

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   WidgetListPanel tests
   
   This panel is a special component (like MasterPanel /
   InspectorPanel) that lists all widgets on the canvas
   and allows toggling their visibility with an eye icon.
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

describe("WidgetListPanel", () => {

  // â”€â”€ Rendering â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  it("renders with 'Widget List' title in the header", () => {
    render(
      <UIProvider>
        <UI.Canvas>
          <UI.Text id="t1" text="Hello" />
        </UI.Canvas>
        <UI.WidgetListPanel />
      </UIProvider>
    );
    expect(screen.getByTestId("ui-widget-list-panel")).toBeTruthy();
    expect(screen.getByTestId("ui-widget-list-header").textContent).toContain("Widget List");
    expect(screen.getByTestId("ui-widget-list-title").textContent).toBe("Widget List");
    expect(screen.getByTestId("ui-widget-list-drag-handle")).toBeTruthy();
  });

  it("lists all widgets with their IDs and types", () => {
    render(
      <UIProvider>
        <UI.Canvas>
          <UI.Text id="my-text" text="Hello" />
          <UI.Button id="my-btn" text="Click" />
        </UI.Canvas>
        <UI.WidgetListPanel />
      </UIProvider>
    );
    const body = screen.getByTestId("ui-widget-list-body");
    expect(body.textContent).toContain("my-text");
    expect(body.textContent).toContain("my-btn");
    // Type badges
    expect(screen.getByTestId("ui-widget-type-my-text").textContent).toBe("Text");
    expect(screen.getByTestId("ui-widget-type-my-btn").textContent).toBe("Button");
  });

  it("shows each widget row with a test id", () => {
    render(
      <UIProvider>
        <UI.Canvas>
          <UI.Text id="alpha" text="A" />
          <UI.Button id="beta" text="B" />
        </UI.Canvas>
        <UI.WidgetListPanel />
      </UIProvider>
    );
    expect(screen.getByTestId("ui-widget-row-alpha")).toBeTruthy();
    expect(screen.getByTestId("ui-widget-row-beta")).toBeTruthy();
  });

  it("shows 'No widgets on the canvas' when the canvas is empty", () => {
    render(
      <UIProvider>
        <UI.Canvas />
        <UI.WidgetListPanel />
      </UIProvider>
    );
    expect(screen.getByTestId("ui-widget-list-empty")).toBeTruthy();
    expect(screen.getByTestId("ui-widget-list-empty").textContent).toContain("No widgets on the canvas");
  });

  // â”€â”€ Deploy mode â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  it("disappears when the Canvas has deploy prop", () => {
    render(
      <UIProvider>
        <UI.Canvas deploy>
          <UI.Text id="t1" text="Hello" />
        </UI.Canvas>
        <UI.WidgetListPanel />
      </UIProvider>
    );
    expect(screen.queryByTestId("ui-widget-list-panel")).toBeNull();
  });

  it("disappears when master deploy is on", () => {
    render(
      <UIProvider>
        <UI.Canvas>
          <UI.Text id="t1" text="Hello" />
        </UI.Canvas>
        <UI.MasterPanel />
        <UI.WidgetListPanel />
      </UIProvider>
    );
    // Panel should exist initially
    expect(screen.getByTestId("ui-widget-list-panel")).toBeTruthy();
    
    // Toggle "Deploy whole page" checkbox on MasterPanel
    const deployCheckbox = screen.getByLabelText(/Deploy whole page/i);
    fireEvent.click(deployCheckbox);

    // Panel should be gone
    expect(screen.queryByTestId("ui-widget-list-panel")).toBeNull();
  });

  // â”€â”€ Collapse â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  it("collapses and expands the body when the collapse button is clicked", () => {
    render(
      <UIProvider>
        <UI.Canvas>
          <UI.Text id="t1" text="Hello" />
        </UI.Canvas>
        <UI.WidgetListPanel />
      </UIProvider>
    );

    // Body should be visible initially
    expect(screen.getByTestId("ui-widget-list-body")).toBeTruthy();

    // Click collapse button
    const collapseBtn = screen.getByTestId("ui-widget-list-collapse");
    fireEvent.click(collapseBtn);

    // Body should be gone, but header still present
    expect(screen.queryByTestId("ui-widget-list-body")).toBeNull();
    expect(screen.getByTestId("ui-widget-list-header")).toBeTruthy();
    // 'Widget List' title still visible
    expect(screen.getByTestId("ui-widget-list-header").textContent).toContain("Widget List");

    // Click again to expand
    fireEvent.click(collapseBtn);
    expect(screen.getByTestId("ui-widget-list-body")).toBeTruthy();
  });

  it("shows only the header with title and drag handle when collapsed", () => {
    render(
      <UIProvider>
        <UI.Canvas>
          <UI.Text id="t1" text="Hello" />
        </UI.Canvas>
        <UI.WidgetListPanel />
      </UIProvider>
    );
    
    fireEvent.click(screen.getByTestId("ui-widget-list-collapse"));

    const panel = screen.getByTestId("ui-widget-list-panel");
    // The panel should only contain the header â€” no body
    expect(panel.querySelector('[data-testid="ui-widget-list-body"]')).toBeNull();
    // But the header with 'Widget List' and drag handle is still there
    expect(screen.getByTestId("ui-widget-list-drag-handle")).toBeTruthy();
    expect(screen.getByTestId("ui-widget-list-title").textContent).toBe("Widget List");
    // Count badge is hidden when collapsed
    expect(screen.queryByTestId("ui-widget-list-count")).toBeNull();
  });

  // â”€â”€ Visibility toggle (eye icon) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  it("toggles widget visibility (hidden flag) when the eye icon is clicked", () => {
    let layoutApi;
    const Probe = () => { layoutApi = useUILayout(); return null; };

    render(
      <UIProvider>
        <UI.Canvas>
          <UI.Text id="viz-test" text="Visible text" />
          <Probe />
        </UI.Canvas>
        <UI.WidgetListPanel />
      </UIProvider>
    );

    // Initially, widget is visible and text is in document
    const widgetEl = screen.getByText("Visible text").closest('[style*="position"]');
    expect(widgetEl).toBeTruthy();
    expect(widgetEl.style.display).not.toBe("none");
    expect(layoutApi.elements.find(e => e.id === "viz-test").hidden).toBe(false);

    // Click the eye button to hide
    const eyeBtn = screen.getByTestId("ui-widget-eye-viz-test");
    fireEvent.click(eyeBtn);

    // Now hidden in store
    expect(layoutApi.elements.find(e => e.id === "viz-test").hidden).toBe(true);
    // Canvas widget element now has display: none
    expect(widgetEl.style.display).toBe("none");

    // Click eye button again to restore visibility
    fireEvent.click(eyeBtn);
    expect(layoutApi.elements.find(e => e.id === "viz-test").hidden).toBe(false);
    expect(widgetEl.style.display).not.toBe("none");
  });

  it("the eye button has a testid for each widget", () => {
    render(
      <UIProvider>
        <UI.Canvas>
          <UI.Text id="foo" text="Foo" />
          <UI.Button id="bar" text="Bar" />
        </UI.Canvas>
        <UI.WidgetListPanel />
      </UIProvider>
    );

    expect(screen.getByTestId("ui-widget-eye-foo")).toBeTruthy();
    expect(screen.getByTestId("ui-widget-eye-bar")).toBeTruthy();
  });

  // â”€â”€ Selecting a widget â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  it("selects a widget when clicking on its row", () => {
    let layoutApi;
    const Probe = () => { layoutApi = useUILayout(); return null; };

    render(
      <UIProvider>
        <UI.Canvas>
          <UI.Text id="w1" text="Item 1" />
          <UI.Text id="w2" text="Item 2" />
          <Probe />
        </UI.Canvas>
        <UI.WidgetListPanel />
      </UIProvider>
    );

    // Initially no widget selected
    expect(layoutApi.selectedId).toBeNull();

    // Click row for w1
    fireEvent.click(screen.getByTestId("ui-widget-row-w1"));
    expect(layoutApi.selectedId).toBe("w1");

    // Click row for w2
    fireEvent.click(screen.getByTestId("ui-widget-row-w2"));
    expect(layoutApi.selectedId).toBe("w2");
  });

  // â”€â”€ Dragging â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  it("has position:fixed styling on the panel", () => {
    render(
      <UIProvider>
        <UI.Canvas>
          <UI.Text id="t1" text="A" />
        </UI.Canvas>
        <UI.WidgetListPanel />
      </UIProvider>
    );
    const panel = screen.getByTestId("ui-widget-list-panel");
    expect(panel.style.position).toBe("fixed");
  });

  it("the header has cursor: grab for dragging", () => {
    render(
      <UIProvider>
        <UI.Canvas>
          <UI.Text id="t1" text="A" />
        </UI.Canvas>
        <UI.WidgetListPanel />
      </UIProvider>
    );
    const header = screen.getByTestId("ui-widget-list-header");
    expect(header.style.cursor).toBe("grab");
  });

  it("drags the panel across the screen using pointer events", () => {
    render(
      <UIProvider>
        <UI.Canvas>
          <UI.Text id="t1" text="A" />
        </UI.Canvas>
        <UI.WidgetListPanel defaultPosition={{ x: 50, y: 50 }} />
      </UIProvider>
    );

    const panel = screen.getByTestId("ui-widget-list-panel");
    expect(panel.style.left).toBe("50px");
    expect(panel.style.top).toBe("50px");

    const header = screen.getByTestId("ui-widget-list-header");
    header.setPointerCapture = vi.fn();
    header.releasePointerCapture = vi.fn();

    // Start drag
    fireEvent.pointerDown(header, { button: 0, clientX: 60, clientY: 60, pointerId: 1 });
    // Move pointer
    fireEvent.pointerMove(header, { clientX: 160, clientY: 200, pointerId: 1 });

    // Panel position updated
    expect(panel.style.left).toBe("150px");
    expect(panel.style.top).toBe("190px");

    // End drag
    fireEvent.pointerUp(header, { pointerId: 1 });
  });

  // â”€â”€ Widget count badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  it("shows the widget count in the header when expanded", () => {
    render(
      <UIProvider>
        <UI.Canvas>
          <UI.Text id="t1" text="A" />
          <UI.Text id="t2" text="B" />
          <UI.Button id="b1" text="C" />
        </UI.Canvas>
        <UI.WidgetListPanel />
      </UIProvider>
    );
    const count = screen.getByTestId("ui-widget-list-count");
    expect(count.textContent).toBe("3");
  });

  // â”€â”€ Multiple widget types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  it("correctly lists widgets of various types", () => {
    render(
      <UIProvider>
        <UI.Canvas>
          <UI.Text id="txt" text="T" />
          <UI.Button id="btn" text="B" />
          <UI.Heading id="hdg" text="H" />
        </UI.Canvas>
        <UI.WidgetListPanel />
      </UIProvider>
    );
    const body = screen.getByTestId("ui-widget-list-body");
    expect(body.textContent).toContain("txt");
    expect(body.textContent).toContain("btn");
    expect(body.textContent).toContain("hdg");
    expect(screen.getByTestId("ui-widget-type-txt").textContent).toBe("Text");
    expect(screen.getByTestId("ui-widget-type-btn").textContent).toBe("Button");
    expect(screen.getByTestId("ui-widget-type-hdg").textContent).toBe("Heading");
  });

  // â”€â”€ Accepts style prop â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  it("accepts and applies extra style prop", () => {
    render(
      <UIProvider>
        <UI.Canvas>
          <UI.Text id="t1" text="A" />
        </UI.Canvas>
        <UI.WidgetListPanel style={{ opacity: 0.8 }} />
      </UIProvider>
    );
    const panel = screen.getByTestId("ui-widget-list-panel");
    expect(panel.style.opacity).toBe("0.8");
  });
});
