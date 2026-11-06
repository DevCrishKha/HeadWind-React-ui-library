import { createWidget } from "../createWidget.jsx";

const OVERFLOW = {
  wrap: { whiteSpace: "normal", overflowWrap: "anywhere", overflow: "hidden" },
  ellipsis: { whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" },
  clip: { whiteSpace: "nowrap", overflow: "hidden" },
  scroll: { whiteSpace: "normal", overflowWrap: "anywhere", overflow: "auto" },
};
const TAGS = ["div", "span", "p", "h1", "h2", "h3", "h4", "h5", "h6", "label"];

function TextContent({
  text, children, color = "#111827", fontSize = 16, fontWeight = 400,
  fontFamily = "system-ui, -apple-system, Segoe UI, sans-serif", textAlign = "left",
  lineHeight = 1.4, overflow = "wrap", as = "div", style, className,
}) {
  const Tag = TAGS.includes(as) ? as : "div"; // only safe tags
  return (
    <Tag
      className={className}
      style={{
        margin: 0, width: "100%", height: "100%", boxSizing: "border-box",
        color, fontSize, fontWeight, fontFamily, textAlign, lineHeight,
        ...(OVERFLOW[overflow] || OVERFLOW.wrap), ...style,
      }}
    >
      {/* Rendered as a plain React text node, so backend text can never inject HTML. */}
      {children ?? text ?? "Text"}
    </Tag>
  );
}

export const Text = createWidget({
  type: "Text",
  builtIn: true,
  defaults: { size: { width: 240, height: 40 } },
  meta: {
    description: "A piece of text. Backend text is shown as plain text (no HTML is run).",
    props: {
      text: { type: "string", default: '"Text"', description: "The words to show. You can also pass children." },
      color: { type: "string (CSS color)", default: '"#111827"', description: "Text color." },
      fontSize: { type: "number | string", default: 16, description: "Font size in px (or any CSS size)." },
      fontWeight: { type: "number | string", default: 400, description: "400 normal, 700 bold." },
      fontFamily: { type: "string", default: "system font", description: "CSS font-family." },
      textAlign: { type: '"left" | "center" | "right" | "justify"', default: '"left"', description: "Horizontal alignment." },
      lineHeight: { type: "number | string", default: 1.4, description: "Space between lines." },
      overflow: { type: '"wrap" | "ellipsis" | "clip" | "scroll"', default: '"wrap"', description: "What happens when the text does not fit the box." },
      as: { type: '"div" | "span" | "p" | "h1".."h6" | "label"', default: '"div"', description: "HTML tag to use (semantic HTML)." },
      style: { type: "object", default: "{}", description: "Extra inline styles for the text." },
      className: { type: "string", default: "", description: "Extra CSS class." },
    },
  },
  render: TextContent,
});
