import { describe, it, expect, vi } from "vitest";
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
    rerender: (kids, o = {}) => result.rerender(ui(kids, o.deploy ?? deploy, o.config ?? config)),
    widget: (id) => document.querySelector(`[data-ui-id="${id}"]`),
  };
}

const drag = (el, dx, dy, from = { x: 100, y: 100 }) => {
  fireEvent.pointerDown(el, { clientX: from.x, clientY: from.y, button: 0 });
  fireEvent.pointerMove(window, { clientX: from.x + dx, clientY: from.y + dy });
  fireEvent.pointerUp(window, { clientX: from.x + dx, clientY: from.y + dy });
};

describe("UI.IconButton", () => {
  it("renders with no layout props and gets its own default size (44x44)", () => {
    const t = setup(<UI.IconButton id="btn1" />);
    const el = t.geo("btn1");
    expect(el.size).toEqual({ width: 44, height: 44 });
    expect(el.isDraggable).toBe(true);
    expect(el.isResizable).toBe(true);
    expect(el.deploy).toBe(false);
    expect(document.querySelector("button")).toBeTruthy();
    expect(document.querySelector("svg")).toBeTruthy();
  });

  it("renders burger design by default", () => {
    setup(<UI.IconButton id="burger-btn" />);
    const button = screen.getByRole("button");
    expect(button.getAttribute("aria-label")).toBe("burger");
    const lines = button.querySelectorAll("line");
    expect(lines.length).toBe(3); // 3 horizontal lines for burger
  });

  it("renders 3dot vertical design when design='3dot' or 'dots-vertical'", () => {
    const { rerender } = setup(<UI.IconButton id="kebab-btn" design="3dot" />);
    let button = screen.getByRole("button");
    expect(button.getAttribute("aria-label")).toBe("3dot");
    let circles = button.querySelectorAll("circle");
    expect(circles.length).toBe(3);

    rerender(<UI.IconButton id="kebab-btn" design="dots-vertical" />);
    button = screen.getByRole("button");
    circles = button.querySelectorAll("circle");
    expect(circles.length).toBe(3);
  });

  it("renders dots-horizontal (meatball) design", () => {
    setup(<UI.IconButton id="meatball-btn" design="dots-horizontal" />);
    const button = screen.getByRole("button");
    const circles = button.querySelectorAll("circle");
    expect(circles.length).toBe(3);
  });

  it("renders close and plus designs", () => {
    const { rerender } = setup(<UI.IconButton id="action-btn" design="close" />);
    let button = screen.getByRole("button");
    expect(button.querySelectorAll("line").length).toBe(2);

    rerender(<UI.IconButton id="action-btn" design="plus" />);
    button = screen.getByRole("button");
    expect(button.querySelectorAll("line").length).toBe(2);
  });

  it("supports icon alias prop and text label", () => {
    setup(<UI.IconButton id="labeled-btn" icon="burger" text="Menu" />);
    expect(screen.getByText("Menu")).toBeTruthy();
  });

  it("auto-placement gives it a non-overlapping position", () => {
    const t = setup(
      <>
        <UI.IconButton id="b1" />
        <UI.IconButton id="b2" />
      </>
    );
    const g1 = t.geo("b1");
    const g2 = t.geo("b2");
    expect(g2.position.y).toBeGreaterThanOrEqual(g1.position.y + g1.size.height);
  });

  it("position={{ x }} only keeps y automatic", () => {
    const t = setup(<UI.IconButton id="b-x" position={{ x: 250 }} />);
    expect(t.geo("b-x").position.x).toBe(250);
    expect(typeof t.geo("b-x").position.y).toBe("number");
  });

  it("fires onClick on click, but not on drag", () => {
    const onClick = vi.fn();
    const t = setup(<UI.IconButton id="click-btn" onClick={onClick} />);
    const btn = t.widget("click-btn").querySelector("button");

    fireEvent.pointerDown(btn, { clientX: 10, clientY: 10, button: 0 });
    fireEvent.pointerUp(window);
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);

    // When dragged >= 4px, click is suppressed
    fireEvent.pointerDown(btn, { clientX: 10, clientY: 10, button: 0 });
    fireEvent.pointerMove(window, { clientX: 60, clientY: 10 });
    fireEvent.pointerUp(window);
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("handles disabled and loading states correctly", () => {
    const onClick = vi.fn();
    const t = setup(<UI.IconButton id="load-btn" loading={true} onClick={onClick} />);
    const btn = t.widget("load-btn").querySelector("button");
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute("aria-busy")).toBe("true");

    t.rerender(<UI.IconButton id="load-btn" disabled={true} onClick={onClick} />);
    const disabledBtn = t.widget("load-btn").querySelector("button");
    expect(disabledBtn.disabled).toBe(true);
  });

  it("supports deploy prop", () => {
    const t = setup(<UI.IconButton id="dep-btn" deploy />);
    expect(t.geo("dep-btn").deploy).toBe(true);
    expect(screen.queryByTestId("ui-overlay")).toBeNull();
  });
});

