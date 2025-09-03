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
import { Add24Regular, MoreHorizontal24Regular, Edit24Regular } from "@fluentui/react-icons";
import { BatchDialog } from "./BatchDialog";
import type { Batch } from "../models/types";

interface BatchManagementProps {
  open: boolean;
  batches: Batch[];
  onOpenChange: (open: boolean) => void;
  onSaveBatch: (batch: Partial<Batch>) => void;
}

export const BatchManagement: React.FC<BatchManagementProps> = ({
  open,
  batches,
  onOpenChange,
  onSaveBatch,
}) => {
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | undefined>();
  // Deletion disabled — no batch deletion allowed from UI

  const handleCreateBatch = () => {
    setSelectedBatch(undefined);
    setIsBatchDialogOpen(true);
  };

  const handleEditBatch = (batch: Batch) => {
    setSelectedBatch(batch);
    setIsBatchDialogOpen(true);
  };

  // handleDeleteBatch intentionally removed

  const handleSaveBatch = (batchData: Partial<Batch>) => {
    onSaveBatch(batchData);
    setIsBatchDialogOpen(false);
    setSelectedBatch(undefined);
  };

  // handleDeleteBatchConfirmed removed

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
                    <TableRow key={batch.cr2b6_batchnumber ?? batch.cr2b6_batchesid}>
                      <TableCell>
                          <TableCellLayout>{batch.cr2b6_batchnumber ?? batch.cr2b6_batchesid}</TableCellLayout>
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
                backgroundColor: batch.color ?? "#ccc",
                                border: "1px solid #ccc",
                                borderRadius: "4px",
                              }}
                            />
              {batch.color ?? ""}
                          </div>
                        </TableCellLayout>
                      </TableCell>
                      <TableCell>
                        <TableCellLayout>
                          {new Date(batch.createdon ?? Date.now()).toLocaleDateString()}
                        </TableCellLayout>
                      </TableCell>
                      <TableCell>
                        <TableCellLayout>
                          {new Date(batch.modifiedon ?? Date.now()).toLocaleDateString()}
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
                                {/* Delete action removed */}
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
      />

  {/* Deletion disabled — confirmation dialog removed */}
    </>
  );
};
