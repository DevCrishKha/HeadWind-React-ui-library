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
<<<<<<< HEAD
=======

## 6.21 UI.AIWidget — AI Chat Panel

`UI.AIWidget` (alias `UI.AIPanel`) is a floating, draggable, non-canvas panel (like `MasterPanel`) that connects the editor to an AI backend over Socket.IO. It is hidden automatically when the page is deployed (`pageDeployed === true`).

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `socketUrl` | `string` | — | Socket.IO server URL. Creates an internal managed connection. |
| `socket` | Socket.IO instance | — | Pass an already-connected socket instead of `socketUrl`. |
| `sendPromptEvent` | `string` | `"aiPrompt"` | Socket event emitted when the **Send** button is clicked. |
| `receiveResponseEvent` | `string` | `"aiResponse"` | Socket event the widget listens on for AI replies. |
| `saveEvent` | `string` | — | Separate event for the **Save** button. Falls back to `sendPromptEvent` if omitted. |
| `getLogsEvent` | `string` | `"aiLogs"` | Every send and receive is also emitted on this event for external logging/storage. |
| `defaultPosition` | `{ x, y }` | `{ x: 20, y: 380 }` | Initial panel screen position. |
| `title` | `string` | `"AI Assistant"` | Panel header label. |
| `style` | object | — | Extra inline styles on the panel container. |
| `className` | `string` | — | Extra CSS class. |

### Send button — targeted widget JSX

When the **Send** button is clicked (or `Ctrl+Enter` in the textarea):

1. Reads all widget IDs currently ticked in `aiSelectionStore` (the AI tick checkboxes in `UI.WidgetListPanel`).
2. For each ticked widget, calls `toWidgetJSX(el)` (from `InspectorPanel.jsx`) to produce a full JSX string identical to what the InspectorPanel's "Copy JSX" button generates — including all layout props, content props, `solid`, `hidden`, `deploy`, `isDraggable`, `isResizable`.
3. Emits on `sendPromptEvent`:
   ```json
   {
     "prompt": "<user typed text>",
     "widgets": [
       { "id": "btn-submit", "jsx": "<UI.Button id=\"btn-submit\" position={{ x: 100, y: 150 }} size={{ width: 140, height: 44 }} text=\"Submit\" />" },
       ...
     ]
   }
   ```
   `widgets` is an empty array `[]` if no widgets are ticked.
4. Also emits on `getLogsEvent`: `{ timestamp, direction: "sent", event, payload }`.

### Save button — changed widgets only

The **Save** button tracks UI changes by comparing each element's current `toWidgetJSX()` output against a **snapshot** taken at mount time (or after the last save).

- **Disabled** (`disabled` attribute, grayed-out, `cursor: not-allowed`) when nothing has changed since the last snapshot.
- **Enabled** when ≥ 1 widget differs. The button label shows the count: `"Save N Change(s) to App.jsx"`.
- On click (only possible when enabled):
  1. Emits on `saveEvent` (or `sendPromptEvent`) with a **fixed hard-coded prompt**:
     ```json
     {
       "prompt": "Make this changes to the current UI",
       "widgets": [
         { "id": "panel-left", "jsx": "<UI.ParentPanel id=\"panel-left\" position={{ x: 20, y: 20 }} size={{ width: 300, height: 400 }} />" }
       ]
     }
     ```
     Only the **changed** widgets are included — not the entire canvas.
  2. Resets the baseline snapshot to the current state → button disables immediately.
  3. Appends a confirmation message in the chat canvas.
  4. Also emits on `getLogsEvent`: `{ timestamp, direction: "sent", event, payload, type: "save" }`.

### Receive — AI response

Listens on `receiveResponseEvent`. Accepts:
- A plain string.
- An object with a `markdown`, `response`, or `text` key.
- Falls back to `JSON.stringify(data)`.

The response is rendered in the chat canvas by `MarkdownRenderer` (headings, bold, italic, inline code, fenced code blocks, bullet lists — no `dangerouslySetInnerHTML`).

Also emits on `getLogsEvent`: `{ timestamp, direction: "received", event, payload: { text } }`.

### Logging (`getLogsEvent`)

Every user interaction is forwarded to the backend on `getLogsEvent` (default `"aiLogs"`). Shape:

```json
{ "timestamp": "2026-11-13T12:38:34.965Z", "direction": "sent"|"received", "event": "<eventName>", "payload": { ... } }
```

The backend can persist these logs however it wishes — to a file, database, or forward to a monitoring service. The widget never stores logs itself.

### `aiSelectionStore`

A module-level store (compatible with `useSyncExternalStore`) shared between `UI.WidgetListPanel` (tick checkboxes) and `UI.AIWidget` (reads ticked IDs). Public API:

```js
import { aiSelectionStore } from "@devcrish/headwind";
aiSelectionStore.toggle(id);       // toggle one widget's ticked state
aiSelectionStore.setTicked(id, bool);
aiSelectionStore.getTickedIds();   // returns stable array ref
aiSelectionStore.isTicked(id);
aiSelectionStore.selectAll(ids);
aiSelectionStore.clear();
aiSelectionStore.subscribe(cb);    // for useSyncExternalStore
```

### Change-detection implementation detail

`computeChangedWidgets()` is called on every render (it reads from `store.getElements()` which is a synchronous getter — no effect needed). It diffs `toWidgetJSX(el)` for each element against the snapshot stored in `initialElementsRef`. A widget is "changed" if:
- It has no snapshot entry (newly added via socket/MQTT), **or**
- Its current JSX string differs from the snapshot JSX string (covers position, size, props, flags).

This means **any change the InspectorPanel would reflect** is also detected here, with no manual diffing of individual fields.

### Example usage

```jsx
<UI.AIWidget
  socketUrl="http://localhost:5000"
  sendPromptEvent="aiPrompt"
  receiveResponseEvent="aiResponse"
  saveEvent="aiSave"
  getLogsEvent="aiLogs"
  defaultPosition={{ x: 20, y: 440 }}
  title="Layout AI"
/>
```

Backend (Python / Socket.IO) listens on `"aiPrompt"` and `"aiSave"`, detects the fixed save prompt string, edits `App.jsx`, and replies on `"aiResponse"`. It can also persist all logs received on `"aiLogs"`.

> [!IMPORTANT]
> `UI.AIWidget` must be placed **outside** `<UI.Canvas>` (like `UI.MasterPanel` and `UI.ExportPanel`). It uses `useUIContext()` to read the store, so it must still be inside `<UIProvider>`.

> [!NOTE]
> The JSX strings sent by the widget (`toWidgetJSX`) are the same format shown by `UI.InspectorPanel`'s "Copy JSX" button and described in `docs/08-jsx-to-socket-payload-guide.md`. The backend can parse them directly or use them as a readable diff for an LLM.

## 6.22 UI.InspectorPanel — VS Code Style Color Palette & Styling

`UI.InspectorPanel` provides live geometry inspection, component prop inspection, and color editing for the currently selected canvas widget.

### Features
1. **Inline Color Squares**:
   Beside both `color` and `background-color` fields, a small 13×13 px square displays the live shade of that color. If the color is unset or transparent, it displays a checkerboard pattern.
2. **VS Code Style Palette Popover**:
   Clicking the small color square opens an interactive styling palette directly beneath the field:
   - **Native color picker**: Click the color input box to open the system eyedropper and spectrum picker.
   - **Hex text input**: Type or paste any CSS color string (`#hex`, `rgb(...)`, `hsl(...)`, or named color).
   - **Clear button**: Removes the color property from the widget and JSX.
   - **Swatches matrix**: 27 standard VS Code / Tailwind CSS swatches organized in 3 rows (neutrals, vibrant primaries, deep tones) for instant one-click selection.
3. **Synchronized JSX & Live Updates**:
   Changing a color updates the widget in the canvas immediately and updates `toWidgetJSX(el)`.
   - The user can copy the updated snippet from InspectorPanel's "Copy JSX" button.
   - `UI.AIWidget` automatically detects the JSX change and enables the **Save UI Changes to App.jsx** button. Saving sends the updated JSX containing the new `color="..."` or `backgroundColor="..."` attributes over Socket.IO.


>>>>>>> Version2.1.1
