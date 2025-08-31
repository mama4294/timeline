// React JSX runtime is used implicitly
import { ZoomLevel } from "../hooks/useViewport";

interface Props {
  zoom: ZoomLevel;
  setZoom: (z: ZoomLevel) => void;
  onJumpToNow: () => void;
}

export default function TimelineControls({
  zoom,
  setZoom,
  onJumpToNow,
}: Props) {
  return (
    <div
      style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}
    >
      <label>Zoom:</label>
      <select
        value={zoom}
        onChange={(e) => setZoom(e.target.value as ZoomLevel)}
      >
        <option value="hour">Hour</option>
        <option value="day">Day</option>
        <option value="week">Week</option>
        <option value="year">Year</option>
      </select>
      <button onClick={onJumpToNow}>Jump to now</button>
    </div>
  );
}
