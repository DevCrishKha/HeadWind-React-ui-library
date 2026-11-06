import { useEffect, useState } from "react";
import { createWidget } from "@devcrish/headwind";

// 12. A custom React component turned into a layout-aware widget with createWidget.
function ClockContent({ prefix = "Time: " }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ height: "100%", display: "grid", placeItems: "center", background: "#0f172a", color: "#e2e8f0", fontFamily: "ui-monospace, monospace", borderRadius: 8 }}>
      {prefix}{now.toLocaleTimeString()}
    </div>
  );
}
const Clock = createWidget({
  type: "Clock",
  defaults: { size: { width: 200, height: 56 } },
  meta: {
    description: "My own custom widget: a live clock.",
    props: { prefix: { type: "string", default: '"Time: "', description: "Text before the time." } },
  },
  render: ClockContent,
});

export default Clock;
