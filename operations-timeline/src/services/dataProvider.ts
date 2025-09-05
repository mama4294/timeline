import type { Operation } from "../models/types";
import type { cr2b6_batcheses } from "../generated/models/cr2b6_batchesesModel";
import type { cr2b6_equipments } from "../generated/models/cr2b6_equipmentsModel";
import { LocalDb } from "./localDb";

export interface IDataProvider {
  getEquipment(): Promise<cr2b6_equipments[]>;
  getOperations(startDate: Date, endDate: Date): Promise<Operation[]>;
  getBatches(): Promise<cr2b6_batcheses[]>;
  saveEquipment(equipment: Partial<cr2b6_equipments>): Promise<cr2b6_equipments>;
  deleteEquipment(id: string): Promise<void>;
  saveOperation(operation: Partial<Operation>): Promise<Operation>;
  deleteOperation(id: string): Promise<void>;
  saveBatch(batch: Partial<cr2b6_batcheses>): Promise<cr2b6_batcheses>;
  deleteBatch(id: string): Promise<void>;
}

class LocalSqliteDataProvider implements IDataProvider {
  private async db() {
    return LocalDb.get();
  }

  async getEquipment(): Promise<cr2b6_equipments[]> {
    const rows = (await this.db()).list<any>("cr2b6_equipments");
    return rows.map((r) => ({
      ...r,
      createdon: r.createdon ? new Date(r.createdon) : undefined,
      modifiedon: r.modifiedon ? new Date(r.modifiedon) : undefined,
    })) as cr2b6_equipments[];
  }

  async getBatches(): Promise<cr2b6_batcheses[]> {
    const rows = (await this.db()).list<any>("cr2b6_batcheses");
    return rows.map((r) => ({
      ...r,
      createdon: r.createdon ? new Date(r.createdon) : undefined,
      modifiedon: r.modifiedon ? new Date(r.modifiedon) : undefined,
    })) as cr2b6_batcheses[];
  }

  async getOperations(startDate: Date, endDate: Date): Promise<Operation[]> {
    // Simple range overlap query using JS filter for now
    const rows = (await this.db()).list<any>("cr2b6_operations");
    const ops: Operation[] = rows.map((r) => ({
      id: r.cr2b6_operationsid,
      equipmentId: r.cr2b6_equipmentid,
      batchId: r.cr2b6_batchid || null,
      startTime: r.cr2b6_starttime ? new Date(r.cr2b6_starttime) : new Date(),
      endTime: r.cr2b6_endtime ? new Date(r.cr2b6_endtime) : new Date(),
      type: r.cr2b6_type || "Production",
      description: r.cr2b6_description || "",
      createdOn: r.createdon ? new Date(r.createdon) : new Date(),
      modifiedOn: r.modifiedon ? new Date(r.modifiedon) : new Date(),
    }));
    return ops.filter((op) => op.startTime <= endDate && op.endTime >= startDate);
  }

  async saveEquipment(equipment: Partial<cr2b6_equipments>): Promise<cr2b6_equipments> {
    const db = await this.db();
    const now = new Date();
    if (!equipment.cr2b6_equipmentid) {
      equipment.cr2b6_equipmentid = crypto.randomUUID();
      equipment.createdon = equipment.createdon || now;
    }
    equipment.modifiedon = now;
    const id = equipment.cr2b6_equipmentid;
    // Upsert
    const existing = (await this.getEquipment()).find((e) => e.cr2b6_equipmentid === id);
    const row = {
      cr2b6_equipmentid: id,
      cr2b6_tag: equipment.cr2b6_tag || "",
      cr2b6_description: equipment.cr2b6_description || "",
      cr2b6_taganddescription: equipment.cr2b6_taganddescription || `${equipment.cr2b6_tag || ''} - ${equipment.cr2b6_description || ''}`,
      createdon: equipment.createdon || now,
      modifiedon: equipment.modifiedon || now,
      ownerid: equipment.ownerid || "system",
      owneridname: equipment.owneridname || "System",
      owneridtype: equipment.owneridtype || "systemuser",
      owneridyominame: equipment.owneridyominame || "",
      statecode: equipment.statecode || "0",
    } as any;
    if (existing) db.update("cr2b6_equipments", "cr2b6_equipmentid", id, row);
    else db.insert("cr2b6_equipments", row);
    return row as cr2b6_equipments;
  }

  async deleteEquipment(_id: string): Promise<void> {
    // Disabled by policy to mirror Dataverse safety
    throw new Error("Equipment deletion is disabled. You can create or update equipment but not delete it.");
  }

  async saveBatch(batch: Partial<cr2b6_batcheses>): Promise<cr2b6_batcheses> {
    const db = await this.db();
    const now = new Date();
    const id = (batch.cr2b6_batchnumber || batch.cr2b6_batchesid || crypto.randomUUID()) as string;
    const existing = (await this.getBatches()).find((b) => (b.cr2b6_batchnumber || b.cr2b6_batchesid) === id);
    const row = {
      cr2b6_batchesid: batch.cr2b6_batchesid || id,
      cr2b6_batchnumber: batch.cr2b6_batchnumber || id,
      createdon: batch.createdon || now,
      modifiedon: now,
      ownerid: batch.ownerid || "system",
      owneridname: batch.owneridname || "System",
      owneridtype: batch.owneridtype || "systemuser",
      owneridyominame: batch.owneridyominame || "",
      statecode: batch.statecode || "0",
    } as any;
    if (existing) db.update("cr2b6_batcheses", "cr2b6_batchesid", row.cr2b6_batchesid, row);
    else db.insert("cr2b6_batcheses", row);
    return row as cr2b6_batcheses;
  }

  async deleteBatch(_id: string): Promise<void> {
    throw new Error("Batch deletion is disabled. You can create or update batches but not delete them.");
  }

  async saveOperation(operation: Partial<Operation>): Promise<Operation> {
    const db = await this.db();
    const now = new Date();
    const id = operation.id || crypto.randomUUID();
    const row = {
      cr2b6_operationsid: id,
      cr2b6_equipmentid: operation.equipmentId || "",
      cr2b6_batchid: operation.batchId || null,
      cr2b6_starttime: (operation.startTime || now).toISOString(),
      cr2b6_endtime: (operation.endTime || now).toISOString(),
      cr2b6_type: operation.type || "Production",
      cr2b6_description: operation.description || "",
      createdon: now.toISOString(),
      modifiedon: now.toISOString(),
      statecode: "0",
    } as any;
    const exists = (await this.getOperations(new Date(0), new Date(8640000000000000)))
      .some((o) => o.id === id);
    if (exists) db.update("cr2b6_operations", "cr2b6_operationsid", id, row);
    else db.insert("cr2b6_operations", row);
    return {
      id,
      equipmentId: row.cr2b6_equipmentid,
      batchId: row.cr2b6_batchid,
      startTime: new Date(row.cr2b6_starttime),
      endTime: new Date(row.cr2b6_endtime),
      type: row.cr2b6_type,
      description: row.cr2b6_description,
      createdOn: new Date(row.createdon),
      modifiedOn: new Date(row.modifiedon),
    } as Operation;
  }

  async deleteOperation(id: string): Promise<void> {
    const db = await this.db();
    db.delete("cr2b6_operations", "cr2b6_operationsid", id);
  }
}

class MockDataProvider implements IDataProvider {
  private equipment: cr2b6_equipments[] = [
    {
      cr2b6_description: "3A Fermenter",
      cr2b6_equipmentid: "1",
      cr2b6_tag: "V-3300A",
      cr2b6_taganddescription: "V-3300A - 3A Fermenter",
      createdbyyominame: "",
      createdon: new Date(),
      createdonbehalfbyyominame: "",
      importsequencenumber: 0,
      modifiedbyyominame: "",
      modifiedon: new Date(),
      modifiedonbehalfbyyominame: "",
      overriddencreatedon: new Date(),
      ownerid: "system",
      owneridname: "System",
      owneridtype: "systemuser",
      owneridyominame: "",
      owningbusinessunit: "",
      owningbusinessunitname: "Default BU",
      statecode: "0",
    },
    {
      cr2b6_description: "3B Fermenter",
      cr2b6_equipmentid: "2",
      cr2b6_tag: "V-3300B",
      cr2b6_taganddescription: "V-3300B - 3B Fermenter",
      createdbyyominame: "",
      createdon: new Date(),
      createdonbehalfbyyominame: "",
      importsequencenumber: 0,
      modifiedbyyominame: "",
      modifiedon: new Date(),
      modifiedonbehalfbyyominame: "",
      overriddencreatedon: new Date(),
      ownerid: "system",
      owneridname: "System",
      owneridtype: "systemuser",
      owneridyominame: "",
      owningbusinessunit: "",
      owningbusinessunitname: "Default BU",
      statecode: "0",
    },
    {
      cr2b6_description: "3C Fermenter",
      cr2b6_equipmentid: "3",
      cr2b6_tag: "V-3300C",
      cr2b6_taganddescription: "V-3300C - 3C Fermenter",
      createdbyyominame: "",
      createdon: new Date(),
      createdonbehalfbyyominame: "",
      importsequencenumber: 0,
      modifiedbyyominame: "",
      modifiedon: new Date(),
      modifiedonbehalfbyyominame: "",
      overriddencreatedon: new Date(),
      ownerid: "system",
      owneridname: "System",
      owneridtype: "systemuser",
      owneridyominame: "",
      owningbusinessunit: "",
      owningbusinessunitname: "Default BU",
      statecode: "0",
    },
    {
      cr2b6_description: "3D Fermenter",
      cr2b6_equipmentid: "4",
      cr2b6_tag: "V-3300D",
      cr2b6_taganddescription: "V-3300D - 3D Fermenter",
      createdbyyominame: "",
      createdon: new Date(),
      createdonbehalfbyyominame: "",
      importsequencenumber: 0,
      modifiedbyyominame: "",
      modifiedon: new Date(),
      modifiedonbehalfbyyominame: "",
      overriddencreatedon: new Date(),
      ownerid: "system",
      owneridname: "System",
      owneridtype: "systemuser",
      owneridyominame: "",
      owningbusinessunit: "",
      owningbusinessunitname: "Default BU",
      statecode: "0",
    },
    {
      cr2b6_description: "3E Fermenter",
      cr2b6_equipmentid: "5",
      cr2b6_tag: "V-3300E",
      cr2b6_taganddescription: "V-3300E - 3E Fermenter",
      createdbyyominame: "",
      createdon: new Date(),
      createdonbehalfbyyominame: "",
      importsequencenumber: 0,
      modifiedbyyominame: "",
      modifiedon: new Date(),
      modifiedonbehalfbyyominame: "",
      overriddencreatedon: new Date(),
      ownerid: "system",
      owneridname: "System",
      owneridtype: "systemuser",
      owneridyominame: "",
      owningbusinessunit: "",
      owningbusinessunitname: "Default BU",
      statecode: "0",
    },
    {
      cr2b6_description: "3F Fermenter",
      cr2b6_equipmentid: "6",
      cr2b6_tag: "V-3300F",
      cr2b6_taganddescription: "V-3300F - 3F Fermenter",
      createdbyyominame: "",
      createdon: new Date(),
      createdonbehalfbyyominame: "",
      importsequencenumber: 0,
      modifiedbyyominame: "",
      modifiedon: new Date(),
      modifiedonbehalfbyyominame: "",
      overriddencreatedon: new Date(),
      ownerid: "system",
      owneridname: "System",
      owneridtype: "systemuser",
      owneridyominame: "",
      owningbusinessunit: "",
      owningbusinessunitname: "Default BU",
      statecode: "0",
    },
    {
      cr2b6_description: "Centrifuge",
      cr2b6_equipmentid: "7",
      cr2b6_tag: "U-4000",
      cr2b6_taganddescription: "U-4000 - Centrifuge",
      createdbyyominame: "",
      createdon: new Date(),
      createdonbehalfbyyominame: "",
      importsequencenumber: 0,
      modifiedbyyominame: "",
      modifiedon: new Date(),
      modifiedonbehalfbyyominame: "",
      overriddencreatedon: new Date(),
      ownerid: "system",
      owneridname: "System",
      owneridtype: "systemuser",
      owneridyominame: "",
      owningbusinessunit: "",
      owningbusinessunitname: "Default BU",
      statecode: "0",
    },
    {
      cr2b6_description: "Decanter",
      cr2b6_equipmentid: "8",
      cr2b6_tag: "U-4400",
      cr2b6_taganddescription: "U-4400 - Decanter",
      createdbyyominame: "",
      createdon: new Date(),
      createdonbehalfbyyominame: "",
      importsequencenumber: 0,
      modifiedbyyominame: "",
      modifiedon: new Date(),
      modifiedonbehalfbyyominame: "",
      overriddencreatedon: new Date(),
      ownerid: "system",
      owneridname: "System",
      owneridtype: "systemuser",
      owneridyominame: "",
      owningbusinessunit: "",
      owningbusinessunitname: "Default BU",
      statecode: "0",
    },
    {
      cr2b6_description: "Homogenizer",
      cr2b6_equipmentid: "9",
      cr2b6_tag: "U-4600",
      cr2b6_taganddescription: "U-4600 - Homogenizer",
      createdbyyominame: "",
      createdon: new Date(),
      createdonbehalfbyyominame: "",
      importsequencenumber: 0,
      modifiedbyyominame: "",
      modifiedon: new Date(),
      modifiedonbehalfbyyominame: "",
      overriddencreatedon: new Date(),
      ownerid: "system",
      owneridname: "System",
      owneridtype: "systemuser",
      owneridyominame: "",
      owningbusinessunit: "",
      owningbusinessunitname: "Default BU",
      statecode: "0",
    },
    {
      cr2b6_description: "Ceramic Skid",
      cr2b6_equipmentid: "10",
      cr2b6_tag: "U-4700",
      cr2b6_taganddescription: "U-4700 - Ceramic Skid",
      createdbyyominame: "",
      createdon: new Date(),
      createdonbehalfbyyominame: "",
      importsequencenumber: 0,
      modifiedbyyominame: "",
      modifiedon: new Date(),
      modifiedonbehalfbyyominame: "",
      overriddencreatedon: new Date(),
      ownerid: "system",
      owneridname: "System",
      owneridtype: "systemuser",
      owneridyominame: "",
      owningbusinessunit: "",
      owningbusinessunitname: "Default BU",
      statecode: "0",
    },
    {
      cr2b6_description: "Ultrafilter",
      cr2b6_equipmentid: "11",
      cr2b6_tag: "U-4500",
      cr2b6_taganddescription: "U-4500 - Ultrafilter",
      createdbyyominame: "",
      createdon: new Date(),
      createdonbehalfbyyominame: "",
      importsequencenumber: 0,
      modifiedbyyominame: "",
      modifiedon: new Date(),
      modifiedonbehalfbyyominame: "",
      overriddencreatedon: new Date(),
      ownerid: "system",
      owneridname: "System",
      owneridtype: "systemuser",
      owneridyominame: "",
      owningbusinessunit: "",
      owningbusinessunitname: "Default BU",
      statecode: "0",
    },
  ];

  // Use cr2b6_batcheses-compatible mock entries; use cr2b6_batchnumber as canonical id
  private batches: cr2b6_batcheses[] = [
    {
      // primary id used by Dataverse
      cr2b6_batchesid: "25-HTS-30",
      cr2b6_batchnumber: "25-HTS-30",
      createdbyyominame: "",
      createdon: new Date(),
      createdonbehalfbyyominame: "",
      importsequencenumber: 0,
      modifiedbyyominame: "",
      modifiedon: new Date(),
      modifiedonbehalfbyyominame: "",
      overriddencreatedon: new Date(),
      ownerid: "system",
      owneridname: "System",
      owneridtype: "systemuser",
      owneridyominame: "",
      owningbusinessunit: "",
  owningbusinessunitname: "Default BU",
      statecode: "0",
  
    },
    {
      cr2b6_batchesid: "25-HTS-31",
      cr2b6_batchnumber: "25-HTS-31",
      createdbyyominame: "",
      createdon: new Date(),
      createdonbehalfbyyominame: "",
      importsequencenumber: 0,
      modifiedbyyominame: "",
      modifiedon: new Date(),
      modifiedonbehalfbyyominame: "",
      overriddencreatedon: new Date(),
      ownerid: "system",
      owneridname: "System",
      owneridtype: "systemuser",
      owneridyominame: "",
      owningbusinessunit: "",
      owningbusinessunitname: "Default BU",
      statecode: "0",
  
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

  async getEquipment(): Promise<cr2b6_equipments[]> {
    return Promise.resolve(this.equipment.map((e) => ({ ...e })));
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

  async getBatches(): Promise<cr2b6_batcheses[]> {
    return Promise.resolve([...this.batches]);
  }

  async saveEquipment(equipment: Partial<cr2b6_equipments>): Promise<cr2b6_equipments> {
    if (equipment.cr2b6_equipmentid) {
      const index = this.equipment.findIndex((eq) => eq.cr2b6_equipmentid === equipment.cr2b6_equipmentid);
      if (index === -1) throw new Error("Equipment not found");
      const updated: cr2b6_equipments = {
        ...this.equipment[index],
        ...equipment,
      } as cr2b6_equipments;
      this.equipment[index] = updated;
      return updated;
    } else {
      const newId = String(this.equipment.length + 1);
      const now = new Date();
      const newEquipment: cr2b6_equipments = {
        cr2b6_description: equipment.cr2b6_description || "",
        cr2b6_equipmentid: newId,
        cr2b6_tag: equipment.cr2b6_tag || "",
        cr2b6_taganddescription: `${equipment.cr2b6_tag || ''} - ${equipment.cr2b6_description || ''}`,
        createdbyyominame: equipment.createdbyyominame || "",
        createdon: equipment.createdon || now,
        createdonbehalfbyyominame: equipment.createdonbehalfbyyominame || "",
        importsequencenumber: equipment.importsequencenumber || 0,
        modifiedbyyominame: equipment.modifiedbyyominame || "",
        modifiedon: equipment.modifiedon || now,
        modifiedonbehalfbyyominame: equipment.modifiedonbehalfbyyominame || "",
        overriddencreatedon: equipment.overriddencreatedon || now,
        ownerid: equipment.ownerid || "system",
        owneridname: equipment.owneridname || "System",
        owneridtype: equipment.owneridtype || "systemuser",
        owneridyominame: equipment.owneridyominame || "",
        owningbusinessunit: equipment.owningbusinessunit || "",
        owningbusinessunitname: equipment.owningbusinessunitname || "Default BU",
        statecode: equipment.statecode || "0",
      } as cr2b6_equipments;
      this.equipment.push(newEquipment);
      return newEquipment;
    }
  }

  async deleteEquipment(_id: string): Promise<void> {
  // Deletion of equipment is disabled by application policy.
  // Throw an error to prevent accidental deletions.
  throw new Error("Equipment deletion is disabled. You can create or update equipment but not delete it.");
  }

  async saveOperation(operation: Partial<Operation>): Promise<Operation> {
    if (operation.id) {
      // Update existing operation
      const index = this.operations.findIndex((op) => op.id === operation.id);
      if (index === -1) throw new Error("Operation not found");

      const updated = {
        ...this.operations[index],
        ...operation,
        modifiedOn: new Date(),
      };
      this.operations[index] = updated;
      return updated;
    } else {
      // Create new operation
      const newId = String(
        Math.max(...this.operations.map((op) => parseInt(op.id))) + 1
      );
      const newOperation: Operation = {
        id: newId,
        equipmentId: operation.equipmentId || "",
        batchId: operation.batchId || null,
        startTime: operation.startTime || new Date(),
        endTime: operation.endTime || new Date(),
        type: operation.type || "Production",
        description: operation.description || "",
        createdOn: new Date(),
        modifiedOn: new Date(),
      };
      this.operations.push(newOperation);
      return newOperation;
    }
  }

  async deleteOperation(id: string): Promise<void> {
    const index = this.operations.findIndex((op) => op.id === id);
    if (index === -1) throw new Error("Operation not found");
    this.operations.splice(index, 1);
  }

  async saveBatch(batch: Partial<cr2b6_batcheses>): Promise<cr2b6_batcheses> {
  const primaryId = batch.cr2b6_batchnumber || batch.cr2b6_batchesid;
  if (primaryId && this.batches.find((b) => (b.cr2b6_batchnumber || b.cr2b6_batchesid) === primaryId)) {
      // Update existing batch
  const index = this.batches.findIndex((b) => (b.cr2b6_batchnumber || b.cr2b6_batchesid) === primaryId);
      if (index === -1) throw new Error("Batch not found");

  const updated: cr2b6_batcheses = {
        ...this.batches[index],
        ...batch,
        // Ensure cr2b6_batchnumber is set and used as the canonical key
        cr2b6_batchesid: this.batches[index].cr2b6_batchesid || batch.cr2b6_batchesid,
        cr2b6_batchnumber: batch.cr2b6_batchnumber || this.batches[index].cr2b6_batchnumber || primaryId,
  modifiedon: new Date(),
  } as cr2b6_batcheses;
      this.batches[index] = updated;
      return updated;
    } else {
      // Create new batch
  if (!batch.cr2b6_batchnumber && !batch.cr2b6_batchesid) throw new Error("Batch ID is required");
  const newId = batch.cr2b6_batchnumber || batch.cr2b6_batchesid!;
  if (this.batches.find((b) => (b.cr2b6_batchnumber || b.cr2b6_batchesid) === newId)) {
        throw new Error("Batch ID already exists");
      }

      const now = new Date();
  const newBatch: cr2b6_batcheses = {
        cr2b6_batchesid: batch.cr2b6_batchesid || newId,
        cr2b6_batchnumber: batch.cr2b6_batchnumber || newId,
        createdbyyominame: batch.createdbyyominame || "",
        createdon: batch.createdon || now,
        createdonbehalfbyyominame: batch.createdonbehalfbyyominame || "",
        importsequencenumber: batch.importsequencenumber || 0,
        modifiedbyyominame: batch.modifiedbyyominame || "",
  modifiedon: batch.modifiedon || now,
  modifiedonbehalfbyyominame: batch.modifiedonbehalfbyyominame || "",
  overriddencreatedon: batch.overriddencreatedon || now,
        ownerid: batch.ownerid || "system",
        owneridname: batch.owneridname || "System",
        owneridtype: batch.owneridtype || "systemuser",
        owneridyominame: batch.owneridyominame || "",
        owningbusinessunit: batch.owningbusinessunit || "",
        owningbusinessunitname: batch.owningbusinessunitname || "Default BU",
  statecode: batch.statecode || "0",
  } as cr2b6_batcheses;
      this.batches.push(newBatch);
      return newBatch;
    }
  }

  async deleteBatch(_id: string): Promise<void> {
  // Deletion of batches is disabled by application policy.
  // Throw an error to prevent accidental deletions.
  throw new Error("Batch deletion is disabled. You can create or update batches but not delete them.");
  }
}

// Provider switch: use local SQLite by default for dev, keeping easy reconnection to Dataverse later
const useLocal = (import.meta as any).env?.VITE_DATA_MODE !== 'remote';
export const dataProvider: IDataProvider = useLocal
  ? new LocalSqliteDataProvider()
  : new MockDataProvider();
