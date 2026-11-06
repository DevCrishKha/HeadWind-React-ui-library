"""
Test script to publish UI payloads to the local Mosquitto MQTT broker.

The Mosquitto broker runs on:
  - Port 1883: TCP connection for backend clients (like this Python script)
  - Port 9001: WebSocket connection for React browsers (used by UI.Canvas / useMqttUI)

Usage:
  # Using the example virtual environment:
  ./example/venv/Scripts/python example/publish_mqtt.py

  # Or with custom topic / broker:
  ./example/venv/Scripts/python example/publish_mqtt.py --topic customSyncUI --host localhost --port 1883
"""

import sys
import json
import argparse
import paho.mqtt.publish as publish

# In paho-mqtt, the function to publish a single message is publish.single().
# We alias publish.simple -> publish.single so both conventions work seamlessly.
if not hasattr(publish, "simple"):
    publish.simple = publish.single

def publish_ui_payload(topic="renderReactUI", hostname="localhost", port=1883, payload=None):
    if payload is None:
        payload = [
            {
                "id": "heading",
                "text": "Updated via MQTT!",
                "color": "#10b981",
                "fontSize": 44,
                "fontWeight": 700,
                "position": {"x": 44, "y": 40},
                "size": {"width": 250, "height": 144}
            },
            {
                "id": "mqttStatusBtn",
                "text": "MQTT Online: Port 1883",
                "variant": "primary",
                "position": {"x": 144, "y": 240},
                "size": {"width": 200, "height": 44}
            }
        ]

    json_data = json.dumps(payload)
    print(f"Connecting to MQTT broker at {hostname}:{port}...")
    print(f"Publishing to topic: '{topic}'")
    print(f"Payload:\n{json.dumps(payload, indent=2)}")

    publish.simple(
        topic,
        payload=json_data,
        hostname=hostname,
        port=port
    )
    print("\nMessage successfully published!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Publish UI payload to Mosquitto MQTT broker.")
    parser.add_argument("--topic", default="renderReactUI", help="MQTT topic (default: renderReactUI)")
    parser.add_argument("--host", default="localhost", help="MQTT broker host (default: localhost)")
    parser.add_argument("--port", type=int, default=1883, help="MQTT broker TCP port (default: 1883)")
    args = parser.parse_args()

    try:
        publish_ui_payload(topic=args.topic, hostname=args.host, port=args.port)
    except Exception as e:
        print(f"Error publishing to MQTT broker: {e}", file=sys.stderr)
        sys.exit(1)

