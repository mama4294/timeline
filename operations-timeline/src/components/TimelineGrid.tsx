import { useEffect, useState, useRef } from "react";
import { Tooltip } from "@fluentui/react-components";
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
import { DuplicateOperationsDialog } from "./DuplicateOperationsDialog";
import { BatchManagement } from "./BatchManagement";
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
  // Edit mode state: when false, editing actions are disabled
  const [editMode, setEditMode] = useState<boolean>(false);

  // Multi-select state
  const [selectedItems, setSelectedItems] = useState<Set<string | number>>(
    new Set()
  );

  // Ref for debouncing drag saves
  const dragSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Duplicate dialog state
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [operationsToDuplicate, setOperationsToDuplicate] = useState<string[]>(
    []
  );

  // Batch management state
  const [isBatchManagementOpen, setIsBatchManagementOpen] = useState(false);

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
          description: o.description, // Add description for tooltip
          batchId: o.batchId, // Add batchId for tooltip
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

  // When in view mode, only display groups that have at least one item visible in the current range
  const displayedGroups = editMode
    ? groups
    : groups.filter((g) =>
        items.some((it) => {
          // item.group may be string/number, compare as string
          const matchesGroup = String(it.group) === String(g.id);
          if (!matchesGroup) return false;
          const itemStart = Number(it.start_time);
          const itemEnd = Number(it.end_time);
          // check intersection with [visibleTimeStart, visibleTimeEnd]
          return itemEnd >= visibleTimeStart && itemStart <= visibleTimeEnd;
        })
      );

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
  _newGroupOrder: number
  ) => {
    if (!editMode) return; // Prevent moves when not in edit mode
    const item = items.find((item) => item.id === itemId);
    if (!item) return;

    // Determine which items to move - if the dragged item is selected, move all selected items
    const itemsToMove = selectedItems.has(itemId)
      ? Array.from(selectedItems)
      : [itemId];

    const difference = dragTime - item.start_time;

    // Update local state immediately for smooth UI - this provides real-time visual feedback
    const newItems = items.map((currentItem) => {
      if (itemsToMove.includes(currentItem.id)) {
        return {
          ...currentItem,
          start_time: currentItem.start_time + difference,
          end_time: currentItem.end_time + difference,
          // Keep original equipment group - no equipment changes allowed
          group: currentItem.group,
        };
      }
      return currentItem;
    });

    // Set items immediately to show all selected items moving in real-time
    setItems(newItems);

    // Debounced save - only save after user stops dragging for a brief moment
    if (dragSaveTimeoutRef.current) {
      clearTimeout(dragSaveTimeoutRef.current);
    }
    dragSaveTimeoutRef.current = setTimeout(async () => {
      // Update operations state and save to backend
      const updatePromises = [];

      for (const moveItemId of itemsToMove) {
        const originalItem = items.find((i) => i.id === moveItemId);
        if (!originalItem) continue;

        const newStartTime = new Date(originalItem.start_time + difference);
        const newEndTime = new Date(originalItem.end_time + difference);

        // Update operations state
        setOperations((prev) =>
          prev.map((op) => {
            if (op.id === moveItemId) {
              return {
                ...op,
                startTime: newStartTime,
                endTime: newEndTime,
                // Keep original equipment - no equipment changes allowed
                equipmentId: op.equipmentId,
                modifiedOn: new Date(),
              };
            }
            return op;
          })
        );

        // Queue save operation
        const operationToUpdate = operations.find((op) => op.id === moveItemId);
        if (operationToUpdate) {
          updatePromises.push(
            dataProvider.saveOperation({
              ...operationToUpdate,
              startTime: newStartTime,
              endTime: newEndTime,
              // Keep original equipment
              equipmentId: operationToUpdate.equipmentId,
              modifiedOn: new Date(),
            })
          );
        }
      }

      // Save all updates to backend
      try {
        await Promise.all(updatePromises);
      } catch (error) {
        console.error("Failed to save operation moves:", error);
        // TODO: Show error message to user and potentially revert changes
      }
    }, 300); // Wait 300ms after user stops dragging before saving
  };

  const handleItemResize = async (
    itemId: string | number,
    time: number,
    edge: string
  ) => {
  if (!editMode) return; // Prevent resizing when not in edit mode
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

  const handleItemSelect = (itemId: string | number, e?: any) => {
    // Handle multi-select with CMD/Ctrl key
    if (e && (e.metaKey || e.ctrlKey)) {
      setSelectedItems((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(itemId)) {
          newSet.delete(itemId);
        } else {
          newSet.add(itemId);
        }
        return newSet;
      });
    } else {
      // Single select - clear others and select this one
      setSelectedItems(new Set([itemId]));
    }

    // Handle delete functionality for keyboard
    const handleDelete = async (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (!editMode) {
          console.log("Delete disabled in View Mode");
          return;
        }

        // Delete all selected items
        const itemsToDelete = Array.from(selectedItems);

        for (const selectedItemId of itemsToDelete) {
          const operationToDelete = operations.find(
            (op) => op.id === String(selectedItemId)
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
        }

        // Clear selection after deletion
        setSelectedItems(new Set());
        window.removeEventListener("keydown", handleDelete);
      }
    };
    window.addEventListener("keydown", handleDelete);
  };

  const handleEditEquipment = async (groupId: string) => {
  if (!editMode) return; // Editing equipment not allowed in view mode
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
  if (!editMode) return;
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
  if (!editMode) return;
  setSelectedOperation(undefined);
  setIsOperationDialogOpen(true);
  };

  const handleEditOperation = (operationId: string) => {
  if (!editMode) return; // Editing operations not allowed in view mode

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

  // Batch handlers
  const handleManageBatches = () => {
    setIsBatchManagementOpen(true);
  };

  const handleSaveBatch = async (batchData: Partial<Batch>) => {
    try {
      const savedBatch = await dataProvider.saveBatch(batchData);

      // Update batches state
      if (batches.find((b) => b.id === savedBatch.id)) {
        // Update existing batch
        setBatches((prev) =>
          prev.map((batch) => (batch.id === savedBatch.id ? savedBatch : batch))
        );
      } else {
        // Add new batch
        setBatches((prev) => [...prev, savedBatch]);
      }

      console.log("Batch saved successfully:", savedBatch);
    } catch (error) {
      console.error("Failed to save batch:", error);
      // TODO: Show error message to user
      alert(
        `Error: ${
          error instanceof Error ? error.message : "Failed to save batch"
        }`
      );
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    try {
      await dataProvider.deleteBatch(batchId);

      // Remove from batches state
      setBatches((prev) => prev.filter((batch) => batch.id !== batchId));

      console.log("Batch deleted successfully:", batchId);
    } catch (error) {
      console.error("Failed to delete batch:", error);
      // TODO: Show error message to user
      alert(
        `Error: ${
          error instanceof Error ? error.message : "Failed to delete batch"
        }`
      );
    }
  };

  // Context menu handlers
  const handleContextMenuEdit = () => {
    if (!editMode) return;
    if (contextMenu.operationId) {
      handleEditOperation(contextMenu.operationId);
      setContextMenu((prev) => ({ ...prev, visible: false }));
    }
  };

  const handleContextMenuDelete = () => {
    if (!editMode) return;
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

  const handleContextMenuSelectBatch = () => {
    if (contextMenu.operationId) {
      // Find the operation to get its batchId
      const operation =
        operations.find((op) => op.id === contextMenu.operationId) ||
        items.find((item) => item.id === contextMenu.operationId);

      if (operation) {
        let batchId: string | null = null;

        if ("batchId" in operation) {
          // It's already an Operation object
          batchId = operation.batchId;
        } else {
          // It's a timeline item
          batchId = operation.batchId || null;
        }

        if (batchId) {
          // Find all operations with the same batchId
          const operationsInBatch = operations.filter(
            (op) => op.batchId === batchId
          );
          const itemsInBatch = items.filter((item) => item.batchId === batchId);

          // Combine the IDs from both sources
          const batchOperationIds = new Set([
            ...operationsInBatch.map((op) => op.id),
            ...itemsInBatch.map((item) => item.id),
          ]);

          // Update selected items to include all operations in the batch
          setSelectedItems(batchOperationIds);

          console.log(
            `Selected batch ${batchId} with ${batchOperationIds.size} operations`
          );
        } else {
          console.log("Operation has no batch ID");
        }
      }

      setContextMenu((prev) => ({ ...prev, visible: false }));
    }
  };

  const handleContextMenuDuplicate = () => {
    if (!editMode) return;
    if (contextMenu.operationId) {
      // Get the currently selected operations (if any) or just the clicked operation
      const operationIds =
        selectedItems.size > 0
          ? Array.from(selectedItems).map(String)
          : [contextMenu.operationId];

      setOperationsToDuplicate(operationIds);
      setIsDuplicateDialogOpen(true);
      setContextMenu((prev) => ({ ...prev, visible: false }));
    }
  };

  const handleDuplicateOperations = async (batchId: string | null) => {
    try {
      const duplicatedOperations: Operation[] = [];

      for (const operationId of operationsToDuplicate) {
        // Find the operation to duplicate
        const originalOperation = operations.find(
          (op) => op.id === operationId
        );

        if (originalOperation) {
          // Create a new operation with the same properties but new ID and batch
          const newOperation: Partial<Operation> = {
            equipmentId: originalOperation.equipmentId,
            batchId: batchId,
            startTime: new Date(
              originalOperation.startTime.getTime() + 24 * 60 * 60 * 1000
            ), // Add 1 day
            endTime: new Date(
              originalOperation.endTime.getTime() + 24 * 60 * 60 * 1000
            ), // Add 1 day
            type: originalOperation.type,
            description: originalOperation.description,
          };

          // Save the new operation via data provider (without ID to create new)
          const savedOperation = await dataProvider.saveOperation(newOperation);
          duplicatedOperations.push(savedOperation);

          // Add to operations state
          setOperations((prev) => [...prev, savedOperation]);

          // Add to timeline items
          const timelineItem = createTimelineItem(savedOperation);
          setItems((prev) => [...prev, timelineItem]);
        }
      }

      console.log(`Duplicated ${duplicatedOperations.length} operations`);
    } catch (error) {
      console.error("Error duplicating operations:", error);
    }
  };

  const handleContextMenuClose = () => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  // Debug logging
  console.log("Timeline render - groups:", groups, "items:", items);

  return (
    <div
      style={{
        backgroundColor: "#f5f5f5",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: "0", // Important for nested flex containers
        overflow: "hidden", // Prevent double scrollbars
        gap: "12px", // Space between controls and timeline
        padding: "12px", // Padding around the entire component
      }}
    >
      {/* Command Bar Container */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
          padding: "12px",
        }}
      >
        <TimelineControls
          zoom={zoom}
          setZoom={setZoom}
          editMode={editMode}
          setEditMode={setEditMode}
          onJumpToNow={jumpToNow}
          onAddEquipment={handleNewEquipment}
          onAddOperation={handleNewOperation}
          onManageBatches={handleManageBatches}
        />
      </div>

      {/* Timeline Container */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
          padding: "12px",
          flex: 1,
          minHeight: "0", // Important for nested flex containers
          overflow: "hidden", // Contains the timeline's scroll
        }}
      >
        <Timeline
          groups={displayedGroups}
          items={items}
          visibleTimeStart={visibleTimeStart}
          visibleTimeEnd={visibleTimeEnd}
          onTimeChange={handleTimeChange}
          canMove={editMode}
          canResize={editMode ? (selectedItems.size <= 1 ? "both" : false) : false}
          canChangeGroup={false}
          onItemMove={handleItemMove}
          onItemResize={handleItemResize}
          onItemSelect={handleItemSelect}
          onCanvasDoubleClick={(groupId: any, time: number) => {
            if (!editMode) return;
            // groupId should be the equipment id
            const equipmentId = String(groupId);
            const start = new Date(time);
            const end = new Date(time + 24 * 60 * 60 * 1000); // default 1 day
            setSelectedOperation({
              id: undefined as any,
              equipmentId,
              batchId: null,
              startTime: start,
              endTime: end,
              type: "Production",
              description: "",
              createdOn: new Date(),
              modifiedOn: new Date(),
            });
            setIsOperationDialogOpen(true);
          }}
          stackItems={true}
          dragSnap={30 * 60 * 1000}
          lineHeight={40}
          itemRenderer={({ item, getItemProps, getResizeProps }) => {
            const { left: leftResizeProps, right: rightResizeProps } =
              getResizeProps();
            const isSelected = selectedItems.has(item.id);
            const canResize = selectedItems.size <= 1;

            const itemProps = getItemProps({
              onClick: (e: React.MouseEvent) => {
                handleItemSelect(item.id, e);
              },
              onDoubleClick: (e: React.MouseEvent) => {
                e.stopPropagation();
                if (!editMode) return;
                handleEditOperation(String(item.id));
              },
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
                cursor: canResize ? "pointer" : "move",
                userSelect: "none",
                border: isSelected ? "2px solid #0078d4" : "none",
                boxShadow: isSelected
                  ? "0 0 0 1px #0078d4, 0 2px 4px rgba(0, 0, 0, 0.15)"
                  : item.itemProps?.style?.boxShadow ||
                    "0 1px 2px rgba(0, 0, 0, 0.1)",
              },
            });

            return (
              <div {...itemProps} data-selected={isSelected}>
                {canResize && <div {...leftResizeProps} />}
                <Tooltip
                  content={`${item.description}${
                    item.batchId ? ` (Batch: ${item.batchId})` : ""
                  }`}
                  relationship="description"
                >
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
                </Tooltip>
                {canResize && <div {...rightResizeProps} />}
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
                cursor: editMode ? "pointer" : "default",
                padding: "4px 8px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                height: "100%",
              }}
              onClick={() => editMode && handleEditEquipment(group.id)}
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
        onSelectBatch={handleContextMenuSelectBatch}
        onDuplicate={handleContextMenuDuplicate}
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

      {/* Duplicate Operations Dialog */}
      <DuplicateOperationsDialog
        open={isDuplicateDialogOpen}
        operationIds={operationsToDuplicate}
        batches={batches}
        onOpenChange={setIsDuplicateDialogOpen}
        onDuplicate={handleDuplicateOperations}
      />

      {/* Batch Management Dialog */}
      <BatchManagement
        open={isBatchManagementOpen}
        batches={batches}
        onOpenChange={setIsBatchManagementOpen}
        onSaveBatch={handleSaveBatch}
        onDeleteBatch={handleDeleteBatch}
      />
    </div>
  );
}
