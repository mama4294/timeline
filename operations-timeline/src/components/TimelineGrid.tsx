import { useEffect, useState } from "react";
import Timeline from "react-calendar-timeline";
import "react-calendar-timeline/style.css";
import moment from "moment";
import { useViewport } from "../hooks/useViewport";
import TimelineControls from "./TimelineControls";
import { dataProvider } from "../services/dataProvider";
// types are available in models if needed

export default function TimelineGrid() {
  const {
    zoom,
    setZoom,
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    jumpToNow,
  } = useViewport("day");
  const [groups, setGroups] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const eq = await dataProvider.getEquipment();
      const ops = await dataProvider.getOperations(startDate, endDate);
      const batches = await dataProvider.getBatches();
      console.log("Batches:", batches);
      const batchColorById: Record<string, string> = {};
      batches.forEach((b) => {
        console.log("Setting color for batch", b.id, "to", b.color);
        batchColorById[b.id] = b.color;
      });
      console.log("Final color map:", batchColorById);
      if (!mounted) return;

      setGroups(eq.map((g) => ({ id: g.id, title: g.tag })));

      console.log("Operations:", ops);
      setItems(
        ops.map((o) => ({
          id: o.id,
          group: o.equipmentId,
          title: o.batchId || o.type,
          start_time: moment(o.startTime).valueOf(),
          end_time: moment(o.endTime).valueOf(),
          itemProps: {
            style: (() => {
              const bgColor = o.batchId
                ? batchColorById[o.batchId] || "#999"
                : "#ccc";
              console.log(
                "Operation",
                o.id,
                "batch",
                o.batchId,
                "color:",
                bgColor
              );
              return {
                background: bgColor,
                color: "#fff",
              };
            })(),
          },
        }))
      );
    })();
    return () => {
      mounted = false;
    };
  }, [startDate, endDate]);

  const visibleTimeStart = moment(startDate).valueOf();
  const visibleTimeEnd = moment(endDate).valueOf();

  const handleTimeChange = (
    visibleTimeStart: number,
    visibleTimeEnd: number
  ) => {
    setStartDate(new Date(visibleTimeStart));
    setEndDate(new Date(visibleTimeEnd));
  };

  const handleItemMove = (
    itemId: string | number,
    dragTime: number,
    newGroupOrder: number
  ) => {
    const item = items.find((item) => item.id === itemId);
    if (!item) return;

    const difference = dragTime - item.start_time;
    const newItems = items.map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          start_time: dragTime,
          end_time: item.end_time + difference,
          group: groups[newGroupOrder].id,
        };
      }
      return item;
    });
    setItems(newItems);
  };

  const handleItemResize = (
    itemId: string | number,
    time: number,
    edge: string
  ) => {
    const newItems = items.map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          start_time: edge === "left" ? time : item.start_time,
          end_time: edge === "left" ? item.end_time : time,
        };
      }
      return item;
    });
    setItems(newItems);
  };

  const handleItemSelect = (itemId: string | number) => {
    const handleDelete = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        setItems(items.filter((item) => item.id !== itemId));
        window.removeEventListener("keydown", handleDelete);
      }
    };
    window.addEventListener("keydown", handleDelete);
  };

  return (
    <div>
      <TimelineControls zoom={zoom} setZoom={setZoom} onJumpToNow={jumpToNow} />
      <Timeline
        groups={groups}
        items={items}
        visibleTimeStart={visibleTimeStart}
        visibleTimeEnd={visibleTimeEnd}
        onTimeChange={handleTimeChange}
        canMove={true}
        canResize="both"
        canChangeGroup={true}
        onItemMove={handleItemMove}
        onItemResize={handleItemResize}
        onItemSelect={handleItemSelect}
        stackItems={true}
        dragSnap={30 * 60 * 1000} // Snap to 15 minute intervals
      />
    </div>
  );
}
