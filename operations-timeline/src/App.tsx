import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import TimelineGrid from "./components/TimelineGrid";
import "./App.css";

function App() {
  return (
    <FluentProvider
      theme={webLightTheme}
      style={{ height: "100vh", backgroundColor: "#f5f5f5" }}
    >
      <div
        style={{
          padding: "20px",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <h1 style={{ margin: 0, color: "#323130" }}>Operations Timeline</h1>
        <TimelineGrid />
      </div>
    </FluentProvider>
  );
}

export default App;
