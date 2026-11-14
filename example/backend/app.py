from flask import Flask, jsonify
from flask_socketio import SocketIO
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# The payload to send to React
payload = [
    {
        "id": "heading",
        "text": "What is it doing",
        "color": "Red"
    },
    {
        "id": "para",
        "text": "I am the developer",
        "fontSize": 50,
        "fontWeight": 300,
        "solid": False,
        "height": 100,
        "width": 100,
        "x": 200,
        "y": 200
    },
    {
        "id": "formSubmitBtn",
        "varient": "Danger",
        "text": "Submit",
    },
    {
        "id": "backendPanel",
        "type": "ParentPanel",
        "title": "Backend ParentPanel",
        "childResizeMode": "reflow",
        "backgroundColor": "#1e293b",
        "opacity": 0.95,
        "x": 40,
        "y": 420,
        "width": 640,
        "height": 260,
    },
    {
        "id": "backendPanelText",
        "type": "Text",
        "parentId": "backendPanel",
        "text": "Created inside ParentPanel over Socket.IO!",
        "color": "#38bdf8",
        "fontSize": 18,
        "x": 20,
        "y": 20,
    },
    {
        "id": "backendPanelBtn",
        "type": "Button",
        "parentId": "backendPanel",
        "text": "Backend Child Action",
        "variant": "primary",
        "x": 20,
        "y": 65,
    },
]


@app.route("/send")
def send():
    """Opens http://localhost:5000/send to send the payload to React."""
    # socketio.emit("renderReactUI", payload)
    socketio.emit("customSyncUI", payload)
    return jsonify({
        "status": "success",
        "message": "Payload sent to React via SocketIO event 'renderReactUI'",
        "payload": payload,
    })


<<<<<<< HEAD
if __name__ == "__main__":
    print("=" * 60)
    print("Flask SocketIO Server running on http://localhost:5000")
    print("Open http://localhost:5000/send to send payload to React UI")
=======
# ── AI Widget SocketIO Handlers ──────────────────────────────
@socketio.on("connect")
def handle_connect():
    print("[SocketIO] Client connected to @devcrish/headwind backend.")


@socketio.on("disconnect")
def handle_disconnect():
    print("[SocketIO] Client disconnected.")


@socketio.on("aiPrompt")
def handle_ai_prompt(data):
    """
    Listens for prompts and save events from <UI.AIWidget />.
    Payload:
      {
        "prompt": "...",
        "widgets": [ { "id": "...", "type": "...", "position": { "x": ..., "y": ... }, "size": ... } ]
      }
    """
    prompt = data.get("prompt", "").strip()
    widgets = data.get("widgets", [])
    print(f"\n[AI Widget] Received prompt: '{prompt}'")
    print(f"[AI Widget] Targeted widgets count: {len(widgets)}")
    print(f"[AI Widget] Content Received: {widgets}\n")

    # Case 1: Save UI button clicked in AI Widget
    if prompt == "Make this changes to the current UI":
        lines = []
        for w in widgets:
            wid = w.get("id", "unknown")
            wtype = w.get("type", "Widget")
            pos = w.get("position", {})
            sz = w.get("size", {})
            lines.append(f"- **`{wid}`** ({wtype}): `x: {pos.get('x')}, y: {pos.get('y')}` | size `{sz.get('width')}x{sz.get('height')}`")

        items_str = "\n".join(lines) if lines else "- *No modified widgets.*"

        response_markdown = f"""### 💾 Layout Changes Saved!
Received **{len(widgets)}** widget update(s) from Canvas:

{items_str}

```jsx
// Updated JSX coordinates ready to apply in App.jsx:
{chr(10).join([f'<{w.get("type", "Widget")} id="{w.get("id")}" position={{{{ x: {w.get("position", {}).get("x")}, y: {w.get("position", {}).get("y")} }}}} size={{{{ width: {w.get("size", {}).get("width")}, height: {w.get("size", {}).get("height")} }}}} />' for w in widgets[:4]])}
```

The updated UI coordinates have been received by the backend and can be synced to `example/App.jsx`.
"""
        socketio.emit("aiResponse", {"markdown": response_markdown})
        return

    # Case 2: General user chat prompt with or without ticked widgets
    target_summary = (
        f"**{len(widgets)} targeted widget(s):** " + ", ".join([f"`{w.get('id')}`" for w in widgets])
        if widgets
        else "*Global scope (no widgets ticked)*"
    )

    # Inspect prompt for dynamic reactive changes
    lower = prompt.lower()
    live_updates = []

    # If the user asks to modify a specific widget, provide sample live sync updates
    if "danger" in lower or "red" in lower:
        live_updates.append({"id": "formSubmitBtn", "variant": "danger", "text": "Danger Action"})
    elif "primary" in lower or "blue" in lower:
        live_updates.append({"id": "formSubmitBtn", "variant": "primary", "text": "Submit"})

    if live_updates:
        # Emit live update to canvas so user sees instant changes
        socketio.emit("customSyncUI", live_updates)

    code_examples = []
    if widgets:
        for w in widgets:
            wid = w.get("id", "widget")
            wtype = w.get("type", "UI.Widget")
            code_examples.append(f'<UI.{wtype} id="{wid}" position={{{{ x: {w.get("position", {}).get("x")}, y: {w.get("position", {}).get("y")} }}}} />')
    else:
        code_examples.append('<UI.Button id="action-btn" text="New Action" variant="primary" />')

    response_markdown = f"""### 🤖 AI Assistant
**Prompt:** *"{prompt}"*  
**Context:** {target_summary}

I have processed your request. Here are the suggested changes for `App.jsx`:

```jsx
{chr(10).join(code_examples)}
```

- Position updates and prop modifications are ready.
- You can drag or resize widgets visually on the canvas, then click **`Save UI Changes to App.jsx`** to save the updated positions.
"""
    socketio.emit("aiResponse", {"markdown": response_markdown})


if __name__ == "__main__":
    print("=" * 60)
    print("Flask SocketIO Server running on http://localhost:5000")
    print("AI Widget listening on event: 'aiPrompt'")
    print("AI Widget emitting on event:  'aiResponse'")
    print("Open http://localhost:5000/send to send test payload to React UI")
>>>>>>> Version2.1.1
    print("=" * 60)
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
