import { useEffect, useState } from "react";
import { UI, UIProvider, useUIElement } from "@devcrish/headwind";

import Clock from "./Clock.jsx";

const card = { background: "#fff", borderRadius: 10, padding: 14, boxShadow: "0 1px 3px rgba(0,0,0,.12)", marginBottom: 14 };
const label = { display: "flex", gap: 6, alignItems: "center", fontSize: 14 };

// Reads one widget's live numbers with the useUIElement hook (item 6).
function LiveReadout({ id }) {
  const g = useUIElement(id);
  if (!g) return null;
  return (
    <code style={{ fontSize: 13 }}>
      {id}: x={g.position.x}, y={g.position.y}, width={g.size.width}, height={g.size.height}
    </code>
  );
}

export default function FullDemo() {
  const [globalDrag, setGlobalDrag] = useState(true);
  const [globalResize, setGlobalResize] = useState(true);
  const [pageDeploy, setPageDeploy] = useState(false);
  const [headingDeploy, setHeadingDeploy] = useState(false);
  const [clicks, setClicks] = useState(0);
  const [temp, setTemp] = useState(28);

  // 11. Simulated backend data: the text changes, the layout does not reset.
  useEffect(() => {
    const t = setInterval(() => setTemp((v) => +(v + (Math.random() - 0.5)).toFixed(1)), 1500);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 20 }}>
      <h1 style={{ margin: "0 0 4px" }}>@devcrish/headwind example</h1>
      <p style={{ marginTop: 0 }}>
        Drag and resize the widgets. Click one to select it. Use the panel at the bottom right to copy the layout.
      </p>

      <UIProvider config={{ isDraggable: globalDrag, isResizable: globalResize }}>
        <div style={card}>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            <label style={label}><input type="checkbox" checked={globalDrag} onChange={(e) => setGlobalDrag(e.target.checked)} /> Dragging (global default)</label>
            <label style={label}><input type="checkbox" checked={globalResize} onChange={(e) => setGlobalResize(e.target.checked)} /> Resizing (global default)</label>
            <label style={label}><input type="checkbox" checked={pageDeploy} onChange={(e) => setPageDeploy(e.target.checked)} /> Deploy whole page</label>
            <label style={label}><input type="checkbox" checked={headingDeploy} onChange={(e) => setHeadingDeploy(e.target.checked)} /> Deploy only the heading</label>
          </div>
          <div style={{ marginTop: 10, display: "grid", gap: 2 }}>
            <LiveReadout id="heading" />
            <LiveReadout id="temperature" />
          </div>
        </div>

        <UI.Canvas deploy={pageDeploy} height={460} style={{ borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,.12)" }}>
          {/* 1-2. No layout props at all: sensible size, placed automatically one below the other. */}
          <UI.Text id="heading" text="Weather Dashboard" fontSize={26} fontWeight={700} deploy={headingDeploy} />
          <UI.Text id="temperature" text={`Temperature: ${temp} Â°C`} />
          <UI.Button text="Click me" onClick={() => setClicks((c) => c + 1)} />

          {/* 4. Override only one thing. Here only x is set, y is still automatic. */}
          <UI.Text text="Only x is set (400)" position={{ x: 400 }} color="#2563eb" />

          {/* 4/9. Override a single setting. This one can be resized but not dragged. */}
          <UI.Text id="pinned" text="Not draggable, but resizable" isDraggable={false} position={{ x: 400, y: 90 }} color="#b91c1c" />

          <UI.Text text={`Button clicks: ${clicks}`} position={{ x: 400, y: 150 }} />
          <UI.Button text="Delete" variant="danger" position={{ x: 400, y: 200 }} />
          <UI.Button text="Disabled" variant="outline" disabled position={{ x: 560, y: 200 }} />
          <Clock position={{ x: 400, y: 270 }} />
        </UI.Canvas>

        <UI.ExportPanel />
      </UIProvider>

      {/* 7-8. The same widgets with numbers pasted in and deploy turned on. */}
      <h2 style={{ marginBottom: 6 }}>After hardcoding</h2>
      <p style={{ marginTop: 0 }}>These numbers were pasted from the export. No editing tools show, and everything still works.</p>
      <UIProvider>
        <UI.Canvas height={120} deploy style={{ borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,.12)" }}>
          <UI.Text id="final-heading" text="Weather Dashboard" fontSize={26} fontWeight={700} position={{ x: 74, y: 32 }} size={{ width: 520, height: 64 }} />
          <UI.Button id="final-button" text="Refresh" position={{ x: 640, y: 40 }} size={{ width: 140, height: 44 }} onClick={() => alert("Still works!")} />
        </UI.Canvas>
      </UIProvider>
      <pre style={{ ...card, overflow: "auto", fontSize: 13 }}>{`<UI.Text id="final-heading" text="Weather Dashboard"
  position={{ x: 74, y: 32 }} size={{ width: 520, height: 64 }} />
<UI.Canvas deploy>  // deploy the whole page`}</pre>
    </div>
  );
}
