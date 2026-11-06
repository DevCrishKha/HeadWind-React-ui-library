import { createWidget } from "../createWidget.jsx";

const VARIANT_STYLES = {
  default:  { background: "#e5e7eb", color: "#374151" },
  primary:  { background: "#dbeafe", color: "#1d4ed8" },
  success:  { background: "#dcfce7", color: "#15803d" },
  warning:  { background: "#fef3c7", color: "#b45309" },
  danger:   { background: "#fee2e2", color: "#dc2626" },
  info:     { background: "#e0f2fe", color: "#0369a1" },
};

function BadgeContent({
  text, children, variant = "default", color, backgroundColor,
  fontSize = 12, fontWeight = 600,
  fontFamily = "system-ui, -apple-system, Segoe UI, sans-serif",
  borderRadius = 9999, style, className,
}) {
  const base = VARIANT_STYLES[variant] || VARIANT_STYLES.default;
  return (
    <span
      className={className}
      style={{
        margin: 0, width: "100%", height: "100%", boxSizing: "border-box",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize, fontWeight, fontFamily, borderRadius,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        paddingLeft: 8, paddingRight: 8,
        ...base,
        ...(color ? { color } : {}),
        ...(backgroundColor ? { background: backgroundColor } : {}),
        ...style,
      }}
    >
      {children ?? text ?? "Badge"}
    </span>
  );
}

export const Badge = createWidget({
  type: "Badge",
  builtIn: true,
  defaults: { size: { width: 80, height: 28 } },
  meta: {
    description: "A compact label for categories, counts, and statuses. Backend text is shown as plain text.",
    props: {
      text:            { type: "string", default: '"Badge"', description: "Badge content. You can also pass children." },
      variant:         { type: '"default" | "primary" | "success" | "warning" | "danger" | "info"', default: '"default"', description: "Color variant." },
      color:           { type: "string (CSS color)", default: "from variant", description: "Text color override." },
      backgroundColor: { type: "string (CSS color)", default: "from variant", description: "Background color override." },
      fontSize:        { type: "number | string", default: 12, description: "Font size." },
      fontWeight:      { type: "number | string", default: 600, description: "Font weight." },
      fontFamily:      { type: "string", default: "system font", description: "CSS font-family." },
      borderRadius:    { type: "number | string", default: 9999, description: "Border radius (pill shape by default)." },
      style:           { type: "object", default: "{}", description: "Extra inline styles." },
      className:       { type: "string", default: "", description: "Extra CSS class." },
    },
  },
  render: BadgeContent,
});

