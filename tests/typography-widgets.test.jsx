import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { UI, UIProvider, useUILayout, useUIElement } from "@devcrish/headwind";

// â”€â”€â”€ Helpers (copied from library.test.jsx, not imported) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function setup(children, { config, deploy = false } = {}) {
  let api;
  function Probe() { api = useUILayout(); return null; }
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Heading
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
describe("Heading", () => {
  it("renders with no layout props and gets its own default size (360x48)", () => {
    const t = setup(<UI.Heading id="h1" />);
    expect(t.geo("h1").size).toEqual({ width: 360, height: 48 });
  });

  it("renders an h2 by default and shows the text", () => {
    setup(<UI.Heading id="h" text="Hello World" />);
    const el = document.querySelector("h2");
    expect(el).toBeTruthy();
    expect(el.textContent).toBe("Hello World");
  });

  it("renders the correct heading level when specified", () => {
    setup(<UI.Heading id="h" text="Title" level={1} />);
    expect(document.querySelector("h1")).toBeTruthy();
    expect(document.querySelector("h1").textContent).toBe("Title");
  });

  it("falls back to h2 for an invalid level", () => {
    setup(<UI.Heading id="h" text="Fallback" level={99} />);
    expect(document.querySelector("h2")).toBeTruthy();
    expect(document.querySelector("h2").textContent).toBe("Fallback");
  });

  it("auto-placement gives it a real, non-overlapping position", () => {
    const t = setup(<><UI.Heading id="a" /><UI.Heading id="b" /></>);
    const a = t.geo("a"), b = t.geo("b");
    expect(Number.isFinite(a.position.x) && Number.isFinite(a.position.y)).toBe(true);
    expect(b.position.y).toBeGreaterThanOrEqual(a.position.y + a.size.height);
  });

  it("position={{ x }} only keeps y automatic", () => {
    const t = setup(<UI.Heading id="h" position={{ x: 400 }} />);
    expect(t.geo("h").position.x).toBe(400);
    expect(Number.isFinite(t.geo("h").position.y)).toBe(true);
  });

  it("isDraggable={false} blocks dragging", () => {
    const t = setup(<UI.Heading id="h" position={{ x: 50, y: 60 }} isDraggable={false} />);
    drag(t.widget("h"), 30, 30);
    expect(t.geo("h").position).toEqual({ x: 50, y: 60 });
  });

  it("isResizable={false} removes the resize handles", () => {
    const t = setup(<UI.Heading id="h" position={{ x: 50, y: 60 }} isResizable={false} />);
    fireEvent.pointerDown(t.widget("h"));
    expect(screen.queryByTestId("ui-handle-se")).toBeNull();
  });

  it("deploy hides tools and ignores drag", () => {
    const t = setup(<UI.Heading id="h" text="Stay" position={{ x: 74, y: 32 }} deploy />);
    drag(t.widget("h"), 50, 50);
    expect(t.geo("h").position).toEqual({ x: 74, y: 32 });
    expect(screen.queryByTestId("ui-overlay")).toBeNull();
  });

  it("changing text does not change position or size", () => {
    const t = setup(<UI.Heading id="h" text="one" position={{ x: 50, y: 60 }} />);
    drag(t.widget("h"), 25, 25);
    const pos = { ...t.geo("h").position };
    t.rerender(<UI.Heading id="h" text="two" position={{ x: 50, y: 60 }} />);
    expect(t.geo("h").position).toEqual(pos);
  });

  it("applies color and textAlign props", () => {
    setup(<UI.Heading id="h" text="Styled" color="#ff0000" textAlign="center" />);
    const el = document.querySelector("h2");
    expect(el.style.color).toBe("rgb(255, 0, 0)");
    expect(el.style.textAlign).toBe("center");
  });

  it("renders backend HTML text literally as plain text", () => {
    setup(<UI.Heading id="h" text="<script>alert('xss')</script>" />);
    expect(screen.getByText("<script>alert('xss')</script>")).toBeTruthy();
    expect(document.querySelector("script")).toBeNull();
  });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Paragraph
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
describe("Paragraph", () => {
  it("renders with no layout props and gets its own default size (400x100)", () => {
    const t = setup(<UI.Paragraph id="p1" />);
    expect(t.geo("p1").size).toEqual({ width: 400, height: 100 });
  });

  it("renders a <p> tag with the text", () => {
    setup(<UI.Paragraph id="p" text="Hello paragraph" />);
    const el = document.querySelector("p");
    expect(el).toBeTruthy();
    expect(el.textContent).toBe("Hello paragraph");
  });

  it("auto-placement gives it a real, non-overlapping position", () => {
    const t = setup(<><UI.Paragraph id="a" /><UI.Paragraph id="b" /></>);
    const a = t.geo("a"), b = t.geo("b");
    expect(b.position.y).toBeGreaterThanOrEqual(a.position.y + a.size.height);
  });

  it("position={{ x }} only keeps y automatic", () => {
    const t = setup(<UI.Paragraph id="p" position={{ x: 200 }} />);
    expect(t.geo("p").position.x).toBe(200);
    expect(Number.isFinite(t.geo("p").position.y)).toBe(true);
  });

  it("isDraggable={false} blocks dragging", () => {
    const t = setup(<UI.Paragraph id="p" position={{ x: 50, y: 60 }} isDraggable={false} />);
    drag(t.widget("p"), 30, 30);
    expect(t.geo("p").position).toEqual({ x: 50, y: 60 });
  });

  it("deploy hides tools and ignores drag", () => {
    const t = setup(<UI.Paragraph id="p" text="Stay" position={{ x: 74, y: 32 }} deploy />);
    drag(t.widget("p"), 50, 50);
    expect(t.geo("p").position).toEqual({ x: 74, y: 32 });
  });

  it("changing text does not change position or size", () => {
    const t = setup(<UI.Paragraph id="p" text="one" position={{ x: 50, y: 60 }} />);
    const size = { ...t.geo("p").size };
    t.rerender(<UI.Paragraph id="p" text="two" position={{ x: 50, y: 60 }} />);
    expect(t.geo("p").size).toEqual(size);
  });

  it("renders backend HTML text literally as plain text", () => {
    setup(<UI.Paragraph id="p" text="<b>bold</b>" />);
    expect(screen.getByText("<b>bold</b>")).toBeTruthy();
    expect(document.querySelector("b")).toBeNull();
  });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Label
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
describe("Label", () => {
  it("renders with no layout props and gets its own default size (160x32)", () => {
    const t = setup(<UI.Label id="l1" />);
    expect(t.geo("l1").size).toEqual({ width: 160, height: 32 });
  });

  it("renders a <label> tag with text", () => {
    setup(<UI.Label id="l" text="Username" />);
    const el = document.querySelector("label");
    expect(el).toBeTruthy();
    expect(el.textContent).toBe("Username");
  });

  it("shows required asterisk when required=true", () => {
    setup(<UI.Label id="l" text="Email" required />);
    const el = document.querySelector("label");
    expect(el.textContent).toContain("Email");
    expect(el.textContent).toContain("*");
  });

  it("sets htmlFor attribute", () => {
    setup(<UI.Label id="l" text="Name" htmlFor="name-input" />);
    expect(document.querySelector("label").getAttribute("for")).toBe("name-input");
  });

  it("auto-placement gives it a real, non-overlapping position", () => {
    const t = setup(<><UI.Label id="a" /><UI.Label id="b" /></>);
    const a = t.geo("a"), b = t.geo("b");
    expect(b.position.y).toBeGreaterThanOrEqual(a.position.y + a.size.height);
  });

  it("isDraggable={false} blocks dragging", () => {
    const t = setup(<UI.Label id="l" position={{ x: 50, y: 60 }} isDraggable={false} />);
    drag(t.widget("l"), 30, 30);
    expect(t.geo("l").position).toEqual({ x: 50, y: 60 });
  });

  it("deploy hides tools and ignores drag", () => {
    const t = setup(<UI.Label id="l" text="Stay" position={{ x: 74, y: 32 }} deploy />);
    drag(t.widget("l"), 50, 50);
    expect(t.geo("l").position).toEqual({ x: 74, y: 32 });
  });

  it("changing text does not change position or size", () => {
    const t = setup(<UI.Label id="l" text="one" position={{ x: 50, y: 60 }} />);
    const size = { ...t.geo("l").size };
    t.rerender(<UI.Label id="l" text="two" position={{ x: 50, y: 60 }} />);
    expect(t.geo("l").size).toEqual(size);
  });

  it("renders backend HTML text literally as plain text", () => {
    setup(<UI.Label id="l" text="<img src=x onerror=alert(1)>" />);
    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeTruthy();
  });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Badge
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
describe("Badge", () => {
  it("renders with no layout props and gets its own default size (80x28)", () => {
    const t = setup(<UI.Badge id="b1" />);
    expect(t.geo("b1").size).toEqual({ width: 80, height: 28 });
  });

  it("renders a <span> with the text", () => {
    setup(<UI.Badge id="b" text="New" />);
    expect(screen.getByText("New")).toBeTruthy();
    expect(screen.getByText("New").tagName).toBe("SPAN");
  });

  it("applies variant styling", () => {
    setup(<UI.Badge id="b" text="Success" variant="success" />);
    const el = screen.getByText("Success");
    expect(el.style.color).toBeTruthy();
    expect(el.style.background).toBeTruthy();
  });

  it("falls back to default variant for unknown value", () => {
    setup(<UI.Badge id="b" text="Unknown" variant="nonexistent" />);
    expect(screen.getByText("Unknown")).toBeTruthy();
  });

  it("color and backgroundColor props override variant", () => {
    setup(<UI.Badge id="b" text="Custom" color="#fff" backgroundColor="#000" />);
    const el = screen.getByText("Custom");
    expect(el.style.color).toBe("rgb(255, 255, 255)");
    expect(el.style.background).toBe("rgb(0, 0, 0)");
  });

  it("auto-placement gives it a real, non-overlapping position", () => {
    const t = setup(<><UI.Badge id="a" /><UI.Badge id="b" /></>);
    const a = t.geo("a"), b = t.geo("b");
    expect(b.position.y).toBeGreaterThanOrEqual(a.position.y + a.size.height);
  });

  it("isDraggable={false} blocks dragging", () => {
    const t = setup(<UI.Badge id="b" position={{ x: 50, y: 60 }} isDraggable={false} />);
    drag(t.widget("b"), 30, 30);
    expect(t.geo("b").position).toEqual({ x: 50, y: 60 });
  });

  it("deploy hides tools and ignores drag", () => {
    const t = setup(<UI.Badge id="b" text="Stay" position={{ x: 74, y: 32 }} deploy />);
    drag(t.widget("b"), 50, 50);
    expect(t.geo("b").position).toEqual({ x: 74, y: 32 });
  });

  it("changing text does not change position or size", () => {
    const t = setup(<UI.Badge id="b" text="one" position={{ x: 50, y: 60 }} />);
    const size = { ...t.geo("b").size };
    t.rerender(<UI.Badge id="b" text="two" position={{ x: 50, y: 60 }} />);
    expect(t.geo("b").size).toEqual(size);
  });

  it("renders backend HTML text literally as plain text", () => {
    setup(<UI.Badge id="b" text="<b>hi</b>" />);
    expect(screen.getByText("<b>hi</b>")).toBeTruthy();
  });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// RichText
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
describe("RichText", () => {
  it("renders with no layout props and gets its own default size (400x100)", () => {
    const t = setup(<UI.RichText id="r1" />);
    expect(t.geo("r1").size).toEqual({ width: 400, height: 100 });
  });

  it("renders bold text with **markers**", () => {
    setup(<UI.RichText id="r" text="**bold text**" />);
    const strong = document.querySelector("strong");
    expect(strong).toBeTruthy();
    expect(strong.textContent).toBe("bold text");
  });

  it("renders italic text with *markers*", () => {
    setup(<UI.RichText id="r" text="*italic text*" />);
    const em = document.querySelector("em");
    expect(em).toBeTruthy();
    expect(em.textContent).toBe("italic text");
  });

  it("renders strikethrough with ~~markers~~", () => {
    setup(<UI.RichText id="r" text="~~deleted~~" />);
    const s = document.querySelector("s");
    expect(s).toBeTruthy();
    expect(s.textContent).toBe("deleted");
  });

  it("renders inline code with `markers`", () => {
    setup(<UI.RichText id="r" text="`code`" />);
    const code = document.querySelector("code");
    expect(code).toBeTruthy();
    expect(code.textContent).toBe("code");
  });

  it("renders newlines as line breaks", () => {
    setup(<UI.RichText id="r" text={"line1\nline2"} />);
    const brs = document.querySelectorAll("br");
    expect(brs.length).toBeGreaterThanOrEqual(1);
  });

  it("auto-placement gives it a real, non-overlapping position", () => {
    const t = setup(<><UI.RichText id="a" /><UI.RichText id="b" /></>);
    const a = t.geo("a"), b = t.geo("b");
    expect(b.position.y).toBeGreaterThanOrEqual(a.position.y + a.size.height);
  });

  it("isDraggable={false} blocks dragging", () => {
    const t = setup(<UI.RichText id="r" position={{ x: 50, y: 60 }} isDraggable={false} />);
    drag(t.widget("r"), 30, 30);
    expect(t.geo("r").position).toEqual({ x: 50, y: 60 });
  });

  it("deploy hides tools and ignores drag", () => {
    const t = setup(<UI.RichText id="r" text="Stay" position={{ x: 74, y: 32 }} deploy />);
    drag(t.widget("r"), 50, 50);
    expect(t.geo("r").position).toEqual({ x: 74, y: 32 });
  });

  it("changing text does not change position or size", () => {
    const t = setup(<UI.RichText id="r" text="one" position={{ x: 50, y: 60 }} />);
    const size = { ...t.geo("r").size };
    t.rerender(<UI.RichText id="r" text="two" position={{ x: 50, y: 60 }} />);
    expect(t.geo("r").size).toEqual(size);
  });

  it("does not inject HTML tags from backend data", () => {
    setup(<UI.RichText id="r" text="<script>alert(1)</script>" />);
    expect(document.querySelector("script")).toBeNull();
  });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Icon
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
describe("Icon", () => {
  it("renders with no layout props and gets its own default size (40x40)", () => {
    const t = setup(<UI.Icon id="i1" />);
    expect(t.geo("i1").size).toEqual({ width: 40, height: 40 });
  });

  it("renders an SVG element", () => {
    setup(<UI.Icon id="i" name="star" />);
    const svg = document.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  it("applies color to the SVG stroke", () => {
    setup(<UI.Icon id="i" name="heart" color="#ff0000" />);
    const svg = document.querySelector("svg");
    expect(svg.getAttribute("stroke")).toBe("#ff0000");
  });

  it("falls back to star icon for unknown name", () => {
    setup(<UI.Icon id="i" name="nonexistent" />);
    const svg = document.querySelector("svg");
    expect(svg).toBeTruthy(); // still renders with fallback
  });

  it("auto-placement gives it a real, non-overlapping position", () => {
    const t = setup(<><UI.Icon id="a" /><UI.Icon id="b" /></>);
    const a = t.geo("a"), b = t.geo("b");
    expect(b.position.y).toBeGreaterThanOrEqual(a.position.y + a.size.height);
  });

  it("isDraggable={false} blocks dragging", () => {
    const t = setup(<UI.Icon id="i" position={{ x: 50, y: 60 }} isDraggable={false} />);
    drag(t.widget("i"), 30, 30);
    expect(t.geo("i").position).toEqual({ x: 50, y: 60 });
  });

  it("isResizable={false} removes the resize handles", () => {
    const t = setup(<UI.Icon id="i" position={{ x: 50, y: 60 }} isResizable={false} />);
    fireEvent.pointerDown(t.widget("i"));
    expect(screen.queryByTestId("ui-handle-se")).toBeNull();
  });

  it("deploy hides tools and ignores drag", () => {
    const t = setup(<UI.Icon id="i" name="check" position={{ x: 74, y: 32 }} deploy />);
    drag(t.widget("i"), 50, 50);
    expect(t.geo("i").position).toEqual({ x: 74, y: 32 });
  });

  it("changing name does not change position or size", () => {
    const t = setup(<UI.Icon id="i" name="star" position={{ x: 50, y: 60 }} />);
    const pos = { ...t.geo("i").position };
    t.rerender(<UI.Icon id="i" name="heart" position={{ x: 50, y: 60 }} />);
    expect(t.geo("i").position).toEqual(pos);
  });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Img
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
describe("Img", () => {
  it("renders with no layout props and gets its own default size (300x200)", () => {
    const t = setup(<UI.Img id="img1" />);
    expect(t.geo("img1").size).toEqual({ width: 300, height: 200 });
  });

  it("shows placeholder when no src is provided", () => {
    setup(<UI.Img id="img" />);
    expect(screen.getByText("No image")).toBeTruthy();
  });

  it("shows custom placeholder text", () => {
    setup(<UI.Img id="img" text="Upload an image" />);
    expect(screen.getByText("Upload an image")).toBeTruthy();
  });

  it("renders an img tag when src is provided", () => {
    setup(<UI.Img id="img" src="https://example.com/photo.jpg" alt="Photo" />);
    const img = document.querySelector("img");
    expect(img).toBeTruthy();
    expect(img.getAttribute("src")).toBe("https://example.com/photo.jpg");
    expect(img.getAttribute("alt")).toBe("Photo");
  });

  it("renders from base64 data + mimeType", () => {
    setup(<UI.Img id="img" data="iVBOR" mimeType="image/png" />);
    const img = document.querySelector("img");
    expect(img).toBeTruthy();
    expect(img.getAttribute("src")).toBe("data:image/png;base64,iVBOR");
  });

  it("shows loading state", () => {
    setup(<UI.Img id="img" loading />);
    expect(screen.getByText("Loadingâ€¦")).toBeTruthy();
  });

  it("shows error state", () => {
    setup(<UI.Img id="img" error />);
    expect(screen.getByText("Failed to load image")).toBeTruthy();
  });

  it("shows custom error text", () => {
    setup(<UI.Img id="img" error errorText="Image not found" />);
    expect(screen.getByText("Image not found")).toBeTruthy();
  });

  it("auto-placement gives it a real, non-overlapping position", () => {
    const t = setup(<><UI.Img id="a" /><UI.Img id="b" /></>);
    const a = t.geo("a"), b = t.geo("b");
    expect(b.position.y).toBeGreaterThanOrEqual(a.position.y + a.size.height);
  });

  it("isDraggable={false} blocks dragging", () => {
    const t = setup(<UI.Img id="img" position={{ x: 50, y: 60 }} isDraggable={false} />);
    drag(t.widget("img"), 30, 30);
    expect(t.geo("img").position).toEqual({ x: 50, y: 60 });
  });

  it("isResizable={false} removes the resize handles", () => {
    const t = setup(<UI.Img id="img" position={{ x: 50, y: 60 }} isResizable={false} />);
    fireEvent.pointerDown(t.widget("img"));
    expect(screen.queryByTestId("ui-handle-se")).toBeNull();
  });

  it("deploy hides tools and ignores drag", () => {
    const t = setup(<UI.Img id="img" src="https://example.com/photo.jpg" position={{ x: 74, y: 32 }} deploy />);
    drag(t.widget("img"), 50, 50);
    expect(t.geo("img").position).toEqual({ x: 74, y: 32 });
  });

  it("changing src does not change position or size", () => {
    const t = setup(<UI.Img id="img" src="https://example.com/a.jpg" position={{ x: 50, y: 60 }} />);
    const size = { ...t.geo("img").size };
    t.rerender(<UI.Img id="img" src="https://example.com/b.jpg" position={{ x: 50, y: 60 }} />);
    expect(t.geo("img").size).toEqual(size);
  });

  it("rejects javascript: URLs", () => {
    setup(<UI.Img id="img" src="javascript:alert(1)" />);
    expect(document.querySelector("img")).toBeNull(); // should show placeholder
    expect(screen.getByText("No image")).toBeTruthy();
  });

  it("renders backend text as plain text in placeholder", () => {
    setup(<UI.Img id="img" text="<b>evil</b>" />);
    expect(screen.getByText("<b>evil</b>")).toBeTruthy();
    expect(document.querySelector("b")).toBeNull();
  });
});

