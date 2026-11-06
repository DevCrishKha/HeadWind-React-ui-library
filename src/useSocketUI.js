import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useUIContext } from "./context.js";

/**
 * useSocketUI
 *
 * React hook that connects to a Socket.IO backend and listens for socket events (default: 'renderReactUI').
 * When an event is received, it applies the updates to the layout store and calls store.emit(),
 * causing the target widgets to re-render with the new properties without changing untouched properties.
 * If a component in the payload does not exist on the Canvas, it is automatically created.
 *
 * @param {object | string} options - Socket instance, socket URL string, or options object:
 *   - socket: existing socket.io client instance
 *   - socketUrl | url: URL to connect to (e.g. "http://localhost:5000")
 *   - socketEvent | event: event name to listen on (default: 'renderReactUI')
 *   - autoConnect: whether to connect automatically if url is provided (default: true)
 */
export function useSocketUI(options = {}) {
  const { store } = useUIContext();
  const [isConnected, setIsConnected] = useState(false);
  const [lastPayload, setLastPayload] = useState(null);

  // Normalize options
  const config = typeof options === "string" ? { socketUrl: options } : options || {};
  const socketProp = config.socket;
  const socketUrl = config.socketUrl || config.url;
  const eventName = config.socketEvent || config.event || "renderReactUI";

  const socketRef = useRef(null);
  const isInternalSocket = useRef(false);

  useEffect(() => {
    let activeSocket = socketProp;

    if (!activeSocket && socketUrl) {
      activeSocket = io(socketUrl, {
        transports: ["websocket", "polling"],
        autoConnect: config.autoConnect !== false,
      });
      isInternalSocket.current = true;
    }

    if (!activeSocket) {
      return;
    }

    socketRef.current = activeSocket;

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    if (activeSocket.connected) {
      setIsConnected(true);
    }

    activeSocket.on("connect", onConnect);
    activeSocket.on("disconnect", onDisconnect);

    const handleRenderReactUI = (data) => {
      setLastPayload(data);
      if (store && typeof store.applySocketUpdates === "function") {
        store.applySocketUpdates(data);
      }
    };

    activeSocket.on(eventName, handleRenderReactUI);

    return () => {
      activeSocket.off("connect", onConnect);
      activeSocket.off("disconnect", onDisconnect);
      activeSocket.off(eventName, handleRenderReactUI);

      if (isInternalSocket.current) {
        activeSocket.disconnect();
        isInternalSocket.current = false;
      }
      socketRef.current = null;
    };
  }, [store, socketProp, socketUrl, eventName, config.autoConnect]);

  return {
    socket: socketRef.current || socketProp || null,
    isConnected,
    lastPayload,
  };
}
