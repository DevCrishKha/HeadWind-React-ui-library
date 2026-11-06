import mqtt from "mqtt";

console.log("=================================================");
console.log("MQTT Broker Connectivity & Topic Test");
console.log("=================================================\n");

// -----------------------------------------------------------------
// Test 1: Check if MQTT broker is reachable at ws://localhost:9001
// -----------------------------------------------------------------
console.log("[Test 1] Testing WebSocket connection to ws://localhost:9001...");

const wsUrl = "ws://localhost:9001";
const wsClient = mqtt.connect(wsUrl, {
  connectTimeout: 5000,
  reconnectPeriod: 0, // don't loop forever if it fails
});

let wsConnected = false;

wsClient.on("connect", () => {
  wsConnected = true;
  console.log("  [SUCCESS] Connected to MQTT broker over WebSocket at " + wsUrl);
  console.log("  [SUCCESS] Subscribing to topic 'renderReactUI' via WebSocket...");
  wsClient.subscribe("renderReactUI", (err) => {
    if (err) {
      console.error("  [FAIL] Failed to subscribe:", err.message);
    } else {
      console.log("  [SUCCESS] Subscribed to 'renderReactUI' via WebSocket!");
    }
    wsClient.end();
  });
});

wsClient.on("error", (err) => {
  console.error("  [FAIL] WebSocket connection error:", err.message);
  if (err.code) console.error("         Error code:", err.code);
});

wsClient.on("close", () => {
  if (!wsConnected) {
    console.error("  [FAIL] WebSocket connection was closed by server (handshake failed / socket hang up).");
    console.error("         Diagnosis: Mosquitto is listening on port 9001, but WebSockets protocol is NOT enabled in mosquitto.conf.");
  }
});

// -----------------------------------------------------------------
// Test 2: Check if topic 'renderReactUI' works via TCP (port 1883)
// -----------------------------------------------------------------
setTimeout(() => {
  console.log("\n[Test 2] Testing TCP connection (port 1883) & topic 'renderReactUI' round-trip...");
  
  const tcpUrl = "mqtt://localhost:1883";
  const tcpClient = mqtt.connect(tcpUrl, {
    connectTimeout: 5000,
  });

  tcpClient.on("connect", () => {
    console.log("  [SUCCESS] Connected to MQTT broker via TCP at " + tcpUrl);
    console.log("  [INFO] Subscribing to topic 'renderReactUI'...");
    
    tcpClient.subscribe("renderReactUI", (err) => {
      if (err) {
        console.error("  [FAIL] Could not subscribe to 'renderReactUI':", err);
        tcpClient.end();
        return;
      }
      
      console.log("  [SUCCESS] Subscribed to topic 'renderReactUI'.");
      console.log("  [INFO] Publishing test payload to 'renderReactUI'...");

      const testPayload = JSON.stringify({
        id: "heading",
        text: "MQTT Connectivity Test OK",
      });

      tcpClient.publish("renderReactUI", testPayload, (pubErr) => {
        if (pubErr) {
          console.error("  [FAIL] Publish failed:", pubErr);
          tcpClient.end();
        } else {
          console.log("  [SUCCESS] Message published successfully!");
        }
      });
    });
  });

  tcpClient.on("message", (topic, message) => {
    console.log(`  [SUCCESS] Received message on topic '${topic}': ${message.toString()}`);
    console.log("  [CONCLUSION] In MQTT, topics exist dynamically upon publish/subscribe.");
    console.log("               The topic 'renderReactUI' is fully functional on the broker!\n");
    tcpClient.end();
    process.exit(0);
  });

  tcpClient.on("error", (err) => {
    console.error("  [FAIL] TCP connection error:", err.message);
    tcpClient.end();
    process.exit(1);
  });
}, 3000);

