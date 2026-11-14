import { useState, useRef, useEffect, useCallback, useSyncExternalStore } from "react";
import { io } from "socket.io-client";
import { useUIContext } from "../context.js";
import { aiSelectionStore } from "./aiSelectionStore.js";
import { toWidgetJSX } from "../components/InspectorPanel.jsx";

/* ───────────────────────────────────────────────────────
   Visual styling constants matching @devcrish/headwind panel theme
   ─────────────────────────────────────────────────────── */
const PANEL_W = 340;
const HEAD_H  = 38;

const COLORS = {
  bg:         "#0f172a",
  head:       "#1e293b",
  accent:     "#38bdf8",
  accentHover:"#0284c7",
  text:       "#e2e8f0",
  dim:        "#94a3b8",
  border:     "#334155",
  inputBg:    "#0b1120",
  chatBg:     "#0b1120",
  userMsgBg:  "#1e293b",
  aiMsgBg:    "#1e293b",
  codeBg:     "#020617",
  success:    "#4ade80",
  error:      "#f87171",
  saveBtn:    "#2563eb",
  saveBtnHov: "#1d4ed8",
};

/* ── Inline Grip Icon ── */
function GripIcon({ color = COLORS.dim, size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ display: "block" }}>
      <circle cx="9"  cy="5"  r="1.5" />
      <circle cx="15" cy="5"  r="1.5" />
      <circle cx="9"  cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9"  cy="19" r="1.5" />
      <circle cx="15" cy="19" r="1.5" />
    </svg>
  );
}

/* ── Lightweight, Safe Markdown Parser for AI Output ── */
function renderInline(text) {
  if (typeof text !== "string") return text;
  // Match bold, italic, inline code, strikethrough
  const tokens = [];
  let remaining = text;
  let idx = 0;

  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|~~(.+?)~~)/;

  while (remaining) {
    const match = regex.exec(remaining);
    if (!match) {
      tokens.push(remaining);
      break;
    }
    const matchIndex = match.index;
    if (matchIndex > 0) {
      tokens.push(remaining.slice(0, matchIndex));
    }
    const full = match[0];
    if (match[2]) {
      // **bold**
      tokens.push(<strong key={`b-${idx++}`}>{match[2]}</strong>);
    } else if (match[3]) {
      // *italic*
      tokens.push(<em key={`i-${idx++}`}>{match[3]}</em>);
    } else if (match[4]) {
      // `code`
      tokens.push(
        <code
          key={`c-${idx++}`}
          style={{
            background: COLORS.codeBg,
            padding: "1px 5px",
            borderRadius: 3,
            color: "#38bdf8",
            fontFamily: "ui-monospace, monospace",
            fontSize: "0.9em",
          }}
        >
          {match[4]}
        </code>
      );
    } else if (match[5]) {
      // ~~strikethrough~~
      tokens.push(<s key={`s-${idx++}`}>{match[5]}</s>);
    }
    remaining = remaining.slice(matchIndex + full.length);
  }
  return tokens;
}

function MarkdownRenderer({ content }) {
  if (!content) return null;
  const lines = typeof content === "string" ? content.split("\n") : [String(content)];
  const blocks = [];
  let codeBlock = null;

  lines.forEach((line, lineIdx) => {
    // Fenced code blocks
    if (line.trim().startsWith("```")) {
      if (codeBlock) {
        blocks.push(
          <pre
            key={`code-${lineIdx}`}
            style={{
              background: COLORS.codeBg,
              padding: "8px 10px",
              borderRadius: 6,
              overflowX: "auto",
              fontFamily: "ui-monospace, Consolas, monospace",
              fontSize: 11,
              color: "#e2e8f0",
              margin: "6px 0",
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <code>{codeBlock.lines.join("\n")}</code>
          </pre>
        );
        codeBlock = null;
      } else {
        const lang = line.trim().slice(3).trim();
        codeBlock = { lang, lines: [] };
      }
      return;
    }

    if (codeBlock) {
      codeBlock.lines.push(line);
      return;
    }

    // Headings
    if (line.startsWith("### ")) {
      blocks.push(
        <h4 key={`h3-${lineIdx}`} style={{ margin: "6px 0 2px", color: COLORS.accent, fontSize: 13, fontWeight: 700 }}>
          {renderInline(line.slice(4))}
        </h4>
      );
      return;
    }
    if (line.startsWith("## ")) {
      blocks.push(
        <h3 key={`h2-${lineIdx}`} style={{ margin: "8px 0 3px", color: COLORS.accent, fontSize: 14, fontWeight: 700 }}>
          {renderInline(line.slice(3))}
        </h3>
      );
      return;
    }
    if (line.startsWith("# ")) {
      blocks.push(
        <h2 key={`h1-${lineIdx}`} style={{ margin: "10px 0 4px", color: "#f8fafc", fontSize: 15, fontWeight: 700 }}>
          {renderInline(line.slice(2))}
        </h2>
      );
      return;
    }

    // Bullet lists
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      blocks.push(
        <div key={`li-${lineIdx}`} style={{ paddingLeft: 12, margin: "2px 0", display: "flex", gap: 6 }}>
          <span style={{ color: COLORS.accent }}>•</span>
          <span>{renderInline(line.trim().slice(2))}</span>
        </div>
      );
      return;
    }

    // Empty lines
    if (!line.trim()) {
      blocks.push(<div key={`sp-${lineIdx}`} style={{ height: 6 }} />);
      return;
    }

    // Paragraph
    blocks.push(
      <p key={`p-${lineIdx}`} style={{ margin: "3px 0", lineHeight: 1.45 }}>
        {renderInline(line)}
      </p>
    );
  });

  if (codeBlock) {
    blocks.push(
      <pre
        key="code-final"
        style={{
          background: COLORS.codeBg,
          padding: "8px 10px",
          borderRadius: 6,
          overflowX: "auto",
          fontFamily: "ui-monospace, Consolas, monospace",
          fontSize: 11,
          color: "#e2e8f0",
          margin: "6px 0",
        }}
      >
        <code>{codeBlock.lines.join("\n")}</code>
      </pre>
    );
  }

  return <div>{blocks}</div>;
}

/* ── Safe prop sanitizer (strips functions, React Fiber/DOM nodes, circular refs) ── */
function sanitizeValue(val, seen = new WeakSet()) {
  if (val === null || val === undefined) return val;
  if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") return val;
  if (typeof val === "function") return undefined;
  // Exclude React elements, Fiber nodes, or DOM elements
  if (val.$$typeof || val._owner || (typeof Element !== "undefined" && val instanceof Element)) {
    return undefined;
  }
  if (typeof val === "object") {
    if (seen.has(val)) return undefined;
    seen.add(val);
    if (Array.isArray(val)) {
      return val.map((item) => sanitizeValue(item, seen)).filter((item) => item !== undefined);
    }
    const cleanObj = {};
    for (const [k, v] of Object.entries(val)) {
      if (k === "children") {
        if (typeof v === "string" || typeof v === "number") cleanObj[k] = v;
        continue;
      }
      const cleaned = sanitizeValue(v, seen);
      if (cleaned !== undefined) {
        cleanObj[k] = cleaned;
      }
    }
    return cleanObj;
  }
  return undefined;
}

function sanitizeProps(rawProps) {
  if (!rawProps || typeof rawProps !== "object") return {};
  try {
    const cleaned = sanitizeValue(rawProps);
    return typeof cleaned === "object" && cleaned !== null ? cleaned : {};
  } catch {
    return {};
  }
}

/* ───────────────────────────────────────────────────────
   Main AIWidget Component
   ─────────────────────────────────────────────────────── */
export function AIWidget({
  socketUrl,
  socket: socketProp,
  sendPromptEvent = "aiPrompt",
  receiveResponseEvent = "aiResponse",
  saveEvent,
  getLogsEvent = "aiLogs",
  defaultPosition = { x: 20, y: 380 },
  title = "AI Assistant",
  style,
  className,
}) {
  const { store } = useUIContext();

  // Store subscriptions
  const pageDeployed = useSyncExternalStore(store.subscribe, store.getPageDeployed);
  const version = useSyncExternalStore(store.subscribe, store.getVersion);

  // Ticked widgets subscription from aiSelectionStore
  const tickedIds = useSyncExternalStore(aiSelectionStore.subscribe, aiSelectionStore.getTickedIds);

  // UI state
  const [collapsed, setCollapsed] = useState(false);
  const [pos, setPos] = useState(defaultPosition);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "👋 Hi! I can edit your **App.jsx** and update components.\nTick any widgets in the **Widget List** to target them, or describe general changes.",
    },
  ]);
  const [isConnected, setIsConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [statusNote, setStatusNote] = useState(null);

  // Reference for dragging
  const dragging = useRef(false);
  const dragOff = useRef({ x: 0, y: 0 });
  const chatBottomRef = useRef(null);

  // Elements baseline snapshot for tracking changes
  const initialElementsRef = useRef(new Map());
  const initializedRef = useRef(false);

  // Helper to snapshot all current elements (store JSX string as fingerprint)
  const snapshotCurrentElements = useCallback(() => {
    if (!store) return;
    initialElementsRef.current.clear();
    store.getElements().forEach((el) => {
      if (el && el.id) {
        initialElementsRef.current.set(el.id, {
          jsx: toWidgetJSX(el),
        });
      }
    });
  }, [store]);

  // Take initial snapshot on mount
  useEffect(() => {
    if (store && !initializedRef.current) {
      snapshotCurrentElements();
      initializedRef.current = true;
    }
  }, [store, snapshotCurrentElements]);

  // Compute changed widgets against snapshot — returns array of { id, jsx } objects
  const computeChangedWidgets = useCallback(() => {
    if (!store) return [];
    const allElements = store.getElements().filter((el) => el && el.id);
    const changed = [];

    allElements.forEach((el) => {
      const currentJSX = toWidgetJSX(el);
      const init = initialElementsRef.current.get(el.id);
      // Changed if: newly added (no snapshot entry) OR JSX string differs from snapshot
      if (!init || currentJSX !== init.jsx) {
        changed.push({ id: el.id, jsx: currentJSX });
      }
    });

    return changed;
  }, [store]);

  // Live changed widgets derived from store version
  const changedWidgets = computeChangedWidgets();
  const hasChanges = changedWidgets.length > 0;

  // Socket.IO connection refs — declared before emitLog so emitLog can close over socketRef
  const socketRef = useRef(null);
  const isInternalSocket = useRef(false);

  // Emit a structured log entry to the getLogsEvent socket event
  const emitLog = useCallback((entry) => {
    const sock = socketRef.current || socketProp;
    if (!sock || !getLogsEvent) return;
    try {
      sock.emit(getLogsEvent, { timestamp: new Date().toISOString(), ...entry });
    } catch {
      // Logging must never crash the widget
    }
  }, [socketProp, getLogsEvent]);

  useEffect(() => {
    let activeSocket = socketProp;

    if (!activeSocket && socketUrl) {
      activeSocket = io(socketUrl, {
        transports: ["websocket", "polling"],
        autoConnect: true,
      });
      isInternalSocket.current = true;
    }

    if (!activeSocket) {
      setIsConnected(false);
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

    const onAiResponse = (data) => {
      setIsSending(false);
      const text = typeof data === "string"
        ? data
        : data?.markdown || data?.response || data?.text || JSON.stringify(data, null, 2);

      setMessages((prev) => [...prev, { role: "assistant", text }]);
      emitLog({ direction: "received", event: receiveResponseEvent, payload: { text } });
    };

    activeSocket.on(receiveResponseEvent, onAiResponse);

    return () => {
      activeSocket.off("connect", onConnect);
      activeSocket.off("disconnect", onDisconnect);
      activeSocket.off(receiveResponseEvent, onAiResponse);

      if (isInternalSocket.current) {
        activeSocket.disconnect();
        isInternalSocket.current = false;
      }
      socketRef.current = null;
    };
  }, [socketProp, socketUrl, receiveResponseEvent, emitLog]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (!collapsed && typeof chatBottomRef.current?.scrollIntoView === "function") {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, collapsed]);

  // Panel drag handlers
  const onPointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    if (e.target.closest("button") || e.target.closest("textarea")) return;
    dragging.current = true;
    dragOff.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [pos]);

  const onPointerMove = useCallback((e) => {
    if (!dragging.current) return;
    setPos({
      x: Math.max(0, e.clientX - dragOff.current.x),
      y: Math.max(0, e.clientY - dragOff.current.y),
    });
  }, []);

  const onPointerUp = useCallback((e) => {
    if (dragging.current) {
      dragging.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  }, []);

  // Send prompt over socket
  const handleSendPrompt = () => {
    const text = prompt.trim();
    if (!text) return;

    const currentSocket = socketRef.current || socketProp;
    if (!currentSocket) {
      setMessages((prev) => [
        ...prev,
        { role: "user", text },
        {
          role: "assistant",
          text: "⚠️ **Not connected to Socket.IO backend.** Please provide a valid `socketUrl` or `socket` prop to `<UI.AIWidget />`.",
        },
      ]);
      setPrompt("");
      return;
    }

    // Gather ticked widgets as JSX strings (empty list if none ticked)
    const activeElements = store.getElements();
    const targetedWidgets = tickedIds.length > 0
      ? tickedIds
          .map((id) => activeElements.find((el) => el.id === id))
          .filter(Boolean)
          .map((el) => ({ id: el.id, jsx: toWidgetJSX(el) }))
      : [];

    const payload = { prompt: text, widgets: targetedWidgets };

    currentSocket.emit(sendPromptEvent, payload);
    emitLog({ direction: "sent", event: sendPromptEvent, payload });

    setMessages((prev) => [...prev, { role: "user", text }]);
    setPrompt("");
    setIsSending(true);
  };

  // Save button: emits JSX of changed widgets only; disabled if nothing has changed
  const handleSaveUI = () => {
    if (!hasChanges) return; // Safety guard — button should already be disabled
    const currentSocket = socketRef.current || socketProp;

    // changedWidgets is already [ { id, jsx } ] from computeChangedWidgets
    const targetEvent = saveEvent || sendPromptEvent;
    const savePayload = {
      prompt: "Make this changes to the current UI",
      widgets: changedWidgets, // array of { id, jsx }
    };

    if (currentSocket) {
      currentSocket.emit(targetEvent, savePayload);
      emitLog({ direction: "sent", event: targetEvent, payload: savePayload, type: "save" });

      // Reset snapshot → save button disables immediately (no new changes yet)
      snapshotCurrentElements();

      setStatusNote("Saved: UI up to date");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `💾 **Sent UI update to AI** (${changedWidgets.length} changed widget(s)). Save status reset — button disabled until next change.`,
        },
      ]);
    } else {
      setStatusNote("Error: Socket disconnected");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "⚠️ **Cannot save:** Socket is not connected. Provide a valid `socketUrl` or `socket` prop to `<UI.AIWidget />`.",
        },
      ]);
    }

    setTimeout(() => setStatusNote(null), 3500);
  };

  // Disappear entirely when deployed
  if (pageDeployed) return null;

  return (
    <div
      data-testid="ui-ai-widget-panel"
      className={className}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: PANEL_W,
        zIndex: 2000,
        background: COLORS.bg,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 10,
        color: COLORS.text,
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        fontSize: 12,
        boxShadow: "0 10px 35px rgba(0,0,0,.45)",
        userSelect: "none",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* ── Header ── */}
      <div
        data-testid="ui-ai-header"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          display: "flex",
          alignItems: "center",
          height: HEAD_H,
          background: COLORS.head,
          padding: "0 10px",
          cursor: "grab",
          borderBottom: collapsed ? "none" : `1px solid ${COLORS.border}`,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", cursor: "grab", paddingRight: 6 }}>
          <GripIcon />
        </span>

        {/* Status dot */}
        <span
          data-testid="ui-ai-status-indicator"
          title={isConnected ? "Connected to Socket.IO" : "Disconnected from Socket.IO"}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: isConnected ? COLORS.success : COLORS.error,
            marginRight: 6,
            flexShrink: 0,
          }}
        />

        <span
          data-testid="ui-ai-title"
          style={{
            flex: 1,
            fontWeight: 700,
            fontSize: 13,
            color: COLORS.accent,
            letterSpacing: "0.02em",
          }}
        >
          {title}
        </span>

        {statusNote && (
          <span style={{ fontSize: 10, color: COLORS.dim, marginRight: 8, fontStyle: "italic" }}>
            {statusNote}
          </span>
        )}

        <button
          data-testid="ui-ai-collapse"
          onClick={() => setCollapsed((c) => !c)}
          style={{
            background: "none",
            border: "none",
            color: COLORS.dim,
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
            padding: "2px 4px",
            display: "flex",
            alignItems: "center",
          }}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? "▸" : "▾"}
        </button>
      </div>

      {/* ── Body ── */}
      {!collapsed && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* Output Canvas / Chat History */}
          <div
            data-testid="ui-ai-output-canvas"
            style={{
              height: 230,
              overflowY: "auto",
              background: COLORS.chatBg,
              padding: 10,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              fontSize: 12,
              userSelect: "text",
            }}
          >
            {messages.map((m, idx) => (
              <div
                key={idx}
                data-testid={`ui-ai-msg-${m.role}`}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "92%",
                  background: m.role === "user" ? "rgba(56, 189, 248, 0.15)" : COLORS.aiMsgBg,
                  border: `1px solid ${m.role === "user" ? "rgba(56, 189, 248, 0.3)" : COLORS.border}`,
                  borderRadius: 8,
                  padding: "6px 10px",
                  color: COLORS.text,
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: m.role === "user" ? COLORS.accent : COLORS.dim,
                    marginBottom: 2,
                  }}
                >
                  {m.role === "user" ? "You" : "AI"}
                </div>
                <MarkdownRenderer content={m.text} />
              </div>
            ))}
            {isSending && (
              <div style={{ alignSelf: "flex-start", color: COLORS.dim, fontSize: 11, fontStyle: "italic" }}>
                AI is thinking…
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Targeted Widgets Banner */}
          <div
            data-testid="ui-ai-target-banner"
            style={{
              padding: "4px 10px",
              background: COLORS.head,
              borderTop: `1px solid ${COLORS.border}`,
              borderBottom: `1px solid ${COLORS.border}`,
              fontSize: 10,
              color: COLORS.dim,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>
              {tickedIds.length > 0 ? (
                <>
                  Targeting: <strong style={{ color: COLORS.accent }}>{tickedIds.length}</strong> widget(s) (
                  {tickedIds.slice(0, 3).join(", ")}
                  {tickedIds.length > 3 ? "…" : ""})
                </>
              ) : (
                "Targeting: No widgets ticked (prompt only)"
              )}
            </span>
            {tickedIds.length > 0 && (
              <button
                onClick={() => aiSelectionStore.clear()}
                style={{
                  background: "none",
                  border: "none",
                  color: COLORS.accent,
                  cursor: "pointer",
                  fontSize: 10,
                  padding: 0,
                  textDecoration: "underline",
                }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Input & Send Area */}
          <div
            style={{
              padding: 8,
              background: COLORS.bg,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <textarea
              data-testid="ui-ai-textarea"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleSendPrompt();
                }
              }}
              placeholder="Type prompt to edit UI (Ctrl+Enter to send)…"
              rows={2}
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: COLORS.inputBg,
                color: COLORS.text,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 6,
                padding: "6px 8px",
                fontSize: 12,
                fontFamily: "inherit",
                resize: "vertical",
                outline: "none",
              }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                data-testid="ui-ai-send-btn"
                onClick={handleSendPrompt}
                disabled={!prompt.trim() || isSending}
                style={{
                  background: prompt.trim() ? COLORS.accent : COLORS.head,
                  color: prompt.trim() ? "#0f172a" : COLORS.dim,
                  border: "none",
                  borderRadius: 6,
                  padding: "5px 14px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: prompt.trim() && !isSending ? "pointer" : "not-allowed",
                  opacity: isSending ? 0.6 : 1,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                Send ➤
              </button>
            </div>
          </div>

          {/* Bottom Save Button */}
          <div
            style={{
              padding: "6px 8px 8px",
              background: COLORS.head,
              borderTop: `1px solid ${COLORS.border}`,
            }}
          >
            <button
              data-testid="ui-ai-save-btn"
              onClick={handleSaveUI}
              disabled={!hasChanges}
              title={hasChanges
                ? `Save ${changedWidgets.length} changed widget(s) to AI`
                : "No UI changes to save yet"}
              style={{
                width: "100%",
                background: hasChanges ? COLORS.saveBtn : COLORS.border,
                color: hasChanges ? "#ffffff" : COLORS.dim,
                border: "none",
                borderRadius: 6,
                padding: "7px 10px",
                fontSize: 12,
                fontWeight: 600,
                cursor: hasChanges ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                transition: "background 0.15s",
                opacity: hasChanges ? 1 : 0.5,
              }}
              onMouseEnter={(e) => {
                if (hasChanges) e.currentTarget.style.background = COLORS.saveBtnHov;
              }}
              onMouseLeave={(e) => {
                if (hasChanges) e.currentTarget.style.background = COLORS.saveBtn;
              }}
            >
              <span>💾</span>
              <span>
                {hasChanges
                  ? `Save ${changedWidgets.length} Change(s) to App.jsx`
                  : "No Changes to Save"}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Alias for consistency with InspectorPanel / MasterPanel
export const AIPanel = AIWidget;
