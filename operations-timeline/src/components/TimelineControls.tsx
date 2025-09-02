import {
  Button,
  Toolbar,
  ToolbarDivider,
  Dropdown,
  Option,
  makeStyles,
  tokens,
  Input,
} from "@fluentui/react-components";
import {
  CalendarLtr24Regular,
  Add24Regular,
  Grid24Regular,
  ZoomIn24Regular,
  ZoomOut24Regular,
  Search24Regular,
} from "@fluentui/react-icons";
import { ZoomLevel } from "../hooks/useViewport";

interface Props {
  zoom: ZoomLevel;
  setZoom: (z: ZoomLevel) => void;
  editMode: boolean;
  setEditMode: (mode: boolean) => void;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
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
    display: "flex",
  gap: tokens.spacingHorizontalS,
    alignItems: "center",
    flexWrap: "wrap",
    // allow content to compress on small screens
    maxWidth: "100%",
  },
  search: {
    minWidth: "140px",
    marginRight: tokens.spacingHorizontalS,
  },
  select: {
    minWidth: "110px",
  },
});

export default function TimelineControls({
  zoom,
  setZoom,
  editMode,
  setEditMode,
  searchTerm,
  setSearchTerm,
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
    { key: "month", text: "Month View" },
    { key: "year", text: "Year View" },
  ];

  const modeOptions = [
    { key: "view", text: "View Mode" },
    { key: "edit", text: "Edit Mode" },
  ];

  const zoomOrder: ZoomLevel[] = ["hour", "day", "week", "month", "year"];
  const currentZoomIndex = zoomOrder.findIndex((z) => z === zoom);
  const canZoomIn = currentZoomIndex > 0;
  const canZoomOut = currentZoomIndex < zoomOrder.length - 1;

  const handleZoomIn = () => {
    if (!canZoomIn) return;
    setZoom(zoomOrder[currentZoomIndex - 1]);
  };

  const handleZoomOut = () => {
    if (!canZoomOut) return;
    setZoom(zoomOrder[currentZoomIndex + 1]);
  };

  return (
    <Toolbar className={styles.toolbar} size="small">
      {/* Search */}
      <Input
        className={styles.search}
        placeholder=""
        aria-label="Search"
        value={searchTerm}
        contentBefore={<Search24Regular style={{ width: 16, height: 16 }} />}
        onChange={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
      />



      <ToolbarDivider />

            <Button
        appearance="subtle"
        icon={<CalendarLtr24Regular />}
        onClick={onJumpToNow}
      >
        Now
      </Button>

      {/* Zoom Selector */}
      <Dropdown
        className={styles.select}
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

      <Button
        appearance="subtle"
        icon={<ZoomIn24Regular />}
        onClick={handleZoomIn}
        disabled={!canZoomIn}
        aria-label="Zoom in"
      />

      <Button
        appearance="subtle"
        icon={<ZoomOut24Regular />}
        onClick={handleZoomOut}
        disabled={!canZoomOut}
        aria-label="Zoom out"
      />

      <ToolbarDivider />

            {/* Edit/View Mode Selector */}
      <Dropdown
        className={styles.select}
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


      {editMode && (
        <>

          <Button
            appearance="subtle"
            icon={<Add24Regular />}
            onClick={onAddEquipment}
          >
            Add Equipment
          </Button>

          <Button
            appearance="subtle"
            icon={<Add24Regular />}
            onClick={onAddOperation}
          >
            Add Operation
          </Button>

          <Button
            appearance="subtle"
            icon={<Grid24Regular />}
            onClick={onManageBatches}
          >
            Manage Batches
          </Button>
        </>
      )}
    </Toolbar>
  );
}
