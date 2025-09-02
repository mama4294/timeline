import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogContent,
  DialogBody,
  DialogActions,
  Button,
  Field,
  Input,
} from "@fluentui/react-components";
import type { Batch } from "../models/types";

interface BatchDialogProps {
  batch?: Batch;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (batch: Partial<Batch>) => void;
  onDelete?: () => void;
}

export const BatchDialog: React.FC<BatchDialogProps> = ({
  batch,
  open,
  onOpenChange,
  onSave,
  onDelete,
}) => {
  const [batchId, setBatchId] = useState("");
  const [color, setColor] = useState("#0078d4");

  useEffect(() => {
    if (open) {
      if (batch) {
        setBatchId(batch.id);
        setColor(batch.color);
      } else {
        setBatchId("");
        setColor("#0078d4");
      }
    }
  }, [batch, open]);

  const handleSave = () => {
    const batchData: Partial<Batch> = {
      id: batchId.trim(),
      color: color,
    };

    if (batch) {
      // Editing existing batch - include the original id
      batchData.id = batch.id; // Keep original ID
      batchData.createdOn = batch.createdOn;
      batchData.modifiedOn = new Date();
    }

    onSave(batchData);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
    }
  };

  const isValid = batchId.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{batch ? "Edit Batch" : "Create New Batch"}</DialogTitle>
          <DialogContent>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <Field label="Batch ID:" required>
                <Input
                  value={batchId}
                  onChange={(_, data) => setBatchId(data.value)}
                  placeholder="Enter batch ID (e.g., B001, Batch-Alpha)"
                  disabled={!!batch} // Disable editing ID for existing batches
                />
              </Field>

              <Field label="Color:">
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      backgroundColor: color,
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      // Simple color picker - cycle through predefined colors
                      const colors = [
                        "#0078d4",
                        "#107c10",
                        "#d13438",
                        "#ff8c00",
                        "#5c2d91",
                        "#0099bc",
                        "#e3008c",
                        "#00bcf2",
                        "#bad80a",
                        "#00b7c3",
                        "#8764b8",
                        "#00cc6a",
                      ];
                      const currentIndex = colors.indexOf(color);
                      const nextIndex = (currentIndex + 1) % colors.length;
                      setColor(colors[nextIndex]);
                    }}
                  />
                  <Input
                    value={color}
                    onChange={(_, data) => setColor(data.value)}
                    placeholder="#0078d4"
                    style={{ width: "100px" }}
                  />
                </div>
              </Field>
            </div>
          </DialogContent>
          <DialogActions>
            {batch && onDelete && (
              <Button appearance="subtle" onClick={handleDelete}>
                Delete
              </Button>
            )}
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary" onClick={handleCancel}>
                Cancel
              </Button>
            </DialogTrigger>
            <Button
              appearance="primary"
              onClick={handleSave}
              disabled={!isValid}
            >
              {batch ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
