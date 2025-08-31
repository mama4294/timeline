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

export interface Batch {
  id: string;
  color: string;
  createdOn: Date;
  modifiedOn: Date;
}
