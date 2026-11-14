import { createWidget } from "../createWidget.jsx";

const VARIANTS = {
  primary: { background: "#2563eb", color: "#fff", border: "1px solid #2563eb" },
  secondary: { background: "#e2e8f0", color: "#0f172a", border: "1px solid #e2e8f0" },
  outline: { background: "transparent", color: "#2563eb", border: "1px solid #2563eb" },
  ghost: { background: "transparent", color: "#2563eb", border: "1px solid transparent" },
  danger: { background: "#dc2626", color: "#fff", border: "1px solid #dc2626" },
};

const ICONS = {
  burger: (
    <g strokeWidth="2.5" strokeLinecap="round" stroke="currentColor">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </g>
  ),
  "3dot": (
    <g fill="currentColor">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </g>
  ),
  "dots-horizontal": (
    <g fill="currentColor">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </g>
  ),
  close: (
    <g strokeWidth="2.5" strokeLinecap="round" stroke="currentColor">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </g>
  ),
  plus: (
    <g strokeWidth="2.5" strokeLinecap="round" stroke="currentColor">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </g>
  ),
  minus: (
    <g strokeWidth="2.5" strokeLinecap="round" stroke="currentColor">
      <line x1="5" y1="12" x2="19" y2="12" />
    </g>
  ),
  check: (
    <g strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" fill="none">
      <polyline points="20 6 9 17 4 12" />
    </g>
  ),
  settings: (
    <path fill="currentColor" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  ),
  search: (
    <g strokeWidth="2" strokeLinecap="round" stroke="currentColor" fill="none">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </g>
  ),
};

// Aliases
ICONS.hamburger = ICONS.burger;
ICONS.menu = ICONS.burger;
ICONS["dots-vertical"] = ICONS["3dot"];
ICONS.kebab = ICONS["3dot"];
ICONS.meatball = ICONS["dots-horizontal"];
ICONS.x = ICONS.close;

function IconButtonContent({
  design,
  icon,
  text,
  children,
  variant = "secondary",
  iconSize = 20,
  borderRadius = 8,
  disabled = false,
  loading = false,
  onClick,
  type = "button",
  color,
  backgroundColor,
  style,
  className,
  title,
}) {
  const base = VARIANTS[variant] || VARIANTS.secondary;
  const off = disabled || loading;
  const iconKey = design || icon || "burger";
  const iconGraphic = ICONS[iconKey] || ICONS.burger;

  return (
    <button
      type={type}
      disabled={off}
      title={title}
      aria-label={title || (typeof text === "string" ? text : iconKey)}
      aria-busy={loading || undefined}
      onClick={onClick}
      className={className}
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        borderRadius,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "0 8px",
        font: "600 14px system-ui, sans-serif",
        cursor: off ? "not-allowed" : "pointer",
        opacity: off ? 0.6 : 1,
        ...base,
        ...(color ? { color } : {}),
        ...(backgroundColor ? { background: backgroundColor } : {}),
        ...style,
      }}
    >
      {loading ? (
        "Loading…"
      ) : (
        <>
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            style={{ display: "block", flexShrink: 0 }}
            aria-hidden="true"
          >
            {iconGraphic}
          </svg>
          {children ?? (text ? <span>{text}</span> : null)}
        </>
      )}
    </button>
  );
}

export const IconButton = createWidget({
  type: "IconButton",
  builtIn: true,
  defaults: { size: { width: 44, height: 44 } },
  meta: {
    description: "A clickable icon button with built-in designs (burger menu, 3-dot kebab/meatball, close, plus, etc.).",
    props: {
      design: { type: '"burger" | "3dot" | "dots-vertical" | "dots-horizontal" | "close" | "plus" | "minus" | "settings" | "search"', default: '"burger"', description: "Design/icon to display." },
      icon: { type: "string", default: '"burger"', description: "Alias for design." },
      text: { type: "string", default: '""', description: "Optional text label displayed next to the icon." },
      variant: { type: '"primary" | "secondary" | "outline" | "ghost" | "danger"', default: '"secondary"', description: "Look of the button." },
      iconSize: { type: "number", default: 20, description: "Size of the icon in pixels." },
      borderRadius: { type: "number | string", default: 8, description: "Corner radius in px." },
      onClick: { type: "(event) => void", default: "undefined", description: "Called when clicked." },
      disabled: { type: "boolean", default: false, description: "Turns the button off." },
      loading: { type: "boolean", default: false, description: "Shows a loading label and blocks clicks." },
      type: { type: '"button" | "submit" | "reset"', default: '"button"', description: "HTML button type." },
      color: { type: "string (CSS color)", default: "from variant", description: "Icon/text color override." },
      backgroundColor: { type: "string (CSS color)", default: "from variant", description: "Background color override." },
      style: { type: "object", default: "{}", description: "Extra inline styles." },
      className: { type: "string", default: '""', description: "Extra CSS class." },
      title: { type: "string", default: '""', description: "Tooltip and accessibility label." },
    },
  },
  render: IconButtonContent,
});

