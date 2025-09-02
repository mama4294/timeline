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
import { OperationDialog } from "./OperationDialog";
import { ContextMenu } from "./ContextMenu";
import type { Equipment, Operation, Batch } from "../models/types";
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

  // Operation dialog state
  const [isOperationDialogOpen, setIsOperationDialogOpen] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<
    Operation | undefined
  >();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    operationId: string | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    operationId: null,
  });

  // Helper function to create timeline items from operations
  const createTimelineItem = (operation: Operation) => {
    const batch = batches.find((b) => b.id === operation.batchId);
    const bgColor = batch ? batch.color : "#ccc";

    return {
      id: operation.id,
      group: operation.equipmentId,
      title: operation.description,
      start_time: moment(operation.startTime).valueOf(),
      end_time: moment(operation.endTime).valueOf(),
      itemProps: {
        style: {
          background: bgColor,
          color: "#fff",
        },
      },
    };
  };

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

      setEquipment(eq);
      setBatches(batches);
      setOperations(ops);

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

  const handleItemMove = async (
    itemId: string | number,
    dragTime: number,
    newGroupOrder: number
  ) => {
    const item = items.find((item) => item.id === itemId);
    if (!item) return;

    const difference = dragTime - item.start_time;
    const newStartTime = new Date(dragTime);
    const newEndTime = new Date(item.end_time + difference);
    const newEquipmentId = groups[newGroupOrder].id;

    // Update local state immediately for smooth UI
    const newItems = items.map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          start_time: dragTime,
          end_time: item.end_time + difference,
          group: newEquipmentId,
        };
      }
      return item;
    });
    setItems(newItems);

    // Update operations state
    setOperations((prev) =>
      prev.map((op) => {
        if (op.id === itemId) {
          return {
            ...op,
            startTime: newStartTime,
            endTime: newEndTime,
            equipmentId: newEquipmentId,
            modifiedOn: new Date(),
          };
        }
        return op;
      })
    );

    // Save to backend
    try {
      const operationToUpdate = operations.find((op) => op.id === itemId);
      if (operationToUpdate) {
        await dataProvider.saveOperation({
          ...operationToUpdate,
          startTime: newStartTime,
          endTime: newEndTime,
          equipmentId: newEquipmentId,
          modifiedOn: new Date(),
        });
      }
    } catch (error) {
      console.error("Failed to save operation move:", error);
      // TODO: Show error message to user and potentially revert changes
    }
  };

  const handleItemResize = async (
    itemId: string | number,
    time: number,
    edge: string
  ) => {
    const item = items.find((item) => item.id === itemId);
    if (!item) return;

    const newStartTime =
      edge === "left" ? new Date(time) : new Date(item.start_time);
    const newEndTime =
      edge === "left" ? new Date(item.end_time) : new Date(time);

    // Update local state immediately for smooth UI
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

    // Update operations state
    setOperations((prev) =>
      prev.map((op) => {
        if (op.id === itemId) {
          return {
            ...op,
            startTime: newStartTime,
            endTime: newEndTime,
            modifiedOn: new Date(),
          };
        }
        return op;
      })
    );

    // Save to backend
    try {
      const operationToUpdate = operations.find((op) => op.id === itemId);
      if (operationToUpdate) {
        await dataProvider.saveOperation({
          ...operationToUpdate,
          startTime: newStartTime,
          endTime: newEndTime,
          modifiedOn: new Date(),
        });
      }
    } catch (error) {
      console.error("Failed to save operation resize:", error);
      // TODO: Show error message to user and potentially revert changes
    }
  };

  const handleItemSelect = (itemId: string | number) => {
    // Just handle delete functionality for keyboard, no auto-edit
    const handleDelete = async (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        // Find and delete the operation directly
        const operationToDelete = operations.find(
          (op) => op.id === String(itemId)
        );
        if (operationToDelete) {
          try {
            await dataProvider.deleteOperation(operationToDelete.id);

            // Remove from operations state
            setOperations((prev) =>
              prev.filter((op) => op.id !== operationToDelete.id)
            );

            // Remove from timeline items
            setItems((prev) =>
              prev.filter((item) => item.id !== operationToDelete.id)
            );
          } catch (error) {
            console.error("Failed to delete operation:", error);
          }
        }
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

  // Operation handlers
  const handleNewOperation = () => {
    setSelectedOperation(undefined);
    setIsOperationDialogOpen(true);
  };

  const handleEditOperation = (operationId: string) => {
    // Find the operation in the operations state first, then items if needed
    let operation = operations.find((op) => op.id === operationId);

    if (!operation) {
      // Fall back to converting from timeline item
      const item = items.find((item) => item.id === operationId);
      if (item) {
        operation = {
          id: item.id,
          equipmentId: item.group,
          batchId: item.batchId || null,
          startTime: new Date(item.start_time),
          endTime: new Date(item.end_time),
          type: item.type || "Production",
          description: item.title,
          createdOn: new Date(),
          modifiedOn: new Date(),
        };
      }
    }

    if (operation) {
      setSelectedOperation(operation);
      setIsOperationDialogOpen(true);
    }
  };

  const handleSaveOperation = async (operation: Partial<Operation>) => {
    try {
      const saved = await dataProvider.saveOperation(operation);

      // Update operations state
      if (operation.id) {
        setOperations((prev) =>
          prev.map((op) => (op.id === operation.id ? saved : op))
        );

        // Update timeline items
        const timelineItem = createTimelineItem(saved);
        setItems((prev) =>
          prev.map((item) => (item.id === operation.id ? timelineItem : item))
        );
      } else {
        setOperations((prev) => [...prev, saved]);

        // Add new timeline item
        const timelineItem = createTimelineItem(saved);
        setItems((prev) => [...prev, timelineItem]);
      }

      setIsOperationDialogOpen(false);
      setSelectedOperation(undefined);
    } catch (error) {
      console.error("Failed to save operation:", error);
      // TODO: Show error message to user
    }
  };

  const handleDeleteOperation = async () => {
    if (selectedOperation) {
      try {
        await dataProvider.deleteOperation(selectedOperation.id);

        // Remove from operations state
        setOperations((prev) =>
          prev.filter((op) => op.id !== selectedOperation.id)
        );

        // Remove from timeline items
        setItems((prev) =>
          prev.filter((item) => item.id !== selectedOperation.id)
        );

        setIsOperationDialogOpen(false);
        setSelectedOperation(undefined);
      } catch (error) {
        console.error("Failed to delete operation:", error);
        // TODO: Show error message to user
      }
    }
  };

  // Context menu handlers
  const handleContextMenuEdit = () => {
    if (contextMenu.operationId) {
      handleEditOperation(contextMenu.operationId);
      setContextMenu((prev) => ({ ...prev, visible: false }));
    }
  };

  const handleContextMenuDelete = () => {
    if (contextMenu.operationId) {
      // Find the operation and set it as selected, then delete
      const operation =
        operations.find((op) => op.id === contextMenu.operationId) ||
        items.find((item) => item.id === contextMenu.operationId);

      if (operation) {
        if ("equipmentId" in operation) {
          // It's already an Operation object
          setSelectedOperation(operation);
        } else {
          // Convert from timeline item
          const operationData: Operation = {
            id: operation.id,
            equipmentId: operation.group,
            batchId: operation.batchId || null,
            startTime: new Date(operation.start_time),
            endTime: new Date(operation.end_time),
            type: operation.type || "Production",
            description: operation.title,
            createdOn: new Date(),
            modifiedOn: new Date(),
          };
          setSelectedOperation(operationData);
        }

        // Call delete handler
        handleDeleteOperation();
      }

      setContextMenu((prev) => ({ ...prev, visible: false }));
    }
  };

  const handleContextMenuClose = () => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
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
          onAddOperation={handleNewOperation}
        />

        <EquipmentDialog
          equipment={selectedEquipment}
          open={isDialogOpen}
          onOpenChange={(_, data) => setIsDialogOpen(data.open)}
          onSave={handleSaveEquipment}
          onDelete={selectedEquipment ? handleDeleteEquipment : undefined}
        />

        <OperationDialog
          operation={selectedOperation}
          open={isOperationDialogOpen}
          onOpenChange={(_, data) => setIsOperationDialogOpen(data.open)}
          onSave={handleSaveOperation}
          onDelete={selectedOperation ? handleDeleteOperation : undefined}
          equipment={equipment}
          batches={batches}
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
          lineHeight={40}
          itemRenderer={({ item, getItemProps, getResizeProps }) => {
            const { left: leftResizeProps, right: rightResizeProps } =
              getResizeProps();
            const itemProps = getItemProps({
              onDoubleClick: () => handleEditOperation(String(item.id)),
              onContextMenu: (e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                setContextMenu({
                  visible: true,
                  x: e.clientX,
                  y: e.clientY,
                  operationId: String(item.id),
                });
              },
              style: {
                ...item.itemProps?.style,
                cursor: "pointer",
                userSelect: "none",
              },
            });

            return (
              <div {...itemProps}>
                <div {...leftResizeProps} />
                <div
                  style={{
                    height: "100%",
                    position: "relative",
                    paddingLeft: 4,
                    paddingRight: 4,
                    display: "flex",
                    alignItems: "center",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      color: "white",
                      fontWeight: "500",
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.title}
                  </div>
                </div>
                <div {...rightResizeProps} />
              </div>
            );
          }}
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
                padding: "4px 8px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                height: "100%",
              }}
              onClick={() => handleEditEquipment(group.id)}
            >
              <div
                style={{
                  fontWeight: "bold",
                  fontSize: "0.9em",
                  lineHeight: "1.2",
                }}
              >
                {group.title}
              </div>
              <div
                style={{
                  fontSize: "0.75em",
                  color: "#666",
                  lineHeight: "1.2",
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

      {/* Context Menu */}
      <ContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        onEdit={handleContextMenuEdit}
        onDelete={handleContextMenuDelete}
        onClose={handleContextMenuClose}
      />

      {/* Equipment Dialog */}
      <EquipmentDialog
        equipment={selectedEquipment}
        open={isDialogOpen}
        onOpenChange={(_, data) => {
          if (!data.open) {
            setIsDialogOpen(false);
            setSelectedEquipment(undefined);
          }
        }}
        onSave={handleSaveEquipment}
        onDelete={selectedEquipment ? handleDeleteEquipment : undefined}
      />

      {/* Operation Dialog */}
      <OperationDialog
        operation={selectedOperation}
        open={isOperationDialogOpen}
        onOpenChange={(_, data) => {
          if (!data.open) {
            setIsOperationDialogOpen(false);
            setSelectedOperation(undefined);
          }
        }}
        onSave={handleSaveOperation}
        onDelete={selectedOperation ? handleDeleteOperation : undefined}
        equipment={equipment}
        batches={batches}
      />
    </div>
  );
}
