# 2. Requirements and Architecture

## 2.1 The original requirement (from `Prompt.MD`)

The owner asked for a **reusable React + JavaScript component library** (not a dashboard grid, not a no-code builder, not a wrapper around an existing drag-and-drop library) that supports this workflow:

1. Import ready-made widgets (text, button, image, card, chart, table ...).
2. Render them with **no positioning/sizing/drag/resize configuration**; the library supplies defaults.
3. Open the page, **drag and resize** widgets visually.
4. **Read exact position and size** in the browser.
5. **Copy the values into source code** to hardcode the layout.
6. Enable/disable dragging and resizing individually or globally.
7. Use a `deploy` property to remove all layout-editing UI while keeping everything else.
8. Change widget properties dynamically through React state, hooks and backend data.

### Critical requirement: defaults
`position`, `size`, `isDraggable`, `isResizable`, `deploy` must never be required. `position: "auto"` is an *instruction*, not a coordinate: the library computes a real position and exposes it. Different widget types have different default sizes. Overrides are partial: setting `position.x` must not lose `position.y`; setting `size.width` must not lose `size.height`.

### Precedence
1. Built-in widget defaults. 2. Global provider config. 3. Individual props. 4. Runtime controls where applicable. A deployed component must never become editable because global edit mode is on.

### Other requirements
- Geometry API (`useUIElement`) and callbacks (`onPositionChange`, `onSizeChange`), with a documented canvas-relative coordinate system.
- JSON export + copy to clipboard; exported values must equal the configured geometry.
- `deploy` hides overlays/handles/measurements but preserves position, size, content, styling and behaviour. It must not turn the widget into an image.
- Page-level deploy to toggle edit mode on/off for everything; turning editing back on re-enables widgets that are not individually deployed.
- Clearly separate application interaction from layout editing (clicking a button must not start a drag).
- A large prebuilt widget catalogue (typography, layout, inputs, media, metrics, charts, tables, navigation, notifications, maps, advanced).
- Typed/clean props, data separated from layout, custom components via a shared wrapper/registration API.
- Architecture: reusable package, shared layout engine, shared defaults + provider, per-widget defaults with partial overrides, predictable coordinate system, minimal re-render during drag, nested components where practical, no backend/database, **no arbitrary JavaScript execution from backend-provided config**.
- Absolute-positioned canvas for v1; **document the limits of fixed-pixel layout** and do not claim it is responsive.
- Runnable example app and tests (defaults, merging, drag/resize restrictions, deployment, geometry).
- Build incrementally: single Text widget first, then config/overrides, then export/runtime controls, **only then** the remaining widgets.

## 2.2 Status: requirement by requirement

| Requirement | Status | Where |
|-------------|--------|-------|
| Reusable library with exports and peer deps | Done | `package.json`, `vite.lib.config.js`, `src/index.js` |
| Canvas with documented coordinates | Done | `Canvas.jsx`, `export.js` (COORDINATES text) |
| Defaults for every widget, partial overrides | Done | `config.js`, `createWidget.jsx` |
| `position: "auto"` -> real coordinates | Done | `store.allocate` |
| Per-widget default sizes | Done (Text, Button) | `widgets/*.jsx` `defaults` |
| Global provider config | Done | `UIProvider.jsx` |
| Precedence rules, deploy can't be bypassed | Done | `createWidget.jsx` (`editable`), tests |
| Drag + resize + overlay + live numbers | Done | `createWidget.jsx` |
| `useUIElement`, callbacks | Done | `hooks.js`, `createWidget.jsx` |
| JSON export + copy | Done | `export.js`, `ExportPanel.jsx` |
| Runtime switches (drag, resize, deploy page) | Done | `MasterPanel.jsx`, `store.setMaster`, `Canvas deploy` |
| Click vs drag separation | Done | 4 px threshold + click suppression |
| Custom widget registration | Done | `createWidget` (+ `example/Clock.jsx`) |
| Data vs layout separation | Done | content props vs layout store |
| Safe rendering of backend text | Done for Text/Button | plain text nodes, tag allow-list |
| Example app | Done | `example/` (App.jsx, FullDemo.jsx) |
| Tests | Done (68: 35 original + 33 for hidden/solid) | `tests/library.test.jsx`, `tests/hidden-solid.test.jsx` |
| `hidden` prop (added after the original prompt) | Done | `createWidget.jsx`, `store.js` |
| `solid` prop: push neighbours aside when growing (added after the original prompt) | Done | `solid.js`, `store.js` |
| Responsive-limits documented | Done | README "Coordinates and limits" + file 7 |
| Typography widgets beyond Text (Heading, Paragraph, Label, Badge, RichText, Icon, Divider, Spacer) | **Not built** | |
| Layout widgets (Container, Card, Panel, Row, Column, Stack, Tabs, Accordion, Modal, Drawer, ScrollArea) | **Not built** | |
| Nested positioning | **Not built** | needs engine change (see rules) |
| Buttons/controls beyond Button (IconButton, Link, ButtonGroup, Tooltip, Popover) | **Not built** | |
| Form inputs (Input ... Form) and validation utilities | **Not built** | |
| Navigation, media, metrics/status, charts, tables, notifications, maps, advanced widgets | **Not built** | |
| TypeScript types | **Not built** (project is JS only) | |

## 2.3 How the library works (the big picture)

```
<UIProvider config>                   <- owns ONE layout store, shares global config
  <UI.Canvas deploy?>                 <- root coordinate system, tells store "page deployed"
    <UI.Text id="a" ... />            <- every widget = createWidget(...) wrapper + your render component
    <UI.Button ... />
  </UI.Canvas>
  <UI.MasterPanel />                  <- reads/writes master switches in the store
  <UI.ExportPanel />                  <- reads store, builds JSON/JSX
</UIProvider>
```

### The five moving parts

1. **Config merging** (`config.js`): turns built-in defaults + widget defaults + provider config + props into one resolved `cfg` (`position`, `size`, flags).
2. **Layout store** (`store.js`): a plain JavaScript object outside React that holds live geometry for every widget, selection, page-deploy and master switches, plus auto placement. Components subscribe with `useSyncExternalStore`.
3. **Widget wrapper** (`createWidget.jsx`): a generic wrapper that positions the widget absolutely, handles pointer events for drag/resize, shows the overlay and handles, enforces edit/deploy rules, fires callbacks, and renders your content component inside.
4. **Canvas** (`Canvas.jsx`): provides the positioned parent (coordinate origin), grows to fit widgets, forwards `deploy` to the store.
5. **Export + hooks** (`export.js`, `hooks.js`): read the store and present geometry as objects, JSON, JSX, or live hook values.

### Data flow while dragging

```
pointerdown on widget  -> createWidget.begin()  (adds window pointermove/up listeners)
pointermove            -> store.update(id, {x, y})   (new element object, emit())
store.emit()           -> listeners fire -> useSyncExternalStore re-renders ONLY components
                          whose selected slice changed (this widget; hooks/panels reading it)
re-render              -> wrapper style left/top changes; overlay text updates
effect on el.x / el.y  -> onPositionChange / onLayoutChange callbacks
pointerup              -> listeners removed; if it moved, the next click is suppressed
```

### Data flow when the page is first rendered

```
render widget -> mergeLayoutConfig(...)         resolve defaults/overrides
              -> store.allocate(id, pos, size)  choose real x,y (auto placement, cached by id)
              -> store.ensure(id, initial)      register geometry (no notification during render)
              -> subscribe + render wrapper
effects       -> store.mount(id)                register mount (StrictMode safe)
              -> store.update(id, flags)        keep isDraggable/isResizable/deploy in sync
```

### Separation of layout and content
- **Layout** (x, y, width, height, flags) lives in the store. It is only changed by drag/resize, or when the `position`/`size` **props change**.
- **Content** (text, value, colors, variants ...) are plain props passed to the render component. Changing them re-renders content only. A test (`changing text keeps the dragged position and size`) locks this.

### Two kinds of "deploy"
| | Scope | Set by |
|--|-------|--------|
| Widget deploy | one widget | `deploy` prop on the widget, or `deploy: true` in `UIProvider config` as a default |
| Page deploy | all widgets | `<UI.Canvas deploy>` or the MasterPanel's "Deploy whole page" |

Page deploy always wins. Widget deploy never un-deploys when the page is un-deployed.

## 2.4 Design decisions worth knowing

- **Plain JS, no TypeScript.** The prompt said "React and JavaScript".
- **Absolute positioning, pixel coordinates** relative to the canvas, because exact inspection and hardcoding were the main goals.
- **Store outside React state** so a drag does not re-render the whole tree.
- **No dependency on a drag-and-drop library**: pointer events + window listeners.
- **One engine, many widgets:** all widgets are produced by `createWidget`; there is no per-widget drag/resize code.
- **Safety:** backend data is data. There is no `eval`, no `dangerouslySetInnerHTML`, and unknown `as` tags are rejected.

---

## 2.5 Real-Time Socket.IO Synchronization and Property Mapping

The library supports live, real-time property updates from a backend via Socket.IO listening on the `'renderReactUI'` event.

### The update flow
1. **Event Reception (`useSocketUI.js`)**: Listens on `'renderReactUI'` and passes incoming payload data to `store.applySocketUpdates(data)`.
2. **Store Processing (`store.js`)**: Extracts layout properties into `layoutPatch` and content properties into `contentProps`, merges them into the element record, and triggers `store.emit()`.
3. **Reactive Re-render (`createWidget.jsx` / `Canvas.jsx`)**: Subscribers via `useSyncExternalStore` receive updated `el.props` and re-render the widget in real time without tearing down existing state.

### Property Mapping: Layout vs. Content Props
- **Layout keys**: Flat keys (`x`, `y`, `width`, `height`, `isDraggable`, `isResizable`, `deploy`, `hidden`, `solid`, `parentId`) update widget layout without affecting content.
- **Nested `position` and `size`**: As a special case, 1-level nested objects `position: { x, y }` and `size: { width, height }` are checked explicitly so partial updates (`position: { x: 50 }`) update `x` without wiping `y`.
- **Component hierarchy (`parentId`)**: Nested components inside containers (such as `UI.ParentPanel`) are mapped dynamically via the `"parentId"` field.

### Shallow Merging and Handling N-Level Nested Properties
For all general component content props, `applySocketUpdates` performs a **shallow merge** at the root property level:

```javascript
const nextProps = { ...(old.props || {}), ...contentProps };
const nextDynamicProps = { ...(old.dynamicProps || {}), ...contentProps };
```

- **Top-level properties are preserved**: Omitting a top-level prop in a socket payload keeps the existing prop value intact (e.g., updating `text` preserves `fontSize` and `color`).
- **N-level nested objects are NOT deep-merged**: `store.js` does not perform recursive deep-merging on arbitrary nested objects (e.g. `style={{ ... }}`, `chartConfig={{ ... }}`, or custom nested data objects). Emitting a partial sub-key replaces the entire nested object, overwriting unmentioned sibling keys.
- **Design Guidelines**:
  1. **Prefer flat props**: Design widget APIs to take flat props at the root level (e.g., `theme="dark"` rather than `config={{ theme: "dark" }}`).
  2. **Emit complete nested objects**: If updating a nested property over Socket.IO, the backend should send the complete nested object rather than partial sub-keys.
  3. **Handle nested defaults inside the widget**: New widgets accepting nested objects should merge incoming props with defaults inside their render component.

