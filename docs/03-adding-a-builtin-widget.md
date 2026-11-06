# 3. Adding a New Built-in Widget to the Library

This guide shows how to add a widget such as `UI.Heading` **inside the library** so that it is available as `UI.Heading` for every user. It is purely additive: it uses the public `createWidget` function and edits only `src/index.js` (adding lines). **No frozen file is touched** (see `DEVELOPMENT_RULES.md`).

> The `Heading` code below is an **illustrative example** that was checked to work with the engine. It has **not** been added to the library.

## 3.1 What you get for free

Every widget made with `createWidget` automatically has: default size and auto position, partial `position`/`size` overrides, `isDraggable`/`isResizable`/`deploy`/`hidden`/`solid`, global provider defaults, master panel switches, drag + 8 resize handles, hover/select overlay, geometry callbacks, `useUIElement(id)` support, JSON/JSX export (including its prop reference), and deploy-mode behaviour. **You write only what is inside the box.**

## 3.2 Steps

### Step 1: Decide the widget contract
Write down before coding:
- `type` string (PascalCase, equals the component name, unique): `"Heading"`.
- Default size: `{ width, height }` appropriate for the widget (do not rely on the 240 x 80 fallback unless it really fits).
- Content props with defaults (see section 3.5 for naming conventions).
- States: loading / empty / error / disabled where relevant.
- Security: how backend data is rendered safely.

### Step 2: Create the file `src/widgets/Heading.jsx`

```jsx
import { createWidget } from "../createWidget.jsx";

const LEVELS = [1, 2, 3, 4, 5, 6];

// The render component: it only draws the inside of the box.
// It must fill the box (width/height 100%) and must NOT position itself.
function HeadingContent({
  text, children, level = 2, color = "#111827", fontSize, fontWeight = 700,
  fontFamily = "system-ui, -apple-system, Segoe UI, sans-serif", textAlign = "left",
  style, className,
}) {
  const safeLevel = LEVELS.includes(level) ? level : 2;      // allow-list, never trust data
  const Tag = `h${safeLevel}`;
  const defaultSizes = { 1: 32, 2: 26, 3: 22, 4: 18, 5: 16, 6: 14 };
  return (
    <Tag
      className={className}
      style={{
        margin: 0, width: "100%", height: "100%", boxSizing: "border-box",
        color, fontWeight, fontFamily, textAlign, lineHeight: 1.25,
        fontSize: fontSize ?? defaultSizes[safeLevel],
        ...style,
      }}
    >
      {children ?? text ?? "Heading"}   {/* plain text node: safe for backend data */}
    </Tag>
  );
}

export const Heading = createWidget({
  type: "Heading",
  builtIn: true,                                  // REQUIRED for built-ins: JSX export prints <UI.Heading ... />
  defaults: { size: { width: 360, height: 48 } }, // this widget's default size
  meta: {                                         // feeds the JSON export's reference block
    description: "A semantic heading (h1 to h6). Backend text is shown as plain text.",
    props: {
      text:      { type: "string", default: '"Heading"', description: "The words to show. You can also pass children." },
      level:     { type: "1 | 2 | 3 | 4 | 5 | 6", default: 2, description: "Which HTML heading tag to use (h1 to h6)." },
      color:     { type: "string (CSS color)", default: '"#111827"', description: "Text color." },
      fontSize:  { type: "number | string", default: "from level", description: "Override the size." },
      fontWeight:{ type: "number | string", default: 700, description: "Weight." },
      textAlign: { type: '"left" | "center" | "right"', default: '"left"', description: "Alignment." },
      style:     { type: "object", default: "{}", description: "Extra inline styles." },
      className: { type: "string", default: "", description: "Extra CSS class." },
    },
  },
  render: HeadingContent,
});
```

### Step 3: Export it (additive edit to `src/index.js`)

`src/index.js` today:

```js
import { Canvas } from "./Canvas.jsx";
import { Text } from "./widgets/Text.jsx";
import { Button } from "./widgets/Button.jsx";
import { ExportPanel } from "./components/ExportPanel.jsx";
import { MasterPanel } from "./components/MasterPanel.jsx";

export const UI = { Canvas, Text, Button, ExportPanel, MasterPanel };
export { Canvas, Text, Button, ExportPanel, MasterPanel };
```

Add (do not remove or rename anything):

```js
import { Heading } from "./widgets/Heading.jsx";                       // + new line
export const UI = { Canvas, Text, Button, ExportPanel, MasterPanel, Heading };  // + append to the object
export { Canvas, Text, Button, ExportPanel, MasterPanel, Heading };    // + append to the named exports
```

### Step 4: Write tests in a NEW file `tests/heading.test.jsx`
Copy the `setup` / `drag` helpers from `tests/library.test.jsx` into your new file (do not edit the original). Minimum cases:

```jsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { UI, UIProvider, useUILayout } from "@devcrish/headwind";

describe("Heading", () => {
  it("renders with no layout props, with its own default size and the right tag", () => {
    let api; const Probe = () => { api = useUILayout(); return null; };
    render(<UIProvider><UI.Canvas><UI.Heading text="Hi" level={1} /><Probe /></UI.Canvas></UIProvider>);
    expect(document.querySelector("h1").textContent).toBe("Hi");
    expect(api.elements[0].size).toEqual({ width: 360, height: 48 });
  });
  // + auto placement does not overlap, x-only keeps y automatic, isDraggable/isResizable/deploy,
  //   content change keeps position/size, unknown level falls back to h2, "<b>x</b>" shows literally.
});
```

### Step 5: Run everything
```bash
npm test             # all existing tests (68) + your new ones must pass
npm run build:lib    # must succeed
npm run dev          # look at it in the example app (add a demo in a NEW example file)
```

### Step 6: Documentation
Update `docs/01-capabilities.md` (widget table), the catalog below (section 3.9), and the top-level `README.md`.

---

## 3.3 Rules for the render component

1. It receives **all non-layout props** as its props, plus a `widget` prop: `{ id, position: {x,y}, size: {width,height}, editable }`. Use `widget.size` if you need to react to the box size (for example charts). Do not use `widget` to move things.
2. **Fill the box**: `width: "100%"`, `height: "100%"`, `boxSizing: "border-box"`. The wrapper's inner div is `overflow: hidden`, so content larger than the box is clipped.
3. **Never** set `position`, `left`, `top`, `width`, `height` in pixels on the root element; layout belongs to the wrapper.
4. Do not use these names as content props: `id`, `position`, `size`, `isDraggable`, `isResizable`, `deploy`, `hidden`, `solid`, `onPositionChange`, `onSizeChange`, `onLayoutChange`, `widget`. The wrapper consumes the first group; `widget` is overwritten by the wrapper.
5. Hooks inside the render component are fine (it is a normal React component; `Clock` uses `useState`/`useEffect`).
6. Floating UI (dropdown menus, tooltips, popovers, date pickers, modals) will be **clipped** by the wrapper's `overflow: hidden`. Render them through a React portal into `document.body`. See `07-pitfalls-and-gotchas.md` section 5.
7. Controls that use pointer drags internally (sliders, color pickers, text selection in inputs) will also start a layout drag in edit mode. See `07-pitfalls-and-gotchas.md` section 4 for the mitigation.

## 3.4 Rules for `defaults`

`defaults` accepts any layout prop; normally just `size`:

```js
defaults: { size: { width: 140, height: 44 } }               // typical
defaults: { size: { width: 480, height: 320 }, isResizable: true }
```

They sit **above** the library defaults and **below** provider config and props (precedence: library -> widget -> provider -> props). Do not set `position` in widget defaults; auto placement should decide.

## 3.5 Content prop naming conventions (match `Text` and `Button`)

| Concern | Prop name |
|---------|-----------|
| Words | `text` (and `children` as an alternative; `children ?? text ?? fallback`) |
| Text color / background | `color`, `backgroundColor` |
| Variants | `variant` with an allow-list and a fallback |
| States | `disabled`, `loading` (add `error`, `empty` where relevant) |
| Escape hatch | `style` (merged last), `className` |
| Semantic tag | `as` (allow-list only) |
| Handlers | `onClick`, `onChange`, ... standard React names |

Always provide **defaults for every content prop** so `<UI.Foo />` renders something useful with zero props.

### 3.5.1 Flat Props vs. Nested Properties (Socket.IO Compatibility)
- **Prefer Flat Props**: Expose widget properties at the root level (e.g. `title="Stats"`, `count={42}`, `theme="dark"`) instead of grouping them inside nested objects (`config={{ title: "Stats", count: 42 }}`).
- **Why**: Real-time Socket.IO updates (`applySocketUpdates`) perform a 1-level shallow merge. With flat props, backend updates can change a single property (`count: 43`) without erasing untouched sibling properties.
- **Handling Nested Objects**: If nested objects are strictly required (e.g. chart configurations, series data), deeply merge incoming props with defaults **inside the widget's render component**, or require the backend to always emit the complete nested object.


## 3.6 `meta` is documentation, not behaviour

`meta.description` and `meta.props` are embedded into the JSON export (`reference.contentProps`). They do not validate or change anything at runtime. Keep them accurate; a future AI uses them to understand the widget.

## 3.7 Data-driven widgets (metrics, charts, tables)

- Accept data via props and re-render when it changes. **Never hard-code sample data in the widget.**
- Provide `loading`, `empty`, `error` states.
- Use an established library for hard rendering (charts, maps) in a **separate file** with the dependency declared as an **optional peer dependency**. Do not import it from `src/index.js` unconditionally if that would force every user to install it; add a separate entry point (see `DEVELOPMENT_RULES.md` section 6).
- Make the chart fill `widget.size` (or `100%`). Pass the size down; do not hard-code.
- Stop chart interaction pointer events from starting layout drags (section 3.3 rule 7).

## 3.8 Common mistakes when adding a widget

| Mistake | Result |
|---------|--------|
| Forgetting `builtIn: true` | JSX export prints `<Heading .../>` instead of `<UI.Heading .../>`. |
| Calling `createWidget` inside a component | A new component type per render: remount every render, lost state. |
| Reusing a `type` string already in use | The registry entry (docs/export reference) is overwritten; auto ids share a counter. |
| Using `width`/`height` as content props | Collides in meaning with layout `size`; confusing and unsupported. |
| Setting a fixed pixel size on the root element | Widget cannot be resized visually; content clipped. |
| Not exporting from `index.js` | Widget not available as `UI.Name`. |
| Editing `Text.jsx` to "add a feature" | Violates the rules; create a new widget. |

## 3.9 Widget catalog (update when you add widgets)

| Widget | File | Default size | Added in |
|--------|------|--------------|----------|
| `UI.Text` | `src/widgets/Text.jsx` | 240 x 40 | 0.1.0 |
| `UI.Button` | `src/widgets/Button.jsx` | 140 x 44 | 0.1.0 |
| `UI.ParentPanel` | `src/widgets/ParentPanel.jsx` | 800 x 500 | 0.2.0 |
| UI.Heading | src/widgets/Heading.jsx | 360 x 48 | 1.2.0 |
| UI.Paragraph | src/widgets/Paragraph.jsx | 400 x 100 | 1.2.0 |
| UI.Label | src/widgets/Label.jsx | 160 x 32 | 1.2.0 |
| UI.Badge | src/widgets/Badge.jsx | 80 x 28 | 1.2.0 |
| UI.RichText | src/widgets/RichText.jsx | 400 x 100 | 1.2.0 |
| UI.Icon | src/widgets/Icon.jsx | 40 x 40 | 1.2.0 |
| UI.Img | src/widgets/Img.jsx | 300 x 200 | 1.2.0 |
| UI.Divider | src/widgets/Divider.jsx | 300 x 12 | 1.2.1 |

## 3.10 Checklist

- [ ] New file in `src/widgets/`, one widget per file, created with `createWidget` at module top level
- [ ] `builtIn: true`, unique `type`, sensible `defaults.size`, accurate `meta`
- [ ] Defaults for all content props; allow-lists for tags/variants; plain-text rendering
- [ ] Root element fills the box; no layout props used as content props
- [ ] `src/index.js` edited by **adding** the import and appending to both export lines
- [ ] New test file; all 68 existing tests unchanged and passing; `npm run build:lib` passes
- [ ] Docs updated
