import { createWidget } from "../createWidget.jsx";

const LEVELS = [1, 2, 3, 4, 5, 6];

function HeadingContent({
  text, children, level = 2, color = "#111827", fontSize, fontWeight = 700,
  fontFamily = "system-ui, -apple-system, Segoe UI, sans-serif", textAlign = "left",
  lineHeight = 1.25, style, className,
}) {
  const safeLevel = LEVELS.includes(level) ? level : 2;
  const Tag = `h${safeLevel}`;
  const defaultSizes = { 1: 36, 2: 30, 3: 24, 4: 20, 5: 18, 6: 16 };
  return (
    <Tag
      className={className}
      style={{
        margin: 0, width: "100%", height: "100%", boxSizing: "border-box",
        color, fontWeight, fontFamily, textAlign, lineHeight,
        fontSize: fontSize ?? defaultSizes[safeLevel],
        display: "flex", alignItems: "center",
        ...style,
      }}
    >
      {children ?? text ?? "Heading"}
    </Tag>
  );
}

export const Heading = createWidget({
  type: "Heading",
  builtIn: true,
  defaults: { size: { width: 360, height: 48 } },
  meta: {
    description: "A semantic heading (h1 to h6). Backend text is shown as plain text.",
    props: {
      text:       { type: "string", default: '"Heading"', description: "The words to show. You can also pass children." },
      level:      { type: "1 | 2 | 3 | 4 | 5 | 6", default: 2, description: "Which HTML heading tag to use (h1 to h6)." },
      color:      { type: "string (CSS color)", default: '"#111827"', description: "Text color." },
      fontSize:   { type: "number | string", default: "from level", description: "Override the font size." },
      fontWeight: { type: "number | string", default: 700, description: "Font weight." },
      fontFamily: { type: "string", default: "system font", description: "CSS font-family." },
      textAlign:  { type: '"left" | "center" | "right"', default: '"left"', description: "Horizontal alignment." },
      lineHeight: { type: "number | string", default: 1.25, description: "Line height." },
      style:      { type: "object", default: "{}", description: "Extra inline styles." },
      className:  { type: "string", default: "", description: "Extra CSS class." },
    },
  },
  render: HeadingContent,
});

