import { createWidget } from "../createWidget.jsx";

// A sanitized subset of HTML tags allowed in rich text rendering.
// We do NOT use dangerouslySetInnerHTML. Instead, we parse a simple
// markdown-like syntax and render React elements.
const INLINE_RULES = [
  { pattern: /\*\*(.+?)\*\*/g,   tag: "strong" },
  { pattern: /\*(.+?)\*/g,       tag: "em" },
  { pattern: /~~(.+?)~~/g,       tag: "s" },
  { pattern: /`(.+?)`/g,         tag: "code" },
  { pattern: /__(.+?)__/g,       tag: "u" },
];

/**
 * Parses simple inline markdown-like tokens into React elements.
 * Only **bold**, *italic*, ~~strikethrough~~, `code`, and __underline__ are supported.
 * All text is rendered as React text nodes (safe from injection).
 */
function parseInline(text) {
  if (typeof text !== "string") return text;

  // Work through the text and find the first match of any rule
  let result = [text];

  for (const rule of INLINE_RULES) {
    const next = [];
    for (const part of result) {
      if (typeof part !== "string") {
        next.push(part);
        continue;
      }
      let lastIndex = 0;
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
      let match;
      while ((match = regex.exec(part)) !== null) {
        if (match.index > lastIndex) {
          next.push(part.slice(lastIndex, match.index));
        }
        const Tag = rule.tag;
        const codeStyle = rule.tag === "code" ? {
          background: "#f1f5f9", padding: "1px 4px", borderRadius: 3,
          fontFamily: "monospace", fontSize: "0.9em",
        } : undefined;
        next.push(<Tag key={`${rule.tag}-${match.index}`} style={codeStyle}>{match[1]}</Tag>);
        lastIndex = regex.lastIndex;
      }
      if (lastIndex < part.length) {
        next.push(part.slice(lastIndex));
      }
    }
    result = next;
  }

  return result;
}

function RichTextContent({
  text, children, color = "#111827", fontSize = 16, fontWeight = 400,
  fontFamily = "system-ui, -apple-system, Segoe UI, sans-serif", textAlign = "left",
  lineHeight = 1.6, style, className,
}) {
  const content = children ?? text ?? "**Rich** *text* with ~~formatting~~ and `code`.";

  // If content is a string, parse it for inline formatting.
  // If it's a React element (children), render as-is.
  const rendered = typeof content === "string"
    ? content.split("\n").map((line, i, arr) => (
        <span key={i}>
          {parseInline(line)}
          {i < arr.length - 1 && <br />}
        </span>
      ))
    : content;

  return (
    <div
      className={className}
      style={{
        margin: 0, width: "100%", height: "100%", boxSizing: "border-box",
        color, fontSize, fontWeight, fontFamily, textAlign, lineHeight,
        whiteSpace: "normal", overflowWrap: "anywhere", overflow: "auto",
        ...style,
      }}
    >
      {rendered}
    </div>
  );
}

export const RichText = createWidget({
  type: "RichText",
  builtIn: true,
  defaults: { size: { width: 400, height: 100 } },
  meta: {
    description: "Formatted text supporting inline markdown-like syntax: **bold**, *italic*, ~~strikethrough~~, `code`, __underline__. All text is rendered as React elements (safe from injection). Newlines are converted to line breaks.",
    props: {
      text:       { type: "string", default: '"**Rich** *text* with ~~formatting~~ and `code`."', description: "The text with inline formatting. You can also pass children." },
      color:      { type: "string (CSS color)", default: '"#111827"', description: "Text color." },
      fontSize:   { type: "number | string", default: 16, description: "Font size." },
      fontWeight: { type: "number | string", default: 400, description: "Font weight." },
      fontFamily: { type: "string", default: "system font", description: "CSS font-family." },
      textAlign:  { type: '"left" | "center" | "right" | "justify"', default: '"left"', description: "Horizontal alignment." },
      lineHeight: { type: "number | string", default: 1.6, description: "Line height." },
      style:      { type: "object", default: "{}", description: "Extra inline styles." },
      className:  { type: "string", default: "", description: "Extra CSS class." },
    },
  },
  render: RichTextContent,
});

