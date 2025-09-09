import { useEffect, useState, useRef } from "react";

// Constants for virtual scrolling sizing
const GROUP_LINE_HEIGHT = 40; // must match timeline lineHeight
const ITEM_HEIGHT_RATIO = 0.9; // tuned for visual vertical centering
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
import { getBatchColor } from "../services/batchColor";
import { EquipmentDialog } from "./EquipmentDialog";
import { OperationDialog } from "./OperationDialog";
import { ContextMenu } from "./ContextMenu";
import { DuplicateOperationsDialog } from "./DuplicateOperationsDialog";
import { BatchManagement } from "./BatchManagement";
import { LocalDb } from "../services/localDb";
import type { Operation } from "../models/types";
import type { cr2b6_batcheses } from "../generated/models/cr2b6_batchesesModel";
import type { cr2b6_equipments } from "../generated/models/cr2b6_equipmentsModel";
// types are available in models if needed

// Helper: ensure each equipment has an order field we can sort & mutate
interface OrderedEquipment extends cr2b6_equipments {
  __order?: number;
}

// Helper to alphabetically sort batches by batch number (case-insensitive),
// falling back to the primary key if batch number missing. Stable for equal keys.
const sortBatches = (list: cr2b6_batcheses[]) => {
  return list.slice().sort((a, b) => {
    const aKey = (a.cr2b6_batchnumber || a.cr2b6_batchesid || "").toLowerCase();
    const bKey = (b.cr2b6_batchnumber || b.cr2b6_batchesid || "").toLowerCase();
    if (aKey < bKey) return -1;
    if (aKey > bKey) return 1;
    return 0;
  });
};

export default function TimelineGrid() {
  const {
    zoom,
    setZoom,
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    jumpToNow,
  } = useViewport("month");
  const [groups, setGroups] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<
    cr2b6_equipments | undefined
  >();

  // Operation dialog state
  const [isOperationDialogOpen, setIsOperationDialogOpen] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<
    Operation | undefined
  >();
  const [equipment, setEquipment] = useState<OrderedEquipment[]>([]);
  const [batches, setBatches] = useState<cr2b6_batcheses[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  // Live drag preview (shows snapped start time while horizontally dragging an item)
  const [dragPreview, setDragPreview] = useState<{ visible: boolean; time: number; left: number; top: number }>({
    visible: false,
    time: 0,
    left: 0,
    top: 0,
  });
  const itemDragRef = useRef<{ itemId: string | null; active: boolean; offsetX: number; rowTop: number }>({ itemId: null, active: false, offsetX: 0, rowTop: 0 });
  // History stacks for undo/redo of operations
  const undoStackRef = useRef<Operation[][]>([]);
  const redoStackRef = useRef<Operation[][]>([]);
  const isApplyingHistoryRef = useRef<boolean>(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const operationsRef = useRef<Operation[]>([]);
  // Edit mode state: when false, editing actions are disabled
  const [editMode, setEditMode] = useState<boolean>(false);
  // Search term for filtering
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Multi-select state
  const [selectedItems, setSelectedItems] = useState<Set<string | number>>(
    new Set()
  );
  // Ref mirrors selectedItems to avoid stale closures in key handlers
  const selectedItemsRef = useRef<Set<string | number>>(new Set());
  useEffect(() => {
    selectedItemsRef.current = selectedItems;
  }, [selectedItems]);

  // Ref for debouncing drag saves
  const dragSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helpers for history
  const snapshotOps = (ops: Operation[] = operations) =>
    ops.map((o) => ({ ...o }));

  const updateHistoryStateFlags = () => {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  };

  const pushHistory = () => {
    if (isApplyingHistoryRef.current) return;
    undoStackRef.current.push(snapshotOps());
    if (undoStackRef.current.length > 50) undoStackRef.current.shift();
    // clear redo stack on new action
    redoStackRef.current = [];
    updateHistoryStateFlags();
  };

  const rebuildItems = (ops: Operation[]) => {
    setItems(ops.map((o) => createTimelineItem(o)));
  };

  const rebuildGroupsFromEquipment = (eq: OrderedEquipment[]) => {
    setGroups(
      eq
        .slice()
        .sort((a, b) => (a.__order ?? 0) - (b.__order ?? 0))
        .map((g: any) => ({
          id: g.cr2b6_equipmentid,
          title: g.cr2b6_description,
          rightTitle: g.cr2b6_tag,
        }))
    );
  };

  const persistFromTo = async (oldOps: Operation[], newOps: Operation[]) => {
    const oldById = new Map(oldOps.map((o) => [String(o.id), o]));
    const newById = new Map(newOps.map((o) => [String(o.id), o]));

    // Deletes
    const toDelete = [...oldById.keys()].filter((id) => !newById.has(id));
    // Upserts
    const toUpsert = newOps;

    await Promise.all([
      ...toDelete.map((id) => dataProvider.deleteOperation(id)),
      ...toUpsert.map((op) => dataProvider.saveOperation(op)),
    ]);
  };

  const applyOpsFromHistory = async (targetOps: Operation[]) => {
    const prev = operations;
    isApplyingHistoryRef.current = true;
    setOperations(snapshotOps(targetOps));
    rebuildItems(targetOps);
    isApplyingHistoryRef.current = false;
    try {
      await persistFromTo(prev, targetOps);
    } catch (e) {
      console.error("Failed to sync operations during undo/redo", e);
    }
  };

  // Keep a ref of current operations for keyboard handlers
  useEffect(() => {
    operationsRef.current = snapshotOps(operations);
  }, [operations]);

  // Keyboard shortcuts: Ctrl/Cmd+Z (undo), Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z (redo)
  useEffect(() => {
    if (!editMode) return;
    const onKeyDown = async (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isEditable = target?.isContentEditable;
      if (tag === "INPUT" || tag === "TEXTAREA" || isEditable) return;

      const ctrlOrMeta = e.ctrlKey || e.metaKey;
      if (!ctrlOrMeta) return;

      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        // Undo
        e.preventDefault();
        if (undoStackRef.current.length === 0) return;
        const prevState = undoStackRef.current.pop()!;
        redoStackRef.current.push(snapshotOps(operationsRef.current));
        await applyOpsFromHistory(prevState);
        updateHistoryStateFlags();
      } else if (key === "y" || (key === "z" && e.shiftKey)) {
        // Redo
        e.preventDefault();
        if (redoStackRef.current.length === 0) return;
        const nextState = redoStackRef.current.pop()!;
        undoStackRef.current.push(snapshotOps(operationsRef.current));
        await applyOpsFromHistory(nextState);
        updateHistoryStateFlags();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editMode]);

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

  // Virtual group windowing (Option 3)
  const [groupOffset, setGroupOffset] = useState(0); // starting index in groups array
  const [groupsPerPage, setGroupsPerPage] = useState(30); // dynamic later
  const scrollAccumRef = useRef(0);
  const dragRef = useRef<{
    startY: number;
    startOffset: number;
    dragging: boolean;
  }>({ startY: 0, startOffset: 0, dragging: false });
  const timelineOuterRef = useRef<HTMLDivElement | null>(null);

  // Helper function to create timeline items from operations
  const createTimelineItem = (operation: Operation) => {
    const batch = batches.find(
      (b) => (b.cr2b6_batchnumber || b.cr2b6_batchesid) === operation.batchId
    );
    const bgColor = batch ? getBatchColor(batch) : "#d3d3d3"; // darker gray for no batch
    const textColor = batch ? "#fff" : "#000"; // black text for no batch

    return {
      id: operation.id,
      group: operation.equipmentId,
      title: operation.description,
      type: operation.type,
      start_time: moment(operation.startTime).valueOf(),
      end_time: moment(operation.endTime).valueOf(),
      itemProps: {
        style: {
          background: bgColor,
          color: textColor,
          border: batch ? "none" : "1px solid #999", // subtle border for no batch
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
        const bid = b.cr2b6_batchnumber ?? b.cr2b6_batchesid;
        if (bid) batchColorById[String(bid)] = getBatchColor(b);
      });
      if (!mounted) return;

      // Attach a stable order (persist existing order if present, else index)
      const withOrder: OrderedEquipment[] = (eq as cr2b6_equipments[]).map(
        (e, i) => ({ ...e, __order: (e as any).cr2b6_order ?? i })
      );
      withOrder.sort((a, b) => (a.__order ?? 0) - (b.__order ?? 0));
      setEquipment(withOrder);
      setBatches(sortBatches(batches));
      setOperations(ops);

      const orderedForGroups = withOrder
        .slice()
        .sort((a, b) => (a.__order ?? 0) - (b.__order ?? 0));
      setGroups(
        orderedForGroups.map((g: any) => ({
          id: g.cr2b6_equipmentid,
          title: g.cr2b6_description,
          rightTitle: g.cr2b6_tag,
        }))
      );

      console.log("Operations:", ops);
      setItems(
        ops.map((o) => ({
          id: o.id,
          group: o.equipmentId,
          title: o.description,
          description: o.description, // Add description for tooltip
          type: o.type,
          batchId: o.batchId, // Add batchId for tooltip (expects cr2b6_batchnumber)
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

  // Recalculate groupsPerPage based on container height & lineHeight (40) when size changes
  useEffect(() => {
    const el = timelineOuterRef.current;
    if (!el) return;
    const compute = () => {
      // Use current computed padding from style (we minimized padding earlier)
      const style = getComputedStyle(el);
      const paddingTop = parseFloat(style.paddingTop) || 0;
      const paddingBottom = parseFloat(style.paddingBottom) || 0;
      const total = el.clientHeight - paddingTop - paddingBottom;
      const headerEl = el.querySelector(
        ".rct-header-root"
      ) as HTMLElement | null;
      const headerH = headerEl ? headerEl.getBoundingClientRect().height : 48;
      // Available vertical space for rows
      const usable = Math.max(0, total - headerH);
      // Allow an extra row if there's > 70% of a row free
      const raw = usable / GROUP_LINE_HEIGHT;
      let per = Math.max(3, Math.floor(raw + (raw % 1 > 0.7 ? 1 : 0)));
      setGroupsPerPage(per);
    };
    const resizeObserver = new ResizeObserver(() => compute());
    resizeObserver.observe(el);
    // Run after initial paint (header may not exist yet)
    setTimeout(compute, 0);
    return () => resizeObserver.disconnect();
  }, []);

  // Clamp offset when groups change
  useEffect(() => {
    setGroupOffset((prev) => {
      const maxStart = Math.max(0, groups.length - groupsPerPage);
      return Math.min(prev, maxStart);
    });
  }, [groups, groupsPerPage]);

  const visibleTimeStart = moment(startDate).valueOf();
  const visibleTimeEnd = moment(endDate).valueOf();

  // Format time for drag preview tooltip
  const formatDragTime = (t: number) => {
    const d = new Date(t);
    // Example: Sep 09 02:15 PM
    return d
      .toLocaleString(undefined, {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      .replace(",", "");
  };

  // RAF loop to track live drag position (more reliable than pointermove with library's internal transforms)
  const dragRafRef = useRef<number | null>(null);
  const startDragPreviewLoop = () => {
    if (!itemDragRef.current.active) return;
    const container = timelineOuterRef.current;
    if (!container) return;
    const canvas = container.querySelector('.rct-items') as HTMLElement | null;
    if (!canvas) return;
    const itemEl = canvas.querySelector(`.rct-item[data-op-id='${itemDragRef.current.itemId}']`) as HTMLElement | null;
    if (itemEl) {
      const canvasRect = canvas.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const itemRect = itemEl.getBoundingClientRect();
      const span = visibleTimeEnd - visibleTimeStart;
      // Item start pixel offset within canvas
      const offset = itemRect.left - canvasRect.left;
      const ratio = canvasRect.width > 0 ? offset / canvasRect.width : 0;
      let time = visibleTimeStart + ratio * span;
      const snap = 30 * 60 * 1000;
      time = Math.round(time / snap) * snap;
      const top = itemRect.top - containerRect.top - 6; // 6px above item
      const left = itemRect.left - containerRect.left; // align with start edge
      setDragPreview({ visible: true, time, left, top });
    }
    dragRafRef.current = window.requestAnimationFrame(startDragPreviewLoop);
  };
  const stopDragPreviewLoop = () => {
    if (dragRafRef.current != null) {
      cancelAnimationFrame(dragRafRef.current);
      dragRafRef.current = null;
    }
    setDragPreview(p => ({ ...p, visible: false }));
  };

  // Filter items by search term (batchId, equipment title/tag, or operation type)
  let displayedItems = items.filter((it) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    const batchMatch =
      it.batchId && String(it.batchId).toLowerCase().includes(s);
    const typeMatch = it.type && String(it.type).toLowerCase().includes(s);
    const titleMatch = it.title && String(it.title).toLowerCase().includes(s);
    const descMatch =
      it.description && String(it.description).toLowerCase().includes(s);
    // find equipment by the Dataverse-generated id field
    const eq = equipment.find(
      (e) => String(e.cr2b6_equipmentid) === String(it.group)
    );
    const equipmentMatch =
      eq &&
      (String(eq.cr2b6_description || "")
        .toLowerCase()
        .includes(s) ||
        String(eq.cr2b6_tag || "")
          .toLowerCase()
          .includes(s));
    return Boolean(
      batchMatch || typeMatch || equipmentMatch || titleMatch || descMatch
    );
  });

  // Filter groups (view mode lazily filters empty groups in time window)
  const filteredGroups = editMode
    ? groups
    : groups.filter((g) =>
        displayedItems.some((it) => {
          const matchesGroup = String(it.group) === String(g.id);
          if (!matchesGroup) return false;
          const itemStart = Number(it.start_time);
          const itemEnd = Number(it.end_time);
          return itemEnd >= visibleTimeStart && itemStart <= visibleTimeEnd;
        })
      );

  // Apply virtual window
  const maxStart = Math.max(0, filteredGroups.length - groupsPerPage);
  const clampedOffset = Math.min(groupOffset, maxStart);
  let displayedGroups = filteredGroups.slice(
    clampedOffset,
    clampedOffset + groupsPerPage
  );

  // Further constrain displayed items to those in visible group window
  const visibleGroupIds = new Set(displayedGroups.map((g) => String(g.id)));
  displayedItems = displayedItems.filter((it) =>
    visibleGroupIds.has(String(it.group))
  );

  // Inject placeholder if no items to display
  if (displayedItems.length === 0) {
    displayedGroups = [
      {
        id: "placeholder",
        title: "No operations",
        rightTitle: "",
      },
    ];
    displayedItems = [
      {
        id: "placeholder-item",
        group: "placeholder",
        title: "No operations scheduled",
        start_time: visibleTimeStart,
        end_time: visibleTimeEnd,
        itemProps: {
          style: {
            background: "#f3f2f1",
            color: "#888",
            fontStyle: "italic",
            border: "none",
            pointerEvents: "none",
          },
        },
      },
    ];
  }

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
      // record history once per move commit
      pushHistory();
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
    pushHistory();
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
  };

  // Global Delete key handler (avoids per-selection listener & stale state)
  useEffect(() => {
    const handleKey = async (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if (!editMode) return;
      // Don't delete if focused element is an input-like field (editing text)
      const active = document.activeElement as HTMLElement | null;
      if (active) {
        const tag = active.tagName;
        const isEditable = active.isContentEditable;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          isEditable ||
          active.getAttribute("role") === "textbox"
        ) {
          return; // allow normal text deletion
        }
      }
      const ids = Array.from(selectedItemsRef.current);
      if (ids.length === 0) return;
      pushHistory();
      for (const id of ids) {
        const op = operations.find((o) => o.id === String(id));
        if (op) {
          try {
            await dataProvider.deleteOperation(op.id);
            setOperations((prev) => prev.filter((p) => p.id !== op.id));
            setItems((prev) => prev.filter((i) => i.id !== op.id));
          } catch (err) {
            console.error("Failed to delete operation", err);
          }
        }
      }
      setSelectedItems(new Set());
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [editMode, operations]);

  const handleEditEquipment = async (groupId: string) => {
    if (!editMode) return; // Editing equipment not allowed in view mode
    console.log("Group ID clicked:", groupId);
    const allEquipment = await dataProvider.getEquipment();
    console.log("All equipment:", allEquipment);
    const equipment = allEquipment.find(
      (eq: any) => eq.cr2b6_equipmentid === groupId
    );
    console.log("Found equipment:", equipment);
    if (equipment) {
      setSelectedEquipment(equipment as cr2b6_equipments);
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
    const ordered = (eq as any[])
      .slice()
      .sort((a, b) => (a.cr2b6_order ?? 0) - (b.cr2b6_order ?? 0));
    setEquipment(
      ordered.map((e, i) => ({ ...e, __order: e.cr2b6_order ?? i }))
    );
    setGroups(
      ordered.map((g: any) => ({
        id: g.cr2b6_equipmentid,
        title: g.cr2b6_description,
        rightTitle: g.cr2b6_tag,
      }))
    );
  };

  const handleSaveEquipment = async (equipment: Partial<cr2b6_equipments>) => {
    try {
      await dataProvider.saveEquipment(equipment);
      await refreshEquipment();
      // Clear any selected equipment so next Add starts fresh
      setSelectedEquipment(undefined);
    } catch (error) {
      console.error("Failed to save equipment:", error);
      // TODO: Show error message to user
    }
  };

  // Equipment deletion disabled — only create and edit allowed

  // Operation handlers
  const handleNewOperation = () => {
    if (!editMode) return;
    setSelectedOperation(undefined);
    setIsOperationDialogOpen(true);
  };

  const handleEditOperation = (operationId: string) => {
    // Allow opening in view mode for read-only

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
      // snapshot before change
      pushHistory();
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
        pushHistory();
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

  const handleSaveBatch = async (batchData: Partial<cr2b6_batcheses>) => {
    try {
      const savedBatch = await dataProvider.saveBatch(batchData);

      // Update batches state using cr2b6_batchnumber as canonical key
      const savedKey =
        savedBatch.cr2b6_batchnumber || savedBatch.cr2b6_batchesid;
      if (
        batches.find(
          (b) => (b.cr2b6_batchnumber || b.cr2b6_batchesid) === savedKey
        )
      ) {
        // Update existing batch
        setBatches((prev) =>
          sortBatches(
            prev.map((batch) =>
              (batch.cr2b6_batchnumber || batch.cr2b6_batchesid) === savedKey
                ? savedBatch
                : batch
            )
          )
        );
      } else {
        // Add new batch (keep list sorted)
        setBatches((prev) => sortBatches([...prev, savedBatch]));
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

  // Batch deletion disabled — not supported from UI

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

  const handleContextMenuSelectBatchBelow = () => {
    if (!contextMenu.operationId) return;
    // Locate the reference operation (from operations array or items fallback)
    const operation =
      operations.find((op) => op.id === contextMenu.operationId) ||
      items.find((item) => item.id === contextMenu.operationId);
    if (!operation) return;

    // Normalized accessors
    const opBatchId =
      "batchId" in operation ? operation.batchId : operation.batchId;
    const opEquipmentId =
      "equipmentId" in operation ? operation.equipmentId : operation.group;
    if (!opBatchId) {
      console.log("Operation has no batch to extend selection below.");
      setContextMenu((prev) => ({ ...prev, visible: false }));
      return;
    }

    // Determine ordering of equipment groups; groups array holds list in order displayed (after potential reorder)
    const equipmentOrder: string[] = groups.map((g) => String(g.id));
    const startIdx = equipmentOrder.indexOf(String(opEquipmentId));
    if (startIdx === -1) {
      setContextMenu((prev) => ({ ...prev, visible: false }));
      return;
    }

    // Collect all equipment ids below current
    const equipmentBelow = new Set(equipmentOrder.slice(startIdx)); // include current row

    // Collect operations (source of truth operations state) that match batch and are in rows below
    const matchingOps = operations.filter(
      (op) =>
        op.batchId === opBatchId && equipmentBelow.has(String(op.equipmentId))
    );
    // Also account for any items not yet synced in operations state
    const matchingItems = items.filter(
      (it) => it.batchId === opBatchId && equipmentBelow.has(String(it.group))
    );

    const newSelection = new Set<string | number>([
      ...matchingOps.map((m) => m.id),
      ...matchingItems.map((m) => m.id),
    ]);

    // Ensure current clicked operation is included
    newSelection.add(contextMenu.operationId);
    setSelectedItems(newSelection);
    console.log(
      `Selected batch ${opBatchId} across ${newSelection.size} operations in rows below.`
    );
    setContextMenu((prev) => ({ ...prev, visible: false }));
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
      // snapshot before duplicating
      pushHistory();
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
      // After duplication, replace the current selection with the newly created operations
      if (duplicatedOperations.length) {
        const newIds = new Set<string | number>(
          duplicatedOperations.map((op) => op.id)
        );
        setSelectedItems(newIds);
      }
      // Clear the queued operations to duplicate
      setOperationsToDuplicate([]);
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
        gap: "8px", // Space between controls and timeline
        padding: "8px 8px 10px 8px", // Slightly tighter padding
      }}
    >
      {/* Command Bar Container */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "6px",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
          padding: "8px 10px",
        }}
      >
        <TimelineControls
          zoom={zoom}
          setZoom={setZoom}
          editMode={editMode}
          setEditMode={setEditMode}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onJumpToNow={jumpToNow}
          onAddEquipment={handleNewEquipment}
          onAddOperation={handleNewOperation}
          onManageBatches={handleManageBatches}
          onExportDb={async () => {
            const db = await LocalDb.get();
            const bytes = db.exportBytes();
            const ab = new ArrayBuffer(bytes.byteLength);
            new Uint8Array(ab).set(bytes);
            const blob = new Blob([ab], { type: "application/octet-stream" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "database.db";
            a.click();
            URL.revokeObjectURL(a.href);
          }}
          onImportDb={async (file) => {
            const buf = await file.arrayBuffer();
            const db = await LocalDb.get();
            db.importBytes(new Uint8Array(buf));
            // Optional: force a data refresh after import
            const [eq, ops, batches] = await Promise.all([
              dataProvider.getEquipment(),
              dataProvider.getOperations(startDate, endDate),
              dataProvider.getBatches(),
            ]);
            setEquipment(eq);
            setBatches(sortBatches(batches));
            setOperations(ops);
            // reset history after import
            undoStackRef.current = [];
            redoStackRef.current = [];
            updateHistoryStateFlags();
          }}
          onUndo={async () => {
            if (undoStackRef.current.length === 0) return;
            const target = undoStackRef.current.pop()!;
            redoStackRef.current.push(snapshotOps());
            await applyOpsFromHistory(target);
            updateHistoryStateFlags();
          }}
          onRedo={async () => {
            if (redoStackRef.current.length === 0) return;
            const target = redoStackRef.current.pop()!;
            undoStackRef.current.push(snapshotOps());
            await applyOpsFromHistory(target);
            updateHistoryStateFlags();
          }}
          canUndo={canUndo}
          canRedo={canRedo}
        />
      </div>

      {/* Timeline Container (reverted wrapper, rely on component scroll) */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "6px",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
          padding: "6px 8px 4px 8px",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overscrollBehavior: "contain",
          touchAction: "none",
        }}
        ref={timelineOuterRef}
        onWheel={(e) => {
          // Always prevent page scroll while over timeline area
          e.preventDefault();
          if (filteredGroups.length <= groupsPerPage) return; // nothing to virtual-scroll
          // accumulate delta so small wheel ticks move eventually
          scrollAccumRef.current += e.deltaY;
          const threshold = 30; // pixels per group scroll
          while (Math.abs(scrollAccumRef.current) >= threshold) {
            const dir = scrollAccumRef.current > 0 ? 1 : -1;
            scrollAccumRef.current -= dir * threshold;
            setGroupOffset((prev) => {
              const max = Math.max(0, filteredGroups.length - groupsPerPage);
              return Math.min(Math.max(prev + dir, 0), max);
            });
          }
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return; // left only
          const target = e.target as HTMLElement;
          const itemEl = target.closest('.rct-item');
          if (itemEl) {
            // Initialize drag preview tracking
            const idAttr = itemEl.getAttribute('data-op-id') || itemEl.getAttribute('data-id');
            // capture initial offset of item left relative to canvas to keep label anchored to item start rather than cursor
            const container = timelineOuterRef.current;
            const canvas = container?.querySelector('.rct-items') as HTMLElement | null;
            let offsetX = 0; let rowTop = 0;
            if (canvas) {
              const canvasRect = canvas.getBoundingClientRect();
              const itemRect = (itemEl as HTMLElement).getBoundingClientRect();
              offsetX = itemRect.left - canvasRect.left; // initial left position inside canvas
              rowTop = itemRect.top - (container!.getBoundingClientRect().top) - 6; // baseline for tooltip
            }
            itemDragRef.current = { itemId: idAttr || null, active: true, offsetX, rowTop };
            startDragPreviewLoop();
            return; // let timeline internal drag proceed
          }
          // Vertical group window drag
            dragRef.current = { startY: e.clientY, startOffset: clampedOffset, dragging: true };
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (dragRef.current.dragging) {
            const dy = e.clientY - dragRef.current.startY;
            const groupsDelta = Math.round(-dy / GROUP_LINE_HEIGHT);
            setGroupOffset(() => {
              const base = dragRef.current.startOffset + groupsDelta;
              const max = Math.max(0, filteredGroups.length - groupsPerPage);
              return Math.min(Math.max(base, 0), max);
            });
          }
        }}
        onPointerUp={(e) => {
          if (dragRef.current.dragging) {
            dragRef.current.dragging = false;
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
          }
          if (itemDragRef.current.active) {
            itemDragRef.current = { itemId: null, active: false, offsetX: 0, rowTop: 0 };
            stopDragPreviewLoop();
          }
        }}
      >
        {dragPreview.visible && (
          <div
            style={{
              position: 'absolute',
              left: dragPreview.left,
              top: dragPreview.top,
              transform: 'translate(-50%, -100%)',
              background: '#323130',
              color: 'white',
              padding: '2px 6px',
              fontSize: '11px',
              borderRadius: 4,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
              zIndex: 1000,
            }}
          >
            {formatDragTime(dragPreview.time)}
          </div>
        )}
        {/* Removed virtual window status overlay as requested */}
        <Timeline
          groups={displayedGroups}
          items={displayedItems}
          visibleTimeStart={visibleTimeStart}
          visibleTimeEnd={visibleTimeEnd}
          onTimeChange={handleTimeChange}
          canMove={editMode}
          canResize={
            editMode ? (selectedItems.size <= 1 ? "both" : false) : false
          }
          canChangeGroup={false}
          onItemMove={handleItemMove}
          onItemResize={handleItemResize}
          onItemSelect={handleItemSelect}
          onCanvasClick={() => {
            // Clicking empty space clears selection
            if (selectedItemsRef.current.size) setSelectedItems(new Set());
          }}
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
          lineHeight={GROUP_LINE_HEIGHT}
          itemHeightRatio={ITEM_HEIGHT_RATIO}
          itemRenderer={({ item, getItemProps, getResizeProps }) => {
            const isSelected = selectedItems.has(item.id);
            const canResize = selectedItems.size <= 1;

            const itemPropsRaw = getItemProps({
              onClick: (e: React.MouseEvent) => {
                handleItemSelect(item.id, e);
              },
              onDoubleClick: (e: React.MouseEvent) => {
                e.stopPropagation();
                handleEditOperation(String(item.id));
              },
              onContextMenu: (e: React.MouseEvent) => {
                if (!editMode) {
                  e.preventDefault();
                  return;
                }
                e.preventDefault();
                e.stopPropagation();
                setContextMenu({
                  visible: true,
                  x: e.clientX,
                  y: e.clientY,
                  operationId: String(item.id),
                });
              },
              onMouseDown: (e: React.MouseEvent) => {
                if (editMode) {
                  (e.currentTarget as HTMLElement).style.cursor = "grabbing";
                }
              },
              onMouseUp: (e: React.MouseEvent) => {
                if (editMode) {
                  (e.currentTarget as HTMLElement).style.cursor = "grab";
                }
              },
              onMouseLeave: (e: React.MouseEvent) => {
                // Ensure cursor resets if mouse leaves while dragging ended
                if (editMode) {
                  (e.currentTarget as HTMLElement).style.cursor = "grab";
                }
              },
              style: {
                ...item.itemProps?.style,
                cursor: editMode ? "grab" : "default",
                userSelect: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                paddingTop: 0,
                paddingBottom: 0,
                boxSizing: "border-box",
                transform: "translateY(-6px)",
                height: "calc(100% - 6px)",
                boxShadow: isSelected
                  ? "0 0 0 1px #0078d4, 0 2px 4px rgba(0, 0, 0, 0.15)"
                  : item.itemProps?.style?.boxShadow ||
                    "0 1px 2px rgba(0, 0, 0, 0.1)",
              },
            });
            const { key: itemKey, ...itemProps } = (itemPropsRaw as any) ?? {};
            const { left: leftResizePropsRaw, right: rightResizePropsRaw } =
              getResizeProps();
            const { key: leftKey, ...leftResizeProps } =
              (leftResizePropsRaw as any) ?? {};
            const { key: rightKey, ...rightResizeProps } =
              (rightResizePropsRaw as any) ?? {};

            if (canResize && editMode && leftResizeProps) {
              (leftResizeProps as any).style = {
                ...(leftResizeProps as any).style,
                cursor: "col-resize",
              };
            }
            if (canResize && editMode && rightResizeProps) {
              (rightResizeProps as any).style = {
                ...(rightResizeProps as any).style,
                cursor: "col-resize",
              };
            }

            return (
              <div
                key={String(itemKey ?? item.id)}
                {...itemProps}
                data-selected={isSelected}
                data-op-id={item.id}
              >
                {canResize && <div key={leftKey} {...leftResizeProps} />}
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
                      boxSizing: "border-box",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        color: "white",
                        fontWeight: 500,
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.title}
                    </div>
                  </div>
                </Tooltip>
                {canResize && <div key={rightKey} {...rightResizeProps} />}
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
              draggable={editMode}
              onDragStart={(e) => {
                if (!editMode) return;
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", String(group.id));
              }}
              onDragOver={(e) => {
                if (!editMode) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                if (!editMode) return;
                e.preventDefault();
                const draggedId = e.dataTransfer.getData("text/plain");
                const targetId = String(group.id);
                if (!draggedId || draggedId === targetId) return;
                // Reorder equipment array
                setEquipment((prev) => {
                  const arr = [...prev];
                  const fromIdx = arr.findIndex(
                    (eq) => String(eq.cr2b6_equipmentid) === draggedId
                  );
                  const toIdx = arr.findIndex(
                    (eq) => String(eq.cr2b6_equipmentid) === targetId
                  );
                  if (fromIdx === -1 || toIdx === -1) return prev;
                  const [moved] = arr.splice(fromIdx, 1);
                  arr.splice(toIdx, 0, moved);
                  // Reassign order numbers
                  arr.forEach((e, i) => {
                    e.__order = i;
                    (e as any).cr2b6_order = i;
                  });
                  // Rebuild groups to reflect new order
                  rebuildGroupsFromEquipment(arr);
                  // Also update groups state directly to ensure immediate reflection
                  setGroups(
                    arr
                      .slice()
                      .sort((a, b) => (a.__order ?? 0) - (b.__order ?? 0))
                      .map((g) => ({
                        id: g.cr2b6_equipmentid,
                        title: g.cr2b6_description,
                        rightTitle: g.cr2b6_tag,
                      }))
                  );
                  // Persist order asynchronously
                  (async () => {
                    for (const eq of arr) {
                      try {
                        await dataProvider.saveEquipment({
                          cr2b6_equipmentid: eq.cr2b6_equipmentid,
                          cr2b6_tag: eq.cr2b6_tag,
                          cr2b6_description: eq.cr2b6_description,
                          cr2b6_taganddescription: eq.cr2b6_taganddescription,
                          // @ts-ignore order field
                          cr2b6_order: (eq as any).cr2b6_order,
                        });
                      } catch (err) {
                        console.error("Failed to persist equipment order", err);
                      }
                    }
                  })();
                  return arr;
                });
              }}
              style={{
                cursor: editMode ? "grab" : "default",
                padding: "4px 8px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                height: "100%",
                opacity: 1,
                userSelect: "none",
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
                style={{ fontSize: "0.75em", color: "#666", lineHeight: "1.2" }}
              >
                {group.rightTitle}
              </div>
            </div>
          )}
        >
          <TimelineHeaders>
            <SidebarHeader>
              {({ getRootProps }) => {
                const rootPropsAll = getRootProps();
                const { key: rootKey, ...rootProps } =
                  (rootPropsAll as any) ?? {};
                return (
                  <div
                    key={rootKey}
                    {...rootProps}
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
        onSelectBatchBelow={handleContextMenuSelectBatchBelow}
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
        editMode={editMode}
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
      />
    </div>
  );
}
