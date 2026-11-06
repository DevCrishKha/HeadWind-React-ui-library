# 4. Creating a Custom Widget with `createWidget`

Use this when **you, as an app developer**, have your own React component and want it to behave like a library widget: auto-positioned, draggable, resizable, inspectable, exportable and deployable. You do **not** modify the library.

## 4.1 The idea

`createWidget` wraps a normal React component ("the render component") in the shared layout engine. You write only the inside of the box; the engine supplies the outside.

```
createWidget({ type, defaults, meta, render })
        |
        v
   <Widget id position size isDraggable isResizable deploy on*Change ...content />
        |  engine: merge defaults, place, drag, resize, overlay, deploy, export
        v
   <render {...content} widget={{ id, position, size, editable }} />   <- your component
```

## 4.2 Minimal example

```jsx
import { createWidget } from "@devcrish/headwind";

function ClockContent({ prefix = "Time: " }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ height: "100%", display: "grid", placeItems: "center",
                  background: "#0f172a", color: "#e2e8f0", borderRadius: 8 }}>
      {prefix}{now.toLocaleTimeString()}
    </div>
  );
}

// Module top level, once:
export const Clock = createWidget({
  type: "Clock",
  defaults: { size: { width: 200, height: 56 } },
  meta: {
    description: "My own custom widget: a live clock.",
    props: { prefix: { type: "string", default: '"Time: "', description: "Text before the time." } },
  },
  render: ClockContent,
});
```

Use it like any widget (must be inside `<UI.Canvas>` or `<UIProvider>`):

```jsx
<UI.Canvas>
  <Clock />                                   {/* defaults, auto position */}
  <Clock id="clock-2" position={{ x: 400 }} prefix="Now: " isResizable={false} />
</UI.Canvas>
```

This exact pattern is in `example/Clock.jsx`.

## 4.3 Options

| Option | Required | Meaning |
|--------|----------|---------|
| `type` | **yes** | Unique name string. Used for auto ids (`clock-1`), data attributes (`data-ui-widget`), the export, the registry. Use PascalCase and the same name as your exported component. |
| `render` | **yes** | React component for the inside. Receives all content props + `widget`. |
| `defaults` | no | Layout defaults for this widget, normally `{ size: { width, height } }`. Sits above library defaults, below provider config and props. |
| `meta` | no | `{ description, props, hooks? }` documentation embedded in the JSON export so humans/AI know how to use the widget. Not validated. |
| `builtIn` | no | Leave unset (`false`) in apps. `true` is only for widgets shipped inside the library (changes the JSX export tag to `UI.Type`). |

Returns a React component with static fields `Widget.widgetType`, `Widget.meta`, `Widget.displayName = "UI.<type>"`.

## 4.4 What the render component receives

```jsx
function MyContent({ /* your content props */, widget }) {
  // widget = { id, position: { x, y }, size: { width, height }, editable }
}
```

- `widget.size` is live: use it for things that depend on the box size (charts, canvases).
- `widget.editable` is `true` in edit mode, `false` when the page or widget is deployed or hidden. Use it to, for example, show a placeholder only while editing.
- Do **not** try to change layout through `widget`; it is read-only information.
- The component re-renders whenever the widget moves or resizes (the `widget` prop is a new object). Keep it light or wrap heavy children in `React.memo`.

## 4.5 Layout props your custom widget automatically supports (including `hidden` and `solid`)

`id`, `position`, `size`, `isDraggable`, `isResizable`, `deploy`, `hidden`, `solid`, `onPositionChange`, `onSizeChange`, `onLayoutChange`. All partial-override and precedence rules from `01-capabilities.md` apply identically.

## 4.6 Using backend data and state

Content props are ordinary React props, so state/hooks/backend data work normally:

```jsx
function WeatherCard({ weather }) {
  return <MyMetric id="weather" label={weather.location} value={weather.temperature} />;
}
```

Changing `value` re-renders the content only. Position and size are not reset (they live in the store). Treat backend values as **data**: render them as text, validate URLs, never build components or run code from them.

## 4.7 Getting the geometry of your custom widget

Same as any widget:

```jsx
const g = useUIElement("clock-2");   // { position: {x,y}, size: {width,height}, ... }
<Clock id="clock-2" onLayoutChange={({ position, size }) => save(position, size)} />
```

Give custom widgets that you read from hooks an explicit `id`.

## 4.8 Hardcoding and deploying

After tuning, use **Copy JSX** from the Export panel. For a custom widget the exported tag is the bare type name (`<Clock id="clock-2" position={{...}} size={{...}} />`), so your component variable must be named exactly like its `type` (here `Clock`), or you rename it in the pasted code. Then add `deploy` or use `<UI.Canvas deploy>`.

## 4.9 Rules and gotchas specific to custom widgets

1. **Call `createWidget` at module top level**, once. Never inside a component, hook, or loop. Doing so creates a new component type on every render, which remounts the widget and loses its state and drag position.
2. **`type` must be unique.** Two widgets with the same `type` share one registry entry (the later one wins for documentation) and one auto-id counter.
3. **Reserved content prop names:** `id`, `position`, `size`, `isDraggable`, `isResizable`, `deploy`, `hidden`, `solid`, `onPositionChange`, `onSizeChange`, `onLayoutChange`, and `widget`. Pick other names.
4. **Fill the box:** root element `width: 100%`, `height: 100%`. Content larger than the box is clipped (the wrapper inner div is `overflow: hidden`).
5. **Popups are clipped.** Dropdowns, tooltips, popovers must use a portal.
6. **Inputs/sliders:** a pointer press inside the widget starts a layout drag in edit mode (after moving 4 px). Interactive-drag controls need special handling (see `07-pitfalls-and-gotchas.md` section 4).
7. **Styling the wrapper is not possible from props.** `style`/`className` that you pass go to **your render component** (as content props), not to the absolutely positioned wrapper. Style your own root element.
8. **Do not read DOM measurements for layout.** Use `widget.size` or `useUIElement`.
9. **Unmounting loses edited geometry.** If a widget is conditionally rendered and removed, its dragged position is discarded; when it comes back with the same `id`, it returns to its originally allocated spot (or to its `position`/`size` props). Hardcode the geometry or keep the widget mounted.
10. **Tests:** use the pattern in `tests/library.test.jsx` (render inside `UIProvider` + `UI.Canvas`, read geometry with `useUILayout`, simulate drags with `fireEvent.pointerDown/pointerMove/pointerUp` on the wrapper `[data-ui-id="..."]` and `window`).
