// Remembers every widget type so the JSON export can describe it.
const registry = new Map();
export const registerWidget = (type, info) => registry.set(type, info);
export const getWidgetInfo = (type) => registry.get(type);
export const getAllWidgetInfo = () => Array.from(registry.entries());
export const getWidgetComponent = (type) => registry.get(type)?.component;

