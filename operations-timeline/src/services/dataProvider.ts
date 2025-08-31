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
      tag: "U-4500",
      description: "Homogenizer",
      isActive: true,
      createdOn: new Date(),
      modifiedOn: new Date(),
    },
    {
      id: "8",
      tag: "U-4700",
      description: "Ceramic",
      isActive: true,
      createdOn: new Date(),
      modifiedOn: new Date(),
    },
    {
      id: "9",
      tag: "U-4600",
      description: "Ultrafilter",
      isActive: true,
      createdOn: new Date(),
      modifiedOn: new Date(),
    },
  ];

  private batches: Batch[] = [
    // We'll generate a few sample batches
    {
      id: "b-25-HTS-1",
      batchNumber: "25-HTS-01",
      color: "#1f77b4",
      description: "HTS Product 1",
      createdOn: new Date(),
      modifiedOn: new Date(),
    },
    {
      id: "b-25-HTS-2",
      batchNumber: "25-HTS-0",
      color: "#ff7f0e",
      description: "HTS Product 2",
      createdOn: new Date(),
      modifiedOn: new Date(),
    },
    {
      id: "b-25-MIX-1",
      batchNumber: "25-MIX-1",
      color: "#2ca02c",
      description: "Mix Product 1",
      createdOn: new Date(),
      modifiedOn: new Date(),
    },
    // Explicit batches for the provided initial operations
    {
      id: "b-25-HTS-30-3A",
      batchNumber: "25-HTS-30-3A",
      color: "#9467bd",
      description: "25-HTS-30-3A",
      createdOn: new Date(),
      modifiedOn: new Date(),
    },
    {
      id: "b-25-HTS-30-3B",
      batchNumber: "25-HTS-30-3B",
      color: "#8c564b",
      description: "25-HTS-30-3B",
      createdOn: new Date(),
      modifiedOn: new Date(),
    },
    {
      id: "b-25-HTS-30-dextrose",
      batchNumber: "25-HTS-30-Dextrose",
      color: "#e377c2",
      description: "25-HTS-30-Dextrose",
      createdOn: new Date(),
      modifiedOn: new Date(),
    },
    {
      id: "b-25-HTS-30",
      batchNumber: "25-HTS-30",
      color: "#7f7f7f",
      description: "25-HTS-30",
      createdOn: new Date(),
      modifiedOn: new Date(),
    },
  ];

  private operations: Operation[] = [
    // Generate a set of operations across equipment and days
  ];

  constructor() {
    // create a sequence of operations for the next 30 days
    const now = new Date(2025, 7, 1, 6, 0);
    let idCounter = 1;
    const batchIds = this.batches.map((b) => b.id);
    for (let day = 0; day < 30; day++) {
      for (let eq of this.equipment) {
        // Randomly decide to create 0-2 operations per equipment per day
        const opsCount =
          Math.random() > 0.3 ? (Math.random() > 0.7 ? 2 : 1) : 0;
        for (let i = 0; i < opsCount; i++) {
          const start = new Date(now.getTime());
          start.setDate(now.getDate() + day);
          start.setHours(6 + Math.floor(Math.random() * 10));
          start.setMinutes(0, 0, 0);
          const durationHours = 4 + Math.floor(Math.random() * 8);
          const end = new Date(start.getTime());
          end.setHours(start.getHours() + durationHours);

          const batchId = batchIds[Math.floor(Math.random() * batchIds.length)];
          const batch = this.batches.find((b) => b.id === batchId);

          this.operations.push({
            id: `${idCounter++}`,
            equipmentId: eq.id,
            batchId: batchId,
            startTime: start,
            endTime: end,
            type: batch ? "Production" : "Maintenance",
            description: batch ? batch.batchNumber : "Maintenance",
            createdOn: new Date(),
            modifiedOn: new Date(),
          });
        }

        // Append the explicit operations requested by the user
        const explicitOps = [
          {
            content: "25-HTS-30-3A",
            start: new Date(2025, 8, 27, 18),
            end: new Date(2025, 9, 1),
            group: 1,
          },
          {
            content: "25-HTS-30-3B",
            start: new Date(2025, 8, 27, 18),
            end: new Date(2025, 9, 1),
            group: 2,
          },
          {
            content: "25-HTS-30-Dextrose",
            start: new Date(2025, 8, 28),
            end: new Date(2025, 9, 1),
            group: 4,
          },
          {
            content: "25-HTS-30",
            start: new Date(2025, 9, 1),
            end: new Date(2025, 9, 2),
            group: 3,
          },
          {
            content: "25-HTS-30",
            start: new Date(2025, 9, 2),
            end: new Date(2025, 9, 5),
            group: 6,
          },
          {
            content: "25-HTS-30",
            start: new Date(2025, 9, 2),
            end: new Date(2025, 9, 3),
            group: 7,
          },
          {
            content: "25-HTS-30",
            start: new Date(2025, 9, 3),
            end: new Date(2025, 9, 5),
            group: 8,
          },
          {
            content: "25-HTS-30",
            start: new Date(2025, 9, 3),
            end: new Date(2025, 9, 5),
            group: 9,
          },
        ];

        const ensureBatch = (batchNumber: string) => {
          const existing = this.batches.find(
            (b) => b.batchNumber === batchNumber
          );
          if (existing) return existing.id;
          const id = `b-${batchNumber}`
            .replace(/[^a-zA-Z0-9-_]/g, "-")
            .toLowerCase();
          const colorPalette = [
            "#1f77b4",
            "#ff7f0e",
            "#2ca02c",
            "#d62728",
            "#9467bd",
            "#8c564b",
            "#e377c2",
            "#7f7f7f",
          ];
          const color = colorPalette[this.batches.length % colorPalette.length];
          const b = {
            id,
            batchNumber,
            color,
            description: batchNumber,
            createdOn: new Date(),
            modifiedOn: new Date(),
          };
          this.batches.push(b);
          return b.id;
        };

        for (const op of explicitOps) {
          const batchId = ensureBatch(op.content);
          this.operations.push({
            id: `${idCounter++}`,
            equipmentId: `${op.group}`,
            batchId,
            startTime: op.start,
            endTime: op.end,
            type: "Production",
            description: op.content,
            createdOn: new Date(),
            modifiedOn: new Date(),
          });
        }
      }
    }
  }

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
