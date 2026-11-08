import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { applyThemeChoice, readThemeChoice } from "./lib/theme";
import "./styles.css";

// Apply a saved light/dark choice before the first render, so the page never flashes the other theme.
applyThemeChoice(readThemeChoice());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
