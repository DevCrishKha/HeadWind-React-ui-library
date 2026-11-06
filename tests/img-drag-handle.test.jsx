import { describe, it, expect } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { UI, UIProvider, useUILayout } from "@devcrish/headwind";

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

describe("UI.Img: showDragHandle property", () => {
  it("renders drag handle by default in edit mode (showDragHandle default is true)", () => {
    setup(<UI.Img id="img1" src="https://example.com/pic.jpg" />);
    const handle = screen.getByTestId("img-drag-handle");
    expect(handle).toBeTruthy();
    expect(screen.getByTestId("parent-drag-handle")).toBeTruthy();
    expect(screen.getByText("img1")).toBeTruthy();
    expect(screen.getByText("IMG")).toBeTruthy();
  });

  it("hides drag handle when showDragHandle={false}", () => {
    setup(<UI.Img id="img1" src="https://example.com/pic.jpg" showDragHandle={false} />);
    expect(screen.queryByTestId("img-drag-handle")).toBeNull();
    expect(screen.queryByTestId("parent-drag-handle")).toBeNull();
  });

  it("shows drag handle when showDragHandle={true} explicitly passed", () => {
    setup(<UI.Img id="img1" src="https://example.com/pic.jpg" showDragHandle={true} />);
    expect(screen.getByTestId("img-drag-handle")).toBeTruthy();
  });

  it("hides drag handle in deploy mode even when showDragHandle is true", () => {
    setup(<UI.Img id="img1" src="https://example.com/pic.jpg" showDragHandle={true} />, {
      deploy: true,
    });
    expect(screen.queryByTestId("img-drag-handle")).toBeNull();
    expect(screen.queryByTestId("parent-drag-handle")).toBeNull();
  });

  it("dragging via the drag handle moves the Img widget position", () => {
    const t = setup(
      <UI.Img
        id="heroImg"
        src="https://example.com/pic.jpg"
        position={{ x: 60, y: 80 }}
        size={{ width: 400, height: 250 }}
        showDragHandle={true}
      />
    );

    const handle = screen.getByTestId("img-drag-handle");
    drag(handle, 50, 40, { x: 70, y: 90 });

    expect(t.geo("heroImg").position).toEqual({ x: 110, y: 120 });
  });

  it("displays custom title in drag handle bar if provided", () => {
    setup(
      <UI.Img
        id="banner"
        src="https://example.com/banner.jpg"
        title="Hero Hospital Banner"
        showDragHandle={true}
      />
    );
    expect(screen.getByText("Hero Hospital Banner")).toBeTruthy();
  });

  it("renders custom dragHandle node when passed", () => {
    const t = setup(
      <UI.Img
        id="imgCustom"
        src="https://example.com/pic.jpg"
        position={{ x: 20, y: 30 }}
        dragHandle={<div data-testid="custom-bar">Custom Drag Bar</div>}
      />
    );

    expect(screen.getByTestId("custom-bar")).toBeTruthy();
    expect(screen.getByText("Custom Drag Bar")).toBeTruthy();

    const handle = screen.getByTestId("img-drag-handle");
    drag(handle, 30, 20, { x: 30, y: 40 });
    expect(t.geo("imgCustom").position).toEqual({ x: 50, y: 50 });
  });

  it("content container adjusts height based on showDragHandle", () => {
    const t = setup(
      <UI.Img id="img1" src="https://example.com/pic.jpg" showDragHandle={true} />
    );
    const content = screen.getByTestId("img-content");
    expect(content.style.height).toBe("calc(100% - 28px)");

    t.rerender(
      <UI.Img id="img1" src="https://example.com/pic.jpg" showDragHandle={false} />
    );
    expect(screen.getByTestId("img-content").style.height).toBe("100%");
  });

  it("drag handle renders in loading, error, and placeholder states", () => {
    const t = setup(<UI.Img id="imgLoading" loading={true} showDragHandle={true} />);
    expect(screen.getByTestId("img-drag-handle")).toBeTruthy();
    expect(screen.getByText("Loadingâ€¦")).toBeTruthy();

    t.rerender(
      <UI.Img id="imgLoading" error={true} errorText="Err" showDragHandle={true} />
    );
    expect(screen.getByTestId("img-drag-handle")).toBeTruthy();
    expect(screen.getByText("Err")).toBeTruthy();

    t.rerender(<UI.Img id="imgLoading" showDragHandle={true} />);
    expect(screen.getByTestId("img-drag-handle")).toBeTruthy();
    expect(screen.getByText("No image")).toBeTruthy();
  });
});

