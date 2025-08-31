import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import PowerProvider from "./components/PowerProvider";

// Configure any services before rendering the app
const configureApp = () => {
  // Add any initialization here
  console.log("Configuring application...");
};

// Initialize the app
configureApp();

// Render the app
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PowerProvider>
      <App />
    </PowerProvider>
  </StrictMode>
);
