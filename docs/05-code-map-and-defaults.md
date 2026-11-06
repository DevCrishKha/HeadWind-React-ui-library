# 5. Code Map: Where Every Default and Non-Default Behaviour Comes From

## 5.1 Repository layout

```
react-ui-library/
  package.json            name @devcrish/headwind, ESM, peer deps react>=18, exports -> dist/
  vite.config.js          example app (root=example/, alias @devcrish/headwind -> src/index.js)
  vite.lib.config.js      library build (entry src/index.js, formats es+cjs, react external)
  vitest.config.js        jsdom, globals, setup file, same alias
  src/
    index.js              public API: UI object + named exports
    config.js             defaultUIConfig, mergeLayoutConfig        <- DEFAULTS + MERGE RULES
    context.js            UIContext, useUIContext (throws outside a provider)
    UIProvider.jsx        creates the store, shares global config
    store.js              layout store                              <- AUTO PLACEMENT, SELECTION, DEPLOY STATE, solid push
    solid.js              pure push-aside algorithm for `solid`     <- SOLID LOGIC
    createWidget.jsx      the engine / widget wrapper               <- DRAG, RESIZE, OVERLAY, DEPLOY RULES
    Canvas.jsx            root coordinate system                    <- SOCKET & MQTT SYNC HOOKS WIRED HERE
    useSocketUI.js        Socket.IO sync hook                       <- LISTENS ON 'renderReactUI'
    useMqttUI.js          MQTT sync hook                            <- SUBSCRIBES TO 'renderReactUI' OVER WS
    hooks.js              useUIElement, useUILayout, useUIConfig
    export.js             geometry/JSON/JSX export, clipboard
    reference.js          layout prop/callback/hook docs embedded in export
    registry.js           widget type registry
    widgets/Text.jsx      built-in widget
    widgets/Button.jsx    built-in widget
    components/MasterPanel.jsx
    components/ExportPanel.jsx
  example/                App.jsx, FullDemo.jsx, Clock.jsx, main.jsx, index.html
  tests/                  library.test.jsx (35 tests), hidden-solid.test.jsx (33 tests), setup.js
```

`example/main.jsx` renders `App.jsx`. `FullDemo.jsx` is a larger demo that is **not** the entry by default; to see it, import it in `main.jsx` (do not edit `main.jsx` unless approved; create a new entry or temporary local change instead).

## 5.2 Where each default lives

| Default / behaviour | Value | Defined in |
|---------------------|-------|-----------|
| Fallback widget size | 240 x 80 | `config.js` `defaultUIConfig.size` |
| Fallback position | `"auto"` | `config.js` `defaultUIConfig.position` |
| `isDraggable`, `isResizable` | `true` | `config.js` |
| `deploy` | `false` | `config.js` |
| `hidden`, `solid` | `false`, `false` | `config.js` |
| Gap between a solid widget and the widgets it pushes | 0 px | `solid.js` `SOLID_GAP` |
| Solid algorithm step limit (safety) | 500 | `solid.js` `MAX_STEPS` |
| Text default size | 240 x 40 | `widgets/Text.jsx` `defaults` |
| Button default size | 140 x 44 | `widgets/Button.jsx` `defaults` |
| Text content defaults (color `#111827`, 16px, weight 400, line-height 1.4, overflow `wrap`, tag `div`, text `"Text"`) | | `TextContent` parameter defaults in `Text.jsx` |
| Button content defaults (variant `primary`, `type="button"`, label `"Button"`) and variant colors | | `ButtonContent` and `VARIANTS` in `Button.jsx` |
| Auto placement left margin | 24 px | `store.js` `MARGIN` |
| Auto placement vertical gap | 16 px | `store.js` `GAP` |
| Auto placement start Y | 24 px | `store.js` `cursorY = MARGIN` |
| Drag threshold (press becomes a drag) | 4 px | `createWidget.jsx` `DRAG_THRESHOLD` |
| Minimum resize size | 20 px | `createWidget.jsx` `MIN_SIZE` |
| Resize handles | 8 (n s e w ne nw se sw), 10x10 px | `createWidget.jsx` `HANDLES` |
| Overlay content and style | dark `<pre>`, flips above the widget when `y >= 110` | `createWidget.jsx` render |
| Selected outline / hover outline | `2px solid #2563eb` / `1px dashed #3b82f6` | `createWidget.jsx` style |
| z-index while tools show | 1000 | `createWidget.jsx` |
| Panels z-index | 2000 | `MasterPanel.jsx`, `ExportPanel.jsx` |
| Canvas background / grid | `#ffffff` / dotted 20 px grid while editing | `Canvas.jsx` |
| Box-mode canvas defaults | width `100%`, height `600`, `overflow: auto` | `Canvas.jsx` |
| Page-mode canvas | absolute, top/left 0, width 100%, `minHeight: 100dvh` | `Canvas.jsx` |
| Master switches initial state | drag on, resize on, deploy off | `store.js` `master` |
| Coordinate-system description text | | `export.js` `COORDINATES` |

## 5.3 `src/config.js`

### `defaultUIConfig`
The lowest layer of every widget's configuration (see table above).

### `mergeLayoutConfig(...layers)`
Folds layers left to right (later wins) into `{ position: {...}, size: {...}, ...flags }`.

Rules, line by line in spirit:
- `null`/`undefined` layers are skipped; `undefined` values never override.
- Key `position`:
  - `"auto"` -> `result.position = {}` (clears any x/y from lower layers).
  - object -> shallow-merge only its **defined** keys (`definedOnly`), so `{ x: 10 }` keeps `y`.
  - any other value (number, array, ...) is ignored.
- Key `size`: object -> merge defined keys; other values ignored.
- Any other key (`isDraggable`, `isResizable`, `deploy`, ...) is copied (last defined wins).
- The result **always** has `position` and `size` objects; they may have missing keys (the store fills x/y; widget defaults supply size).

Callers: `createWidget.jsx` (per widget render), `hooks.js` (`useUIConfig`), `reference.js` (to show defaults in the export).

**Layer order used by a widget:** `mergeLayoutConfig(defaultUIConfig, widgetDefaults, providerConfig, { position, size, isDraggable, isResizable, deploy })`. This is where the precedence "built-in -> widget -> provider -> props" comes from.

## 5.4 `src/context.js` and `src/UIProvider.jsx`

- `UIContext` holds `{ store, config }`.
- `UIProvider` creates the store exactly once (`useState(createLayoutStore)`) and memoizes `{ store, config: config || {} }`.
- `useUIContext()` throws a clear error when no provider exists, which is the source of the "must be used inside Canvas or UIProvider" message.

## 5.5 `src/store.js` (`createLayoutStore`)

A closure-based store. Internal state: `elements` (Map id -> element object `{id,type,isAutoId,x,y,width,height,isDraggable,isResizable,deploy}`), `listeners`, `allocations` (id -> {x,y}), `names` (React id -> readable id), `counters` (type -> count), `mounts`, `version`, `selectedId`, `canvasDeploy`, `master`, `cursorY`, `canvasEl`.

| Method | Purpose |
|--------|---------|
| `subscribe(listener)` | Add listener; returns unsubscribe. Used by `useSyncExternalStore`. |
| `getVersion()` | Counter that increments on every `emit()`. |
| `getElement(id)`, `getElements()` | Read geometry (the Map stores a **new object per change**, which makes `useSyncExternalStore` snapshots stable and cheap). |
| `getSelectedId()`, `isSelected(id)`, `select(id)` | Selection. `select` is a no-op when unchanged. |
| `getPageDeployed()` | `canvasDeploy \|\| master.deploy`. |
| `getCanvasDeployed()`, `setPageDeployed(v)` | The Canvas `deploy` prop. Clears selection when set true. |
| `getMaster()`, `getMasterDrag/Resize/Deploy()`, `setMaster(patch)` | MasterPanel switches. `deploy: true` clears selection. No-op if nothing changed. |
| `getMaxBottom()`, `getMaxRight()` | Used by Canvas to grow in page mode. Ignore hidden widgets. |
| `setCanvasElement(el)`, `getCanvasSize()` | Canvas DOM node and its `clientWidth/clientHeight` (for the export). |
| `nameFor(reactId, type)` | Readable auto id `"<type lowercased>-<n>"`, stable for one React instance. Counter is per type and never decreases. |
| `allocate(id, position, size)` | **Auto placement**: caches by id; `x = position.x ?? 24`; if `position.y` undefined, `y = cursorY` and `cursorY += size.height + 16`. |
| `ensure(id, initial)` | Register geometry if missing. Safe during render because it never notifies. |
| `update(id, patch)` | Merge patch into the element; no-op if no value changed; **if the widget is solid and visible and it grew or appeared, calls `pushAside`**; emits once. |
| `pushAside(seedId)` (internal) | Calls `resolveSolid` from `solid.js` and writes the new x/y of the pushed widgets into the Map. Returns true if anything moved. Does not emit. |
| `mount(id)` | If the element is solid and visible, pushes neighbours aside (and emits if something moved). Counts mounts; returns an unmount function that removes the element on a microtask if the count is zero (StrictMode-safe). |

## 5.6 `src/createWidget.jsx` (the engine)

`createWidget({ type, defaults, meta, render, builtIn })`:

1. **Registers** the type (`registerWidget`) at creation time (module load).
2. Returns the `Widget` component. For each render of a widget it does, in order:

| Step | Code concept | Source of... |
|------|--------------|--------------|
| Split props | layout props vs `...content` | which props are "layout" vs "content" |
| Context | `store`, `config` from `useUIContext` | global config |
| Identity | `useId()`; `id = idProp ?? store.nameFor(reactId, type)`; `isAutoId` | auto ids like `text-1` |
| Merge | `cfg = mergeLayoutConfig(defaultUIConfig, defaults, config, props)` | defaults + precedence |
| Placement | `spot = store.allocate(id, cfg.position, cfg.size)` | automatic coordinates |
| Register | `store.ensure(id, initial)` | initial geometry in the store |
| Subscribe | `useSyncExternalStore` for this element, page deployed, master drag, master resize, selected | live updates |
| Rules | `editable`, `canDrag`, `canResize` | all deploy/hidden/drag/resize permissions |
| Mount | `useEffect(() => store.mount(id))` | cleanup on unmount |
| Sync flags | `useLayoutEffect` updating `isDraggable/isResizable/deploy/hidden/solid` in the store when they change (this is also what triggers solid pushes when `solid` or `hidden` flips) | runtime `isDraggable={state}` etc. |
| Hide cleanup | effect: when `hidden` becomes true, clear hover and selection | no stuck tools after re-show |
| Follow props | effect on `position.x/y`, `size.width/height` props (skips first run) | pasting numbers moves the widget; dynamic position props |
| Callbacks | effect on `el.x/y/width/height` comparing with previous | `onPositionChange`, `onSizeChange`, `onLayoutChange` |
| Gestures | `begin(e, mode)` with window listeners | drag + resize |
| Pointer routing | wrapper `onPointerDown` selects and starts drag; handles `stopPropagation` and start resize | edit vs click separation |
| Click guard | `onClickCapture` + `suppressClick` | drag is not a click |
| Overlay | `<pre data-testid="ui-overlay">` | geometry readout |
| Render | `<Render {...content} widget={...} />` inside an `overflow: hidden` div | your content |

DOM structure of every widget:

```
<div data-ui-widget="Text" data-ui-id="heading"   style="position:absolute; left; top; width; height; outline...; display:none when hidden">
  <div style="width:100%; height:100%; overflow:hidden">   <- content clip
    <Render ...content widget={...} />
  </div>
  <pre data-testid="ui-overlay">...</pre>                  <- only when tools show
  <div data-ui-handle="se" data-testid="ui-handle-se" /> x8 <- only when tools show and canResize
</div>
```

The values the engine computes:

```js
editable  = !pageDeployed && !cfg.deploy && !cfg.hidden
canDrag   = editable && cfg.isDraggable && masterDrag
canResize = editable && cfg.isResizable && masterResize
showTools = editable && (hovered || selected || active)
```

## 5.7 `src/Canvas.jsx`

- `Canvas`: wraps itself in a `UIProvider` only if no context exists above.
- `CanvasInner`: registers its DOM node (`store.setCanvasElement`), pushes the `deploy` prop to the store (`setPageDeployed`), reads `maxBottom`/`maxRight` to size itself in page mode, deselects when you press on empty canvas (`e.target === e.currentTarget`), draws the grid only while not deployed.
- Connects to real-time sync providers: invokes `useSocketUI({ socket, socketUrl, socketEvent, event })` and `useMqttUI({ client: mqttClient, mqttUrl, mqttTopic: mqttTopic || topic, mqttOptions })`.
- Default mode: page mode unless `width` or `height` is passed (`fullPage ?? (width === undefined && height === undefined)`).

## 5.8 `src/hooks.js`

- `useUIElement(id)` -> subscribes to one element; `toGeometry(el)` memoized by element identity.
- `useUILayout()` -> subscribes to the store **version** (every change); returns arrays/functions listed in `01-capabilities.md`. Exports are computed on demand with `buildExport(store, options)`.
- `useUIConfig()` -> `mergeLayoutConfig(defaultUIConfig, config)` memoized on `config`.

## 5.9 `src/export.js`, `src/reference.js`, `src/registry.js`

- `toGeometry(el)` -> `{ id, type, position, size, isDraggable, isResizable, deploy, hidden, solid }` or `null`.
- `toJSXSnippet(el)` -> `<UI.Type id? position size />` (tag is `UI.Type` for `builtIn` widgets, else the bare type; `id` only if not auto).
- Export entries have `settings` (the original three flags, exact keys locked by a test) and `extras` (`hidden`, `solid`); `reference.layoutProps` is likewise unchanged and the new props are documented in `reference.layoutPropsExtra` (`layoutPropsExtraReference()` in `reference.js`).
- `buildExport(store, { includeReference })` -> the JSON object (see `01-capabilities.md` 1.10). Uses `registry` for each widget's `defaults` and `meta`, and `reference.js` for layout docs.
- `copyText(text)` -> tries `navigator.clipboard.writeText`, then falls back to a hidden textarea + `document.execCommand("copy")`; resolves true/false.
- `reference.js` -> `layoutPropsReference(defaults)` (shows the widget's real merged defaults), `layoutCallbacksReference`, `hooksReference(id)`.
- `registry.js` -> a module-level `Map` of type -> `{ defaults, meta, builtIn }` filled by `createWidget`.

## 5.10 Widgets

### `Text.jsx`
`TextContent` renders one allow-listed tag (`TAGS`) with inline styles; `OVERFLOW` maps `overflow` to CSS (`wrap`, `ellipsis`, `clip`, `scroll`). `children ?? text ?? "Text"` is rendered as a text node. `createWidget({ type: "Text", builtIn: true, defaults: { size: {240, 40} }, meta, render: TextContent })`.

### `Button.jsx`
`ButtonContent` renders a real `<button>`; `VARIANTS` supplies colors; `color`/`backgroundColor`/`style` override in that order; `loading` disables and shows "Loading..."; `disabled || loading` sets `disabled` and a not-allowed cursor. Default size 140 x 44.

## 5.11 Panels

- `MasterPanel`: three checkboxes bound to `store.setMaster`; fixed position; hidden if `store.getCanvasDeployed()`.
- `ExportPanel`: uses `useUILayout()` to build JSON; **Copy JSX** maps `store.getElements()` through `toJSXSnippet`; hidden if `pageDeployed`.

## 5.12 Default vs. non-default functionality at a glance

| Behaviour | Default (no props) | Non-default way to change it |
|-----------|--------------------|------------------------------|
| Size | widget default (Text 240x40, Button 140x44, else 240x80) | `size={{...}}` on the widget; `config.size` on provider |
| Position | auto stacked from (24, 24) | `position={{ x, y }}` (partial ok) |
| Dragging | on | `isDraggable={false}`; provider `config.isDraggable`; MasterPanel; deploy |
| Resizing | on | `isResizable={false}`; provider; MasterPanel; deploy |
| Visibility | shown | `hidden` (widget, provider config) |
| Pushing neighbours | off | `solid` (widget, provider config) |
| Edit tools | on | `deploy` on widget, `<UI.Canvas deploy>`, MasterPanel "Deploy whole page" |
| Id | `type-n` | `id="..."` |
| Content | per widget content defaults | content props |
| Canvas size | whole page | `width` / `height` / `fullPage` |

## 5.13 `src/solid.js`

Pure functions, no React, no store access.

- `SOLID_GAP` (0): pixels between a solid widget and the widgets it pushes.
- `resolveSolid(elements, seedId, { gap })` -> `Map<id, {x, y}>` of the widgets that must move.
  - Copies the rects, skips hidden ones. The seed never moves.
  - Queue starts with the seed (no direction). For each widget `w` overlapping the current pusher `p`: direction = the pusher's direction, or (for the seed) `pickDirection(p, w)`; `shift(w, p, dir)` puts `w` flush against `p` on that side; `w` is queued as a new pusher with the same direction.
  - `pickDirection` computes the move needed on each side and takes the smallest (ties: right, down, left, up). Left/up are disallowed when the result would be below 0.
  - `shift` clamps left/up at 0. Step limit `MAX_STEPS` (500) guarantees termination.
- Who calls it: `store.js` `pushAside` (from `update` and `mount`). Nothing else.

## 5.14 Real-time Synchronization Hooks

### `src/useSocketUI.js`
- Subscribes to Socket.IO backend events (default event: `'renderReactUI'`).
- Props: `socket` (existing socket instance), `socketUrl` (URL string), `socketEvent` / `event` (custom event name), `autoConnect`.
- On receiving payload: calls `store.applySocketUpdates(data)`.

### `src/useMqttUI.js`
- Connects to an MQTT broker over WebSockets (or uses an existing `client`) and subscribes to topic (default: `'renderReactUI'`).
- Props: `client` / `mqttClient`, `mqttUrl` / `url`, `mqttTopic` / `topic` (supports wildcards like `+` / `#`), `mqttOptions`, `autoConnect`.
- On receiving message: parses JSON payload and calls `store.applySocketUpdates(data)`.
- Helper: `matchesMqttTopic(pattern, topic)` checks topic match against wildcards.
