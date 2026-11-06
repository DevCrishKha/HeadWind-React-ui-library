"""
Python test to verify that the topic 'renderReactUI' works properly
on the Mosquitto broker via TCP port 1883.
"""

import sys
import json
import time
import paho.mqtt.client as mqtt

received_messages = []

def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print("[SUCCESS] Connected to Mosquitto MQTT broker on port 1883!")
        print("[INFO] Subscribing to topic 'renderReactUI'...")
        client.subscribe("renderReactUI")
    else:
        print(f"[FAIL] Connection failed with code {rc}")

def on_subscribe(client, userdata, mid, granted_qos, properties=None):
    print("[SUCCESS] Subscribed to topic 'renderReactUI' successfully!")
    print("[INFO] Publishing test payload to 'renderReactUI'...")
    payload = json.dumps({"id": "heading", "text": "Topic renderReactUI exists and verified!"})
    client.publish("renderReactUI", payload)

def on_message(client, userdata, msg):
    print(f"\n[SUCCESS] Message received on topic '{msg.topic}':")
    print(f"          Payload: {msg.payload.decode('utf-8')}")
    received_messages.append(msg)

def test_mqtt():
    # Supports both paho-mqtt 1.x and 2.x
    try:
        client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    except AttributeError:
        client = mqtt.Client()

    client.on_connect = on_connect
    client.on_subscribe = on_subscribe
    client.on_message = on_message

    print("Connecting to localhost:1883...")
    client.connect("localhost", 1883, 60)
    client.loop_start()

    time.sleep(2)
    client.loop_stop()
    client.disconnect()

    if received_messages:
        print("\n=======================================================")
        print("RESULT: Topic 'renderReactUI' exists and functions 100%!")
        print("=======================================================")
    else:
        print("\n[FAIL] Did not receive message back.")

if __name__ == "__main__":
    test_mqtt()

