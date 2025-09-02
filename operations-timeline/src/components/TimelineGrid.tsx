import { useEffect, useState } from "react";
import Timeline, {
  TimelineMarkers,
  TodayMarker,
  TimelineHeaders,
  SidebarHeader,
  DateHeader,
} from "react-calendar-timeline";
import "react-calendar-timeline/style.css";
import "../styles/Timeline.css";
import moment from "moment";
import { useViewport } from "../hooks/useViewport";
import TimelineControls from "./TimelineControls";
import { dataProvider } from "../services/dataProvider";
import { EquipmentDialog } from "./EquipmentDialog";
import type { Equipment } from "../models/types";
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<
    Equipment | undefined
  >();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [eq, ops, batches] = await Promise.all([
        dataProvider.getEquipment(),
        dataProvider.getOperations(startDate, endDate),
        dataProvider.getBatches(),
      ]);
      console.log("Batches:", batches);
      const batchColorById: Record<string, string> = {};
      batches.forEach((b) => {
        batchColorById[b.id] = b.color;
      });
      if (!mounted) return;

      setGroups(
        eq.map((g) => ({
          id: g.id,
          title: g.description,
          rightTitle: g.tag,
        }))
      );

      console.log("Operations:", ops);
      setItems(
        ops.map((o) => ({
          id: o.id,
          group: o.equipmentId,
          title: o.description,
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

  const handleEditEquipment = async (groupId: string) => {
    console.log("Group ID clicked:", groupId);
    const allEquipment = await dataProvider.getEquipment();
    console.log("All equipment:", allEquipment);
    const equipment = allEquipment.find((eq) => eq.id === groupId);
    console.log("Found equipment:", equipment);
    if (equipment) {
      setSelectedEquipment(equipment);
      setIsDialogOpen(true);
    }
  };

  const handleNewEquipment = () => {
    setSelectedEquipment(undefined);
    setIsDialogOpen(true);
  };

  const refreshEquipment = async () => {
    const eq = await dataProvider.getEquipment();
    setGroups(
      eq.map((g) => ({
        id: g.id,
        title: g.description,
        rightTitle: g.tag,
      }))
    );
  };

  const handleSaveEquipment = async (equipment: Partial<Equipment>) => {
    try {
      await dataProvider.saveEquipment(equipment);
      await refreshEquipment();
    } catch (error) {
      console.error("Failed to save equipment:", error);
      // TODO: Show error message to user
    }
  };

  const handleDeleteEquipment = async () => {
    if (selectedEquipment) {
      try {
        await dataProvider.deleteEquipment(selectedEquipment.id);
        await refreshEquipment();
      } catch (error) {
        console.error("Failed to delete equipment:", error);
        // TODO: Show error message to user
      }
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#f5f5f5",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: "0", // Important for nested flex containers
        overflow: "hidden", // Prevent double scrollbars
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "4px",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          flex: 1,
          minHeight: "0", // Important for nested flex containers
          overflow: "hidden", // Contains the timeline's scroll
        }}
      >
        <TimelineControls
          zoom={zoom}
          setZoom={setZoom}
          onJumpToNow={jumpToNow}
          onAddEquipment={handleNewEquipment}
        />

        <EquipmentDialog
          equipment={selectedEquipment}
          open={isDialogOpen}
          onOpenChange={(_, data) => setIsDialogOpen(data.open)}
          onSave={handleSaveEquipment}
          onDelete={selectedEquipment ? handleDeleteEquipment : undefined}
        />
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
          dragSnap={30 * 60 * 1000}
          className="timeline-grid"
          style={{
            backgroundColor: "white",
            borderRadius: "2px",
          }}
          sidebarWidth={180}
          rightSidebarWidth={0}
          groupRenderer={({ group }) => (
            <div
              style={{
                cursor: "pointer",
                padding: "2px 8px",
                display: "flex",
                flexDirection: "column",
                height: "100%",
                justifyContent: "center",
                minHeight: "32px",
                gap: "0px", // Minimal gap between elements
              }}
              onClick={() => handleEditEquipment(group.id)}
            >
              <div
                style={{
                  fontWeight: "bold",
                  fontSize: "0.9em",
                  lineHeight: "1",
                  marginBottom: "1px", // Tiny margin between text lines
                }}
              >
                {group.title}
              </div>
              <div
                style={{
                  fontSize: "0.75em",
                  color: "#666",
                  lineHeight: "1",
                }}
              >
                {group.rightTitle}
              </div>
            </div>
          )}
        >
          <TimelineHeaders>
            <SidebarHeader>
              {({ getRootProps }) => {
                return (
                  <div
                    {...getRootProps()}
                    style={{
                      backgroundColor: "#f8f8f8",
                      padding: "8px 10px",
                      fontWeight: "bold",
                      borderBottom: "1px solid #e0e0e0",
                      color: "#323130",
                      width: "180px",
                      boxSizing: "border-box",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    Equipment
                  </div>
                );
              }}
            </SidebarHeader>
            <DateHeader unit="primaryHeader" />
            <DateHeader />
          </TimelineHeaders>
          <TimelineMarkers>
            <TodayMarker>
              {({ styles }) => (
                <div
                  style={{
                    ...styles,
                    backgroundColor: "#e4002b", // Fluid UI red
                    width: "2px",
                  }}
                />
              )}
            </TodayMarker>
          </TimelineMarkers>
        </Timeline>
      </div>
    </div>
  );
}
