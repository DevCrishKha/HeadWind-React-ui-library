# 8. JSX to Socket Payload Reference Guide

This document describes how to convert JSX snippets (such as those copied or inspected from `UI.InspectorPanel`) into the JSON / Python dictionary payloads accepted by the real-time Socket.IO backend (`example/backend/app.py`).

---

## 1. Overview

When you select any widget in edit mode on the `<UI.Canvas>`, the `UI.InspectorPanel` allows viewing and copying the widget's full JSX code.

To dynamically update existing widgets or create new widgets from the backend in real-time, the backend broadcasts a list of objects over Socket.IO on the event **`'renderReactUI'`**:

```python
socketio.emit("renderReactUI", payload)
```

The React library listens for this event via `Canvas` (configured with `socketUrl` or `socket` prop) and updates the internal layout store (`store.applySocketUpdates()`).

To listen on a custom Socket.IO event instead of `'renderReactUI'`, pass `socketEvent="customEvent"` (or `event="customEvent"`) to `<UI.Canvas>` or to `useSocketUI({ socketEvent: "customEvent" })`.

---

## 2. Property Mapping Cheat Sheet

| JSX Attribute / Prop | Socket Payload Key | Type | Description |
| :--- | :--- | :--- | :--- |
| `<UI.Widget ... />` | `"type"` | `string` | The widget component type: `"Text"`, `"Button"`, `"ParentPanel"`, or custom. |
| `id="myWidget"` | `"id"` | `string` | Unique identifier of the widget (required). |
| `position={{ x: 100, y: 200 }}` | `"x"`, `"y"` | `number` | **Flat coordinates** at the payload root level. |
| `size={{ width: 300, height: 150 }}` | `"width"`, `"height"` | `number` | **Flat dimensions** at the payload root level. |
| *(Inside a `ParentPanel`)* | `"parentId"` | `string` | The `id` of the parent container. Local `x` and `y` become container-relative. |
| `solid` / `solid={true}` | `"solid"` | `boolean` | When `True`, pushes overlapping neighbouring widgets aside. |
| `hidden` / `hidden={true}` | `"hidden"` | `boolean` | When `True`, hides the widget while preserving its state. |
| `isDraggable={false}` | `"isDraggable"` | `boolean` | Disable dragging for this widget. |
| `isResizable={false}` | `"isResizable"` | `boolean` | Disable resize handles for this widget. |
| `deploy` | `"deploy"` | `boolean` | Deploy mode for the individual widget (removes handles/overlay). |
| Content props (`text`, `color`, `fontSize`, `variant`, `title`, etc.) | Direct keys | `any` | All content properties are specified directly at root level. |

> [!NOTE]
> Unlike JSX where coordinates and dimensions are grouped under `position={{ x, y }}` and `size={{ width, height }}`, the Socket.IO payload flattens them directly to `"x"`, `"y"`, `"width"`, and `"height"`. Both `variant` and the alias `varient` are supported for buttons.

---

## 3. Practical Conversion Examples

### Example 1: Basic Text Widget

**Inspector JSX:**
```jsx
<UI.Text
  id="heading"
  position={{ x: 156, y: 29 }}
  size={{ width: 280, height: 60 }}
  text="Welcome to the App"
  fontSize={36}
  fontWeight={700}
  color="#0f172a"
/>
```

**Socket Payload (`app.py`):**
```python
{
    "id": "heading",
    "type": "Text",
    "x": 156,
    "y": 29,
    "width": 280,
    "height": 60,
    "text": "Welcome to the App",
    "fontSize": 36,
    "fontWeight": 700,
    "color": "#0f172a",
}
```

---

### Example 2: Interactive Solid Button

**Inspector JSX:**
```jsx
<UI.Button
  id="submitOrder"
  position={{ x: 40, y: 220 }}
  size={{ width: 150, height: 44 }}
  variant="primary"
  text="Place Order"
  solid
/>
```

**Socket Payload (`app.py`):**
```python
{
    "id": "submitOrder",
    "type": "Button",
    "x": 40,
    "y": 220,
    "width": 150,
    "height": 44,
    "variant": "primary",
    "text": "Place Order",
    "solid": True,
}
```

---

### Example 3: Nested ParentPanel and Children

When nesting widgets inside a `UI.ParentPanel`, provide the parent container definition and then reference it using `"parentId"` on the child items:

**Inspector JSX:**
```jsx
<UI.ParentPanel
  id="workspace"
  position={{ x: 40, y: 320 }}
  size={{ width: 680, height: 340 }}
  childResizeMode="reflow"
  backgroundColor="#172554"
  opacity={0.95}
  title="Workspace Panel"
>
  <UI.Text
    id="panelHeading"
    position={{ x: 20, y: 20 }}
    text="Nested Child Title"
    color="#38bdf8"
    fontSize={20}
  />
  <UI.Button
    id="panelBtn"
    position={{ x: 20, y: 70 }}
    size={{ width: 140, height: 44 }}
    text="Child Action"
    variant="secondary"
  />
</UI.ParentPanel>
```

**Socket Payload (`app.py`):**
```python
payload = [
    # 1. Container Panel
    {
        "id": "workspace",
        "type": "ParentPanel",
        "x": 40,
        "y": 320,
        "width": 680,
        "height": 340,
        "childResizeMode": "reflow",
        "backgroundColor": "#172554",
        "opacity": 0.95,
        "title": "Workspace Panel",
    },
    # 2. Child Text Widget (Notice parentId and container-relative coordinates)
    {
        "id": "panelHeading",
        "type": "Text",
        "parentId": "workspace",
        "x": 20,
        "y": 20,
        "text": "Nested Child Title",
        "color": "#38bdf8",
        "fontSize": 20,
    },
    # 3. Child Button Widget
    {
        "id": "panelBtn",
        "type": "Button",
        "parentId": "workspace",
        "x": 20,
        "y": 70,
        "width": 140,
        "height": 44,
        "text": "Child Action",
        "variant": "secondary",
    },
]
```

---

## 4. Partial Updates vs Auto-Creation

- **Updating Existing Widgets**: You only need to send the `"id"` and the specific fields you want to update (e.g. `{"id": "heading", "text": "New Text"}`). All untouched properties (position, size, colors) remain untouched.
- **Creating New Widgets**: If the `"id"` does not exist on the canvas, the library creates a new component. Supplying `"type"` (`"Text"`, `"Button"`, `"ParentPanel"`, etc.) ensures the correct widget is instantiated. If omitted, the library infers the widget from the id and props.

---

## 5. Nested Properties & Shallow vs. Deep Merging

When updating components via the `'renderReactUI'` event, it is crucial to understand how property merging operates internally in `store.applySocketUpdates()`.

### A. Shallow Merging Behavior (Root Level Only)
The library merges incoming content properties into component props using a **1-level shallow spread**:

```javascript
const nextProps = { ...(old.props || {}), ...contentProps };
```

* **Top-Level Flat Props (Recommended)**:
  If your widget defines flat props, partial updates work seamlessly without data loss:
  ```json
  // Initial state: { id: "card1", title: "Overview", count: 10, theme: "dark" }
  // Backend emits:
  { "id": "card1", "count": 11 }
  // Resulting props: { id: "card1", title: "Overview", count: 11, theme: "dark" }
  ```
  `title` and `theme` remain untouched.

* **Nested Prop Objects (e.g., `config`, `style`, `data`)**:
  `store.js` does **not** perform recursive N-level deep merging. If you emit a partial sub-key inside a nested object, the new nested object **replaces** the previous one:
  ```json
  // Initial state: { id: "card1", config: { theme: "dark", showHeader: true } }
  // Backend emits partial sub-key:
  { "id": "card1", "config": { "theme": "light" } }
  // Resulting props:
  { "id": "card1", "config": { "theme": "light" } } // ❌ "showHeader" was erased!
  ```

### B. Best Practices for Nested Data

1. **Send the Complete Nested Object from the Backend**:
   When updating nested structures, always send the entire nested object rather than partial sub-keys:
   ```json
   {
     "id": "card1",
     "config": {
       "theme": "light",
       "showHeader": true
     }
   }
   ```
2. **Flatten Widget Properties**:
   Follow the standard library design pattern by exposing properties at the root level (`theme="dark"`, `showHeader={true}`) instead of bundling them inside a single configuration object.
3. **Merge Defaults Inside the Widget**:
   For widgets that require nested configuration objects, perform the deep merge with defaults inside the widget's render component:
   ```jsx
   function MyCardContent({ config, ...props }) {
     const mergedConfig = {
       ...DEFAULT_CONFIG,
       ...(config || {}),
       nestedOptions: {
         ...DEFAULT_CONFIG.nestedOptions,
         ...(config?.nestedOptions || {}),
       },
     };
     return <div>{/* render using mergedConfig */}</div>;
   }
   ```

### C. Exceptions: Special Handling in `applySocketUpdates`
* **`position: { x, y }` and `size: { width, height }`**: The store explicitly checks `position.x`, `position.y`, `size.width`, and `size.height`. Emitting `{ "id": "w1", "position": { "x": 100 } }` updates `x` while preserving `y`.
* **Container Nesting (`parentId`)**: Hierarchical component nesting under a `ParentPanel` is tracked through the flat `"parentId"` key.

---

## 7. MQTT Payload Usage

The exact same JSON payload structure applies when synchronizing over MQTT!

### Publishing from Python via `paho-mqtt`
```python
import paho.mqtt.publish as publish
import json

payload = [
    {
        "id": "heading",
        "text": "Live Title via MQTT",
        "fontSize": 44,
        "color": "#10b981",
        "solid": True
    },
    {
        "id": "mqttBtn",
        "type": "Button",
        "text": "Trigger Action",
        "variant": "primary",
        "x": 40,
        "y": 180,
        "width": 160,
        "height": 44
    }
]

# Publish to the default topic 'renderReactUI' on localhost port 1883
publish.single(
    "renderReactUI",
    payload=json.dumps(payload),
    hostname="localhost",
    port=1883
)
```

In React, the canvas subscribes via WebSockets:
```jsx
<UI.Canvas mqttUrl="ws://localhost:9001" mqttTopic="renderReactUI">
  {/* widgets */}
</UI.Canvas>
```
Both single objects `{ "id": "..." }` and lists of objects `[ { "id": "..." } ]` are supported.

