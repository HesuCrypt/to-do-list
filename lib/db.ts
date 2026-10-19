import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure data folder exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'dashboard.db');

// Singleton connection for Next.js dev & prod
let dbInstance: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!dbInstance) {
    dbInstance = new Database(dbPath);
    dbInstance.pragma('journal_mode = WAL');
    initializeSchema(dbInstance);
  }
  return dbInstance;
}

function initializeSchema(db: Database.Database) {
  // Tasks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      description TEXT,
      deadline TEXT,
      startDate TEXT,
      endDate TEXT,
      isImportant INTEGER DEFAULT 0,
      isCompleted INTEGER DEFAULT 0,
      category TEXT DEFAULT 'None',
      createdAt TEXT,
      updatedAt TEXT
    );
  `);

  // Work notes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS work_notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT,
      date TEXT NOT NULL,
      time TEXT,
      category TEXT,
      status TEXT,
      hours TEXT,
      eta TEXT,
      isCompleted INTEGER DEFAULT 0,
      createdAt TEXT,
      updatedAt TEXT
    );
  `);

  // Work logs (Overtime) table
  db.exec(`
    CREATE TABLE IF NOT EXISTS work_logs (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      hours REAL NOT NULL,
      overtime REAL NOT NULL,
      createdAt TEXT
    );
  `);

  // Bills table
  db.exec(`
    CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      amount REAL,
      dueDate TEXT NOT NULL,
      repeatMonthly INTEGER DEFAULT 0,
      isPaid INTEGER DEFAULT 0,
      paidAmount REAL,
      lastPaidCycle TEXT,
      lastPaidDate TEXT
    );
  `);

  // Dashboard settings table (for key-value pairs like moto, utilities, totals, theme)
  db.exec(`
    CREATE TABLE IF NOT EXISTS dashboard_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt TEXT
    );
  `);
}

export interface TaskRecord {
  id: string;
  text: string;
  description?: string;
  deadline?: string;
  startDate?: string;
  endDate?: string;
  isImportant: boolean;
  isCompleted: boolean;
  category: 'Work' | 'Personal' | 'Urgent' | 'None';
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkNoteRecord {
  id: string;
  title: string;
  content?: string;
  date: string;
  time?: string;
  category: string;
  status: string;
  hours?: string;
  eta?: string;
  isCompleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkLogRecord {
  id: string;
  date: string;
  hours: number;
  overtime: number;
  createdAt?: string;
}

export interface BillRecord {
  id: string;
  name: string;
  amount?: number | '';
  dueDate: string;
  repeatMonthly: boolean;
  isPaid: boolean;
  paidAmount?: number;
  lastPaidCycle?: string;
  lastPaidDate?: string;
}

export interface DashboardPayload {
  tasks: TaskRecord[];
  workNotes: WorkNoteRecord[];
  workLogs: WorkLogRecord[];
  bills: BillRecord[];
  settings: Record<string, unknown>;
}

export function getAllDashboardData(): DashboardPayload {
  const db = getDatabase();

  const taskRows = db.prepare('SELECT * FROM tasks').all() as any[];
  const tasks: TaskRecord[] = taskRows.map((r) => ({
    id: r.id,
    text: r.text,
    description: r.description || undefined,
    deadline: r.deadline || '',
    startDate: r.startDate || undefined,
    endDate: r.endDate || undefined,
    isImportant: Boolean(r.isImportant),
    isCompleted: Boolean(r.isCompleted),
    category: (r.category as any) || 'None',
    createdAt: r.createdAt || undefined,
    updatedAt: r.updatedAt || undefined,
  }));

  const noteRows = db.prepare('SELECT * FROM work_notes').all() as any[];
  const workNotes: WorkNoteRecord[] = noteRows.map((r) => ({
    id: r.id,
    title: r.title,
    content: r.content || '',
    date: r.date,
    time: r.time || undefined,
    category: r.category || 'Development',
    status: r.status || 'In Progress',
    hours: r.hours || undefined,
    eta: r.eta || undefined,
    isCompleted: Boolean(r.isCompleted),
    createdAt: r.createdAt || undefined,
    updatedAt: r.updatedAt || undefined,
  }));

  const logRows = db.prepare('SELECT * FROM work_logs').all() as any[];
  const workLogs: WorkLogRecord[] = logRows.map((r) => ({
    id: r.id,
    date: r.date,
    hours: Number(r.hours),
    overtime: Number(r.overtime),
    createdAt: r.createdAt || undefined,
  }));

  const billRows = db.prepare('SELECT * FROM bills').all() as any[];
  const bills: BillRecord[] = billRows.map((r) => ({
    id: r.id,
    name: r.name,
    amount: r.amount !== null && r.amount !== undefined ? Number(r.amount) : '',
    dueDate: r.dueDate,
    repeatMonthly: Boolean(r.repeatMonthly),
    isPaid: Boolean(r.isPaid),
    paidAmount: r.paidAmount !== null && r.paidAmount !== undefined ? Number(r.paidAmount) : undefined,
    lastPaidCycle: r.lastPaidCycle || undefined,
    lastPaidDate: r.lastPaidDate || undefined,
  }));

  const settingRows = db.prepare('SELECT key, value FROM dashboard_settings').all() as any[];
  const settings: Record<string, unknown> = {};
  for (const row of settingRows) {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch {
      settings[row.key] = row.value;
    }
  }

  return {
    tasks,
    workNotes,
    workLogs,
    bills,
    settings,
  };
}

export function saveAllDashboardData(payload: Partial<DashboardPayload>) {
  const db = getDatabase();

  const transaction = db.transaction(() => {
    // 1. Sync tasks
    if (Array.isArray(payload.tasks)) {
      db.prepare('DELETE FROM tasks').run();
      const insertTask = db.prepare(`
        INSERT INTO tasks (id, text, description, deadline, startDate, endDate, isImportant, isCompleted, category, createdAt, updatedAt)
        VALUES (@id, @text, @description, @deadline, @startDate, @endDate, @isImportant, @isCompleted, @category, @createdAt, @updatedAt)
      `);
      for (const t of payload.tasks) {
        insertTask.run({
          id: t.id,
          text: t.text,
          description: t.description || null,
          deadline: t.deadline || null,
          startDate: t.startDate || null,
          endDate: t.endDate || null,
          isImportant: t.isImportant ? 1 : 0,
          isCompleted: t.isCompleted ? 1 : 0,
          category: t.category || 'None',
          createdAt: t.createdAt || new Date().toISOString(),
          updatedAt: t.updatedAt || new Date().toISOString(),
        });
      }
    }

    // 2. Sync work notes
    if (Array.isArray(payload.workNotes)) {
      db.prepare('DELETE FROM work_notes').run();
      const insertNote = db.prepare(`
        INSERT INTO work_notes (id, title, content, date, time, category, status, hours, eta, isCompleted, createdAt, updatedAt)
        VALUES (@id, @title, @content, @date, @time, @category, @status, @hours, @eta, @isCompleted, @createdAt, @updatedAt)
      `);
      for (const n of payload.workNotes) {
        insertNote.run({
          id: n.id,
          title: n.title,
          content: n.content || '',
          date: n.date,
          time: n.time || null,
          category: n.category || 'Development',
          status: n.status || 'In Progress',
          hours: n.hours || null,
          eta: n.eta || null,
          isCompleted: n.isCompleted ? 1 : 0,
          createdAt: n.createdAt || new Date().toISOString(),
          updatedAt: n.updatedAt || new Date().toISOString(),
        });
      }
    }

    // 3. Sync work logs
    if (Array.isArray(payload.workLogs)) {
      db.prepare('DELETE FROM work_logs').run();
      const insertLog = db.prepare(`
        INSERT INTO work_logs (id, date, hours, overtime, createdAt)
        VALUES (@id, @date, @hours, @overtime, @createdAt)
      `);
      for (const l of payload.workLogs) {
        insertLog.run({
          id: l.id,
          date: l.date,
          hours: l.hours,
          overtime: l.overtime,
          createdAt: l.createdAt || new Date().toISOString(),
        });
      }
    }

    // 4. Sync bills
    if (Array.isArray(payload.bills)) {
      db.prepare('DELETE FROM bills').run();
      const insertBill = db.prepare(`
        INSERT INTO bills (id, name, amount, dueDate, repeatMonthly, isPaid, paidAmount, lastPaidCycle, lastPaidDate)
        VALUES (@id, @name, @amount, @dueDate, @repeatMonthly, @isPaid, @paidAmount, @lastPaidCycle, @lastPaidDate)
      `);
      for (const b of payload.bills) {
        insertBill.run({
          id: b.id,
          name: b.name,
          amount: typeof b.amount === 'number' ? b.amount : null,
          dueDate: b.dueDate,
          repeatMonthly: b.repeatMonthly ? 1 : 0,
          isPaid: b.isPaid ? 1 : 0,
          paidAmount: typeof b.paidAmount === 'number' ? b.paidAmount : null,
          lastPaidCycle: b.lastPaidCycle || null,
          lastPaidDate: b.lastPaidDate || null,
        });
      }
    }

    // 5. Sync settings
    if (payload.settings && typeof payload.settings === 'object') {
      const upsertSetting = db.prepare(`
        INSERT INTO dashboard_settings (key, value, updatedAt)
        VALUES (@key, @value, @updatedAt)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt
      `);
      const now = new Date().toISOString();
      for (const [key, val] of Object.entries(payload.settings)) {
        upsertSetting.run({
          key,
          value: JSON.stringify(val),
          updatedAt: now,
        });
      }
    }
  });

  transaction();
}
