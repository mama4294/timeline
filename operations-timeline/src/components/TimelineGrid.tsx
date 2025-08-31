import { useEffect, useState } from "react";
import Timeline from "react-calendar-timeline";
import "react-calendar-timeline/style.css";
import moment from "moment";
import { useViewport } from "../hooks/useViewport";
import TimelineControls from "./TimelineControls";
import { dataProvider } from "../services/dataProvider";
// types are available in models if needed

export default function TimelineGrid() {
  const { zoom, setZoom, startDate, endDate, jumpToNow } = useViewport("day");
  const [groups, setGroups] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const eq = await dataProvider.getEquipment();
      const ops = await dataProvider.getOperations(startDate, endDate);
      const batches = await dataProvider.getBatches();
      const batchColorById: Record<string, string> = {};
      batches.forEach((b: any) => (batchColorById[b.id] = b.color));
      if (!mounted) return;

      setGroups(eq.map((g) => ({ id: g.id, title: g.tag })));

      setItems(
        ops.map((o) => ({
          id: o.id,
          group: o.equipmentId,
          title: o.batchId
            ? batches.find((b: any) => b.id === o.batchId)?.batchNumber ||
              `${o.batchId}`
            : o.type,
          start_time: moment(o.startTime).valueOf(),
          end_time: moment(o.endTime).valueOf(),
          style: {
            background: o.batchId
              ? batchColorById[o.batchId] || "#999"
              : "#ccc",
            color: "#fff",
          },
        }))
      );
    })();
    return () => {
      mounted = false;
    };
  }, [startDate, endDate]);

  const defaultStart = moment(startDate).add(-1, "day").valueOf();
  const defaultEnd = moment(endDate).add(1, "day").valueOf();

  return (
    <div>
      <TimelineControls zoom={zoom} setZoom={setZoom} onJumpToNow={jumpToNow} />
      <Timeline
        groups={groups}
        items={items}
        defaultTimeStart={defaultStart}
        defaultTimeEnd={defaultEnd}
        canMove={false}
        canResize={false}
      />
    </div>
  );
}
