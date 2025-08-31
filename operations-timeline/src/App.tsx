import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import TimelineGrid from "./components/TimelineGrid";
import "./App.css";

function App() {
  return (
    <FluentProvider theme={webLightTheme}>
      <div className="app-container">
        <h1>Operations Timeline</h1>
        <TimelineGrid />
      </div>
    </FluentProvider>
  );
}

export default App;
