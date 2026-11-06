import { createRoot } from "react-dom/client";
import StaticPage from "./StaticPage.jsx";

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<StaticPage />);
}

