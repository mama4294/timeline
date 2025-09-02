import {
  Button,
  Toolbar,
  ToolbarDivider,
  Dropdown,
  Option,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import {
  CalendarLtr24Regular,
  Add24Regular,
  Grid24Regular,
} from "@fluentui/react-icons";
import { ZoomLevel } from "../hooks/useViewport";

interface Props {
  zoom: ZoomLevel;
  setZoom: (z: ZoomLevel) => void;
  editMode: boolean;
  setEditMode: (mode: boolean) => void;
  onJumpToNow: () => void;
  onAddEquipment: () => void;
  onAddOperation: () => void;
  onManageBatches: () => void;
}

const useStyles = makeStyles({
  toolbar: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
  },
});

export default function TimelineControls({
  zoom,
  setZoom,
  editMode,
  setEditMode,
  onJumpToNow,
  onAddEquipment,
  onAddOperation,
  onManageBatches,
}: Props) {
  const styles = useStyles();

  const zoomOptions = [
    { key: "hour", text: "Hour View" },
    { key: "day", text: "Day View" },
    { key: "week", text: "Week View" },
    { key: "year", text: "Year View" },
  ];

  const modeOptions = [
    { key: "view", text: "View Mode" },
    { key: "edit", text: "Edit Mode" },
  ];

  return (
    <Toolbar className={styles.toolbar} size="small">
      {/* Edit/View Mode Selector */}
      <Dropdown
        aria-labelledby="mode-label"
        placeholder="Select mode"
        value={editMode ? "Edit Mode" : "View Mode"}
        onOptionSelect={(_, data) => setEditMode(data.optionValue === "edit")}
      >
        {modeOptions.map((option) => (
          <Option key={option.key} value={option.key}>
            {option.text}
          </Option>
        ))}
      </Dropdown>

      <ToolbarDivider />

      {/* Zoom Selector */}
      <Dropdown
        aria-labelledby="zoom-label"
        placeholder="Select zoom level"
        value={zoomOptions.find((option) => option.key === zoom)?.text}
        onOptionSelect={(_, data) => setZoom(data.optionValue as ZoomLevel)}
      >
        {zoomOptions.map((option) => (
          <Option key={option.key} value={option.key}>
            {option.text}
          </Option>
        ))}
      </Dropdown>

      <ToolbarDivider />

      <Button
        appearance="subtle"
        icon={<CalendarLtr24Regular />}
        onClick={onJumpToNow}
      >
        Jump to Now
      </Button>

      <ToolbarDivider />

      <Button
        appearance="primary"
        icon={<Add24Regular />}
        onClick={onAddEquipment}
        disabled={!editMode}
      >
        Add Equipment
      </Button>

      <Button
        appearance="outline"
        icon={<Add24Regular />}
        onClick={onAddOperation}
        disabled={!editMode}
      >
        Add Operation
      </Button>

      <ToolbarDivider />

      <Button
        appearance="subtle"
        icon={<Grid24Regular />}
        onClick={onManageBatches}
        disabled={!editMode}
      >
        Manage Batches
      </Button>
    </Toolbar>
  );
}
