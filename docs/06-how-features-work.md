# 6. How Each Feature Works

Internal mechanics, in the order a developer meets them. All behaviour below is current v0.1.0 behaviour and is locked by tests unless noted.

## 6.1 Defaults and partial overrides

**Goal:** `<UI.Text text="Hi" />` works; `position={{ x: 120 }}` keeps `y`.

**How:** each widget render calls `mergeLayoutConfig(defaultUIConfig, widgetDefaults, providerConfig, props)`. The merger ignores `undefined`, and merges `position` and `size` key by key. The result's `position` may be `{}` (auto) or partial (`{ x: 120 }`), and `size` is always complete after the built-in layer (`defaultUIConfig.size` is 240 x 80, widget defaults override it per key).

Examples:
- `<UI.Text />` -> position `{}` (auto), size `{ width: 240, height: 40 }`.
- `<UI.Text size={{ width: 500 }} />` -> size `{ width: 500, height: 40 }`.
- `<UIProvider config={{ size: { width: 100 } }}><UI.Text/>` -> `{ width: 100, height: 40 }`; `<UI.Text size={{ width: 300 }} />` -> `{ width: 300, height: 40 }`.
- `position="auto"` anywhere clears x/y from lower layers.

## 6.2 Automatic placement

`store.allocate(id, position, size)`:

```
if allocations has id -> return the cached spot
x = position.x ?? 24
y = position.y   if given
  else y = cursorY; cursorY += size.height + 16       // "below the previous auto widget"
cache {x, y} under id and return it
```

So the first auto widget lands at (24, 24), the next below it with a 16 px gap, etc. Widgets with an explicit `y` do not advance the cursor. The spot is **computed once per id** (first render) and becomes the widget's real stored geometry (`store.ensure`), so it is readable via overlay/hooks/export like any coordinate.

Auto placement uses the widget's height **at the time of its first render**. It does not look at where other widgets currently are, so after you drag things around, later-mounting auto widgets are still placed using the original cursor.

## 6.3 Layout state vs. content state

- Layout: element object in the store (`x, y, width, height, isDraggable, isResizable, deploy`).
- Content: props passed to the render component.

Re-rendering with new content props leaves the store untouched, so position/size stay. The store is only written by (a) drag/resize, (b) an effect that **follows changes of the `position`/`size` props** (so editing numbers in source and hot-reloading moves the widget), (c) an effect that syncs the three flags from the resolved config.

The "follow props" effect compares `position.x`, `position.y`, `size.width`, `size.height` and skips its first run. It applies only the keys that are defined in the prop (partial props patch only those keys).

## 6.4 Dragging

1. `onPointerDown` on the wrapper (only attached when `editable`) selects the widget; if `canDrag`, calls `begin(e, "move")`. Non-primary mouse buttons are ignored.
2. `begin` stores the start pointer position and the widget's start geometry, and adds `pointermove`, `pointerup`, `pointercancel` listeners on **`window`** (so the drag continues when the pointer leaves the widget).
3. On move, until the pointer has travelled `DRAG_THRESHOLD` (4 px) nothing happens (it is still a click). After that: `moved = true`, `active = true`, `body.userSelect = "none"`.
4. Each move: `store.update(id, { x: max(0, round(startX + dx)), y: max(0, round(startY + dy)) })`. Coordinates are **deltas of pointer client coordinates**, so page scrolling does not change the result; positions are clamped to `>= 0` and rounded to integers.
5. On pointer up: listeners removed, `active = false`; if it moved, `suppressClick` is set for one tick so the click that follows the pointer-up is cancelled in the capture phase (`onClickCapture` stops it). A press that never exceeded 4 px is a normal click.
6. The wrapper has `touchAction: "none"` while draggable (so touch drags do not scroll the page) and `cursor: grab/grabbing`.

## 6.5 Resizing

- The 8 handles are children of the wrapper, rendered when `showTools && canResize`.
- A handle's `onPointerDown` calls `stopPropagation()` (so the wrapper does not start a drag), selects the widget and calls `begin(e, dir)` with `dir` in `n s e w ne nw se sw`. Resize has **no threshold** (starts immediately).
- Per move (from the start geometry): `e` -> `w = max(20, startW + dx)`; `s` -> `h = max(20, startH + dy)`; `w` -> new width `max(20, startW - dx)` and `x` shifts so the **right edge stays fixed**; `n` -> same for height/top edge.
- Values are rounded, minimum 20 px. Unlike dragging, resize does **not** clamp `x`/`y` to `>= 0` (see pitfalls).

## 6.6 Overlay and selection

- `showTools = editable && (hovered || selected || active)`. Hover uses `pointerenter/leave` on the wrapper.
- The overlay is a `<pre data-testid="ui-overlay">` with six lines (`Widget`, `Position`, `Size`, `Draggable`, `Resizable`, `Deployed`) placed below the widget, or above it when `el.y >= 110` so it stays visible. It has `pointerEvents: none` so it never blocks interaction.
- "Draggable/Resizable" lines show `isDraggable && master switch`. The "Deployed" line shows the widget's own `deploy`. Because the overlay appears only when editable, it normally shows `false`.
- Selection is stored in the store (`selectedId`). Pressing empty canvas deselects (`Canvas` handler). Page deploy clears selection.
- Selected: solid blue outline; hovered: dashed outline; deployed: none. Tools raise the wrapper to `zIndex: 1000`.

## 6.7 `isDraggable`, `isResizable` at runtime

The values are read from the resolved `cfg` on **every render**, so changing a prop or provider config through React state takes effect immediately. The three flags are also pushed into the store (`useLayoutEffect`) so hooks/exports report the current values.

## 6.8 Deployment

Rules (in `createWidget.jsx`):

```
editable = !pageDeployed && !cfg.deploy
```

- `editable === false`: no `onPointerDown`, no outline, no overlay, no handles, no grab cursor, no touch-action override. The wrapper still has the same absolute position/size and the content still renders and works.
- Page deploy = `Canvas deploy` OR `MasterPanel` deploy. It beats `deploy={false}` on a widget.
- Turning page deploy off re-enables only widgets whose own `deploy` is false. A widget with `deploy` stays locked.
- The Canvas does not change size or position when deployed (grid dots disappear, nothing else).
- `<UI.MasterPanel />` hides itself if the Canvas is deployed in code (otherwise you would be unable to un-deploy). When deployed through its own checkbox, it stays visible.

Provider-level `deploy: true` is just a **default for each widget's own `deploy`**. A widget can override it with `deploy={false}`. It is not page deploy.

## 6.9 Master switches (runtime controls)

`store.master = { isDraggable, isResizable, deploy }`, each `true/true/false` initially. They have the highest precedence but only **restrict**: `canDrag = editable && cfg.isDraggable && master.isDraggable`. They can never grant a permission that the widget's own prop or the provider denied, and never override deployment.

## 6.10 Callbacks

An effect watches `el.x, el.y, el.width, el.height`. It compares with the previous values stored in a ref:
- moved (x or y changed) -> `onPositionChange({ x, y })`
- resized (width or height changed) -> `onSizeChange({ width, height })`
- either -> `onLayoutChange({ position, size })`

It does not fire on the first render. It fires for changes from dragging, resizing **and** from changed `position`/`size` props. Callbacks are read from a ref, so the latest function is always called without re-subscribing. Callbacks are invoked in an effect after render, i.e. once per committed change; during a drag that is effectively once per animation of pointer movement.

## 6.11 Geometry hooks

- Store emits on every change; `useUIElement(id)` subscribes with a snapshot function returning that element's current object (identity changes only when that widget changes), so it re-renders only for that widget.
- `useUILayout()` subscribes to `getVersion`, so it re-renders on **any** change in the store (including selection, master switches, every drag frame of any widget).

## 6.12 Export and copy

- `buildExport(store, opts)` reads `store.getElements()` at call time, so the numbers equal the live geometry.
- `ExportPanel` calls `layout.exportJSON()` on each render (which re-renders on every store change) and copies on click. **Copy JSX** joins `toJSXSnippet` of all elements, one per line.
- `copyText` prefers the async Clipboard API (needs a secure context: https or localhost) and falls back to `execCommand("copy")`.

## 6.13 Canvas sizing and coordinates

- Coordinates are relative to the canvas element, because every widget wrapper is `position: absolute` inside it and the canvas is the positioned ancestor (`absolute` in page mode, `relative` in box mode).
- Page mode: `position: absolute; top: 0; left: 0; width: 100%; minWidth: maxRight; minHeight: 100dvh; height: maxBottom`. Pinned to the page top-left so surrounding CSS cannot offset coordinates; it grows when widgets extend past the screen.
- Box mode: `position: relative; width: <width ?? 100%>; height: <height ?? 600>; overflow: auto`. Scrolling inside the box does not change coordinates (drag uses pointer deltas; widgets are positioned inside the scroll content).

## 6.14 StrictMode safety

- Render-phase functions (`allocate`, `ensure`, `nameFor`) are idempotent per id, so React's double render does not allocate two spots.
- `mount` counts mounts and removes an element on a microtask only when the count is zero, so the mount-unmount-mount cycle of StrictMode does not delete the element.

## 6.15 Safe rendering

- `Text`: `children ?? text` is a React text node; `as` must be in the `TAGS` allow-list else `div`.
- `Button`: label is a React text node; `variant` falls back to `primary`.
- Nothing in the library evaluates strings as code or injects HTML.

## 6.16 Click vs drag in edit mode (summary)

| Gesture | Result |
|---------|--------|
| Press and release without moving 4 px | Selects the widget; the click reaches the content (button works). |
| Press, move >= 4 px, release | Drag; the follow-up click is cancelled. |
| Press on a resize handle | Resize; never a drag or a click on content. |
| Press on empty canvas | Deselect. |
| Any press while deployed | Nothing from the engine; content works normally. |

## 6.17 `hidden`

- A layout prop like the others: resolved by `mergeLayoutConfig` (default `false`, provider config can set it, widget prop wins), stored in the element, reported by `useUIElement`/export.
- `createWidget`: wrapper style gets `display: "none"`; `editable` becomes false (no pointer handlers, no outline, no overlay, no handles); an effect clears hover and selection when it turns on.
- The render component **stays mounted** (state, timers, effects keep running). Geometry stays in the store, so hooks/export still report it and showing it again restores it exactly.
- `store.getMaxBottom/Right` ignore hidden elements, so a hidden widget does not stretch the full-page canvas.
- `solid.js` ignores hidden widgets: they are not pushed and do not push.
- Auto placement still reserves a hidden widget's slot (allocation is by id and never freed).

## 6.18 `solid`

**What triggers a push** (all in `store.js`, only when the widget is `solid` and not `hidden`):

| Trigger | Where it happens |
|---------|------------------|
| width or height becomes larger | `store.update` (resize handles call it each move; a changed `size` prop reaches it through the follow-props effect) |
| the widget "appears": `solid` false -> true, or `hidden` true -> false | `store.update` (the flags effect in `createWidget` calls it) |
| the widget is present at load | `store.mount` (runs in the widget's mount effect, after all widgets have registered) |

Moving (x/y only) never triggers. Shrinking never triggers. A widget that is not solid never triggers, even if it grows over others. So **dragging stays free**, which was a requirement.

**What happens:** `pushAside(id)` asks `resolveSolid` (see 5.13) for new positions, writes them into the element Map, and `update`/`mount` emits once, so all pushed widgets re-render together. Each pushed widget's own effect then fires `onPositionChange`/`onLayoutChange`, exactly as for a drag.

**During a live resize:** the pointer moves many times. Each move that grows the widget pushes any widgets it now overlaps; widgets already pushed are flush against the edge (no overlap), so each step moves them only by the new growth. Resizing back down leaves them where they are.

**Direction choice:** the first widgets pushed (those the solid widget overlaps) go to the side needing the smallest move, so a widget on the right of an `e`-resize goes right, a widget below an `s`-resize goes down, a widget on the left of a `w`-resize goes left (if it stays >= 0; otherwise down or right). Widgets they then hit are pushed the same way (a chain).

**Hardcoding:** the pushed positions exist only in the store. Your JSX `position` props are not rewritten. On reload the same JSX produces the same result (the load-time push is deterministic for the same widget order), and exporting the layout gives the pushed numbers.

**Limits:** best effort. A left/up push stops at the canvas edge, so overlap can remain in a crowded corner; the step limit stops runaway layouts; the algorithm does not search for a globally optimal layout.

**Verified in a real browser (Chromium):** a solid widget (x 20, width 200) with neighbours at x 230 and x 390; enlarging it by 60 px moved them to 280 and 430. Dragging the solid widget 100 px to the right over them moved nothing else.

## 6.19 Real-time Socket.IO synchronization

- `useSocketUI({ socket, socketUrl, socketEvent, autoConnect })` connects to a Socket.IO backend.
- Listens on `socketEvent` (defaults to `'renderReactUI'`).
- Calls `store.applySocketUpdates(payload)`.
- Updates content props and layout flags in `dynamicProps` / `dynamicFlags` in the store so React renders keep backend-provided properties intact while allowing dragging and resizing to continue freely.

## 6.20 Real-time MQTT synchronization

- `useMqttUI({ client, mqttUrl, mqttTopic, mqttOptions, autoConnect })` connects to an MQTT broker over WebSockets.
- Browser requirement: WebSockets connection (e.g. `ws://localhost:9001`), whereas TCP connection (port 1883) is used by backend publishers (e.g. Python scripts).
- Subscribes to `mqttTopic` (defaults to `'renderReactUI'`). Supports wildcards such as `+` and `#` checked with `matchesMqttTopic`.
- On incoming message: parses JSON payload (handling string, Buffer, or object) and invokes `store.applySocketUpdates(payload)`.
- Lifecycle: automatically manages subscriptions, tracks `isConnected`, and performs clean unsubscribes / client disconnects on unmount.
- Wired directly to `<UI.Canvas mqttUrl="ws://..." mqttTopic="..." />` so applications need zero boilerplate.
