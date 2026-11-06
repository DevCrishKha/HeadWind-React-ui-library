# 7. Pitfalls, Gotchas and Known Limitations

What can break if the library is used wrongly, and behaviours that look like bugs but are current behaviour. Items marked **[verified]** were reproduced by running code against the library. Items marked **[from code]** are derived from reading the source. Items marked **[untested]** are expected from how browsers behave and have not been tried.

> For AI agents: nothing in this file is a licence to "fix" existing behaviour. Report it and ask (see `DEVELOPMENT_RULES.md` sections 4 and 7).

---

## 1. Setup and structure

| # | Pitfall | Why | What to do |
|---|---------|-----|-----------|
| 1.1 | `@devcrish/headwind: widgets and hooks must be used inside <UI.Canvas> or <UIProvider>.` error | Widgets, hooks and panels read the store from context. | Render widgets inside `<UI.Canvas>` (or inside `<UIProvider>`), and call hooks only in components below one of them. A hook in a sibling **above** the provider throws. |
| 1.2 | Two canvases in one `UIProvider` behave wrongly **[from code]** | The store has one `canvasEl`, one page-deploy flag, one auto-placement cursor, one selection. `getMaxBottom/Right` mix all widgets. | **One provider per canvas.** Wrap a second canvas in its own `<UIProvider>`. |
| 1.3 | Full-page canvas hides other page content **[from code]** | Page mode is `position: absolute; top:0; left:0; width:100%; min-height:100dvh` with a white background. | Put your content inside the canvas as widgets, or use box mode (`width`/`height`). Set `body { margin: 0 }`. |
| 1.4 | Box-mode canvas inside a `transform`ed or scaled parent gives wrong drag values **[untested]** | Drag uses pointer pixel deltas 1:1; a CSS `scale()` or zoom makes 1 screen px != 1 canvas px. | Do not scale ancestors of an editable canvas. Deploy before scaling. |
| 1.5 | Panels placed in a clipped/transformed ancestor mispositions **[untested]** | `MasterPanel` / `ExportPanel` are `position: fixed`. | Put panels directly inside `UIProvider` or at the top level of the canvas. |
| 1.6 | `npm test` passing does not prove the package build works | Tests and dev server use an alias to `src/`, not `dist/`. | Run `npm run build:lib` after packaging changes. |
| 1.7 | The example opens locked with no panels **[from code]** | `example/App.jsx` uses `<UI.Canvas deploy={true}>`, which deploys the page; `MasterPanel` and `ExportPanel` both hide themselves when the page is deployed in code, so there is no way to turn editing back on from the UI. | Change that prop to `deploy={false}` (or remove it) locally to edit. `FullDemo.jsx` has working toggles. (Not edited here; owner decision.) |

## 2. Ids and identity

| # | Pitfall | Why | What to do |
|---|---------|-----|-----------|
| 2.1 | **Duplicate `id`s share one geometry record** **[verified]** | The store is a Map keyed by `id`. Two widgets with `id="d"` render two DOM nodes but `useUILayout().elements` has one element; they move together and one overrides the other. | Make every explicit `id` unique per provider. |
| 2.2 | Auto ids change if you reorder, add or remove widgets **[from code]** | `text-1`, `text-2` ... are assigned in first-render order per type. | Give an explicit `id` to anything you read via `useUIElement`, log, or export for later. |
| 2.3 | Conditionally rendered auto-id widgets get a **new** id every time they mount **[from code]** | `nameFor` is keyed by the React instance id and the per-type counter never decreases. | Use an explicit `id`. |
| 2.4 | Exported JSX omits `id` for auto-id widgets **[from code]** | `toJSXSnippet` only prints `id` when you gave one. When you paste JSX for several widgets, you must map lines to the right widgets yourself (order = mount order). | Give widgets explicit ids before exporting. |

## 3. Layout, coordinates and state

| # | Pitfall | Why | What to do |
|---|---------|-----|-----------|
| 3.1 | **Resizing from the west/north handle can push `x`/`y` negative** **[verified]** (x = -40 after dragging the west handle past the left edge) | Move is clamped to `>= 0`; resize is not. | Keep resizing within the canvas, or review exported numbers. A negative value is exported as is. |
| 3.2 | **Unmounting a widget discards its dragged geometry** **[verified]** (dragged to 104,104; after unmount/remount it returned to its originally allocated 24,24) | On unmount the element is deleted from the store; remount re-creates it from allocation/props. | Hardcode geometry (`position`/`size` props) for widgets that appear and disappear, or keep them mounted and hide with CSS/state. |
| 3.3 | Changing the **provider's** `size`/`position` after widgets mounted does **not** resize them **[verified]** (width stayed 100 after provider width changed to 500) | The store is initialised once per widget (`ensure`). Only the **widget's own** `position`/`size` props are followed afterwards. Flags (`isDraggable`, `isResizable`, `deploy`) do update live. | Set size/position through each widget's props, or remount. Use provider config for flags and initial defaults. |
| 3.4 | Removing a `size`/`position` prop (setting it back to `undefined`) does not restore defaults | The follow-props effect only applies **defined** values. | Give the value you want explicitly. |
| 3.5 | Changing a widget's `position` prop **is** applied immediately and overrides a dragged position **[from code]** | Prop changes are followed. A re-render with the *same* prop values does not reset anything. | After pasting numbers, source and screen agree. Avoid computing `position` from fast-changing state unless you want it to follow. |
| 3.6 | Auto placement never "reuses" gaps **[from code]** | `cursorY` only grows; unmounted widgets do not free space; explicit-`y` widgets do not advance it. The cursor ignores where you dragged things. | Use explicit positions for anything that matters (this is the whole point of hardcoding). |
| 3.7 | A global `position` in `UIProvider config` puts every widget at the same spot | Provider config merges as a layer for all widgets. | Do not set `position` globally; set `size` and flags only. |
| 3.8 | Fixed pixel layout is **not responsive** | Absolute pixel positions inside a canvas. The canvas keeps its layout; it does not reflow. | Design for a target width, use box mode with a fixed size, or build a separate layout per breakpoint. Do not claim responsiveness. |
| 3.9 | Drag clamps to `x,y >= 0` but has no upper bound | The page canvas grows to fit. | Expect the page to scroll if widgets are dragged far out. |
| 3.10 | Minimum widget size on resize is 20 px | `MIN_SIZE`. | Initial `size` props below 20 are accepted but cannot be re-created by resizing. |
| 3.11 | Layout values are integers after interaction but can be fractional if given by props | Interactions round; props are used as given. | Prefer integers. |

## 4. Interaction conflicts (important for form, slider and chart widgets)

| # | Pitfall | Why | What to do |
|---|---------|-----|-----------|
| 4.1 | **A pointer press anywhere inside an editable widget starts a layout drag** (after moving 4 px) **[from code]** | The wrapper handles `onPointerDown` for the whole box, including inputs, sliders, charts, text selection, scrollbars. Buttons are fine because a click does not move 4 px. | For widgets with internal drag gestures, stop the pointer event from reaching the wrapper in **your render component** (for example `onPointerDown={(e) => e.stopPropagation()}` on the interactive element, only while you do not want layout drag), or give such widgets `isDraggable={false}`. A reusable "no-drag zone" mechanism does not exist; adding one means changing `createWidget.jsx` (needs owner approval). |
| 4.2 | Dragging inside a text input selects text **and** may move the widget **[from code]** | `userSelect` is only disabled on `body` after the drag threshold; there is no `preventDefault` on pointer-down. | Same as 4.1. |
| 4.3 | Touch scrolling is disabled on draggable widgets in edit mode | `touchAction: "none"` while `canDrag`. | Expected in edit mode; deploy to restore. |
| 4.4 | Disabled controls may not forward pointer events in some browsers **[untested]** | Browser behaviour for `<button disabled>`/`<input disabled>`. | Test in your target browsers. |
| 4.5 | No keyboard way to move or resize, no touch-specific testing, no screen-reader announcement for editing | Not built. | Editing is a developer tool; deploy removes it. |

## 5. Rendering and styling

| # | Pitfall | Why | What to do |
|---|---------|-----|-----------|
| 5.1 | **Content is clipped to the widget box** | The wrapper's inner div is `overflow: hidden`. | Make content fit, or use scrolling inside your content. |
| 5.2 | **Dropdowns, tooltips, popovers, modals, date pickers rendered inside a widget get clipped** | Same `overflow: hidden`. | Render floating UI with a portal to `document.body`, with its own stacking (use z-index above 1000 while editing; panels are 2000). |
| 5.3 | `style` and `className` on a widget go to the **content**, not to the positioned wrapper **[from code]** | Only layout props are consumed by the wrapper; everything else is passed to `render`. | Style your root element. Use the layout props for position/size. |
| 5.4 | Root of a custom render component must fill the box | Wrapper inner div is 100% x 100%. | `width: 100%; height: 100%; box-sizing: border-box`. Do not set pixel sizes on the root. |
| 5.5 | Reserved content prop names | `id`, `position`, `size`, `isDraggable`, `isResizable`, `deploy`, `hidden`, `solid`, `onPositionChange`, `onSizeChange`, `onLayoutChange` are consumed by the wrapper; `widget` is overwritten by it. | Choose different content prop names. |
| 5.6 | A widget's render component re-renders on every drag frame **[from code]** | It receives a new `widget` object each time. | Memoize heavy children (`React.memo`), avoid expensive work in render. |
| 5.7 | `<UIProvider config={{...}}>` with an inline object re-creates the context value on every parent render | `useMemo` depends on the `config` identity. | Define the config object outside the component or `useMemo` it. It causes extra renders, not wrong results. |
| 5.8 | `useUILayout()` re-renders on **every** store change | Subscribes to the store version. | Use it only in small components (panels, debug readouts); use `useUIElement(id)` for one widget. |
| 5.9 | `Text`: `text=""` renders empty; `text={null}`/`undefined` renders the fallback `"Text"` | `children ?? text ?? "Text"` (nullish coalescing). | Pass `""` explicitly if you want empty text. |
| 5.10 | Invalid `as` (Text) or `variant` (Button) silently falls back | Allow-list with fallback. | Check spelling; there is no warning. |

## 6. Creating widgets

| # | Pitfall | Why | What to do |
|---|---------|-----|-----------|
| 6.1 | **`createWidget` inside a component** remounts the widget on every render | A new component type is created each time. | Call it once at module top level. |
| 6.2 | Duplicate `type` names | The registry entry is overwritten; counters are shared. | Unique `type` per widget. |
| 6.3 | Forgetting `builtIn: true` for library widgets | JSX export prints the bare type name. | Set it for widgets inside the library only. |
| 6.4 | Custom widget copy-JSX tag is the bare `type` | Assumes your component variable has the same name. | Name it the same or edit the pasted tag. |
| 6.5 | The registry is global to the module instance | `availableWidgetTypes` in an export lists **every** type created in the app (and, in tests, across tests), not only those on the canvas. | Informational only. |
| 6.6 | `sideEffects: false` and top-level `createWidget` | A module that is only imported for its side effect (registration) can be dropped by a bundler. | Import and use the widget component, not just the module. |
| 6.7 | `UI` is one object that references every built-in widget | Importing `UI` pulls all built-in widgets (tree-shaking of `UI.*` members is not possible). | Fine today (2 widgets). Heavy future widgets (charts, maps, editors) **must** live in separate entry points with optional peer dependencies. |

## 7. Data and security

| # | Pitfall | What to do |
|---|---------|-----------|
| 7.1 | The library trusts nothing from the backend only if you keep it that way | Render as text. Never put backend strings into `dangerouslySetInnerHTML`, `eval`, `new Function`, or dynamic import. Allow-list tags, variants and URL schemes. Do not let backend JSON choose arbitrary component types or arbitrary inline CSS without validation. |
| 7.2 | URLs from data (future Image/Link/Video widgets) | Validate scheme (`http`, `https`, `mailto`, `tel`, relative). Block `javascript:` and `data:` for links. |
| 7.3 | Forms (future) | Never transmit data without an explicit application handler. |
| 7.4 | The JSON export contains your layout and widget ids, not your content | Safe to share; still do not paste it blindly into untrusted tools. |
| 7.5 | Clipboard needs a secure context | `navigator.clipboard` works on https/localhost; otherwise the fallback `execCommand("copy")` is used and may fail (the panel shows "Copy failed"). |

## 8. Deploy and runtime-switch semantics people get wrong

| # | Misconception | Reality |
|---|---------------|---------|
| 8.1 | "Provider `deploy: true` deploys the page." | It only sets the **default per-widget** `deploy`. A widget can override with `deploy={false}`. Page deploy is `<UI.Canvas deploy>` or the master panel. |
| 8.2 | "Turning page deploy off makes everything editable." | Only widgets that are not individually deployed become editable again. |
| 8.3 | "MasterPanel Dragging ON forces dragging." | It only removes the ability when OFF. A widget with `isDraggable={false}` stays locked. |
| 8.4 | "`deploy` removes the widget wrapper." | The wrapper stays (absolute, same size). Only tools are removed. |
| 8.5 | "`isDraggable={false}` also stops selecting." | Selecting and the overlay still work in edit mode; only the drag is disabled. |
| 8.6 | "Canvas `deploy` prop false un-deploys the page after the panel deployed it." | `pageDeployed = canvasDeploy OR master.deploy`; either one deploys. |
| 8.7 | Canvas `deploy` is not reset when the Canvas unmounts **[from code]** | The flag lives in the store (owned by the provider). Remounting a canvas under the same provider re-sets it from its prop. |

## 9. Not built / out of scope today

- All widgets in the specification except `Text`, `Button`, and `ParentPanel`.
- TypeScript types.
- Snap-to-grid, alignment guides, multi-select, undo/redo, z-order, keyboard nudging.
- Persistence/backend for layouts (by design: copy and paste into source).
- Tests for: real browsers, touch devices, CSS transforms, RTL, disabled controls, `dist/` build.

## 10. `ParentPanel` (nested containers)

| # | Pitfall | Why | What to do |
|---|---------|-----|-----------|
| 10.1 | Explicit absolute child positions can be overridden in `reflow` mode | Reflow mode calculates fluid positions based on available width and flexbox wrap. | Use `childResizeMode="clip"` or `"fixed"` if strict manual pixel positions are required. |
| 10.2 | Child drag vs. parent drag | Child widgets capture pointer events on their box to drag independently. | Use the explicit parent drag handle bar at the top of the `ParentPanel` to move the parent and the entire group. |
| 10.3 | Content clipped in `clip` mode | In `clip` mode the container has `overflow: hidden`. | If children need to extend outside the panel or scroll, set `childResizeMode="fixed"` with `overflow="visible"`, `overflow="auto"`, or `overflow="scroll"`. |

## 10. `hidden` and `solid`

| # | Pitfall | Why | What to do |
|---|---------|-----|-----------|
| 10.1 | A hidden widget is **still mounted** | `hidden` uses `display: none`. Its timers, effects, subscriptions and fetches keep running. | Use conditional rendering (`{show && <UI.X/>}`) if it should unmount, but see 3.2: unmounting discards dragged geometry. |
| 10.2 | A hidden auto-placed widget still leaves its slot empty | Auto placement allocates once per id and never frees. | Set explicit positions. |
| 10.3 | You cannot select or move a hidden widget in the UI | It is not editable. | Un-hide it with the prop or state to edit it. |
| 10.4 | `solid` pushes when the solid widget **grows, appears, loads overlapping, or is dragged** | Shrinking is excluded so widgets do not pull back. Non-solid widgets do not push when dragged. | Drag a solid widget over neighbours to push them aside. |
| 10.5 | Shrinking a solid widget does not pull neighbours back **[verified]** | Pushes are one-way. | Drag them back or change their positions. |
| 10.6 | Pushed positions are not written to your source **[from code]** | The store holds them; JSX props stay as typed. | Use the export / Copy JSX after tuning. |
| 10.7 | A solid widget loading on top of others moves them at load | Mount-time resolve (same JSX gives the same result). A widget intentionally layered on a solid one is shifted. | Make the layered widget not overlap, or do not mark the lower one `solid`. |
| 10.8 | A pushed widget moves away from its own `position` prop | The pushed value is live state. If you later change that widget's `position` prop, the new prop value wins. | Hardcode the pushed numbers. |
| 10.9 | Pushing left/up stops at the canvas edge **[verified: pushes down instead when left would go negative]** | Coordinates are clamped to `>= 0`. | Leave room, or start widgets further from the edge. |
| 10.10 | Pushing can make the canvas taller or wider | Pushed widgets move right/down. In full-page mode the page grows; in box mode it scrolls. | Expected. |
| 10.11 | Everything can be pushed, including `isDraggable={false}` or deployed widgets **[verified]** | Pushing is layout, not editing. | Do not mark a widget `solid` if neighbours must stay exactly where they are. |
| 10.12 | A provider-level `solid: true` makes **every** widget solid | Provider config is a default layer. | Prefer per-widget `solid`; override with `solid={false}`. |
| 10.13 | Crowded layouts are best effort | Step limit and edge clamp (see 6.18). | Space things out; report odd cases. |
| 10.14 | Export `settings` and `reference.layoutProps` do not list `hidden`/`solid` | Existing tests lock those exact keys. They are in `extras` and `reference.layoutPropsExtra`. | Read those keys. Copy JSX prints only `id`, `position`, `size`; add `solid`/`hidden` yourself. |

## 11. Troubleshooting quick list

| Symptom | Likely cause |
|---------|--------------|
| Widgets stuck, no overlay, no panels | Page deployed (`<UI.Canvas deploy>` or master deploy). In code, deploy hides both panels. |
| Two widgets move together | Duplicate `id`. |
| Widget jumped back to old place after toggling visibility | Unmount discarded its geometry (3.2). |
| Position/size changes from `UIProvider config` ignored for existing widgets | 3.3. |
| Dropdown/tooltip cut off | 5.2. |
| Dragging a slider/input moves the widget | 4.1. |
| Content clipped | 5.1 / 5.4. |
| Negative x/y in export | 3.1. |
| JSX export has no id | 2.4. |
| Hook throws about Canvas/Provider | 1.1. |
| Widget state resets every render | 6.1 (`createWidget` inside a component). |
| Widget invisible but its geometry still reported | `hidden` is true (10.1). |
| Neighbours did not move when I dragged a solid widget over them | By design (10.4). |
| Neighbours moved when the page loaded | A solid widget overlaps them (10.7). |
| Partial socket update erased other nested fields | Socket payload sent partial sub-keys of a nested object; `store.applySocketUpdates` shallow-merges top-level props only (12.1). |

## 12. Socket.IO Real-Time Updates and Nested Properties

| # | Pitfall | Why | What to do |
|---|---------|-----|-----------|
| 12.1 | **Emitting partial sub-keys of a nested object property erases unmentioned sibling keys** **[from code]** | `store.applySocketUpdates()` performs a **1-level shallow spread** (`{ ...old.props, ...contentProps }`). Sibling sub-keys within nested objects (e.g., `config: { a: 1, b: 2 }`) are replaced rather than recursively merged. | **Option A**: Send the complete nested object from the backend (`{ config: { a: 1, b: 3 } }`).<br>**Option B (Recommended)**: Flatten widget props (`configA={1}`, `configB={2}`).<br>**Option C**: Merge with defaults inside the widget's render component. |
| 12.2 | **N-level nested property paths (e.g., `"data.theme.color"`) are not supported** **[from code]** | `applySocketUpdates` processes direct keys and does not parse dot-separated paths. | Send props as flat keys or structured objects mapped directly to component prop names. |
| 12.3 | **Nested `position` or `size` vs custom nested objects** **[from code]** | `position: { x, y }` and `size: { width, height }` have explicit 1-level checks in `applySocketUpdates` to preserve the other dimension; arbitrary content props do not. | Rely on partial updates for coordinates/size or flat keys (`x`, `y`, `width`, `height`), but treat all custom nested content objects as whole-value replacements. |

## 13. MQTT Real-Time Synchronization

| # | Pitfall | Why | What to do |
|---|---------|-----|-----------|
| 13.1 | **Connecting to TCP port (e.g. `1883`) in the browser fails** **[verified]** | Browsers cannot open raw TCP sockets; MQTT clients in the browser connect over WebSockets (`ws://` or `wss://`, e.g. Mosquitto port 9001). | In React `<UI.Canvas>`, pass `mqttUrl="ws://localhost:9001"`. Use TCP port 1883 only from backend publishers (e.g. Python scripts). |
| 13.2 | **Published MQTT message did not update widgets** **[from code]** | The message was published to a topic other than the subscribed topic (default: `'renderReactUI'`). | Ensure both publisher and `<UI.Canvas>` agree on the same topic. Also make sure to start the mosquitto mqtt server with the right config else the ws port `9001` does not work by default. You will have to specify to use the websocket port in the `monquitto.conf` file and also write the docker run command in the perfect manner to tell docker to use that conf file while spinning the container. |
| 13.3 | **Non-JSON or malformed payload** **[from code]** | MQTT payloads arrive as buffers; `useMqttUI` parses JSON string from the buffer. If parsing fails, a console warning is logged and the update is ignored. | Send valid JSON strings from the publisher (`json.dumps(payload)`). |


