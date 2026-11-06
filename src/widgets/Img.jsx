import { createWidget } from "../createWidget.jsx";

// Allowed URL schemes for security
const SAFE_SCHEMES = ["http:", "https:", "data:"];

function isValidSrc(src) {
  if (!src || typeof src !== "string") return false;
  // Relative URLs are allowed
  if (src.startsWith("/") || src.startsWith("./") || src.startsWith("../")) return true;
  try {
    const url = new URL(src);
    return SAFE_SCHEMES.includes(url.protocol);
  } catch {
    // If it's not a parseable URL, allow it (could be a relative path)
    return true;
  }
}

function ImgContent({
  src, alt = "", text, objectFit = "contain", objectPosition = "center",
  borderRadius = 0, backgroundColor = "transparent",
  // Binary image support: pass raw base64 data + mimeType
  data, mimeType = "image/png",
  loading = false, error = false, errorText = "Failed to load image",
  showDragHandle = true,
  title,
  dragHandle,
  style, className, widget,
}) {
  const showHandle = widget?.editable && showDragHandle !== false;
  const handleHeight = 28;

  // Build the actual source URL
  let imageSrc = src;
  if (!imageSrc && data) {
    // Build a data URI from binary content
    imageSrc = `data:${mimeType};base64,${data}`;
  }

  let content;
  if (loading) {
    content = (
      <div
        style={{
          margin: 0, width: "100%", height: "100%", boxSizing: "border-box",
          display: "flex", alignItems: "center", justifyContent: "center",
          backgroundColor: "#f3f4f6", color: "#9ca3af", fontSize: 14,
        }}
      >
        Loading…
      </div>
    );
  } else if (error) {
    content = (
      <div
        style={{
          margin: 0, width: "100%", height: "100%", boxSizing: "border-box",
          display: "flex", alignItems: "center", justifyContent: "center",
          backgroundColor: "#fef2f2", color: "#dc2626", fontSize: 14,
        }}
      >
        {errorText}
      </div>
    );
  } else if (!imageSrc || !isValidSrc(imageSrc)) {
    content = (
      <div
        style={{
          margin: 0, width: "100%", height: "100%", boxSizing: "border-box",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: 8,
          backgroundColor: "#f9fafb", color: "#9ca3af", fontSize: 14,
          border: "2px dashed #d1d5db",
        }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {text ?? "No image"}
      </div>
    );
  } else {
    content = (
      <img
        src={imageSrc}
        alt={alt}
        style={{
          width: "100%", height: "100%",
          objectFit, objectPosition,
          display: "block",
        }}
      />
    );
  }

  return (
    <div
      data-ui-img={widget?.id}
      className={className}
      style={{
        margin: 0,
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        borderRadius: typeof borderRadius === "number" ? `${borderRadius}px` : borderRadius,
        backgroundColor,
        overflow: "hidden",
        ...style,
      }}
    >
      {/* Explicit drag handle */}
      {showHandle && (
        dragHandle ? (
          <div
            data-testid="img-drag-handle"
            data-ui-img-drag-handle
            data-ui-parent-drag-handle
            onPointerDown={(e) => {
              e.stopPropagation();
              widget?.beginDrag?.(e);
            }}
          >
            <div data-testid="parent-drag-handle" style={{ display: "contents" }}>
              {dragHandle}
            </div>
          </div>
        ) : (
          <div
            data-testid="img-drag-handle"
            data-ui-img-drag-handle
            data-ui-parent-drag-handle
            onPointerDown={(e) => {
              e.stopPropagation();
              widget?.beginDrag?.(e);
            }}
            style={{
              height: `${handleHeight}px`,
              minHeight: `${handleHeight}px`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 10px",
              background: "rgba(0, 0, 0, 0.08)",
              borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
              cursor: "grab",
              userSelect: "none",
              fontSize: "12px",
              color: "#334155",
              fontFamily: "system-ui, -apple-system, sans-serif",
              borderTopLeftRadius: typeof borderRadius === "number" ? `${borderRadius}px` : borderRadius,
              borderTopRightRadius: typeof borderRadius === "number" ? `${borderRadius}px` : borderRadius,
            }}
          >
            <div data-testid="parent-drag-handle" style={{ display: "contents" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                <span style={{ fontSize: "14px", lineHeight: 1, opacity: 0.6 }}>⠿</span>
                <span>{title || widget?.id || "Img"}</span>
              </div>
              <div style={{ fontSize: "10px", opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                IMG
              </div>
            </div>
          </div>
        )
      )}

      {/* Content area */}
      <div
        data-testid="img-content"
        style={{
          position: "relative",
          flex: 1,
          width: "100%",
          height: showHandle ? `calc(100% - ${handleHeight}px)` : "100%",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {content}
      </div>
    </div>
  );
}

export const Img = createWidget({
  type: "Img",
  builtIn: true,
  defaults: { size: { width: 300, height: 200 } },
  meta: {
    description: "Displays an image from a URL (src) or from base64-encoded binary data (data + mimeType). Shows placeholder, loading, and error states. URLs are validated for safe schemes (http, https, data, relative).",
    props: {
      src:             { type: "string", default: "undefined", description: "Image URL (http, https, data URI, or relative path)." },
      alt:             { type: "string", default: '""', description: "Alt text for accessibility." },
      text:            { type: "string", default: '"No image"', description: "Placeholder text when no image is provided." },
      objectFit:       { type: '"contain" | "cover" | "fill" | "none" | "scale-down"', default: '"contain"', description: "How the image fits inside the box." },
      objectPosition:  { type: "string", default: '"center"', description: "CSS object-position for the image." },
      borderRadius:    { type: "number | string", default: 0, description: "Border radius." },
      backgroundColor: { type: "string (CSS color)", default: '"transparent"', description: "Background color behind the image." },
      data:            { type: "string (base64)", default: "undefined", description: "Base64-encoded image data (used when src is not provided)." },
      mimeType:        { type: "string", default: '"image/png"', description: "MIME type for binary data (e.g. image/png, image/jpeg, image/svg+xml)." },
      loading:         { type: "boolean", default: false, description: "Shows a loading placeholder." },
      error:           { type: "boolean", default: false, description: "Shows an error state." },
      errorText:       { type: "string", default: '"Failed to load image"', description: "Error message to display." },
      showDragHandle:  { type: "boolean", default: true, description: "Show dedicated drag handle bar in edit mode." },
      title:           { type: "string", default: '""', description: "Title displayed in drag handle bar." },
      dragHandle:      { type: "ReactNode", default: "undefined", description: "Custom drag handle element." },
      style:           { type: "object", default: "{}", description: "Extra inline styles." },
      className:       { type: "string", default: "", description: "Extra CSS class." },
    },
  },
  render: ImgContent,
});

