import {
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  Button,
  Input,
  Field,
  Divider,
  Dropdown,
  Option,
} from "@fluentui/react-components";
import type { Operation } from "../models/types";
import type { cr2b6_batcheses } from "../generated/models/cr2b6_batchesesModel";
import type { cr2b6_equipments } from "../generated/models/cr2b6_equipmentsModel";
import { useState, useCallback, useEffect, MouseEvent } from "react";

import type {
  DialogOpenChangeData,
  DialogOpenChangeEvent,
} from "@fluentui/react-components";

interface OperationDialogProps {
  operation?: Operation;
  open: boolean;
  onOpenChange: (
    event: DialogOpenChangeEvent,
    data: DialogOpenChangeData
  ) => void;
  onSave: (operation: Partial<Operation>) => void;
  onDelete?: () => void;
  equipment: cr2b6_equipments[];
  batches: cr2b6_batcheses[];
}

export const OperationDialog: React.FC<OperationDialogProps> = ({
  operation,
  open,
  onOpenChange,
  onSave,
  onDelete,
  equipment,
  batches,
}) => {
  const [formData, setFormData] = useState<Partial<Operation>>(
    operation ?? {
      equipmentId: "",
      batchId: null,
      startTime: new Date(),
      endTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      type: "Production",
      description: "",
    }
  );

  // Update form data when operation changes
  useEffect(() => {
    if (operation) {
      setFormData(operation);
    } else {
      setFormData({
        equipmentId: "",
        batchId: null,
        startTime: new Date(),
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        type: "Production",
        description: "",
      });
    }
  }, [operation]);

  const handleChange = useCallback((field: keyof Operation, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(() => {
    onSave(formData);
    const syntheticEvent = {
      preventDefault: () => {},
      stopPropagation: () => {},
      target: document.body,
    } as unknown as MouseEvent<HTMLElement>;
    onOpenChange(syntheticEvent, {
      type: "triggerClick",
      open: false,
      event: syntheticEvent,
    });
  }, [formData, onSave, onOpenChange]);

  const handleDelete = useCallback(() => {
    if (onDelete) {
      onDelete();
      const syntheticEvent = {
        preventDefault: () => {},
        stopPropagation: () => {},
        target: document.body,
      } as unknown as MouseEvent<HTMLElement>;
      onOpenChange(syntheticEvent, {
        type: "triggerClick",
        open: false,
        event: syntheticEvent,
      });
    }
  }, [onDelete, onOpenChange]);

  const formatDateTimeLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const parseDateTime = (value: string): Date => {
    return new Date(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogSurface>
        <DialogTitle>
          {operation ? "Edit Operation" : "Add Operation"}
        </DialogTitle>
        <DialogBody>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <Field label="Equipment" required>
              <Dropdown
                placeholder="Select equipment"
                value={
                  equipment.find((eq) => eq.cr2b6_equipmentid === formData.equipmentId)
                    ?.cr2b6_description || ""
                }
                onOptionSelect={(_, data) =>
                  handleChange("equipmentId", data.optionValue)
                }
              >
                {equipment.map((eq) => (
                  <Option
                    key={eq.cr2b6_equipmentid}
                    value={eq.cr2b6_equipmentid}
                    text={`${eq.cr2b6_description} (${eq.cr2b6_tag})`}
                  >
                    {eq.cr2b6_description} ({eq.cr2b6_tag})
                  </Option>
                ))}
              </Dropdown>
            </Field>

            <Field label="Batch">
              <Dropdown
                placeholder="Select batch (optional)"
                value={
                  batches.find((batch) => (batch.cr2b6_batchnumber ?? batch.cr2b6_batchesid) === formData.batchId)?.cr2b6_batchnumber ?? ""
                }
                onOptionSelect={(_, data) =>
                  handleChange(
                    "batchId",
                    data.optionValue === "" ? null : data.optionValue
                  )
                }
              >
                <Option value="" text="No Batch">
                  No Batch
                </Option>
                {batches.map((batch) => {
                  const bid = batch.cr2b6_batchnumber ?? batch.cr2b6_batchesid ?? "";
                  return (
                    <Option key={bid} value={bid} text={String(bid)}>
                      {String(bid)}
                    </Option>
                  );
                })}
              </Dropdown>
            </Field>

            <Field label="Start Time" required>
              <Input
                type="datetime-local"
                value={
                  formData.startTime
                    ? formatDateTimeLocal(formData.startTime)
                    : ""
                }
                onChange={(e) =>
                  handleChange("startTime", parseDateTime(e.target.value))
                }
              />
            </Field>

            <Field label="End Time" required>
              <Input
                type="datetime-local"
                value={
                  formData.endTime ? formatDateTimeLocal(formData.endTime) : ""
                }
                onChange={(e) =>
                  handleChange("endTime", parseDateTime(e.target.value))
                }
              />
            </Field>

            <Field label="Type" required>
              <Dropdown
                placeholder="Select operation type"
                value={formData.type || ""}
                onOptionSelect={(_, data) =>
                  handleChange("type", data.optionValue)
                }
              >
                <Option value="Production" text="Production">
                  Production
                </Option>
                <Option value="Maintenance" text="Maintenance">
                  Maintenance
                </Option>
                <Option value="Cleaning" text="Cleaning">
                  Cleaning
                </Option>
                <Option value="Inspection" text="Inspection">
                  Inspection
                </Option>
              </Dropdown>
            </Field>

            <Field label="Description" required>
              <Input
                value={formData.description || ""}
                onChange={(e) => handleChange("description", e.target.value)}
              />
            </Field>
          </div>
        </DialogBody>
        <Divider />
        <DialogActions>
          <DialogTrigger disableButtonEnhancement>
            <Button appearance="secondary">Cancel</Button>
          </DialogTrigger>
          {operation && onDelete && (
            <Button appearance="subtle" onClick={handleDelete}>
              Delete
            </Button>
          )}
          <Button appearance="primary" onClick={handleSave}>
            {operation ? "Save" : "Add"}
          </Button>
        </DialogActions>
      </DialogSurface>
    </Dialog>
  );
};
