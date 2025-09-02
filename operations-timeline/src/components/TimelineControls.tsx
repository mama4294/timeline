import {
  Button,
  Toolbar,
  ToolbarDivider,
  Dropdown,
  Option,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { CalendarLtr24Regular, Add24Regular } from "@fluentui/react-icons";
import { ZoomLevel } from "../hooks/useViewport";

interface Props {
  zoom: ZoomLevel;
  setZoom: (z: ZoomLevel) => void;
  onJumpToNow: () => void;
  onAddEquipment: () => void;
  onAddOperation: () => void;
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
  onJumpToNow,
  onAddEquipment,
  onAddOperation,
}: Props) {
  const styles = useStyles();

  const zoomOptions = [
    { key: "hour", text: "Hour View" },
    { key: "day", text: "Day View" },
    { key: "week", text: "Week View" },
    { key: "year", text: "Year View" },
  ];

  return (
    <Toolbar className={styles.toolbar} size="small">
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
      >
        Add Equipment
      </Button>

      <Button
        appearance="outline"
        icon={<Add24Regular />}
        onClick={onAddOperation}
      >
        Add Operation
      </Button>
    </Toolbar>
  );
}
