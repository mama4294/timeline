export interface Equipment {
  id: string;
  tag: string; // equipment tag (formerly 'name')
  description: string;
  isActive: boolean;
  createdOn: Date;
  modifiedOn: Date;
}

export interface Operation {
  id: string;
  equipmentId: string;
  batchId: string | null;
  startTime: Date;
  endTime: Date;
  type: string;
  description: string;
  createdOn: Date;
  modifiedOn: Date;
}

import type { cr2b6_batcheses } from "../generated/models/cr2b6_batchesesModel";

// Use the generated Dataverse model for Batch records but keep a small UI-friendly
// compatibility layer (id + color) so existing code continues to work.
export type Batch = cr2b6_batcheses & {
  // NOTE: do NOT use `id` anymore. Use `cr2b6_batchnumber` as the canonical id.
  // UI-only color field for batch visualization
  // UI-only color field for batch visualization
  color?: string;
};
