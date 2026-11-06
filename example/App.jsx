import { UI } from "@devcrish/headwind";
// import Clock from "./Clock.jsx";
// copy Clock.jsx from the example folder of the library into the directory of App.jsx, then import Clock from it

// The simple version: just widgets. Drag and resize them in the browser.
// Socket.IO backend sync is enabled by passing socketUrl="http://localhost:5000" to <UI.Canvas>.
export default function App() {
  return (
    <UI.Canvas
      deploy={false}
      mqttUrl="ws://localhost:9001"
      mqttTopic="renderReactUI"
      socketUrl="http://localhost:5000"
      socketEvent="customSyncUI"
    >
      {/* Existing demo widgets */}
      <UI.Text
        id="pinned"
        text="Hello Brother"
        fontSize={30}
        fontWeight={700}
        position={{ x: 420, y: 80 }}
        size={{ width: 240, height: 80 }}
      />
      {/* <Clock position={{ x: 420, y: 180 }} size={{ width: 200, height: 56 }} solid /> */}

      {/* Two adjacent ParentPanels resizable via Divider */}
      <UI.ParentPanel
        id="panel-left"
        position={{ x: 40, y: 300 }}
        size={{ width: 708, height: 360 }}
        childResizeMode="reflow"
        backgroundColor="#1e293b"
        title="Left Panel"
      >
        <UI.Text
          text="Left Panel (Adjacent)"
          color="#ffffff"
          position={{ x: 20, y: 20 }}
        />
        <UI.Button
          position={{ x: 20, y: 70 }}
          size={{ width: 140, height: 40 }}
          text="Left Action"
          variant="primary"
        />
      </UI.ParentPanel>

      <UI.Divider
        id="panel-divider"
        position={{ x: 754, y: 301 }}
        size={{ width: 12, height: 360 }}
        orientation="vertical"
        panelBefore="panel-left"
        panelAfter="panel-right"
        resizableSections
        interactive={true}
        showHandle
        color="#64748b"
        hoverColor="#38bdf8"
        activeColor="#0284c7"
        thickness={2}
      />

      <UI.ParentPanel
        id="panel-right"
        position={{ x: 772, y: 294 }}
        size={{ width: 660, height: 360 }}
        childResizeMode="reflow"
        backgroundColor="#0f172a"
        title="Right Panel"
      >
        <UI.Text
          text="Right Panel (Adjacent)"
          color="#ffffff"
          position={{ x: 20, y: 20 }}
        />
        <UI.Button
          position={{ x: 20, y: 70 }}
          size={{ width: 140, height: 40 }}
          text="Right Action"
          variant="primary"
        />
      </UI.ParentPanel>

      <UI.MasterPanel />
      <UI.InspectorPanel />
      <UI.WidgetListPanel />
    </UI.Canvas>
  );
}
