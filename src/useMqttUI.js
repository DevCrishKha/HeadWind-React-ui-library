import { useEffect, useRef, useState } from "react";
import mqtt from "mqtt";
import { useUIContext } from "./context.js";

const mqttConnect =
  mqtt && typeof mqtt.connect === "function"
    ? mqtt.connect
    : mqtt?.default && typeof mqtt.default.connect === "function"
    ? mqtt.default.connect
    : typeof mqtt === "function"
    ? mqtt
    : null;

/**
 * Matches an MQTT topic against a pattern that may contain '+' or '#' wildcards.
 *
 * @param {string} pattern - Subscribed topic pattern (e.g. 'renderReactUI', 'app/+', 'sensors/#')
 * @param {string} topic - Incoming message topic
 * @returns {boolean}
 */
export function matchesMqttTopic(pattern, topic) {
  if (!pattern || !topic) return false;
  if (pattern === topic || pattern === "#") return true;
  const pParts = pattern.split("/");
  const tParts = topic.split("/");
  for (let i = 0; i < pParts.length; i++) {
    if (pParts[i] === "#") return true;
    if (pParts[i] !== "+" && pParts[i] !== tParts[i]) return false;
  }
  return pParts.length === tParts.length;
}

/**
 * useMqttUI
 *
 * React hook that connects to an MQTT broker (e.g. via WebSocket ws://localhost:9001)
 * or uses an existing MQTT client, and subscribes to a topic (default: 'renderReactUI').
 * When a message is received, it parses the JSON payload and updates the layout store
 * using store.applySocketUpdates(data), updating widget properties or creating dynamic widgets.
 *
 * @param {object | string} options - MQTT client instance, broker URL string, or options object:
 *   - client | mqttClient: existing MQTT client instance
 *   - mqttUrl | url | brokerUrl: MQTT broker WebSocket URL (e.g. "ws://localhost:9001")
 *   - mqttTopic | topic: topic to subscribe to (default: 'renderReactUI')
 *   - mqttOptions | options: options passed to mqtt.connect()
 *   - autoConnect: whether to connect automatically if url is provided (default: true)
 *
 * @returns {{ client: object | null, isConnected: boolean, lastPayload: any }}
 */
export function useMqttUI(options = {}) {
  const { store } = useUIContext();
  const [isConnected, setIsConnected] = useState(false);
  const [lastPayload, setLastPayload] = useState(null);

  // Normalize options
  const config = typeof options === "string" ? { mqttUrl: options } : options || {};
  const clientProp = config.client || config.mqttClient;
  const mqttUrl = config.mqttUrl || config.url || config.brokerUrl;
  const targetTopic = config.mqttTopic || config.topic || "renderReactUI";
  const mqttOptions = config.mqttOptions || config.options;
  const autoConnect = config.autoConnect !== false;

  const clientRef = useRef(null);
  const isInternalClient = useRef(false);

  useEffect(() => {
    let activeClient = clientProp;

    if (!activeClient && mqttUrl && autoConnect && typeof mqttConnect === "function") {
      try {
        console.log(`[useMqttUI] Connecting to MQTT broker at ${mqttUrl}...`);
        activeClient = mqttConnect(mqttUrl, mqttOptions);
        isInternalClient.current = true;
      } catch (err) {
        console.error("[useMqttUI] Failed to connect to MQTT broker:", err);
      }
    }

    if (!activeClient) {
      return;
    }

    clientRef.current = activeClient;

    const subscribeTopic = () => {
      if (typeof activeClient.subscribe === "function") {
        console.log(`[useMqttUI] Subscribing to topic "${targetTopic}"...`);
        activeClient.subscribe(targetTopic, (err) => {
          if (err) {
            console.error(`[useMqttUI] Failed to subscribe to topic "${targetTopic}":`, err);
          } else {
            console.log(`[useMqttUI] Successfully subscribed to topic: "${targetTopic}"`);
          }
        });
      }
    };

    if (activeClient.connected) {
      setIsConnected(true);
      subscribeTopic();
    }

    const onConnect = () => {
      console.log(`[useMqttUI] Connected to MQTT broker at ${mqttUrl || "client"}`);
      setIsConnected(true);
      subscribeTopic();
    };

    const onError = (err) => {
      console.error("[useMqttUI] Connection error:", err?.message || err);
    };

    const onClose = () => {
      setIsConnected(false);
    };

    const onOffline = () => {
      setIsConnected(false);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    if (typeof activeClient.on === "function") {
      activeClient.on("connect", onConnect);
      activeClient.on("error", onError);
      activeClient.on("close", onClose);
      activeClient.on("offline", onOffline);
      activeClient.on("disconnect", onDisconnect);

      const handleMessage = (topic, message) => {
        if (!matchesMqttTopic(targetTopic, topic)) return;
        try {
          let payload;
          if (typeof message === "string") {
            payload = JSON.parse(message);
          } else if (message && typeof message === "object") {
            if (typeof message.toString === "function" && !(Array.isArray(message) || message.id !== undefined)) {
              const str = message.toString();
              payload = JSON.parse(str);
            } else {
              payload = message;
            }
          }
          if (payload !== undefined && payload !== null) {
            console.log(`[useMqttUI] Received message on topic "${topic}":`, payload);
            setLastPayload(payload);
            if (store && typeof store.applySocketUpdates === "function") {
              store.applySocketUpdates(payload);
            }
          }
        } catch (err) {
          console.warn("[useMqttUI] Failed to parse MQTT message payload as JSON:", err);
        }
      };

      activeClient.on("message", handleMessage);

      return () => {
        const off = (event, fn) => {
          if (typeof activeClient.off === "function") {
            activeClient.off(event, fn);
          } else if (typeof activeClient.removeListener === "function") {
            activeClient.removeListener(event, fn);
          }
        };

        off("connect", onConnect);
        off("error", onError);
        off("close", onClose);
        off("offline", onOffline);
        off("disconnect", onDisconnect);
        off("message", handleMessage);

        if (typeof activeClient.unsubscribe === "function") {
          activeClient.unsubscribe(targetTopic);
        }

        if (isInternalClient.current) {
          if (typeof activeClient.end === "function") {
            activeClient.end(true);
          }
          isInternalClient.current = false;
        }
        clientRef.current = null;
      };
    }
  }, [store, clientProp, mqttUrl, targetTopic, autoConnect, mqttOptions]);

  return {
    client: clientRef.current || clientProp || null,
    isConnected,
    lastPayload,
  };
}
