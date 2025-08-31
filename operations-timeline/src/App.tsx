import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import "./App.css";

function App() {
  return (
    <FluentProvider theme={webLightTheme}>
      <div className="app-container">
        <h1>Operations Timeline</h1>
        {/* TimelineGrid component will be added here */}
      </div>
    </FluentProvider>
  );
}

export default App;
