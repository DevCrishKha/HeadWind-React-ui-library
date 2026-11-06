import { createWidget } from "../createWidget.jsx";

const VARIANTS = {
  primary: { background: "#2563eb", color: "#fff", border: "1px solid #2563eb" },
  secondary: { background: "#e2e8f0", color: "#0f172a", border: "1px solid #e2e8f0" },
  outline: { background: "transparent", color: "#2563eb", border: "1px solid #2563eb" },
  ghost: { background: "transparent", color: "#2563eb", border: "1px solid transparent" },
  danger: { background: "#dc2626", color: "#fff", border: "1px solid #dc2626" },
};

function ButtonContent({ text, children, variant = "primary", disabled = false, loading = false, onClick, type = "button", color, backgroundColor, style }) {
  const base = VARIANTS[variant] || VARIANTS.primary;
  const off = disabled || loading;
  return (
    <button
      type={type}
      disabled={off}
      aria-busy={loading || undefined}
      onClick={onClick}
      style={{
        width: "100%", height: "100%", boxSizing: "border-box", borderRadius: 8,
        font: "600 15px system-ui, sans-serif", cursor: off ? "not-allowed" : "pointer", opacity: off ? 0.6 : 1,
        ...base, ...(color ? { color } : {}), ...(backgroundColor ? { background: backgroundColor } : {}), ...style,
      }}
    >
      {loading ? "Loading…" : children ?? text ?? "Button"}
    </button>
  );
}

export const Button = createWidget({
  type: "Button",
  builtIn: true,
  defaults: { size: { width: 140, height: 44 } },
  meta: {
    description: "A clickable button. It still works normally in edit mode (a click is not a drag).",
    props: {
      text: { type: "string", default: '"Button"', description: "Label. You can also pass children." },
      variant: { type: '"primary" | "secondary" | "outline" | "ghost" | "danger"', default: '"primary"', description: "Look of the button." },
      onClick: { type: "(event) => void", default: "undefined", description: "Called when clicked." },
      disabled: { type: "boolean", default: false, description: "Turns the button off." },
      loading: { type: "boolean", default: false, description: "Shows a loading label and blocks clicks." },
      type: { type: '"button" | "submit" | "reset"', default: '"button"', description: "HTML button type." },
      color: { type: "string (CSS color)", default: "from variant", description: "Text color override." },
      backgroundColor: { type: "string (CSS color)", default: "from variant", description: "Background color override." },
      style: { type: "object", default: "{}", description: "Extra inline styles." },
    },
  },
  render: ButtonContent,
});
