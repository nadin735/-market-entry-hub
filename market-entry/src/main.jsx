import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/inter/300.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/noto-sans-arabic/400.css";
import "@fontsource/noto-sans-arabic/600.css";
import "@fontsource/noto-sans-arabic/700.css";
import "./index.css";
import App from "./Root.jsx";
import { mountDemoBanner, mountSetupPanel } from "./shell.js";

mountDemoBanner();
mountSetupPanel();

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
