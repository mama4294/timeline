// Local-only SQLite DB using sql.js with file persistence (database.db)
// This keeps schemas aligned with Dataverse-ish names for smoother future mapping.
import initSqlJs from 'sql.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

const DB_FILE_KEY = 'local-db-binary';

export type Row = Record<string, any>;

function loadFromStorage(): Uint8Array | undefined {
  try {
    const b64 = localStorage.getItem(DB_FILE_KEY);
    if (!b64) return undefined;
    const raw = atob(b64);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
  } catch {
    return undefined;
  }
}

function saveToStorage(bytes: Uint8Array) {
  const b64 = btoa(String.fromCharCode(...bytes));
  localStorage.setItem(DB_FILE_KEY, b64);
}

export class LocalDb {
  private static _instance: LocalDb | null = null;
  private db: any;
  private seeded = false;

  static async get(): Promise<LocalDb> {
    if (this._instance) return this._instance;
  const SQL = await initSqlJs({ locateFile: () => wasmUrl });
    const file = loadFromStorage();
    const db = new SQL.Database(file);
    const instance = new LocalDb(db);
    await instance.ensureSchema();
    this._instance = instance;
    return instance;
  }

  private constructor(db: any) {
    this.db = db;
  }

  private persist() {
    const bytes = this.db.export();
    saveToStorage(bytes);
  }

  private run(sql: string, params: any[] = []) {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    stmt.step();
    stmt.free();
    this.persist();
  }

  private all<T = Row>(sql: string, params: any[] = []): T[] {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const rows: T[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      rows.push(row as T);
    }
    stmt.free();
    return rows;
  }

  async ensureSchema() {
    // equipments
    this.run(`CREATE TABLE IF NOT EXISTS cr2b6_equipments (
      cr2b6_equipmentid TEXT PRIMARY KEY,
      cr2b6_tag TEXT NOT NULL,
      cr2b6_description TEXT,
      cr2b6_taganddescription TEXT,
  cr2b6_order INTEGER,
      createdon TEXT,
      modifiedon TEXT,
      ownerid TEXT,
      owneridname TEXT,
      owneridtype TEXT,
  owneridyominame TEXT,
      statecode TEXT
    )`);

    // Migration: ensure cr2b6_order column exists for older DBs
    try {
      // Attempt a harmless select; if it fails, add column
      this.all(`SELECT cr2b6_order FROM cr2b6_equipments LIMIT 1`);
    } catch {
      try {
        this.run(`ALTER TABLE cr2b6_equipments ADD COLUMN cr2b6_order INTEGER`);
      } catch { /* ignore */ }
    }
    // Initialize missing order values sequentially
    try {
      const eqRows = this.list<any>('cr2b6_equipments');
      let needsInit = false;
      for (const r of eqRows) {
        if (r.cr2b6_order === null || r.cr2b6_order === undefined) { needsInit = true; break; }
      }
      if (needsInit) {
        eqRows.sort((a,b)=> String(a.cr2b6_equipmentid).localeCompare(String(b.cr2b6_equipmentid)));
        eqRows.forEach((r,i) => {
          if (r.cr2b6_order === null || r.cr2b6_order === undefined) {
            r.cr2b6_order = i;
            this.update('cr2b6_equipments','cr2b6_equipmentid', r.cr2b6_equipmentid, r);
          }
        });
      }
    } catch { /* ignore */ }

    // batches
    this.run(`CREATE TABLE IF NOT EXISTS cr2b6_batcheses (
      cr2b6_batchesid TEXT PRIMARY KEY,
      cr2b6_batchnumber TEXT NOT NULL,
      createdon TEXT,
      modifiedon TEXT,
      ownerid TEXT,
      owneridname TEXT,
      owneridtype TEXT,
  owneridyominame TEXT,
      statecode TEXT
    )`);

    // operations
    this.run(`CREATE TABLE IF NOT EXISTS cr2b6_operations (
      cr2b6_operationsid TEXT PRIMARY KEY,
      cr2b6_equipmentid TEXT,
      cr2b6_batchid TEXT,
      cr2b6_starttime TEXT,
      cr2b6_endtime TEXT,
      cr2b6_type TEXT,
      cr2b6_description TEXT,
      cr2b6_allowoverlap INTEGER,
      createdon TEXT,
      modifiedon TEXT,
      statecode TEXT,
      statuscode TEXT
    )`);
    // Seed once
    if (!this.seeded && this.list("cr2b6_equipments").length === 0) {
  this.seed();
      this.seeded = true;
    }
  }

  // CRUD helpers
  insert(table: string, fields: Row) {
    const keys = Object.keys(fields);
    const placeholders = keys.map(() => '?').join(',');
    const sql = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`;
    const values = keys.map((k) => this.toDb(fields[k]));
    this.run(sql, values);
  }

  update(table: string, idField: string, id: string, fields: Row) {
    const entries = Object.entries(fields);
    if (!entries.length) return;
    const set = entries.map(([k]) => `${k} = ?`).join(',');
    const values = entries.map(([, v]) => this.toDb(v));
    const sql = `UPDATE ${table} SET ${set} WHERE ${idField} = ?`;
    this.run(sql, [...values, id]);
  }

  delete(table: string, idField: string, id: string) {
    this.run(`DELETE FROM ${table} WHERE ${idField} = ?`, [id]);
  }

  list<T = Row>(table: string): T[] {
    return this.all<T>(`SELECT * FROM ${table}`);
  }

  private toDb(v: any) {
    if (v instanceof Date) return v.toISOString();
    if (typeof v === 'boolean') return v ? 1 : 0;
    return v;
  }

  exportBytes(): Uint8Array {
    return this.db.export();
  }
  importBytes(bytes: Uint8Array) {
    const SQLCtor = (this.db.constructor as any);
    this.db = new SQLCtor(bytes);
    this.persist();
  }
  // Quick seed to mirror earlier mock content
  private seed() {
  const now = new Date().toISOString();
  const equipment = [
    { id: "1", tag: "V-3300A", desc: "3A Fermenter" },
    { id: "2", tag: "V-3300B", desc: "3B Fermenter" },
    { id: "3", tag: "V-3300C", desc: "3C Fermenter" },
    { id: "4", tag: "V-3300D", desc: "3D Fermenter" },
    { id: "5", tag: "V-3300E", desc: "3E Fermenter" },
    { id: "6", tag: "V-3300F", desc: "3F Fermenter" },
    { id: "7", tag: "U-4000", desc: "Centrifuge" },
    { id: "8", tag: "U-4400", desc: "Decanter" },
    { id: "9", tag: "U-4600", desc: "Homogenizer" },
    { id: "10", tag: "U-4700", desc: "Ceramic Skid" },
    { id: "11", tag: "U-4500", desc: "Ultrafilter" },
  ];
  for (const e of equipment) {
    this.insert("cr2b6_equipments", {
      cr2b6_equipmentid: e.id,
      cr2b6_tag: e.tag,
      cr2b6_description: e.desc,
      cr2b6_taganddescription: `${e.tag} - ${e.desc}`,
      createdon: now,
      modifiedon: now,
      ownerid: "system",
      owneridname: "System",
      owneridtype: "systemuser",
      owneridyominame: "",
      statecode: "0",
    });
  }
  const batches = ["25-HTS-30", "25-HTS-31"];
  for (const b of batches) {
    this.insert("cr2b6_batcheses", {
      cr2b6_batchesid: b,
      cr2b6_batchnumber: b,
      createdon: now,
      modifiedon: now,
      ownerid: "system",
      owneridname: "System",
      owneridtype: "systemuser",
      owneridyominame: "",
      statecode: "0",
    });
  }

  // Seed operations across the two batches
  const baseOps = [
    { id: "1", eq: "1", desc: "Fermentation", start: new Date(2025, 7, 28, 0, 0), end: new Date(2025, 8, 2, 12, 0) },
    { id: "2", eq: "7", desc: "Centrifugation", start: new Date(2025, 8, 2, 9, 0), end: new Date(2025, 8, 2, 12, 0) },
    { id: "3", eq: "3", desc: "Lyse buffer", start: new Date(2025, 8, 2, 9, 0), end: new Date(2025, 8, 3, 0, 0) },
    { id: "4", eq: "9", desc: "Homogenization", start: new Date(2025, 8, 2, 14, 0), end: new Date(2025, 8, 3, 0, 0) },
    { id: "5", eq: "6", desc: "Lysate holding", start: new Date(2025, 8, 2, 14, 0), end: new Date(2025, 8, 5, 12, 0) },
    { id: "6", eq: "10", desc: "Clarification", start: new Date(2025, 8, 3, 0, 0), end: new Date(2025, 8, 5, 12, 0) },
    { id: "7", eq: "11", desc: "Concentration", start: new Date(2025, 8, 3, 0, 0), end: new Date(2025, 8, 5, 18, 0) },
    { id: "8", eq: "4", desc: "Dextrose feed", start: new Date(2025, 7, 29, 0, 0), end: new Date(2025, 8, 2, 12, 0) },
    { id: "9", eq: "2", desc: "Fermentation", start: new Date(2025, 7, 28, 0, 0), end: new Date(2025, 8, 2, 12, 0) },
  ];
  const addWeek = (d: Date) => new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000);
  const batchIds = ["25-HTS-30", "25-HTS-31"];
  for (let i = 0; i < batchIds.length; i++) {
    const b = batchIds[i];
    for (const op of baseOps) {
      const id = i === 0 ? op.id : String(Number(op.id) + 10);
      const s = i === 0 ? op.start : addWeek(op.start);
      const e = i === 0 ? op.end : addWeek(op.end);
      this.insert("cr2b6_operations", {
        cr2b6_operationsid: id,
        cr2b6_equipmentid: op.eq,
        cr2b6_batchid: b,
        cr2b6_starttime: s.toISOString(),
        cr2b6_endtime: e.toISOString(),
        cr2b6_type: "Production",
        cr2b6_description: op.desc,
        createdon: now,
        modifiedon: now,
        statecode: "0",
        statuscode: "0",
      });
    }
  }
  }
}
