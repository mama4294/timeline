import type { Equipment, Operation, Batch } from "../models/types";

export interface IDataProvider {
  getEquipment(): Promise<Equipment[]>;
  getOperations(startDate: Date, endDate: Date): Promise<Operation[]>;
  getBatches(): Promise<Batch[]>;
}

class MockDataProvider implements IDataProvider {
  private equipment: Equipment[] = [
    {
      id: "1",
      name: "V-3100A",
      description: "Vessel A",
      isActive: true,
      createdOn: new Date(),
      modifiedOn: new Date(),
    },
    {
      id: "2",
      name: "V-3100B",
      description: "Vessel B",
      isActive: true,
      createdOn: new Date(),
      modifiedOn: new Date(),
    },
  ];

  private batches: Batch[] = [
    {
      id: "1",
      batchNumber: "B001",
      color: "#FF0000",
      description: "Production Batch 1",
      createdOn: new Date(),
      modifiedOn: new Date(),
    },
  ];

  private operations: Operation[] = [
    {
      id: "1",
      equipmentId: "1",
      batchId: "1",
      startTime: new Date(2025, 7, 30, 8, 0),
      endTime: new Date(2025, 7, 30, 16, 0),
      type: "Production",
      description: "Production Run",
      createdOn: new Date(),
      modifiedOn: new Date(),
    },
  ];

  async getEquipment(): Promise<Equipment[]> {
    return Promise.resolve([...this.equipment]);
  }

  async getOperations(startDate: Date, endDate: Date): Promise<Operation[]> {
    return Promise.resolve(
      this.operations.filter(
        (op) => op.startTime >= startDate && op.endTime <= endDate
      )
    );
  }

  async getBatches(): Promise<Batch[]> {
    return Promise.resolve([...this.batches]);
  }
}

export const dataProvider = new MockDataProvider();
