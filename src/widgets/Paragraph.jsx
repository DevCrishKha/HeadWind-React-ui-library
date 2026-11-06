import { createWidget } from "../createWidget.jsx";

function ParagraphContent({
  text, children, color = "#374151", fontSize = 16, fontWeight = 400,
  fontFamily = "system-ui, -apple-system, Segoe UI, sans-serif", textAlign = "left",
  lineHeight = 1.6, style, className,
}) {
  return (
    <p
      className={className}
      style={{
        margin: 0, width: "100%", height: "100%", boxSizing: "border-box",
        color, fontSize, fontWeight, fontFamily, textAlign, lineHeight,
        whiteSpace: "normal", overflowWrap: "anywhere", overflow: "auto",
        ...style,
      }}
    >
      {children ?? text ?? "Paragraph text goes here. This is a block of body text with comfortable line height for readability."}
    </p>
  );
}

export const Paragraph = createWidget({
  type: "Paragraph",
  builtIn: true,
  defaults: { size: { width: 400, height: 100 } },
  meta: {
    description: "Body text paragraph with readable line-height. Backend text is shown as plain text.",
    props: {
      text:       { type: "string", default: '"Paragraph text goes here..."', description: "The paragraph content. You can also pass children." },
      color:      { type: "string (CSS color)", default: '"#374151"', description: "Text color." },
      fontSize:   { type: "number | string", default: 16, description: "Font size in px (or any CSS size)." },
      fontWeight: { type: "number | string", default: 400, description: "Font weight." },
      fontFamily: { type: "string", default: "system font", description: "CSS font-family." },
      textAlign:  { type: '"left" | "center" | "right" | "justify"', default: '"left"', description: "Horizontal alignment." },
      lineHeight: { type: "number | string", default: 1.6, description: "Line height." },
      style:      { type: "object", default: "{}", description: "Extra inline styles." },
      className:  { type: "string", default: "", description: "Extra CSS class." },
    },
  },
  render: ParagraphContent,
});

