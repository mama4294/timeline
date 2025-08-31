import {
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  Button,
  Input,
  Label,
  Switch,
  Field,
  Divider,
} from "@fluentui/react-components";
import { Equipment } from "../models/types";
import { useState, useCallback, useEffect, MouseEvent } from "react";

import type {
  DialogOpenChangeData,
  DialogOpenChangeEvent,
} from "@fluentui/react-components";

interface EquipmentDialogProps {
  equipment?: Equipment;
  open: boolean;
  onOpenChange: (
    event: DialogOpenChangeEvent,
    data: DialogOpenChangeData
  ) => void;
  onSave: (equipment: Partial<Equipment>) => void;
  onDelete?: () => void;
}

export const EquipmentDialog: React.FC<EquipmentDialogProps> = ({
  equipment,
  open,
  onOpenChange,
  onSave,
  onDelete,
}) => {
  const [formData, setFormData] = useState<Partial<Equipment>>(
    equipment ?? {
      tag: "",
      description: "",
      isActive: true,
    }
  );

  // Update form data when equipment changes
  useEffect(() => {
    if (equipment) {
      setFormData(equipment);
    } else {
      setFormData({
        tag: "",
        description: "",
        isActive: true,
      });
    }
  }, [equipment]);

  const handleChange = useCallback((field: keyof Equipment, value: any) => {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogSurface>
        <DialogTitle>
          {equipment ? "Edit Equipment" : "Add Equipment"}
        </DialogTitle>
        <DialogBody>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <Field label="Tag" required>
              <Input
                value={formData.tag}
                onChange={(e) => handleChange("tag", e.target.value)}
              />
            </Field>
            <Field label="Description" required>
              <Input
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
              />
            </Field>
            <Field>
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <Switch
                  checked={formData.isActive}
                  onChange={(_e, data) =>
                    handleChange("isActive", data.checked)
                  }
                />
                <Label>Active</Label>
              </div>
            </Field>
          </div>
        </DialogBody>
        <Divider />
        <DialogActions>
          <DialogTrigger disableButtonEnhancement>
            <Button appearance="secondary">Cancel</Button>
          </DialogTrigger>
          {equipment && onDelete && (
            <Button appearance="subtle" onClick={handleDelete}>
              Delete
            </Button>
          )}
          <Button appearance="primary" onClick={handleSave}>
            {equipment ? "Save" : "Add"}
          </Button>
        </DialogActions>
      </DialogSurface>
    </Dialog>
  );
};
