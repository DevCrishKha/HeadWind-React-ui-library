import { createWidget } from "../createWidget.jsx";

function LabelContent({
  text, children, htmlFor, color = "#374151", fontSize = 14, fontWeight = 600,
  fontFamily = "system-ui, -apple-system, Segoe UI, sans-serif", textAlign = "left",
  lineHeight = 1.4, required = false, style, className,
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={className}
      style={{
        margin: 0, width: "100%", height: "100%", boxSizing: "border-box",
        color, fontSize, fontWeight, fontFamily, textAlign, lineHeight,
        display: "flex", alignItems: "center",
        cursor: "default", userSelect: "none",
        ...style,
      }}
    >
      {children ?? text ?? "Label"}
      {required && (
        <span style={{ color: "#dc2626", marginLeft: 2 }} aria-hidden="true">*</span>
      )}
    </label>
  );
}

export const Label = createWidget({
  type: "Label",
  builtIn: true,
  defaults: { size: { width: 160, height: 32 } },
  meta: {
    description: "A label for form inputs and other interface elements. Backend text is shown as plain text.",
    props: {
      text:       { type: "string", default: '"Label"', description: "Label text. You can also pass children." },
      htmlFor:    { type: "string", default: "undefined", description: "The id of the element this label is for." },
      color:      { type: "string (CSS color)", default: '"#374151"', description: "Text color." },
      fontSize:   { type: "number | string", default: 14, description: "Font size." },
      fontWeight: { type: "number | string", default: 600, description: "Font weight." },
      fontFamily: { type: "string", default: "system font", description: "CSS font-family." },
      textAlign:  { type: '"left" | "center" | "right"', default: '"left"', description: "Horizontal alignment." },
      lineHeight: { type: "number | string", default: 1.4, description: "Line height." },
      required:   { type: "boolean", default: false, description: "Shows a red asterisk after the label text." },
      style:      { type: "object", default: "{}", description: "Extra inline styles." },
      className:  { type: "string", default: "", description: "Extra CSS class." },
    },
  },
  render: LabelContent,
});

