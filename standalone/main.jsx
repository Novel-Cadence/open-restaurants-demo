import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import OpenRestaurantsDemo from "../components/OpenRestaurantsDemo";
import "./index.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing root element");
}

createRoot(root).render(
  <StrictMode>
    <OpenRestaurantsDemo />
  </StrictMode>
);
