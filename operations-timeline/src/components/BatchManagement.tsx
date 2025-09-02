import React, { useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogContent,
  DialogBody,
  DialogActions,
  Button,
  Table,
  TableHeader,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  TableCellLayout,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
} from "@fluentui/react-components";
import {
  Add24Regular,
  MoreHorizontal24Regular,
  Edit24Regular,
  Delete24Regular,
} from "@fluentui/react-icons";
import { BatchDialog } from "./BatchDialog";
import type { Batch } from "../models/types";

interface BatchManagementProps {
  open: boolean;
  batches: Batch[];
  onOpenChange: (open: boolean) => void;
  onSaveBatch: (batch: Partial<Batch>) => void;
  onDeleteBatch: (batchId: string) => void;
}

export const BatchManagement: React.FC<BatchManagementProps> = ({
  open,
  batches,
  onOpenChange,
  onSaveBatch,
  onDeleteBatch,
}) => {
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | undefined>();
  const [batchToDelete, setBatchToDelete] = useState<Batch | undefined>();

  const handleCreateBatch = () => {
    setSelectedBatch(undefined);
    setIsBatchDialogOpen(true);
  };

  const handleEditBatch = (batch: Batch) => {
    setSelectedBatch(batch);
    setIsBatchDialogOpen(true);
  };

  const handleDeleteBatch = (batch: Batch) => {
    setBatchToDelete(batch);
  };

  const confirmDelete = () => {
    if (batchToDelete) {
      onDeleteBatch(batchToDelete.id);
      setBatchToDelete(undefined);
    }
  };

  const handleSaveBatch = (batchData: Partial<Batch>) => {
    onSaveBatch(batchData);
    setIsBatchDialogOpen(false);
    setSelectedBatch(undefined);
  };

  const handleDeleteBatchConfirmed = () => {
    if (selectedBatch) {
      onDeleteBatch(selectedBatch.id);
      setIsBatchDialogOpen(false);
      setSelectedBatch(undefined);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
        <DialogSurface style={{ width: "800px", maxWidth: "90vw" }}>
          <DialogBody>
            <DialogTitle>Batch Management</DialogTitle>
            <DialogContent>
              <div style={{ marginBottom: "16px" }}>
                <Button
                  appearance="primary"
                  icon={<Add24Regular />}
                  onClick={handleCreateBatch}
                >
                  Create New Batch
                </Button>
              </div>

              <Table arial-label="Batches table">
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell>Batch ID</TableHeaderCell>
                    <TableHeaderCell>Color</TableHeaderCell>
                    <TableHeaderCell>Created</TableHeaderCell>
                    <TableHeaderCell>Modified</TableHeaderCell>
                    <TableHeaderCell>Actions</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell>
                        <TableCellLayout>{batch.id}</TableCellLayout>
                      </TableCell>
                      <TableCell>
                        <TableCellLayout>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <div
                              style={{
                                width: "20px",
                                height: "20px",
                                backgroundColor: batch.color,
                                border: "1px solid #ccc",
                                borderRadius: "4px",
                              }}
                            />
                            {batch.color}
                          </div>
                        </TableCellLayout>
                      </TableCell>
                      <TableCell>
                        <TableCellLayout>
                          {new Date(batch.createdOn).toLocaleDateString()}
                        </TableCellLayout>
                      </TableCell>
                      <TableCell>
                        <TableCellLayout>
                          {new Date(batch.modifiedOn).toLocaleDateString()}
                        </TableCellLayout>
                      </TableCell>
                      <TableCell>
                        <TableCellLayout>
                          <Menu>
                            <MenuTrigger>
                              <Button
                                appearance="subtle"
                                icon={<MoreHorizontal24Regular />}
                                size="small"
                              />
                            </MenuTrigger>
                            <MenuPopover>
                              <MenuList>
                                <MenuItem
                                  icon={<Edit24Regular />}
                                  onClick={() => handleEditBatch(batch)}
                                >
                                  Edit
                                </MenuItem>
                                <MenuItem
                                  icon={<Delete24Regular />}
                                  onClick={() => handleDeleteBatch(batch)}
                                >
                                  Delete
                                </MenuItem>
                              </MenuList>
                            </MenuPopover>
                          </Menu>
                        </TableCellLayout>
                      </TableCell>
                    </TableRow>
                  ))}
                  {batches.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <TableCellLayout>
                          <div
                            style={{
                              textAlign: "center",
                              padding: "20px",
                              color: "#666",
                            }}
                          >
                            No batches found. Create your first batch to get
                            started.
                          </div>
                        </TableCellLayout>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">Close</Button>
              </DialogTrigger>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Batch Edit/Create Dialog */}
      <BatchDialog
        batch={selectedBatch}
        open={isBatchDialogOpen}
        onOpenChange={setIsBatchDialogOpen}
        onSave={handleSaveBatch}
        onDelete={selectedBatch ? handleDeleteBatchConfirmed : undefined}
      />

      {/* Delete Confirmation Dialog */}
      {batchToDelete && (
        <Dialog
          open={!!batchToDelete}
          onOpenChange={(_, data) => !data.open && setBatchToDelete(undefined)}
        >
          <DialogSurface>
            <DialogBody>
              <DialogTitle>Delete Batch</DialogTitle>
              <DialogContent>
                Are you sure you want to delete batch "{batchToDelete.id}"? This
                action cannot be undone.
              </DialogContent>
              <DialogActions>
                <DialogTrigger disableButtonEnhancement>
                  <Button appearance="secondary">Cancel</Button>
                </DialogTrigger>
                <Button appearance="primary" onClick={confirmDelete}>
                  Delete
                </Button>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </Dialog>
      )}
    </>
  );
};
