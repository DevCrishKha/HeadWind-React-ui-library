# 1. Capabilities and API Reference

Everything a developer can do with `@devcrish/headwind` today (v0.1.0), with the exact props, hooks and return shapes.

## 1.1 What the library gives you

| Capability | Summary |
|------------|---------|
| Zero-config widgets | `<UI.Text />`, `<UI.Button />` render immediately with a sensible size, style and automatic position. |
| Automatic placement | Widgets without a position are stacked down the canvas so they never overlap. The computed position is real and readable. |
| Visual layout editing | In the browser, drag a widget and resize it with 8 handles. |
| Live geometry inspection | Hover or select a widget to see an overlay with `x`, `y`, `width`, `height`, and flags. Numbers update while dragging. |
| Hardcoding workflow | Copy layout as JSON or as ready-to-paste JSX, paste into source, then `deploy`. |
| Partial overrides | Override `position.x` only, `size.width` only, `isDraggable` only; the rest is inherited. |
| Global defaults | `<UIProvider config={...}>` sets defaults for every widget. |
| Per-widget flags | `isDraggable`, `isResizable`, `deploy` on each widget, changeable at runtime via React state. |
| Page-level switches | `<UI.Canvas deploy>` and `<UI.MasterPanel />` (Dragging / Resizing / Deploy whole page). |
| Deploy mode | Removes overlay, handles, hover outline, drag; keeps geometry, content, styling and behaviour. |
| Callbacks | `onPositionChange`, `onSizeChange`, `onLayoutChange`. |
| Hooks | `useUIElement(id)`, `useUILayout()`, `useUIConfig()` for live geometry and state. |
| Hide a widget | `hidden` hides it without unmounting it or losing its geometry or state. |
| Solid widgets | `solid` makes a widget push others aside when it grows or appears, instead of covering them. |
| Data/layout separation | Changing text, value, color etc. never moves or resizes the widget. |
| Custom widgets | `createWidget()` turns any React component into a layout-aware widget with all of the above for free. |
| Full-page or fixed-box canvas | Edge-to-edge page canvas (default) or a scrolling box of fixed size. |
| Self-describing export | The JSON export embeds a reference of every layout prop, callback, content prop and hook so another developer or AI can understand the page. |
| Safe text | Text widgets render plain text nodes; backend strings cannot inject HTML. Only allow-listed HTML tags can be chosen. |
| Performance | Layout state is outside React state; dragging re-renders only the widget being moved (plus subscribers of that widget's data). |
| Packaging | ES + CJS build, React is a peer dependency, `sideEffects: false`. |

### Widgets shipped today

| Widget | Default size (w x h) | Purpose |
|--------|----------------------|---------|
| `UI.Text` | 240 x 40 | Configurable text. |
| `UI.Button` | 140 x 44 | Clickable button, variants, loading, disabled. |
| `UI.ParentPanel` | 800 x 500 | Container supporting nested, independently editable child widgets with configurable resize modes (clip, fixed, reflow). |
| `UI.Canvas` | n/a | The coordinate system (not a draggable widget). |
| `UI.MasterPanel` | n/a | Floating panel with three master switches. |
| `UI.ExportPanel` | n/a | Floating panel to copy JSON / JSX. |
| `UI.InspectorPanel` | n/a | Floating panel to inspect selected widget props, geometry and copy JSX. |
| `UI.WidgetListPanel` | n/a | Draggable, collapsible panel to view all widgets by ID and type, and toggle visibility via eye icon. |

Everything else in the original specification (Heading, Image, Metric, charts, tables, forms, navigation, maps, etc.) is **not built yet**. See `02-requirements-and-architecture.md`.

---

## 1.2 Exports (public API)

From `src/index.js`:

```js
import {
  UI,                          // { Canvas, Text, Button, ExportPanel, MasterPanel, InspectorPanel, useSocketUI }
  Canvas, Text, Button, ExportPanel, MasterPanel, InspectorPanel,   // named versions
  UIProvider,
  createWidget,
  useUIElement, useUILayout, useUIConfig, useSocketUI,
  getWidgetComponent,
  defaultUIConfig, mergeLayoutConfig,
  resolveSolid, SOLID_GAP,     // the push-aside function behind `solid` (advanced use)
} from "@devcrish/headwind";
```

---

## 1.3 `<UI.Canvas>`

The root coordinate system. All widget coordinates are pixels measured from the canvas's top-left corner (x grows right, y grows down).

```jsx
<UI.Canvas>...</UI.Canvas>                              // full page
<UI.Canvas width={800} height={400}>...</UI.Canvas>     // fixed scrolling box
<UI.Canvas deploy>...</UI.Canvas>                       // whole page deployed
```

| Prop | Type | Default | Meaning |
|------|------|---------|---------|
| `children` | node | | Widgets. |
| `width` | number \| string | `"100%"` in box mode | Giving `width` and/or `height` switches to **box mode**. |
| `height` | number \| string | `600` in box mode | Same. |
| `fullPage` | boolean | `true` if neither `width` nor `height` given | Force page or box mode. |
| `deploy` | boolean | `false` | Deploys the whole page (no editing tools anywhere). |
| `showGrid` | boolean | `true` | Dotted background grid while editing (hidden when deployed). |
| `background` | CSS color | `"#ffffff"` | Canvas background color. |
| `style` | object | | Extra styles; merged **after** the canvas's own layout styles, so it can override them. |
| `className` | string | | CSS class. |

If `<UI.Canvas>` is used **without** a surrounding `<UIProvider>`, it creates one automatically (with no global config). If one exists above it, the canvas uses it.

**Page mode** (default): the canvas is `position: absolute; top: 0; left: 0; width: 100%; min-height: 100dvh`. It grows to the lowest/rightmost widget so the page scrolls. It stays the same size before and after deploy.

**Box mode**: `position: relative`, the given size, `overflow: auto`.

---

## 1.4 `<UIProvider config>`

```jsx
<UIProvider config={{ isDraggable: true, isResizable: true, deploy: false }}>
  <UI.Canvas>...</UI.Canvas>
  <UI.MasterPanel />
  <UI.ExportPanel />
</UIProvider>
```

- Supplies global defaults (any of the layout props: `position`, `size`, `isDraggable`, `isResizable`, `deploy`).
- Owns the layout store. **One provider = one canvas.** For a second independent canvas, use a second `UIProvider`.
- `config` is optional.

---

## 1.5 Layout props (accepted by every widget)

| Prop | Type | Default | Meaning |
|------|------|---------|---------|
| `id` | string | auto: `"text-1"`, `"button-2"` ... | Name shown in overlay/export and used by `useUIElement(id)`. Give important widgets a stable explicit `id`. |
| `position` | `"auto"` \| `{ x?: number, y?: number }` | `"auto"` | Pixels from canvas top-left. Partial objects allowed; missing axis is automatic. |
| `size` | `{ width?: number, height?: number }` | per widget (Text 240x40, Button 140x44, fallback 240x80) | Pixels. Partial allowed. |
| `isDraggable` | boolean | `true` | Allow dragging in edit mode. |
| `isResizable` | boolean | `true` | Show resize handles in edit mode. |
| `deploy` | boolean | `false` | Hide editing tools for this widget. |
| `hidden` | boolean | `false` | Do not show the widget (see 1.13). |
| `solid` | boolean | `false` | Push overlapping widgets aside when this one grows or appears (see 1.13). |
| `onPositionChange` | `({x,y}) => void` | | Called when position changes. |
| `onSizeChange` | `({width,height}) => void` | | Called when size changes. |
| `onLayoutChange` | `({position,size}) => void` | | Called when either changes. |

All other props are **content props** and go to the widget's render component.

### Precedence (later wins)

1. `defaultUIConfig` (library) then the widget's own `defaults` (e.g. Button 140x44)
2. `<UIProvider config>`
3. The widget's props
4. Runtime switches from `MasterPanel` (can only switch dragging/resizing/deploy **off**)

### Editing rule

```
editable  = !pageDeployed && !widget.deploy
canDrag   = editable && isDraggable && master.isDraggable
canResize = editable && isResizable && master.isResizable
(editable is also false when the widget is `hidden`)
pageDeployed = <UI.Canvas deploy> OR MasterPanel "Deploy whole page"
```

A deployed page or widget can never become editable because a global switch is turned on.

---

## 1.6 `<UI.Text>`

| Prop | Type | Default |
|------|------|---------|
| `text` | string | `"Text"` (used when `text` and `children` are nullish) |
| `children` | node | takes priority over `text` |
| `color` | CSS color | `"#111827"` |
| `fontSize` | number \| string | `16` |
| `fontWeight` | number \| string | `400` |
| `fontFamily` | string | `system-ui, -apple-system, Segoe UI, sans-serif` |
| `textAlign` | `left` \| `center` \| `right` \| `justify` | `"left"` |
| `lineHeight` | number \| string | `1.4` |
| `overflow` | `wrap` \| `ellipsis` \| `clip` \| `scroll` | `"wrap"` |
| `as` | `div` `span` `p` `h1`-`h6` `label` | `"div"` (any other value falls back to `div`) |
| `style` | object | merged last; can override anything |
| `className` | string | |

Default size 240 x 40. Text is rendered as a React text node (no HTML execution).

## 1.7 `<UI.Button>`

| Prop | Type | Default |
|------|------|---------|
| `text` / `children` | string / node | `"Button"` |
| `variant` | `primary` `secondary` `outline` `ghost` `danger` | `"primary"` (unknown value falls back to primary) |
| `onClick` | `(event) => void` | |
| `disabled` | boolean | `false` |
| `loading` | boolean | `false` (shows "Loading..." and blocks clicks, sets `aria-busy`) |
| `type` | `button` `submit` `reset` | `"button"` |
| `color` | CSS color | from variant (text color override) |
| `backgroundColor` | CSS color | from variant |
| `style` | object | merged last |

Default size 140 x 44. A pointer press that moves less than 4 px is a click, so the button works in edit mode; a real drag does not trigger a click.

---

## 1.8 Panels

### `<UI.MasterPanel position="top-right" style />`
Fixed floating panel with three checkboxes: **Dragging**, **Resizing**, **Deploy whole page**.
- Dragging/Resizing OFF stops that action on every widget. ON does **not** override a widget's own `isDraggable={false}` / `isResizable={false}`.
- Deploy whole page hides all editing tools. The panel itself stays so you can switch back.
- If the canvas is deployed in code (`<UI.Canvas deploy>`), the panel hides itself.
- `position`: `"top-right"` (default), `"top-left"`, `"bottom-right"`, `"bottom-left"`.

### `<UI.ExportPanel style />`
Fixed bottom-right panel with **Copy layout JSON**, **Copy JSX**, **Preview**. Hidden automatically when the page is deployed.

### `<UI.InspectorPanel position="bottom-left" style />`
Fixed floating panel that shows the selected widget's live properties, geometry (`x`, `y`, `width`, `height`), layout flags (`isDraggable`, `isResizable`, `solid`, `hidden`, `deploy`), with a **Show JSX** toggle and **Copy JSX** button to hardcode the widget into React code. Hidden automatically when the page is deployed.
- `position`: `"bottom-left"` (default), `"bottom-right"`, `"top-left"`, `"top-right"`.

### `<UI.WidgetListPanel defaultPosition style />`
Draggable and collapsible panel that lists all widgets on the canvas by their `id` and `type`.
- **Toggle visibility**: Click the eye icon next to any widget to toggle its visibility (appear/disappear like in Blender).
- **Collapsible**: Collapses so only the title "Widget List" and the drag handle are visible to minimize screen space.
- **Draggable**: Drag by the header / drag handle to position the panel anywhere on the screen.
- **Select widget**: Click any widget row in the list to select it on the canvas.
- **Deploy**: Automatically disappears when the page is deployed (`<UI.Canvas deploy>` or MasterPanel deploy).
- `defaultPosition`: `{ x: 16, y: 70 }` (default) or custom `{ x, y }`.

All panels need to be inside a `<UIProvider>` or a `<UI.Canvas>` (they read the store from context).

---

## 1.9 Hooks

All hooks must be used inside a `<UIProvider>` or `<UI.Canvas>` (otherwise they throw `@devcrish/headwind: widgets and hooks must be used inside <UI.Canvas> or <UIProvider>.`).

### `useUIElement(id)`
```js
const g = useUIElement("heading");
// null until the widget has mounted, or if the id does not exist
// { id, type, position:{x,y}, size:{width,height}, isDraggable, isResizable, deploy, hidden, solid }
```
Live: the component re-renders as the widget moves or resizes. `isDraggable`/`isResizable`/`deploy` are the widget's own effective settings (not the master switches or page deploy).

### `useUILayout()`
```js
const {
  elements,          // array of geometry objects (same shape as useUIElement)
  selectedId,        // string | null
  select,            // select(id | null)
  pageDeployed,      // boolean (Canvas deploy OR master deploy)
  master,            // { isDraggable, isResizable, deploy }
  setMaster,         // setMaster({ isDraggable?, isResizable?, deploy? })
  exportGeometry,    // (options?) => object
  exportJSON,        // (options?) => string (pretty JSON)
  copyJSON,          // (options?) => Promise<boolean>
} = useUILayout();
```
`options`: `{ includeReference: false }` returns the short export without the documentation block. This hook re-renders on **every** store change (every drag frame). Use it in small components only.

### `useUIConfig()`
Returns the global defaults: `defaultUIConfig` merged with `<UIProvider config>` (`{ position, size, isDraggable, isResizable, deploy }`).

---

## 1.10 Geometry export (JSON)

```jsonc
{
  "library": "@devcrish/headwind",
  "exportedAt": "2026-10-23T08:59:00.000Z",
  "coordinateSystem": "Pixels. (0,0) is the top-left corner of the UI.Canvas. ...",
  "canvas": { "width": 1280, "height": 720 },
  "pageDeployed": false,
  "master": { "isDraggable": true, "isResizable": true, "deploy": false },
  "widgets": [
    {
      "id": "heading",
      "type": "Text",
      "idIsAuto": false,
      "geometry": { "position": { "x": 74, "y": 32 }, "size": { "width": 520, "height": 64 } },
      "settings": { "isDraggable": true, "isResizable": true, "deploy": false },
      "extras": { "hidden": false, "solid": false },
      "jsx": "<UI.Text id=\"heading\" position={{ x: 74, y: 32 }} size={{ width: 520, height: 64 }} />",
      "reference": { /* layoutProps, layoutPropsExtra (hidden, solid), layoutCallbacks, contentProps, hooks, description */ }
    }
  ],
  "availableWidgetTypes": [ { "type": "Text", "description": "...", "defaultSize": { "width": 240, "height": 40 } } ]
}
```

- `reference` and `availableWidgetTypes` are omitted with `{ includeReference: false }`.
- The `jsx` field and the panel's **Copy JSX** contain only `id` (if you gave one), `position` and `size`. Content props, `deploy` and other flags are **not** included; you add them yourself.
- The exported numbers are the live numbers on screen.

---

## 1.11 `createWidget(options)`

Turns a React component into a widget. Full guide: `04-custom-widgets-with-createWidget.md`.

```js
const Clock = createWidget({
  type: "Clock",                                   // required, unique name
  defaults: { size: { width: 200, height: 56 } },  // widget defaults (any layout prop)
  meta: { description: "...", props: { /* documentation of content props */ } },
  render: ClockContent,                            // React component for the inside
  builtIn: false,                                  // true only for components shipped inside this library
});
```

## 1.12 Merge helpers

- `defaultUIConfig`: `{ position: "auto", size: { width: 240, height: 80 }, isDraggable: true, isResizable: true, deploy: false, hidden: false, solid: false }`
- `mergeLayoutConfig(...layers)`: the same merger the widgets use. `undefined` never overrides; `position`/`size` merge per key; `position: "auto"` clears x and y.

---

## 1.13 `hidden` and `solid`

Two layout props accepted by **every** widget (built-in and `createWidget`). Both default to `false`, can be set globally in `<UIProvider config>`, overridden per widget, changed with React state, and work on deployed pages. Mechanics: `06-how-features-work.md` sections 6.17 and 6.18.

### `hidden`
```jsx
<UI.Text id="promo" text="Sale!" hidden={!showPromo} />
```
- The widget is not shown (`display: none` on its wrapper). Its content **stays mounted**, so component state, timers and effects keep running; use conditional rendering instead if you want it unmounted.
- Its geometry is kept: `useUIElement("promo")` and the export still report position and size, and it returns to the same place when shown.
- It cannot be selected, dragged or resized, and shows no overlay or handles. Hiding clears its selection and hover.
- It does not make the full-page canvas grow, and solid widgets neither push it nor are pushed by it.
- An auto-placed hidden widget keeps its reserved slot (other auto widgets do not move up).

### `solid`
```jsx
<UI.Card id="details" solid size={{ width: 400, height: 260 }} />
```
A solid widget makes room for itself. Its neighbours are shifted instead of being covered:

| Event | Pushes neighbours? |
|-------|--------------------|
| You enlarge it with the resize handles | Yes, live while you drag the handle |
| You make its `size` bigger in code (`size` prop changes) | Yes |
| It is on screen at load and overlaps others | Yes |
| `hidden` goes from true to false, or `solid` goes from false to true, while it overlaps others | Yes |
| You **drag** a solid widget over another widget | Yes, pushes overlapping widgets aside |
| You drag a non-solid widget over another widget | No, dragging non-solid widgets is free |
| You make it smaller | No. Neighbours stay where they were pushed |
| Another widget grows (that widget is not solid) | No |

How neighbours move: each overlapped visible widget goes to the side that needs the **smallest move** (ties: right, down, left, up; left/up only if it stays at x,y >= 0). A widget that is pushed pushes whatever it then hits in the **same direction** (a chain, like sliding blocks). The solid widget never moves itself. Hidden widgets are ignored. Any widget can be pushed (also `isDraggable={false}`, `deploy`, non-solid ones). Pushed widgets report through `onPositionChange` like any move.

Pushed positions are **live geometry**: the export, hooks and overlay show them, so tuning in the browser and copying the layout hardcodes the already-pushed positions. A widget's own `position` prop in your source is not rewritten.

---

## 1.14 Real-time Socket.IO property synchronization

Widgets on the Canvas can have their properties updated live from a backend via Socket.IO.

```jsx
// Minimal boilerplate: just pass socketUrl or socket instance to Canvas
<UI.Canvas socketUrl="http://localhost:5000">
  <UI.Text id="heading" text="Original Heading" fontSize={24} />
  <UI.Button id="formSubmitBtn" text="Old Button" variant="primary" />
</UI.Canvas>
```

Or invoke the standalone hook anywhere inside a Canvas/UIProvider:
```jsx
useSocketUI({ socketUrl: "http://localhost:5000" });
```

### Backend event and payload format:
The library listens on the Socket.IO event `'renderReactUI'` by default. You can specify a different event name using `socketEvent` (or `event`) on `<UI.Canvas>` or `useSocketUI({ socketEvent: "customEvent" })`.

The backend emits a JSON list of component configurations:

```json
[
  {
    "id": "heading",
    "fontSize": 50,
    "fontWeight": 300,
    "solid": true
  },
  {
    "id": "formSubmitBtn",
    "varient": "Danger",
    "text": "Submit"
  }
]
```

### Key behaviors:
- **Selective property override**: Only properties specified in the socket payload are updated; all other top-level properties (text, colors, layout) remain untouched. Note that property merging is shallow (1 level deep) for content props; sending partial sub-keys of a custom nested object replaces that nested object. To update nested objects, send the complete nested object or use flat props.
- **Dynamic component creation**: If a component specified by `id` does not exist on the canvas, it is automatically created and rendered with the specified config.
- **Layout & solid push**: If `solid: true` or dimension changes are sent via socket, overlapping widgets are pushed aside according to solid layout rules.
- **Zero boilerplate**: Works automatically by passing `socketUrl` or `socket` to `<UI.Canvas>`, and is completely inert when not in use.

---

## 1.15 Real-time MQTT property synchronization

Widgets on the Canvas can have their properties updated live from an MQTT broker via WebSockets.

```jsx
// Minimal boilerplate: pass mqttUrl (e.g. ws://localhost:9001) and optional mqttTopic to Canvas
<UI.Canvas mqttUrl="ws://localhost:9001" mqttTopic="renderReactUI">
  <UI.Text id="heading" text="Original Heading" fontSize={24} />
  <UI.Button id="formSubmitBtn" text="Old Button" variant="primary" />
</UI.Canvas>
```

Or invoke the standalone hook anywhere inside a Canvas/UIProvider:
```jsx
useMqttUI({ mqttUrl: "ws://localhost:9001", mqttTopic: "renderReactUI" });
```

### Broker connection and topic subscription:
- **Default topic**: If `mqttTopic` (or `topic`) is omitted, the library automatically subscribes to `'renderReactUI'`.
- **Custom topic**: Pass any custom topic or wildcard string (e.g. `devices/+/ui`, `sensors/#`).
- **Connection**: In browser environments, MQTT connects over WebSockets (e.g. Mosquitto default WS port 9001). Backend publishers (such as Python scripts) connect over TCP (port 1883).
- **Backend publishing with Python `paho-mqtt`**:
  ```python
  import paho.mqtt.publish as publish
  import json

  payload = [
      {"id": "heading", "fontSize": 48, "text": "Updated via MQTT", "solid": True}
  ]
  publish.single("renderReactUI", payload=json.dumps(payload), hostname="localhost", port=1883)
  ```

### Key behaviors:
- **Consistent payload schema**: Uses the exact same JSON schema as Socket.IO property updates (`store.applySocketUpdates()`). Both arrays and single objects are supported.
- **Selective property override**: Untouched properties and geometry are preserved.
- **Dynamic component creation**: Non-existent element IDs are dynamically registered and rendered.
- **Layout & solid push**: `solid`, `hidden`, `deploy`, `position`, and `size` changes trigger automatic layout updates and solid push-aside.

---

## 1.16 What the library does not do (today)

No nested containers, no widgets beyond Text and Button, no pull-back when a solid widget shrinks, no TypeScript types, no snapping/grid snap, no multi-select, no undo/redo, no keyboard-based moving, no z-order controls, no responsive reflow (fixed pixel layout), no persistence or backend. See `07-pitfalls-and-gotchas.md` section 9.
