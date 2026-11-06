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


if __name__ == "__main__":
    print("=" * 60)
    print("Flask SocketIO Server running on http://localhost:5000")
    print("Open http://localhost:5000/send to send payload to React UI")
    print("=" * 60)
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
