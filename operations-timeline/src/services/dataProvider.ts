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
      tag: "V-3300A",
      description: "3A Fermenter",
      isActive: true,
      createdOn: new Date(),
      modifiedOn: new Date(),
    },
    {
      id: "2",
      tag: "V-3300B",
      description: "3B Fermenter",
      isActive: true,
      createdOn: new Date(),
      modifiedOn: new Date(),
    },
    {
      id: "3",
      tag: "V-3300C",
      description: "3C Fermenter",
      isActive: true,
      createdOn: new Date(),
      modifiedOn: new Date(),
    },
    {
      id: "4",
      tag: "V-3300D",
      description: "3D Fermenter",
      isActive: true,
      createdOn: new Date(),
      modifiedOn: new Date(),
    },
    {
      id: "5",
      tag: "V-3300E",
      description: "3E Fermenter",
      isActive: true,
      createdOn: new Date(),
      modifiedOn: new Date(),
    },
    {
      id: "6",
      tag: "V-3300F",
      description: "3F Fermenter",
      isActive: true,
      createdOn: new Date(),
      modifiedOn: new Date(),
    },
    {
      id: "7",
      tag: "U-4000",
      description: "Centrifuge",
      isActive: true,
      createdOn: new Date(),
      modifiedOn: new Date(),
    },
    {
      id: "8",
      tag: "U-4400",
      description: "Decanter",
      isActive: true,
      createdOn: new Date(),
      modifiedOn: new Date(),
    },
    {
      id: "9",
      tag: "U-4600",
      description: "Homogenizer",
      isActive: true,
      createdOn: new Date(),
      modifiedOn: new Date(),
    },
    {
      id: "10",
      tag: "U-4700",
      description: "Ceramic Skid",
      isActive: true,
      createdOn: new Date(),
      modifiedOn: new Date(),
    },
    {
      id: "11",
      tag: "U-4500",
      description: "Ultrafilter",
      isActive: true,
      createdOn: new Date(),
      modifiedOn: new Date(),
    },
  ];

  private batches: Batch[] = [
    {
      id: "25-HTS-30",
      color: "#1f77b4",
      createdOn: new Date(),
      modifiedOn: new Date(),
    },
    {
      id: "25-HTS-31",
      color: "#ff7f0e", // Different color for the second batch
      createdOn: new Date(),
      modifiedOn: new Date(),
    },
  ];

  private addWeek(date: Date): Date {
    return new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  private createOperation(
    id: string,
    equipmentId: string,
    batchId: string,
    description: string,
    startTime: Date,
    endTime: Date
  ): Operation {
    return {
      id,
      equipmentId,
      batchId,
      startTime,
      endTime,
      type: "Production",
      description,
      createdOn: new Date(),
      modifiedOn: new Date(),
    };
  }

  private baseOps = [
    {
      id: "1",
      equipmentId: "1", //3A
      description: "Fermentation",
      startTime: new Date(2025, 7, 28, 0, 0), // Aug 28, 2025
      endTime: new Date(2025, 8, 2, 12, 0), // Sept 1, 2025
    },
    {
      id: "2",
      equipmentId: "7", //Centrifuge
      description: "Centrifugation",
      startTime: new Date(2025, 8, 2, 9, 0),
      endTime: new Date(2025, 8, 2, 12, 0),
    },
    {
      id: "3",
      equipmentId: "3", //3C
      description: "Lyse buffer",
      startTime: new Date(2025, 8, 2, 9, 0),
      endTime: new Date(2025, 8, 3, 0, 0),
    },
    {
      id: "4",
      equipmentId: "9", //Homogenizer
      description: "Homogenization",
      startTime: new Date(2025, 8, 2, 14, 0),
      endTime: new Date(2025, 8, 3, 0, 0),
    },
    {
      id: "5",
      equipmentId: "6", //3F
      description: "Lysate holding",
      startTime: new Date(2025, 8, 2, 14, 0),
      endTime: new Date(2025, 8, 5, 12, 0),
    },
    {
      id: "6",
      equipmentId: "10", //Ceramic
      description: "Clarification",
      startTime: new Date(2025, 8, 3, 0, 0),
      endTime: new Date(2025, 8, 5, 12, 0),
    },
    {
      id: "7",
      equipmentId: "11", //Ultrafilter
      description: "Concentration",
      startTime: new Date(2025, 8, 3, 0, 0),
      endTime: new Date(2025, 8, 5, 18, 0),
    },
    {
      id: "8",
      equipmentId: "4", //3D
      description: "Dextrose feed",
      startTime: new Date(2025, 7, 29, 0, 0),
      endTime: new Date(2025, 8, 2, 12, 0),
    },
    {
      id: "9",
      equipmentId: "2", //3B
      description: "Fermentation",
      startTime: new Date(2025, 7, 28, 0, 0),
      endTime: new Date(2025, 8, 2, 12, 0),
    },
  ];

  private operations: Operation[] = (() => {
    // First batch operations
    const batch1Ops = this.baseOps.map((op) =>
      this.createOperation(
        op.id,
        op.equipmentId,
        "25-HTS-30",
        op.description,
        op.startTime,
        op.endTime
      )
    );

    // Second batch operations (one week later)
    const batch2Ops = this.baseOps.map((op) =>
      this.createOperation(
        String(Number(op.id) + 10), // Add 10 to the original operation ID
        op.equipmentId,
        "25-HTS-31",
        op.description,
        this.addWeek(op.startTime),
        this.addWeek(op.endTime)
      )
    );

    const allOps = [...batch1Ops, ...batch2Ops];
    console.log(
      "All operations:",
      allOps.map((op) => ({
        id: op.id,
        batchId: op.batchId,
        equipmentId: op.equipmentId,
        startTime: op.startTime,
        endTime: op.endTime,
      }))
    );
    return allOps;
  })();

  async getEquipment(): Promise<Equipment[]> {
    return Promise.resolve([...this.equipment]);
  }

  async getOperations(startDate: Date, endDate: Date): Promise<Operation[]> {
    console.log("Getting operations between", startDate, "and", endDate);
    const filteredOps = this.operations.filter(
      (op) => op.startTime <= endDate && op.endTime >= startDate
    );
    console.log(
      "Filtered operations:",
      filteredOps.map((op) => ({
        id: op.id,
        batchId: op.batchId,
        equipmentId: op.equipmentId,
        startTime: op.startTime,
        endTime: op.endTime,
      }))
    );
    return Promise.resolve(filteredOps);
  }

  async getBatches(): Promise<Batch[]> {
    return Promise.resolve([...this.batches]);
  }
}

export const dataProvider = new MockDataProvider();
