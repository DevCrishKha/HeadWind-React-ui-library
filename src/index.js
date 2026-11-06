import { Canvas } from "./Canvas.jsx";
import { Text } from "./widgets/Text.jsx";
import { Button } from "./widgets/Button.jsx";
import { ParentPanel } from "./widgets/ParentPanel.jsx";
import { ExportPanel } from "./components/ExportPanel.jsx";
import { MasterPanel } from "./components/MasterPanel.jsx";
import { InspectorPanel } from "./components/InspectorPanel.jsx";
import { WidgetListPanel } from "./widgets/WidgetListPanel.jsx";
import { useSocketUI } from "./useSocketUI.js";
import { useMqttUI, matchesMqttTopic } from "./useMqttUI.js";
import { getWidgetComponent } from "./registry.js";
import { ParentContext, useParentContext } from "./parentContext.js";
import { Heading } from "./widgets/Heading.jsx";
import { Paragraph } from "./widgets/Paragraph.jsx";
import { Label } from "./widgets/Label.jsx";
import { Badge } from "./widgets/Badge.jsx";
import { RichText } from "./widgets/RichText.jsx";
import { Icon, ICON_NAMES } from "./widgets/Icon.jsx";
import { Img } from "./widgets/Img.jsx";
import { Divider } from "./widgets/Divider.jsx";

// Everything is available as UI.Something ...
export const UI = { Canvas, Text, Button, ParentPanel, ExportPanel, MasterPanel, InspectorPanel, WidgetListPanel, useSocketUI, useMqttUI, Heading, Paragraph, Label, Badge, RichText, Icon, Img, Divider };

// ... and as named imports.
export { Canvas, Text, Button, ParentPanel, ExportPanel, MasterPanel, InspectorPanel, WidgetListPanel, Heading, Paragraph, Label, Badge, RichText, Icon, ICON_NAMES, Img, Divider };
export { UIProvider } from "./UIProvider.jsx";
export { createWidget } from "./createWidget.jsx";
export { useUIElement, useUILayout, useUIConfig } from "./hooks.js";
export { useSocketUI } from "./useSocketUI.js";
export { useMqttUI, matchesMqttTopic } from "./useMqttUI.js";
export { getWidgetComponent } from "./registry.js";
export { defaultUIConfig, mergeLayoutConfig } from "./config.js";
export { resolveSolid, SOLID_GAP } from "./solid.js";
export { ParentContext, useParentContext } from "./parentContext.js";
