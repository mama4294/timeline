

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

