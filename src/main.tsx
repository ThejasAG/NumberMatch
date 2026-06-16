import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./mobile/App.tsx";
import "./mobile/styles.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
