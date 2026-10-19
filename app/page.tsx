'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Circle, 
  Pencil, 
  Trash2, 
  AlertCircle, 
  Wallet, 
  Clock, 
  CalendarDays, 
  Plus, 
  RotateCcw, 
  Sun, 
  Moon, 
  Sparkles, 
  Users, 
  DollarSign,
  CalendarCheck,
  CreditCard,
  X,
  FastForward
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import WorkNotesTab from '@/components/WorkNotesTab';
import CalendarTab from '@/components/CalendarTab';
import { WorkNote, checkDateBusyStatus, formatTime12Hour, parseTimeToStandard } from '@/lib/calendar-utils';


// --- TYPES ---
type TaskCategory = 'Work' | 'Personal' | 'Urgent' | 'None';

type Task = {
  id: string;
  text: string;
  description?: string;
  deadline: string;
  startDate?: string;
  endDate?: string;
  isImportant: boolean;
  isCompleted: boolean;
  category: TaskCategory;
};

type WorkLog = {
  id: string;
  date: string;
  hours: number;
  overtime: number;
};

type Bill = {
  id: string;
  name: string;
  amount?: number;
  dueDate: string;
  repeatMonthly?: boolean;
};

type GoogleAIPaymentRecord = {
  id: string;
  date: string;
  amount: number;
  cycleKey: string;
  type: 'regular' | 'advance';
  note?: string;
};

type GoogleAIMember = {
  id: string;
  name: string;
  amount: number;
  paymentDate: string; // YYYY-MM-DD
  repeatMonthly: boolean;
  isPaid: boolean;
  advanceMonths?: number;
  lastPaymentDate?: string;
  lastPaidCycle?: string;
  lastPaidAmount?: number;
  paymentHistory?: GoogleAIPaymentRecord[];
  notes?: string;
};

type HomePaidState = {
  meralco?: string;
  wifi?: string;
  samsung?: string;
};

type MotoProfile = {
  model: string;
  basePrice: number | '';
  currentOdometerKm: number | '';
};

type MotoAccessory = {
  id: string;
  name: string;
  price: number;
  date?: string;
};

type MotoFuelLog = {
  id: string;
  date: string;
  odometerKm: number;
  cost: number;
  liters?: number;
  notes?: string;
};

type MotoMaintenanceLog = {
  id: string;
  taskName: string;
  datePerformed: string;
  cost: number;
  odometerKm?: number;
  remindNextDate?: string;
  nextServiceKm?: number;
};

type MotoParkingLog = {
  id: string;
  date: string;
  cost: number;
  location?: string;
  notes?: string;
};

type DayExpensesLastReset = {
  total: number;
  at: string;
};

// --- HELPERS ---
const formatPHP = (amount: number) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  // Time-only value (HH:MM or H:MM)
  if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(dateString.trim())) {
    return formatTime12Hour(dateString);
  }
  const date = new Date(dateString);
  // Ensure we get valid date
  if (isNaN(date.getTime())) return dateString;
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric', 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  };
  // Check if it's just a date without time
  if (dateString.length <= 10) {
    options.hour = undefined;
    options.minute = undefined;
    options.hour12 = undefined;
    // Add timezone adjustment context if needed or just use UTC to avoid off-by-one errors with YYYY-MM-DD
    return new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', options);
  }
  return date.toLocaleString('en-US', options);
};

const formatHM = (decimalHours: number) => {
  if (isNaN(decimalHours) || decimalHours < 0) return '0:00';
  let h = Math.floor(decimalHours);
  let m = Math.round((decimalHours - h) * 60);
  if (m === 60) {
    h += 1;
    m = 0;
  }
  return `${h}:${m.toString().padStart(2, '0')}`;
};

const isDueSoon = (dateString: string) => {
  if (!dateString) return false;
  const dueDate = new Date(dateString);
  const now = new Date();
  
  const utcDue = Date.UTC(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const utcNow = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  
  const daysDiff = (utcDue - utcNow) / (1000 * 3600 * 24);
  return daysDiff <= 3;
};

const getMonthKey = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const getHomeCycleKey = (date: Date) => {
  const resetDay = 20;
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  const cycleDate = d >= resetDay ? new Date(y, m, 1) : new Date(y, m - 1, 1);
  return getMonthKey(cycleDate);
};

const getNextDueDate = (dayOfMonth: number) => {
  const now = new Date();
  const dueThisMonth = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
  if (now.getTime() <= dueThisMonth.getTime()) return dueThisMonth;
  return new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth);
};

const GOOGLE_AI_RESET_DAY = 24;

const getGoogleAICycleKey = (date: Date = new Date()) => {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  const cycleDate = d >= GOOGLE_AI_RESET_DAY ? new Date(y, m, 1) : new Date(y, m - 1, 1);
  return getMonthKey(cycleDate);
};

const getDefaultGoogleAIDueDate = (date: Date = new Date()) => {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  const targetDate = d <= GOOGLE_AI_RESET_DAY
    ? new Date(y, m, GOOGLE_AI_RESET_DAY)
    : new Date(y, m + 1, GOOGLE_AI_RESET_DAY);
  const yyyy = targetDate.getFullYear();
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const dd = String(targetDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getGoogleAICycleDetails = (date: Date = new Date()) => {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  
  const cycleStart = d >= GOOGLE_AI_RESET_DAY
    ? new Date(y, m, GOOGLE_AI_RESET_DAY)
    : new Date(y, m - 1, GOOGLE_AI_RESET_DAY);
  
  const cycleEnd = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, GOOGLE_AI_RESET_DAY - 1);
  
  const nextCycleDate = d >= GOOGLE_AI_RESET_DAY
    ? new Date(y, m + 1, GOOGLE_AI_RESET_DAY)
    : new Date(y, m, GOOGLE_AI_RESET_DAY);
    
  const isDueToday = d === GOOGLE_AI_RESET_DAY;
  
  const now = new Date(y, m, d);
  const diffMs = nextCycleDate.getTime() - now.getTime();
  const daysUntilNext = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  return {
    cycleKey: getMonthKey(cycleStart),
    cycleStart,
    cycleEnd,
    nextCycleDate,
    isDueToday,
    daysUntilNext,
    formattedCycleStart: cycleStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    formattedCycleEnd: cycleEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    formattedNextCycleDate: nextCycleDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  };
};

const getMemberCoverageInfo = (member: GoogleAIMember) => {
  const advance = Math.max(0, member.advanceMonths || 0);
  let baseDate: Date;
  if (member.paymentDate && member.paymentDate.length >= 10) {
    baseDate = new Date(member.paymentDate.slice(0, 10) + 'T00:00:00');
    if (isNaN(baseDate.getTime())) baseDate = new Date();
  } else {
    baseDate = new Date();
  }
  
  const targetDue = new Date(baseDate.getFullYear(), baseDate.getMonth(), GOOGLE_AI_RESET_DAY);
  if (member.isPaid) {
    targetDue.setMonth(targetDue.getMonth() + 1 + advance);
  } else if (advance > 0) {
    targetDue.setMonth(targetDue.getMonth() + advance);
  }
  
  const coverageEnd = new Date(targetDue.getFullYear(), targetDue.getMonth(), GOOGLE_AI_RESET_DAY - 1);
  
  return {
    nextDueDate: targetDue,
    coverageEndDate: coverageEnd,
    formattedNextDue: targetDue.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    formattedCoverageEnd: coverageEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    hasAdvance: advance > 0,
    advanceMonths: advance,
  };
};

const DASH_DB_NAME = 'dash_local_db';
const DASH_DB_VERSION = 1;
const DASH_DB_STORE = 'snapshots';
const DASH_DB_KEY = 'dashboard';

const openDashDb = () => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DASH_DB_NAME, DASH_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DASH_DB_STORE)) {
        db.createObjectStore(DASH_DB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

const idbSetDashboardSnapshot = async (snapshot: unknown) => {
  const db = await openDashDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DASH_DB_STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(DASH_DB_STORE).put(snapshot, DASH_DB_KEY);
  });
  db.close();
};

const getDashSnapshot = (storage: Storage) => {
  const kv: Record<string, string> = {};
  for (let i = 0; i < storage.length; i += 1) {
    const k = storage.key(i);
    if (!k || !k.startsWith('dash_')) continue;
    kv[k] = storage.getItem(k) ?? '';
  }
  const updatedAt = kv['dash_updatedAt'] || new Date().toISOString();
  kv['dash_updatedAt'] = updatedAt;
  return { kv, updatedAt };
};

// --- MAIN COMPONENT ---
export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'tasks' | 'work-notes' | 'calendar' | 'overtime' | 'finance' | 'motorcycle' | 'google-ai'>('tasks');
  const [workNotes, setWorkNotes] = useState<WorkNote[]>([]);
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<string>('');

  // Google AI Pro State
  const [googleAIMembers, setGoogleAIMembers] = useState<GoogleAIMember[]>([]);
  const [googleAIPlanCost, setGoogleAIPlanCost] = useState<number | ''>(1099);
  const [googleAICycleKey, setGoogleAICycleKey] = useState<string>('');
  const [googleAICycleNotice, setGoogleAICycleNotice] = useState<string | null>(null);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberAmount, setNewMemberAmount] = useState<number | ''>(183.17); // 1099 / 6 = 183.17 default
  const [newMemberDate, setNewMemberDate] = useState(getDefaultGoogleAIDueDate());
  const [newMemberAdvanceMonths, setNewMemberAdvanceMonths] = useState<number>(0);
  const [newMemberRepeat, setNewMemberRepeat] = useState(true);
  const [advanceModalMember, setAdvanceModalMember] = useState<GoogleAIMember | null>(null);
  const [advanceInputMonths, setAdvanceInputMonths] = useState<number>(1);
  const [historyModalMember, setHistoryModalMember] = useState<GoogleAIMember | null>(null);

  // Tasks State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [newTaskDeadlineTime, setNewTaskDeadlineTime] = useState('');
  const [newTaskDeadlineType, setNewTaskDeadlineType] = useState<'date' | 'datetime'>('date');
  const [newTaskImportant, setNewTaskImportant] = useState(false);
  const [newTaskCategory, setNewTaskCategory] = useState<TaskCategory>('None');
  const [filterCategory, setFilterCategory] = useState<TaskCategory | 'All'>('All');
  const [showArchive, setShowArchive] = useState(false);

  // Overtime State
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [logDate, setLogDate] = useState('');
  const [timeIn, setTimeIn] = useState('');
  const [timeOut, setTimeOut] = useState('');
  const [logHours, setLogHours] = useState<number | ''>('');
  const NORMAL_HOURS = 9;

  // Finance State
  const [bills, setBills] = useState<Bill[]>([]);
  const [newBillName, setNewBillName] = useState('');
  const [newBillDate, setNewBillDate] = useState('');
  const [newBillRepeatMonthly, setNewBillRepeatMonthly] = useState(false);

  const [dayExpensesTotal, setDayExpensesTotal] = useState(0);
  const [monthlyExpensesTotal, setMonthlyExpensesTotal] = useState(0);
  const [dayExpensesAmount, setDayExpensesAmount] = useState<number | ''>('');
  const [dayExpensesLastReset, setDayExpensesLastReset] = useState<DayExpensesLastReset | null>(null);
  const [dayExpensesCopied, setDayExpensesCopied] = useState(false);

  const [motoProfile, setMotoProfile] = useState<MotoProfile>({
    model: '',
    basePrice: '',
    currentOdometerKm: '',
  });
  const [motoAccessories, setMotoAccessories] = useState<MotoAccessory[]>([]);
  const [motoFuelLogs, setMotoFuelLogs] = useState<MotoFuelLog[]>([]);
  const [motoMaintenanceLogs, setMotoMaintenanceLogs] = useState<MotoMaintenanceLog[]>([]);
  const [motoParkingLogs, setMotoParkingLogs] = useState<MotoParkingLog[]>([]);

  const [newAccessoryName, setNewAccessoryName] = useState('');
  const [newAccessoryPrice, setNewAccessoryPrice] = useState<number | ''>('');
  const [newAccessoryDate, setNewAccessoryDate] = useState('');

  const [newFuelDate, setNewFuelDate] = useState('');
  const [newFuelOdometerKm, setNewFuelOdometerKm] = useState<number | ''>('');
  const [newFuelLiters, setNewFuelLiters] = useState<number | ''>('');
  const [newFuelCost, setNewFuelCost] = useState<number | ''>('');
  const [newFuelNotes, setNewFuelNotes] = useState('');

  const [newMaintenanceTaskName, setNewMaintenanceTaskName] = useState('');
  const [newMaintenanceCost, setNewMaintenanceCost] = useState<number | ''>('');
  const [newMaintenanceDatePerformed, setNewMaintenanceDatePerformed] = useState('');
  const [newMaintenanceOdometerKm, setNewMaintenanceOdometerKm] = useState<number | ''>('');
  const [newMaintenanceRemindDate, setNewMaintenanceRemindDate] = useState('');
  const [newMaintenanceNextServiceKm, setNewMaintenanceNextServiceKm] = useState<number | ''>('');

  const [newParkingDate, setNewParkingDate] = useState('');
  const [newParkingCost, setNewParkingCost] = useState<number | ''>('');
  const [newParkingLocation, setNewParkingLocation] = useState('');
  const [newParkingNotes, setNewParkingNotes] = useState('');

  // Utilities State
  const [meralcoBill, setMeralcoBill] = useState<number | ''>('');
  const WIFI_BILL = 600;
  const SAMSUNG_BILL = 1869;
  const SAMSUNG_START_BALANCE = 14647;
  const [samsungRemaining, setSamsungRemaining] = useState<number | ''>('');
  const [homePaid, setHomePaid] = useState<HomePaidState>({});

  const [isClient, setIsClient] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setIsClient(true);
      const storedTasks = localStorage.getItem('dash_tasks');
      if (storedTasks) setTasks(JSON.parse(storedTasks));

      const storedWorkNotes = localStorage.getItem('dash_work_notes');
      if (storedWorkNotes) {
        try {
          setWorkNotes(JSON.parse(storedWorkNotes));
        } catch {}
      }

      const storedWorkLogs = localStorage.getItem('dash_workLogs');
      if (storedWorkLogs) setWorkLogs(JSON.parse(storedWorkLogs));

      const storedBills = localStorage.getItem('dash_bills');
      if (storedBills) setBills(JSON.parse(storedBills));

      const storedDayExpensesTotal = localStorage.getItem('dash_dayExpenses_total');
      if (storedDayExpensesTotal && storedDayExpensesTotal !== '') {
        const n = Number(storedDayExpensesTotal);
        if (Number.isFinite(n)) setDayExpensesTotal(n);
      }

      const storedDayExpensesLastReset = localStorage.getItem('dash_dayExpenses_lastReset');
      if (storedDayExpensesLastReset) {
        try {
          const parsed = JSON.parse(storedDayExpensesLastReset);
          if (parsed && typeof parsed.total === 'number' && typeof parsed.at === 'string') setDayExpensesLastReset(parsed);
        } catch {}
      }

      const storedMotoProfile = localStorage.getItem('dash_moto_profile');
      if (storedMotoProfile) setMotoProfile(JSON.parse(storedMotoProfile));

      const storedMotoAccessories = localStorage.getItem('dash_moto_accessories');
      if (storedMotoAccessories) setMotoAccessories(JSON.parse(storedMotoAccessories));

      const storedMotoFuelLogs = localStorage.getItem('dash_moto_fuelLogs');
      if (storedMotoFuelLogs) setMotoFuelLogs(JSON.parse(storedMotoFuelLogs));

      const storedMotoMaintenanceLogs = localStorage.getItem('dash_moto_maintenanceLogs');
      if (storedMotoMaintenanceLogs) setMotoMaintenanceLogs(JSON.parse(storedMotoMaintenanceLogs));

      const storedMotoParkingLogs = localStorage.getItem('dash_moto_parkingLogs');
      if (storedMotoParkingLogs) setMotoParkingLogs(JSON.parse(storedMotoParkingLogs));

      const currentHomeCycleKey = getHomeCycleKey(new Date());
      const storedMeralcoBillMonthKey = localStorage.getItem('dash_meralcoBill_monthKey');
      const storedMeralcoBill = localStorage.getItem('dash_meralcoBill');
      if (storedMeralcoBillMonthKey === currentHomeCycleKey && storedMeralcoBill && storedMeralcoBill !== '') {
        setMeralcoBill(Number(storedMeralcoBill));
      }

      const storedSamsungRemaining = localStorage.getItem('dash_samsungRemaining');
      if (storedSamsungRemaining && storedSamsungRemaining !== '') setSamsungRemaining(Number(storedSamsungRemaining));
      else setSamsungRemaining(SAMSUNG_START_BALANCE);

      const storedHomePaid = localStorage.getItem('dash_homePaid');
      // Monthly reset logic for expenses
      const currentMonthKey = getMonthKey(new Date());
      const storedMonthKey = localStorage.getItem('dash_monthKey');
      const storedMonthlyTotal = localStorage.getItem('dash_monthly_total');
      if (storedMonthKey !== currentMonthKey) {
        setMonthlyExpensesTotal(0);
        localStorage.setItem('dash_monthKey', currentMonthKey);
        localStorage.setItem('dash_monthly_total', '0');
      } else if (storedMonthlyTotal) {
        const n = Number(storedMonthlyTotal);
        if (Number.isFinite(n)) setMonthlyExpensesTotal(n);
      }
      if (storedHomePaid) setHomePaid(JSON.parse(storedHomePaid));

      const currentGoogleAICycleKey = getGoogleAICycleKey(new Date());
      setGoogleAICycleKey(currentGoogleAICycleKey);
      const storedGoogleAICycleKey = localStorage.getItem('dash_google_ai_cycleKey');
      const storedGoogleAIMembers = localStorage.getItem('dash_google_ai_members');
      
      let initialMembers: GoogleAIMember[] = [];
      if (storedGoogleAIMembers) {
        try {
          initialMembers = JSON.parse(storedGoogleAIMembers);
        } catch {}
      }

      const currentGoogleAICycleDate = `${currentGoogleAICycleKey}-24`;

      // Always synchronize members whose paymentDate is before the current cycle date (e.g. Aug 24 -> Sept 24)
      let migratedFromPast = false;
      const synchronizedMembers = initialMembers.map((m) => {
        if (!m.paymentDate || m.paymentDate < currentGoogleAICycleDate) {
          migratedFromPast = true;
          let elapsedMonths = 1;
          if (m.paymentDate && m.paymentDate.length >= 7) {
            const [mYear, mMonth] = m.paymentDate.slice(0, 7).split('-').map(Number);
            const [cYear, cMonth] = currentGoogleAICycleKey.split('-').map(Number);
            if (!isNaN(mYear) && !isNaN(mMonth)) {
              elapsedMonths = Math.max(1, (cYear - mYear) * 12 + (cMonth - mMonth));
            }
          }

          const adv = m.advanceMonths || 0;
          const hadPaidPast = m.isPaid || Boolean(m.lastPaymentDate);
          const pastDate = m.lastPaymentDate || m.paymentDate || '2026-08-24';
          const pastCycle = m.lastPaidCycle || (m.paymentDate ? m.paymentDate.slice(0, 7) : '2026-08');
          const pastAmount = m.lastPaidAmount || m.amount;

          let updatedHistory: GoogleAIPaymentRecord[] = m.paymentHistory ? [...m.paymentHistory] : [];
          if (hadPaidPast && !updatedHistory.some((h) => h.cycleKey === pastCycle)) {
            updatedHistory.push({
              id: crypto.randomUUID(),
              date: pastDate,
              amount: pastAmount,
              cycleKey: pastCycle,
              type: 'regular',
              note: `August cycle payment recorded`,
            });
          }

          if (adv >= elapsedMonths) {
            return {
              ...m,
              advanceMonths: adv - elapsedMonths,
              isPaid: true,
              paymentDate: currentGoogleAICycleDate,
              lastPaymentDate: pastDate,
              lastPaidCycle: pastCycle,
              lastPaidAmount: pastAmount,
              paymentHistory: updatedHistory,
            };
          } else {
            return {
              ...m,
              advanceMonths: 0,
              isPaid: false,
              paymentDate: currentGoogleAICycleDate,
              lastPaymentDate: hadPaidPast ? pastDate : m.lastPaymentDate,
              lastPaidCycle: hadPaidPast ? pastCycle : m.lastPaidCycle,
              lastPaidAmount: hadPaidPast ? pastAmount : m.lastPaidAmount,
              paymentHistory: updatedHistory,
            };
          }
        }
        return m;
      });

      localStorage.setItem('dash_google_ai_cycleKey', currentGoogleAICycleKey);
      if (migratedFromPast) {
        localStorage.setItem('dash_google_ai_members', JSON.stringify(synchronizedMembers));
        setGoogleAICycleNotice(`Active cycle is September 24. Past payments from August have been saved to payment history.`);
      }
      setGoogleAIMembers(synchronizedMembers);

      const storedGoogleAIPlanCost = localStorage.getItem('dash_google_ai_plan_cost');
      if (storedGoogleAIPlanCost && storedGoogleAIPlanCost !== '') {
        setGoogleAIPlanCost(Number(storedGoogleAIPlanCost));
      }

      const storedTheme = localStorage.getItem('dash_theme');
      if (storedTheme === 'dark') setIsDark(true);
    });
  }, []);

  useEffect(() => {
    if (isClient) localStorage.setItem('dash_tasks', JSON.stringify(tasks));
  }, [tasks, isClient]);

  useEffect(() => {
    if (isClient) localStorage.setItem('dash_work_notes', JSON.stringify(workNotes));
  }, [workNotes, isClient]);

  useEffect(() => {
    if (isClient) localStorage.setItem('dash_workLogs', JSON.stringify(workLogs));
  }, [workLogs, isClient]);

  useEffect(() => {
    if (isClient) localStorage.setItem('dash_bills', JSON.stringify(bills));
  }, [bills, isClient]);

  useEffect(() => {
    if (isClient) localStorage.setItem('dash_dayExpenses_total', String(dayExpensesTotal));
  }, [dayExpensesTotal, isClient]);

  useEffect(() => {
    if (isClient) localStorage.setItem('dash_dayExpenses_lastReset', JSON.stringify(dayExpensesLastReset));
  }, [dayExpensesLastReset, isClient]);

  useEffect(() => {
    if (isClient) localStorage.setItem('dash_moto_profile', JSON.stringify(motoProfile));
  }, [motoProfile, isClient]);

  useEffect(() => {
    if (isClient) localStorage.setItem('dash_moto_accessories', JSON.stringify(motoAccessories));
  }, [motoAccessories, isClient]);

  useEffect(() => {
    if (isClient) localStorage.setItem('dash_moto_fuelLogs', JSON.stringify(motoFuelLogs));
  }, [motoFuelLogs, isClient]);

  useEffect(() => {
    if (isClient) localStorage.setItem('dash_moto_maintenanceLogs', JSON.stringify(motoMaintenanceLogs));
  }, [motoMaintenanceLogs, isClient]);

  useEffect(() => {
    if (isClient) localStorage.setItem('dash_moto_parkingLogs', JSON.stringify(motoParkingLogs));
  }, [motoParkingLogs, isClient]);

  useEffect(() => {
    if (isClient) localStorage.setItem('dash_monthly_total', String(monthlyExpensesTotal));
  }, [monthlyExpensesTotal, isClient]);

  useEffect(() => {
    if (!isClient) return;
    localStorage.setItem('dash_meralcoBill', meralcoBill.toString());
    localStorage.setItem('dash_meralcoBill_monthKey', getHomeCycleKey(new Date()));
  }, [meralcoBill, isClient]);

  useEffect(() => {
    if (isClient) localStorage.setItem('dash_samsungRemaining', samsungRemaining.toString());
  }, [samsungRemaining, isClient]);

  useEffect(() => {
    if (isClient) localStorage.setItem('dash_homePaid', JSON.stringify(homePaid));
  }, [homePaid, isClient]);

  useEffect(() => {
    if (isClient) localStorage.setItem('dash_theme', isDark ? 'dark' : 'light');
  }, [isDark, isClient]);

  useEffect(() => {
    if (isClient) localStorage.setItem('dash_google_ai_members', JSON.stringify(googleAIMembers));
  }, [googleAIMembers, isClient]);

  useEffect(() => {
    if (isClient) localStorage.setItem('dash_google_ai_plan_cost', String(googleAIPlanCost));
  }, [googleAIPlanCost, isClient]);

  useEffect(() => {
    if (isClient && googleAICycleKey) localStorage.setItem('dash_google_ai_cycleKey', googleAICycleKey);
  }, [googleAICycleKey, isClient]);

  useEffect(() => {
    if (!isClient) return;
    const nowIso = new Date().toISOString();
    localStorage.setItem('dash_updatedAt', nowIso);
    const snapshot = getDashSnapshot(localStorage);
    void idbSetDashboardSnapshot(snapshot);
  }, [
    tasks,
    workLogs,
    bills,
    meralcoBill,
    samsungRemaining,
    homePaid,
    isDark,
    dayExpensesTotal,
    dayExpensesLastReset,
    motoProfile,
    motoAccessories,
    motoFuelLogs,
    motoMaintenanceLogs,
    motoParkingLogs,
    googleAIMembers,
    googleAIPlanCost,
    googleAICycleKey,
    isClient,
  ]);

  const calculateLoggedHours = (inTime: string, outTime: string) => {
    if (!inTime || !outTime) return '';
    const [inH, inM] = inTime.split(':').map(Number);
    const [outH, outM] = outTime.split(':').map(Number);
    let diff = (outH * 60 + outM) - (inH * 60 + inM);
    if (diff < 0) diff += 24 * 60;
    return Number((diff / 60).toFixed(2));
  };

  const handlePayAllHomeUtilities = () => {
  const cycleKey = getHomeCycleKey(new Date());
  const remaining = samsungRemaining === '' ? 0 : Number(samsungRemaining);
  const shouldPaySamsung = remaining > 0 && homePaid.samsung !== cycleKey;

  setHomePaid((prev) => ({
    ...prev,
    meralco: cycleKey,
    wifi: cycleKey,
    ...(remaining > 0 ? { samsung: cycleKey } : {}),
  }));

  if (shouldPaySamsung) {
    const payment = Math.min(SAMSUNG_BILL, remaining);
    setSamsungRemaining(Math.max(0, remaining - payment));
  }

  // Add utilities cost to monthly total
  const utilitiesPaid = (meralcoBill ? Number(meralcoBill) : 0) + WIFI_BILL + (shouldPaySamsung ? Math.min(SAMSUNG_BILL, remaining) : 0);
  setMonthlyExpensesTotal((prev) => prev + utilitiesPaid);
};













  // --- HANDLERS ---
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    const deadline =
      newTaskDeadlineType === 'datetime'
        ? newTaskDeadline && newTaskDeadlineTime
          ? `${newTaskDeadline}T${newTaskDeadlineTime}`
          : newTaskDeadline
        : newTaskDeadline;
    const newTask: Task = {
      id: crypto.randomUUID(),
      text: newTaskText,
      description: newTaskDescription.trim() || undefined,
      deadline,
      isImportant: newTaskImportant,
      isCompleted: false,
      category: newTaskCategory,
    };
    // Keep incomplete first, sort by relevance could be added later
    setTasks([newTask, ...tasks]);
    setNewTaskText('');
    setNewTaskDescription('');
    setNewTaskDeadline('');
    setNewTaskDeadlineTime('');
    setNewTaskImportant(false);
    setNewTaskCategory('None');
  };

  const handleToggleTask = (id: string) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, isCompleted: !t.isCompleted } : t)));
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logDate || logHours === '') return;
    const hours = Number(logHours);
    const overtime = Math.max(0, hours - NORMAL_HOURS);
    const newLog: WorkLog = {
      id: crypto.randomUUID(),
      date: logDate,
      hours,
      overtime,
    };
    
    // Sort descending by date
    const sortedLogs = [...workLogs, newLog].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setWorkLogs(sortedLogs);
    setLogDate('');
    setLogHours('');
    setTimeIn('');
    setTimeOut('');
  };

  const handleAddBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBillName.trim() || !newBillDate) return;
    const newBill: Bill = {
      id: crypto.randomUUID(),
      name: newBillName,
      dueDate: newBillDate,
      repeatMonthly: newBillRepeatMonthly,
    };
    // Sort bills by due date ascending
    const updatedBills = [...bills, newBill].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    setBills(updatedBills);
    setNewBillName('');
    setNewBillDate('');
    setNewBillRepeatMonthly(false);
  };

  const handleDeleteBill = (id: string) => {
    setBills((prev) => prev.filter((b) => b.id !== id));
  };

  const handleAddDayExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (dayExpensesAmount === '') return;
    const value = Number(dayExpensesAmount);
    if (!Number.isFinite(value) || value <= 0) return;
      setDayExpensesTotal((prev) => prev + value);
      setMonthlyExpensesTotal((prev) => prev + value);
    setDayExpensesAmount('');
  };

  const handleResetDayExpenses = () => {
    const total = dayExpensesTotal;
    setDayExpensesLastReset({ total, at: new Date().toISOString() });
    setDayExpensesTotal(0);
    setDayExpensesAmount('');
    setDayExpensesCopied(false);
  };

  const handleCopyDayExpensesTotal = async () => {
    const text = String(dayExpensesTotal);
    try {
      await navigator.clipboard.writeText(text);
      setDayExpensesCopied(true);
      window.setTimeout(() => setDayExpensesCopied(false), 1200);
    } catch {
      const fallback = prompt('Copy total:', text);
      if (fallback !== null) {
        setDayExpensesCopied(true);
        window.setTimeout(() => setDayExpensesCopied(false), 1200);
      }
    }
  };

  const handleAddAccessory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccessoryName.trim() || newAccessoryPrice === '') return;
    const newItem: MotoAccessory = {
      id: crypto.randomUUID(),
      name: newAccessoryName.trim(),
      price: Number(newAccessoryPrice),
      ...(newAccessoryDate ? { date: newAccessoryDate } : {}),
    };
    setMotoAccessories((prev) => [newItem, ...prev]);
    setNewAccessoryName('');
    setNewAccessoryPrice('');
    setNewAccessoryDate('');
  };

  const handleDeleteAccessory = (id: string) => {
    setMotoAccessories((prev) => prev.filter((a) => a.id !== id));
  };

  const handleAddFuelLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFuelDate || newFuelOdometerKm === '' || newFuelCost === '') return;
    const newItem: MotoFuelLog = {
      id: crypto.randomUUID(),
      date: newFuelDate,
      odometerKm: Number(newFuelOdometerKm),
      cost: Number(newFuelCost),
      ...(newFuelLiters === '' ? {} : { liters: Number(newFuelLiters) }),
      ...(newFuelNotes.trim() ? { notes: newFuelNotes.trim() } : {}),
    };
    setMotoFuelLogs((prev) =>
      [newItem, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    );
    setNewFuelDate('');
    setNewFuelOdometerKm('');
    setNewFuelLiters('');
    setNewFuelCost('');
    setNewFuelNotes('');
  };

  const handleDeleteFuelLog = (id: string) => {
    setMotoFuelLogs((prev) => prev.filter((x) => x.id !== id));
  };

  const handleAddMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaintenanceTaskName.trim() || !newMaintenanceDatePerformed || newMaintenanceCost === '') return;
    const newItem: MotoMaintenanceLog = {
      id: crypto.randomUUID(),
      taskName: newMaintenanceTaskName.trim(),
      datePerformed: newMaintenanceDatePerformed,
      cost: Number(newMaintenanceCost),
      ...(newMaintenanceOdometerKm === '' ? {} : { odometerKm: Number(newMaintenanceOdometerKm) }),
      ...(newMaintenanceRemindDate ? { remindNextDate: newMaintenanceRemindDate } : {}),
      ...(newMaintenanceNextServiceKm === '' ? {} : { nextServiceKm: Number(newMaintenanceNextServiceKm) }),
    };
    setMotoMaintenanceLogs((prev) =>
      [newItem, ...prev].sort((a, b) => new Date(b.datePerformed).getTime() - new Date(a.datePerformed).getTime())
    );
    setNewMaintenanceTaskName('');
    setNewMaintenanceCost('');
    setNewMaintenanceDatePerformed('');
    setNewMaintenanceOdometerKm('');
    setNewMaintenanceRemindDate('');
    setNewMaintenanceNextServiceKm('');
  };

  const handleDeleteMaintenance = (id: string) => {
    setMotoMaintenanceLogs((prev) => prev.filter((x) => x.id !== id));
  };

  const handleAddParkingLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParkingDate || newParkingCost === '') return;
    const newItem: MotoParkingLog = {
      id: crypto.randomUUID(),
      date: newParkingDate,
      cost: Number(newParkingCost),
      ...(newParkingLocation.trim() ? { location: newParkingLocation.trim() } : {}),
      ...(newParkingNotes.trim() ? { notes: newParkingNotes.trim() } : {}),
    };
    setMotoParkingLogs((prev) =>
      [newItem, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    );
    setNewParkingDate('');
    setNewParkingCost('');
    setNewParkingLocation('');
    setNewParkingNotes('');
  };

  const handleDeleteParkingLog = (id: string) => {
    setMotoParkingLogs((prev) => prev.filter((x) => x.id !== id));
  };

  const advanceBillOneMonth = (bill: Bill): Bill => {
    const d = new Date(bill.dueDate + 'T00:00:00');
    d.setMonth(d.getMonth() + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return { ...bill, id: crypto.randomUUID(), dueDate: `${yyyy}-${mm}-${dd}` };
  };

  const handleAddGoogleAIMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || newMemberAmount === '' || !newMemberDate) return;
    const advMonths = Math.max(0, Number(newMemberAdvanceMonths) || 0);
    const newMember: GoogleAIMember = {
      id: crypto.randomUUID(),
      name: newMemberName.trim(),
      amount: Number(newMemberAmount),
      paymentDate: newMemberDate,
      repeatMonthly: newMemberRepeat,
      isPaid: advMonths > 0 ? true : false,
      advanceMonths: advMonths,
    };
    const updatedMembers = [...googleAIMembers, newMember].sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
    setGoogleAIMembers(updatedMembers);
    setNewMemberName('');
    setNewMemberDate(getDefaultGoogleAIDueDate());
    setNewMemberAdvanceMonths(0);
    if (advMonths > 0) {
      setGoogleAICycleNotice(`Added ${newMember.name} with ${advMonths} month(s) advance payment.`);
    }
  };

  const handleToggleMemberPaid = (id: string) => {
    setGoogleAIMembers(
      googleAIMembers.map((m) => {
        if (m.id !== id) return m;
        if (m.isPaid && (m.advanceMonths || 0) > 0) {
          if (!confirm(`${m.name} has ${m.advanceMonths} advance month(s) recorded. Mark as pending and clear their advance payment?`)) {
            return m;
          }
          return { ...m, isPaid: false, advanceMonths: 0 };
        }
        const nextPaid = !m.isPaid;
        const curCycleKey = googleAICycleKey || getGoogleAICycleKey();
        const todayStr = new Date().toISOString().slice(0, 10);

        let newHistory = m.paymentHistory ? [...m.paymentHistory] : [];
        if (nextPaid) {
          newHistory.unshift({
            id: crypto.randomUUID(),
            date: todayStr,
            amount: m.amount,
            cycleKey: curCycleKey,
            type: 'regular',
            note: `Payment recorded for ${curCycleKey} cycle`,
          });
        }

        return {
          ...m,
          isPaid: nextPaid,
          ...(nextPaid
            ? {
                lastPaymentDate: todayStr,
                lastPaidCycle: curCycleKey,
                lastPaidAmount: m.amount,
                paymentHistory: newHistory,
              }
            : {})
        };
      })
    );
  };

  const handleDeleteMember = (id: string) => {
    setGoogleAIMembers(googleAIMembers.filter((m) => m.id !== id));
  };

  const handleResetGoogleAICollections = () => {
    const curKey = googleAICycleKey || getGoogleAICycleKey();
    const currentDueDate = `${curKey}-24`;
    const todayStr = new Date().toISOString().slice(0, 10);
    const hasAdvance = googleAIMembers.some((m) => (m.advanceMonths || 0) > 0);
    if (hasAdvance) {
      const choice = confirm(
        `Reset current cycle collections for ${currentDueDate}?\n\n[OK] = Reset regular members to Pending (preserves advance payments)\n[Cancel] = Cancel`
      );
      if (!choice) return;
      setGoogleAIMembers(
        googleAIMembers.map((m) => {
          if ((m.advanceMonths || 0) > 0) return { ...m, paymentDate: currentDueDate };
          const wasPaid = m.isPaid;
          let newHistory = m.paymentHistory ? [...m.paymentHistory] : [];
          if (wasPaid && !newHistory.some((h) => h.cycleKey === curKey)) {
            newHistory.unshift({
              id: crypto.randomUUID(),
              date: m.lastPaymentDate || todayStr,
              amount: m.amount,
              cycleKey: curKey,
              type: 'regular',
              note: `Payment recorded for ${curKey} cycle`,
            });
          }
          return {
            ...m,
            isPaid: false,
            paymentDate: currentDueDate,
            lastPaymentDate: wasPaid ? (m.lastPaymentDate || todayStr) : m.lastPaymentDate,
            lastPaidCycle: wasPaid ? curKey : m.lastPaidCycle,
            lastPaidAmount: wasPaid ? m.amount : m.lastPaidAmount,
            paymentHistory: newHistory,
          };
        })
      );
      setGoogleAICycleNotice(`Current cycle reset to ${currentDueDate}. Past payments have been preserved in history.`);
    } else {
      if (confirm(`Reset collection status for all members to ${currentDueDate}?`)) {
        setGoogleAIMembers(
          googleAIMembers.map((m) => {
            const wasPaid = m.isPaid;
            let newHistory = m.paymentHistory ? [...m.paymentHistory] : [];
            if (wasPaid && !newHistory.some((h) => h.cycleKey === curKey)) {
              newHistory.unshift({
                id: crypto.randomUUID(),
                date: m.lastPaymentDate || todayStr,
                amount: m.amount,
                cycleKey: curKey,
                type: 'regular',
                note: `Payment recorded for ${curKey} cycle`,
              });
            }
            return {
              ...m,
              isPaid: false,
              paymentDate: currentDueDate,
              lastPaymentDate: wasPaid ? (m.lastPaymentDate || todayStr) : m.lastPaymentDate,
              lastPaidCycle: wasPaid ? curKey : m.lastPaidCycle,
              lastPaidAmount: wasPaid ? m.amount : m.lastPaidAmount,
              paymentHistory: newHistory,
            };
          })
        );
        setGoogleAICycleNotice(`All members marked pending for ${currentDueDate}. Past payments preserved in history.`);
      }
    }
  };

  const handleSyncToCurrentCycle = () => {
    const curKey = googleAICycleKey || getGoogleAICycleKey();
    const currentDueDate = `${curKey}-24`;

    setGoogleAIMembers(
      googleAIMembers.map((m) => {
        const adv = m.advanceMonths || 0;
        return {
          ...m,
          paymentDate: currentDueDate,
          isPaid: adv > 0 ? true : false,
        };
      })
    );
    setGoogleAICycleNotice(`All members synchronized to active cycle due date: ${currentDueDate}.`);
  };

  const handleAdvanceGoogleAICycle = () => {
    const curKey = googleAICycleKey || getGoogleAICycleKey();
    const [curY, curM] = curKey.split('-').map(Number);
    const nextDate = new Date(curY, curM, 1);
    const nextKey = getMonthKey(nextDate);

    if (
      !confirm(
        `Advance billing cycle to next month (${nextKey}, 24th)?\n\n• Members with advance payments will have 1 advance month deducted and remain Collected.\n• Members with 0 advance months will reset to Pending.\n• Due dates will update to ${nextKey}-24.`
      )
    ) {
      return;
    }

    let advancedKeptCount = 0;
    const rolledMembers = googleAIMembers.map((m) => {
      const adv = m.advanceMonths || 0;
      const wasPaid = m.isPaid;
      let newHistory = m.paymentHistory ? [...m.paymentHistory] : [];
      if (wasPaid && !newHistory.some((h) => h.cycleKey === curKey)) {
        newHistory.unshift({
          id: crypto.randomUUID(),
          date: m.lastPaymentDate || `${curKey}-24`,
          amount: m.amount,
          cycleKey: curKey,
          type: 'regular',
          note: `Payment recorded for ${curKey} cycle`,
        });
      }

      if (adv > 0) {
        advancedKeptCount++;
        return {
          ...m,
          advanceMonths: adv - 1,
          isPaid: true,
          paymentDate: `${nextKey}-24`,
          lastPaymentDate: m.lastPaymentDate || `${curKey}-24`,
          lastPaidCycle: curKey,
          lastPaidAmount: m.amount,
          paymentHistory: newHistory,
        };
      }
      return {
        ...m,
        advanceMonths: 0,
        isPaid: false,
        paymentDate: `${nextKey}-24`,
        lastPaymentDate: wasPaid ? (m.lastPaymentDate || `${curKey}-24`) : m.lastPaymentDate,
        lastPaidCycle: wasPaid ? curKey : m.lastPaidCycle,
        lastPaidAmount: wasPaid ? m.amount : m.lastPaidAmount,
        paymentHistory: newHistory,
      };
    });

    setGoogleAICycleKey(nextKey);
    setGoogleAIMembers(rolledMembers);
    setGoogleAICycleNotice(`Advanced cycle to ${nextKey} (24th). ${advancedKeptCount} member(s) with advance payments remained paid.`);
  };

  const handleMarkAllGoogleAIPaid = () => {
    if (confirm('Mark all members as collected for this cycle?')) {
      const curCycleKey = googleAICycleKey || getGoogleAICycleKey();
      const todayStr = new Date().toISOString().slice(0, 10);
      setGoogleAIMembers(
        googleAIMembers.map((m) => {
          let newHistory = m.paymentHistory ? [...m.paymentHistory] : [];
          if (!newHistory.some((h) => h.cycleKey === curCycleKey)) {
            newHistory.unshift({
              id: crypto.randomUUID(),
              date: todayStr,
              amount: m.amount,
              cycleKey: curCycleKey,
              type: 'regular',
              note: `Marked collected for ${curCycleKey}`,
            });
          }
          return {
            ...m,
            isPaid: true,
            lastPaymentDate: todayStr,
            lastPaidCycle: curCycleKey,
            lastPaidAmount: m.amount,
            paymentHistory: newHistory,
          };
        })
      );
    }
  };

  const handleSaveAdvancePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!advanceModalMember) return;
    const months = Math.max(1, Number(advanceInputMonths) || 1);
    const curCycleKey = googleAICycleKey || getGoogleAICycleKey();
    const todayStr = new Date().toISOString().slice(0, 10);
    const advAmount = months * advanceModalMember.amount;

    setGoogleAIMembers((prev) =>
      prev.map((m) => {
        if (m.id !== advanceModalMember.id) return m;
        const newHistory = m.paymentHistory ? [...m.paymentHistory] : [];
        newHistory.unshift({
          id: crypto.randomUUID(),
          date: todayStr,
          amount: advAmount,
          cycleKey: curCycleKey,
          type: 'advance',
          note: `Prepaid ${months} month(s) ahead`,
        });

        return {
          ...m,
          isPaid: true,
          advanceMonths: months,
          lastPaymentDate: todayStr,
          lastPaidCycle: curCycleKey,
          lastPaidAmount: advAmount,
          paymentHistory: newHistory,
        };
      })
    );
    setGoogleAICycleNotice(`Recorded ${months} month(s) advance payment for ${advanceModalMember.name}.`);
    setAdvanceModalMember(null);
  };

  const handleClearAdvancePayment = (id: string) => {
    setGoogleAIMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, advanceMonths: 0 } : m))
    );
    setAdvanceModalMember(null);
  };

  const handleEditMember = (member: GoogleAIMember) => {
    const nextName = prompt('Edit member name:', member.name);
    if (nextName === null) return;
    if (!nextName.trim()) return;

    const nextAmountStr = prompt('Edit monthly payment amount:', String(member.amount));
    if (nextAmountStr === null) return;
    const nextAmount = Number(nextAmountStr);
    if (isNaN(nextAmount) || nextAmount < 0) return;

    const nextDate = prompt('Edit next payment date (YYYY-MM-DD):', member.paymentDate);
    if (nextDate === null) return;
    if (!nextDate.trim()) return;

    const nextAdvanceStr = prompt('Edit advance months (0 for none):', String(member.advanceMonths || 0));
    if (nextAdvanceStr === null) return;
    const nextAdvance = Math.max(0, parseInt(nextAdvanceStr, 10) || 0);

    setGoogleAIMembers((prev) =>
      prev.map((m) =>
        m.id === member.id
          ? {
              ...m,
              name: nextName.trim(),
              amount: nextAmount,
              paymentDate: nextDate.trim(),
              advanceMonths: nextAdvance,
              isPaid: nextAdvance > 0 ? true : m.isPaid,
            }
          : m
      ).sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime())
    );
  };

  // --- RENDERERS ---
  const renderTasksTab = () => {
    const activeTasksCount = tasks.filter(t => !t.isCompleted).length;
    const completedTasksCount = tasks.filter(t => t.isCompleted).length;
    const getDeadlineTs = (d: string): number | null => {
      if (!d) return null;
      // Time-only HH:MM — treat as today at that time
      if (/^\d{2}:\d{2}$/.test(d)) {
        const [h, m] = d.split(':').map(Number);
        const now = new Date(); now.setHours(h, m, 0, 0); return now.getTime();
      }
      const date = new Date(d.length <= 10 ? d + 'T00:00:00' : d);
      return isNaN(date.getTime()) ? null : date.getTime();
    };

    const sortedTasks = tasks
      .filter(t => filterCategory === 'All' || t.category === filterCategory)
      .slice()
      .sort((a, b) => {
        const aTs = getDeadlineTs(a.deadline);
        const bTs = getDeadlineTs(b.deadline);
        if (aTs !== null && bTs !== null) return aTs - bTs;
        if (aTs !== null) return -1;
        if (bTs !== null) return 1;
        
        // Neither has a deadline, sort by importance
        if (a.isImportant && !b.isImportant) return -1;
        if (!a.isImportant && b.isImportant) return 1;
        return 0;
      });

    const activeTasks = sortedTasks.filter(t => !t.isCompleted);
    const archivedTasks = sortedTasks.filter(t => t.isCompleted);

    return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Summary Card */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border border-black p-6 flex flex-col justify-center items-center bg-white text-black">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Active Tasks</p>
          <p className="text-4xl font-extrabold">{activeTasksCount}</p>
        </div>
        <div className="border border-black p-6 flex flex-col justify-center items-center bg-black text-white">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">Completed Tasks</p>
          <p className="text-4xl font-extrabold">{completedTasksCount}</p>
        </div>
        <div className="border border-black p-6 flex flex-col justify-center items-center bg-white text-black">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Monthly Expenses</p>
          <p className="text-4xl font-extrabold">{formatPHP(monthlyExpensesTotal)}</p>
        </div>
      </div>

      {/* Add Task Form */}
      <form onSubmit={handleAddTask} className="border border-black p-6 bg-white space-y-4">
        <h2 className="text-lg font-extrabold uppercase tracking-tight border-b border-black pb-2 mb-4">New Task</h2>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-5">
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 opacity-70">Task</label>
            <input 
              type="text" 
              value={newTaskText} 
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full border border-black px-4 py-3 focus:outline-none focus:bg-neutral-50 placeholder-neutral-400 text-sm font-semibold"
              required
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 opacity-70">Category</label>
            <select 
              value={newTaskCategory}
              onChange={(e) => setNewTaskCategory(e.target.value as TaskCategory)}
              className="w-full border border-black px-4 py-3 focus:outline-none focus:bg-neutral-50 text-sm font-semibold appearance-none bg-white rounded-none m-0"
            >
              <option value="None">None</option>
              <option value="Work">Work</option>
              <option value="Personal">Personal</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 opacity-70">Deadline</label>
            {/* Type toggle */}
            <div className="flex mb-2">
              {(['date', 'datetime'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setNewTaskDeadlineType(t);
                    setNewTaskDeadline('');
                    setNewTaskDeadlineTime('');
                  }}
                  className={`flex-1 py-1 text-[9px] font-bold uppercase tracking-wider border border-black transition-colors ${
                    newTaskDeadlineType === t ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
                  } ${t === 'date' ? 'border-r-0' : ''}`}
                >
                  {t === 'date' ? 'Date Only' : 'Date & Time'}
                </button>
              ))}
            </div>
            {newTaskDeadlineType === 'datetime' ? (
              <div className="space-y-2">
                <input
                  type="date"
                  value={newTaskDeadline}
                  onChange={(e) => setNewTaskDeadline(e.target.value)}
                  className="w-full border border-black px-4 py-3 focus:outline-none focus:bg-neutral-50 uppercase text-xs font-semibold"
                />
                <div className="space-y-1">
                  <input
                    type="time"
                    value={newTaskDeadlineTime}
                    onChange={(e) => setNewTaskDeadlineTime(e.target.value)}
                    className="w-full border border-black px-4 py-3 focus:outline-none focus:bg-neutral-50 uppercase text-xs font-semibold"
                  />
                  {newTaskDeadlineTime && (
                    <span className="text-[10px] text-neutral-600 font-semibold px-1 block">
                      Time: {formatTime12Hour(newTaskDeadlineTime)}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <input
                type="date"
                value={newTaskDeadline}
                onChange={(e) => setNewTaskDeadline(e.target.value)}
                className="w-full border border-black px-4 py-3 focus:outline-none focus:bg-neutral-50 uppercase text-xs font-semibold"
              />
            )}
            {/* Live Busy Status Indicator */}
            {newTaskDeadline && (() => {
              const busyInfo = checkDateBusyStatus(newTaskDeadline, tasks, workNotes);
              return (
                <div className="mt-2">
                  {busyInfo.isBusy ? (
                    <div className="border border-red-600 bg-red-50 p-2 text-red-900 text-xs font-semibold">
                      <div className="flex items-center gap-1.5 font-extrabold text-[10px] uppercase tracking-wider text-red-700">
                        <span className="w-2 h-2 rounded-full bg-red-600 shrink-0 animate-pulse" />
                        <span>🔴 BUSY DAY</span>
                      </div>
                      <p className="text-[10px] text-red-800 font-bold mt-0.5">
                        {busyInfo.busyReason}
                      </p>
                    </div>
                  ) : (
                    <div className="border border-green-600 bg-green-50 p-1.5 text-green-900 text-xs font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-600 shrink-0" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-green-700">
                        🟢 FREE / AVAILABLE
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          <div className="md:col-span-2 flex flex-col justify-end pb-2">
            <label className="flex items-center space-x-2 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={newTaskImportant}
                onChange={(e) => setNewTaskImportant(e.target.checked)}
                className="w-5 h-5 border-black appearance-none border checked:bg-black checked:relative 
                  after:content-[''] after:absolute after:hidden checked:after:block after:left-[5px] 
                  after:top-[1px] after:w-[6px] after:h-[10px] after:border-white after:border-r-2 
                  after:border-b-2 after:rotate-45"
              />
              <span className="text-[10px] font-bold uppercase tracking-wider group-hover:underline select-none">Important</span>
            </label>
          </div>
        </div>
        {/* Description row */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 opacity-70">Notes / Description <span className="opacity-50 normal-case font-semibold tracking-normal">(optional)</span></label>
          <textarea
            value={newTaskDescription}
            onChange={(e) => setNewTaskDescription(e.target.value)}
            placeholder="Add any extra details..."
            rows={2}
            className="w-full border border-black px-4 py-3 focus:outline-none focus:bg-neutral-50 placeholder-neutral-400 text-sm font-semibold resize-none"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button type="submit" className="w-full sm:w-auto bg-black text-white px-8 py-3 text-[10px] font-bold uppercase tracking-widest hover:opacity-80 transition-opacity flex items-center justify-center space-x-2">
            <Plus size={16} /> <span>Submit Task</span>
          </button>
          <button 
            type="button" 
            onClick={() => setActiveTab('calendar')}
            className="w-full sm:w-auto border border-black bg-white text-black px-6 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-100 transition-colors flex items-center justify-center space-x-2"
          >
            <CalendarDays size={14} /> <span>Open Calendar</span>
          </button>
        </div>
      </form>

      {/* Task List */}
      <div className="border border-black bg-white">
        <div className="border-b border-black p-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-extrabold uppercase tracking-tight">Tasks Queue</h2>
            <button
              type="button"
              onClick={() => setActiveTab('calendar')}
              className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 border border-black hover:bg-black hover:text-white transition-colors flex items-center gap-1"
            >
              <CalendarDays size={11} /> <span>Calendar View</span>
            </button>
          </div>
          {/* Filtering UI */}
          <div className="flex gap-2 text-[10px] font-bold uppercase tracking-widest overflow-x-auto hide-scrollbar pb-1 md:pb-0">
            {['All', 'Work', 'Personal', 'Urgent'].map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCategory(cat as any)}
                className={`px-3 py-1 border border-black transition-colors shrink-0 ${filterCategory === cat ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="relative min-h-[100px]">
          <ul className="divide-y divide-black/10 flex flex-col">
            <AnimatePresence mode="popLayout">
              {activeTasks.length === 0 ? (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-12 text-center text-neutral-500 uppercase tracking-widest text-sm font-bold absolute w-full"
                >
                  No tasks found.
                </motion.div>
              ) : (
                activeTasks.map((task) => (
                  <motion.li 
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    key={task.id} 
                    className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:bg-neutral-50 border-b border-black/10">
                    <div className="flex items-start space-x-4">
                      <button onClick={() => handleToggleTask(task.id)} className="mt-1 focus:outline-none shrink-0" aria-label="Toggle Completion">
                        <Circle size={20} className="text-black" />
                      </button>
                      <div className="space-y-1">
                        <p className="text-sm font-bold leading-tight text-black">
                          {task.text}
                          {task.category !== 'None' && (
                            <span className="inline-block ml-3 px-2 py-0.5 border border-black text-[10px] font-bold uppercase tracking-wider text-black align-middle scale-90">
                              {task.category}
                            </span>
                          )}
                          {task.isImportant && (
                            <span className="inline-block ml-2 px-2 py-0.5 bg-black text-white border border-black text-[10px] font-bold uppercase tracking-wider align-middle scale-90">
                              Important
                            </span>
                          )}
                        </p>
                        {task.startDate && task.endDate && task.startDate !== task.endDate ? (
                          <p className="text-[10px] uppercase font-semibold opacity-70 flex items-center mt-1">
                            Event Range: {task.startDate} → {task.endDate}
                          </p>
                        ) : task.deadline ? (
                          <p className="text-[10px] uppercase font-semibold opacity-70 flex items-center mt-1">
                            Due: {formatDate(task.deadline)}
                          </p>
                        ) : null}
                        {task.description && (
                          <p className="text-xs text-neutral-500 mt-1 leading-relaxed font-normal max-w-prose whitespace-pre-wrap">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="self-end sm:self-center flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const nextText = prompt('Edit task name:', task.text);
                          if (nextText === null) return;
                          if (!nextText.trim()) return;

                          const nextDescription = prompt('Edit description (optional):', task.description || '');
                          if (nextDescription === null) return;

                          const currentDate = task.deadline ? task.deadline.split('T')[0] : '';
                          const currentTime = task.deadline && task.deadline.includes('T') ? task.deadline.split('T')[1] : '';
                          const nextDate = prompt('Edit deadline date (YYYY-MM-DD). Leave blank to clear:', currentDate);
                          if (nextDate === null) return;
                          const nextTime = nextDate.trim()
                            ? prompt(
                                'Edit deadline time (e.g. 2:00 PM or 14:00). Leave blank for date-only:',
                                currentTime ? formatTime12Hour(currentTime) : ''
                              )
                            : '';
                          if (nextTime === null) return;

                          const parsedTime = nextTime.trim() ? parseTimeToStandard(nextTime.trim()) : '';
                          const nextDeadline = nextDate.trim()
                            ? parsedTime
                              ? `${nextDate.trim()}T${parsedTime}`
                              : nextDate.trim()
                            : '';

                          setTasks((prev) =>
                            prev.map((t) =>
                              t.id === task.id
                                ? {
                                    ...t,
                                    text: nextText.trim(),
                                    description: nextDescription.trim() ? nextDescription : undefined,
                                    deadline: nextDeadline,
                                  }
                                : t
                            )
                          );
                        }}
                        className="p-2 opacity-50 hover:opacity-100 transition-opacity"
                        aria-label="Edit task"
                        title="Edit task"
                      >
                        <Pencil size={16} />
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleDeleteTask(task.id)} 
                        className="p-2 opacity-50 hover:opacity-100 transition-opacity"
                        aria-label="Delete task"
                        title="Delete task"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.li>
                ))
              )}
            </AnimatePresence>
          </ul>
        </div>

        {/* Collapsible Archive Section */}
        {archivedTasks.length > 0 && (
          <div className="border-t border-black bg-neutral-50">
            <button
              type="button"
              onClick={() => setShowArchive(!showArchive)}
              className="w-full flex items-center justify-between p-4 sm:p-6 text-xs font-bold uppercase tracking-widest hover:bg-neutral-100 transition-colors focus:outline-none"
            >
              <span className="flex items-center gap-2">
                <CheckCircle size={16} />
                Archived / Completed ({archivedTasks.length})
              </span>
              <span>{showArchive ? 'Hide' : 'Show'}</span>
            </button>
            
            {showArchive && (
              <ul className="divide-y divide-black/10 border-t border-black flex flex-col bg-white">
                <AnimatePresence mode="popLayout">
                  {archivedTasks.map((task) => (
                    <motion.li 
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      key={task.id} 
                      className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:bg-neutral-50 border-b border-black/10 opacity-50 grayscale"
                    >
                      <div className="flex items-start space-x-4">
                        <button onClick={() => handleToggleTask(task.id)} className="mt-1 focus:outline-none shrink-0" aria-label="Toggle Completion">
                          <CheckCircle size={20} className="text-black" />
                        </button>
                        <div className="space-y-1">
                          <p className="text-sm font-bold leading-tight text-black line-through">
                            {task.text}
                            {task.category !== 'None' && (
                              <span className="inline-block ml-3 px-2 py-0.5 border border-black text-[10px] font-bold uppercase tracking-wider text-black align-middle scale-90">
                                {task.category}
                              </span>
                            )}
                          </p>
                          {task.startDate && task.endDate && task.startDate !== task.endDate ? (
                            <p className="text-[10px] uppercase font-semibold opacity-70 flex items-center mt-1">
                              Event Range: {task.startDate} → {task.endDate}
                            </p>
                          ) : task.deadline ? (
                            <p className="text-[10px] uppercase font-semibold opacity-70 flex items-center mt-1">
                              Due: {formatDate(task.deadline)}
                            </p>
                          ) : null}
                          {task.description && (
                            <p className="text-xs text-neutral-500 mt-1 leading-relaxed font-normal max-w-prose whitespace-pre-wrap">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="self-end sm:self-center flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const nextText = prompt('Edit task name:', task.text);
                            if (nextText === null) return;
                            if (!nextText.trim()) return;

                            const nextDescription = prompt('Edit description (optional):', task.description || '');
                            if (nextDescription === null) return;

                            const currentDate = task.deadline ? task.deadline.split('T')[0] : '';
                            const currentTime = task.deadline && task.deadline.includes('T') ? task.deadline.split('T')[1] : '';
                            const nextDate = prompt('Edit deadline date (YYYY-MM-DD). Leave blank to clear:', currentDate);
                            if (nextDate === null) return;
                            const nextTime = nextDate.trim()
                              ? prompt(
                                  'Edit deadline time (e.g. 2:00 PM or 14:00). Leave blank for date-only:',
                                  currentTime ? formatTime12Hour(currentTime) : ''
                                )
                              : '';
                            if (nextTime === null) return;

                            const parsedTime = nextTime.trim() ? parseTimeToStandard(nextTime.trim()) : '';
                            const nextDeadline = nextDate.trim()
                              ? parsedTime
                                ? `${nextDate.trim()}T${parsedTime}`
                                : nextDate.trim()
                              : '';

                            setTasks((prev) =>
                              prev.map((t) =>
                                t.id === task.id
                                  ? {
                                      ...t,
                                      text: nextText.trim(),
                                      description: nextDescription.trim() ? nextDescription : undefined,
                                      deadline: nextDeadline,
                                    }
                                  : t
                              )
                            );
                          }}
                          className="p-2 opacity-50 hover:opacity-100 transition-opacity"
                          aria-label="Edit task"
                          title="Edit task"
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDeleteTask(task.id)} 
                          className="p-2 opacity-50 hover:opacity-100 transition-opacity"
                          aria-label="Delete task"
                          title="Delete task"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
  };

  const renderOvertimeTab = () => {
    const totalOvertime = workLogs.reduce((acc, log) => acc + log.overtime, 0);

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-1 border-2 border-black p-8 bg-black text-white flex flex-col justify-center items-center text-center">
            <h3 className="text-[10px] font-bold uppercase text-white/50 mb-2">Accumulated Overtime</h3>
            <div className="text-5xl font-extrabold tracking-tighter mt-4">{formatHM(totalOvertime)} <span className="text-xl">hrs</span></div>
          </div>

          <form onSubmit={handleAddLog} className="lg:col-span-2 border-2 border-black p-6 bg-white space-y-6 flex flex-col">
            <h2 className="text-lg font-extrabold uppercase tracking-tight mb-2 border-b border-black pb-2">Log Working Hours</h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 flex-grow">
              <div className="sm:col-span-1 sm:border-r border-black/10 sm:pr-4">
                <label className="block text-[10px] font-bold uppercase mb-2 opacity-70">Work Date</label>
                <input 
                  type="date" 
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="w-full border border-black px-3 py-2 focus:outline-none focus:bg-neutral-50 uppercase text-xs font-semibold"
                  required
                />
              </div>
              <div className="sm:col-span-1 sm:border-r border-black/10 sm:px-4">
                <label className="block text-[10px] font-bold uppercase mb-2 opacity-70">
                  Time In {timeIn ? `• ${formatTime12Hour(timeIn)}` : ''}
                </label>
                <input 
                  type="time" 
                  value={timeIn}
                  onChange={(e) => {
                    const next = e.target.value;
                    setTimeIn(next);
                    const hours = calculateLoggedHours(next, timeOut);
                    if (hours !== '') setLogHours(hours);
                  }}
                  className="w-full border border-black px-3 py-2 focus:outline-none focus:bg-neutral-50 uppercase text-xs font-semibold"
                />
              </div>
              <div className="sm:col-span-1 sm:border-r border-black/10 sm:px-4">
                <label className="block text-[10px] font-bold uppercase mb-2 opacity-70">
                  Time Out {timeOut ? `• ${formatTime12Hour(timeOut)}` : ''}
                </label>
                <input 
                  type="time" 
                  value={timeOut}
                  onChange={(e) => {
                    const next = e.target.value;
                    setTimeOut(next);
                    const hours = calculateLoggedHours(timeIn, next);
                    if (hours !== '') setLogHours(hours);
                  }}
                  className="w-full border border-black px-3 py-2 focus:outline-none focus:bg-neutral-50 uppercase text-xs font-semibold"
                />
              </div>
              <div className="sm:col-span-1 sm:pl-4">
                <label className="block text-[10px] font-bold uppercase mb-2 opacity-70 text-center">Log (Hrs)</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  max="24"
                  value={logHours}
                  onChange={(e) => setLogHours(e.target.value !== '' ? Number(e.target.value) : '')}
                  placeholder={`Base: ${NORMAL_HOURS}h`}
                  className="w-full border border-black px-3 py-2 focus:outline-none focus:bg-neutral-50 font-semibold text-center"
                  required
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between pt-4 mt-auto">
              <span className="text-[10px] opacity-50 uppercase font-bold tracking-wider">
                Standard Baseline: {NORMAL_HOURS} hrs/day
              </span>
              <button type="submit" className="w-full sm:w-auto bg-black text-white px-6 py-2 text-[10px] font-bold uppercase tracking-widest hover:opacity-80 transition-opacity">
                Confirm Log
              </button>
            </div>
          </form>

        </div>

        {/* History Table */}
        <div className="border border-black bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-black p-6 py-4">
            <h2 className="text-lg font-extrabold uppercase tracking-tight">Logging History</h2>
            <button 
              type="button"
              onClick={() => { if(confirm('Clear all historical logs?')) setWorkLogs([]) }}
              className="text-[10px] font-bold uppercase text-black flex items-center hover:underline bg-white px-3 py-1 border border-black"
            >
              Reset
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-black text-[10px] font-extrabold uppercase tracking-tight bg-white">
                  <th className="p-4 sm:p-6 w-1/3">Date</th>
                  <th className="p-4 sm:p-6 w-1/3 text-center">Hours Logged</th>
                  <th className="p-4 sm:p-6 w-1/3 text-right">Overtime Earned</th>
                </tr>
              </thead>
              <tbody className="text-sm font-semibold">
                {workLogs.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-12 text-center text-neutral-400 font-sans uppercase text-[10px] font-bold tracking-widest">No hours recorded.</td>
                  </tr>
                ) : (
                  workLogs.map((log) => (
                    <tr key={log.id} className="border-b border-black/10 hover:bg-neutral-50 transition-colors">
                      <td className="p-4 sm:p-6">{formatDate(log.date)}</td>
                      <td className="p-4 sm:p-6 text-center">{formatHM(log.hours)} <span className="opacity-50 text-[10px]">hrs</span></td>
                      <td className="p-4 sm:p-6 text-right font-extrabold">
                        {log.overtime > 0 ? (
                          <span>
                            +{formatHM(log.overtime)} hrs
                          </span>
                        ) : (
                          <span className="opacity-30">--</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderFinanceTab = () => {
    const meralcoNumeric = meralcoBill === '' ? 0 : Number(meralcoBill);
    const samsungRemainingNumeric = samsungRemaining === '' ? 0 : Number(samsungRemaining);
    const samsungPaymentDue = samsungRemainingNumeric > 0 ? Math.min(SAMSUNG_BILL, samsungRemainingNumeric) : 0;
    const totalUtilities = meralcoNumeric + WIFI_BILL + samsungPaymentDue;

    const dueDate = getNextDueDate(25);
    const currentHomeCycleKey = getHomeCycleKey(new Date());
    const isMeralcoPaid = homePaid.meralco === currentHomeCycleKey;
    const isWifiPaid = homePaid.wifi === currentHomeCycleKey;
    const isSamsungPaid = homePaid.samsung === currentHomeCycleKey;
    const allUtilitiesPaid = isMeralcoPaid && isWifiPaid && (samsungPaymentDue <= 0 || isSamsungPaid);

    // Prepare pie chart data
    const expensesData = [
      ...(meralcoNumeric > 0 ? [{ name: 'Meralco', value: meralcoNumeric }] : []),
      { name: 'WiFi', value: WIFI_BILL },
      ...(samsungPaymentDue > 0 ? [{ name: 'Samsung', value: samsungPaymentDue }] : []),
      ...bills.flatMap((b) => (typeof b.amount === 'number' && b.amount > 0 ? [{ name: b.name, value: b.amount }] : []))
    ];

    const COLORS = ['#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#E5E5E5'];

    return (
      <div className="space-y-8 animate-in fade-in duration-500">

        {/* Home Utilities */}
        <div className="border border-black flex flex-col md:flex-row shadow-none">
          <div className="bg-white p-8 sm:p-10 flex-grow border-b md:border-b-0 md:border-r border-black">
            <div className="flex items-start justify-between gap-4 mb-6 pb-2 border-b border-black">
              <div>
                <h2 className="text-xl font-extrabold uppercase tracking-tight">
                  Home Utilities & Fixed Costs
                </h2>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mt-1">
                  Monthly • Resets every 20th • Due every 25th
                </p>
              </div>
              <button
                type="button"
                onClick={handlePayAllHomeUtilities}
                disabled={allUtilitiesPaid}
                className={`px-4 py-2 border border-black text-[10px] font-bold uppercase tracking-widest transition-colors shrink-0 ${allUtilitiesPaid ? 'bg-black text-white opacity-60' : 'bg-white text-black hover:bg-black hover:text-white'}`}
              >
                {allUtilitiesPaid ? 'Paid' : 'Mark All Paid'}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider opacity-50 mb-2">Meralco (Variable)</label>
                <div className="flex items-center">
                  <span className="text-lg font-extrabold mr-2">₱</span>
                  <input 
                    type="number" 
                    value={meralcoBill}
                    onChange={(e) => setMeralcoBill(e.target.value !== '' ? Number(e.target.value) : '')}
                    className="w-full bg-transparent border-b-2 border-black/20 px-0 py-1 text-xl font-extrabold focus:outline-none focus:border-black transition-colors placeholder-black/20"
                    placeholder="0.00"
                  />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-50">Due: {formatDate(dueDate.toISOString().slice(0, 10))}</span>
                  <span className={`px-2 py-0.5 border border-black text-[10px] font-bold uppercase tracking-wider ${isMeralcoPaid ? 'bg-black text-white' : 'bg-white text-black'}`}>
                    {isMeralcoPaid ? 'Paid' : 'Unpaid'}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider opacity-50 mb-2">WiFi (Fixed)</label>
                <div className="flex items-center border-b-2 border-transparent py-1">
                  <span className="text-lg font-extrabold mr-2 opacity-50">₱</span>
                  <span className="text-xl font-extrabold">{WIFI_BILL.toFixed(2)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-50">Due: {formatDate(dueDate.toISOString().slice(0, 10))}</span>
                  <span className={`px-2 py-0.5 border border-black text-[10px] font-bold uppercase tracking-wider ${isWifiPaid ? 'bg-black text-white' : 'bg-white text-black'}`}>
                    {isWifiPaid ? 'Paid' : 'Unpaid'}
                  </span>
                </div>
              </div>
              {samsungPaymentDue > 0 ? (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-50 mb-2">Samsung (Debt)</label>
                  <div className="flex items-center border-b-2 border-transparent py-1">
                    <span className="text-lg font-extrabold mr-2 opacity-50">₱</span>
                    <span className="text-xl font-extrabold">{samsungPaymentDue.toFixed(2)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-50">Remaining: {formatPHP(samsungRemainingNumeric)}</span>
                    <span className={`px-2 py-0.5 border border-black text-[10px] font-bold uppercase tracking-wider ${isSamsungPaid ? 'bg-black text-white' : 'bg-white text-black'}`}>
                      {isSamsungPaid ? 'Paid' : 'Unpaid'}
                    </span>
                  </div>
                  <div className="mt-4">
                    <label className="block text-[10px] font-bold uppercase tracking-wider opacity-50 mb-2">Set Remaining Balance</label>
                    <div className="flex items-center">
                      <span className="text-lg font-extrabold mr-2 opacity-50">₱</span>
                      <input
                        type="number"
                        value={samsungRemaining}
                        onChange={(e) => setSamsungRemaining(e.target.value !== '' ? Number(e.target.value) : '')}
                        className="w-full bg-transparent border-b-2 border-black/20 px-0 py-1 text-lg font-extrabold focus:outline-none focus:border-black transition-colors placeholder-black/20"
                        placeholder={SAMSUNG_START_BALANCE.toString()}
                        min={0}
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <div className="bg-neutral-100 text-black p-8 sm:p-10 shrink-0 flex flex-col justify-center min-w-[300px]">
             <label className="block text-[10px] font-bold uppercase tracking-wider opacity-70 mb-2 border-b border-black/20 pb-2">Total Monthly Utilities</label>
             <div className="text-3xl sm:text-4xl font-extrabold tracking-tighter mt-2 break-all">
               {formatPHP(totalUtilities)}
             </div>
          </div>
        </div>

        <div className="border border-black flex flex-col md:flex-row shadow-none">
          <div className="bg-white p-8 sm:p-10 flex-grow border-b md:border-b-0 md:border-r border-black">
            <h2 className="text-xl font-extrabold uppercase tracking-tight mb-6 pb-2 border-b border-black">
              Day Expenses Tracker
            </h2>
            <form onSubmit={handleAddDayExpense} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider opacity-50 mb-2">Amount (₱)</label>
                <input
                  type="number"
                  value={dayExpensesAmount}
                  onChange={(e) => setDayExpensesAmount(e.target.value !== '' ? Number(e.target.value) : '')}
                  className="w-full border border-black px-4 py-3 focus:outline-none focus:bg-neutral-50 text-sm font-semibold"
                  placeholder="0.00"
                  min={0}
                  step="0.01"
                  required
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-black text-white px-6 py-3 text-[10px] font-bold uppercase tracking-widest hover:opacity-80 transition-opacity"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={handleCopyDayExpensesTotal}
                  className={`flex-1 border border-black px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors ${dayExpensesCopied ? 'bg-black text-white' : 'bg-white text-black hover:bg-black hover:text-white'}`}
                >
                  {dayExpensesCopied ? 'Copied' : 'Copy Total'}
                </button>
                <button
                  type="button"
                  onClick={handleResetDayExpenses}
                  className="flex-1 border border-black bg-white text-black px-6 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-100 transition-colors"
                >
                  Reset
                </button>
              </div>
            </form>

            {dayExpensesLastReset && (
              <div className="mt-6 border border-black p-4 bg-neutral-50">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Last Reset</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-bold">{formatDate(dayExpensesLastReset.at)}</span>
                  <span className="text-sm font-extrabold">{formatPHP(dayExpensesLastReset.total)}</span>
                </div>
              </div>
            )}
          </div>
          <div className="bg-black text-white p-8 sm:p-10 shrink-0 flex flex-col justify-center min-w-[300px]">
            <label className="block text-[10px] font-bold uppercase tracking-wider opacity-70 mb-2 border-b border-white/20 pb-2">
              Current Total (Since Last Reset)
            </label>
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tighter mt-2 break-all">
              {formatPHP(dayExpensesTotal)}
            </div>
          </div>
        </div>

        {/* Expenses Breakdown */}
        {expensesData.length > 0 && (
        <div className="border border-black bg-white shadow-none">
           <h2 className="text-lg font-extrabold uppercase tracking-tight border-b border-black p-6 py-4 bg-neutral-100">
             Monthly Allocation Breakdown
           </h2>
           <div className="h-64 sm:h-80 w-full p-4 flex justify-center items-center">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={expensesData}
                   cx="50%"
                   cy="50%"
                   innerRadius={60}
                   outerRadius={80}
                   paddingAngle={2}
                   dataKey="value"
                   label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                   labelLine={false}
                   style={{ fontSize: '10px', fontWeight: 'bold' }}
                 >
                   {expensesData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <Tooltip 
                   formatter={(value: any) => formatPHP(Number(value))}
                   contentStyle={{ backgroundColor: '#fff', border: '2px solid #000', borderRadius: 0, fontSize: '12px', fontWeight: 'bold' }}
                   itemStyle={{ color: '#000', fontWeight: 'bold' }}
                 />
               </PieChart>
             </ResponsiveContainer>
           </div>
        </div>
        )}

        {/* Bills Tracker */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <form onSubmit={handleAddBill} className="lg:col-span-5 border border-black p-6 bg-white space-y-6 self-start shadow-none">
             <h2 className="text-lg font-extrabold uppercase tracking-tight border-b border-black pb-2">Schedule Bill</h2>
             
             <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider opacity-70 mb-2">Bill Name / Payee</label>
                <input 
                  type="text" 
                  value={newBillName}
                  onChange={(e) => setNewBillName(e.target.value)}
                  className="w-full border border-black px-4 py-3 focus:outline-none focus:bg-neutral-50 text-sm font-semibold"
                  placeholder="e.g. Meralco, CCard"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider opacity-70 mb-2">Deadline</label>
                <input 
                  type="date" 
                  value={newBillDate}
                  onChange={(e) => setNewBillDate(e.target.value)}
                  className="w-full border border-black px-4 py-3 focus:outline-none focus:bg-neutral-50 text-xs uppercase font-semibold"
                  required
                />
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer group select-none">
                  <input
                    type="checkbox"
                    checked={newBillRepeatMonthly}
                    onChange={(e) => setNewBillRepeatMonthly(e.target.checked)}
                    className="w-5 h-5 border-black appearance-none border checked:bg-black checked:relative
                      after:content-[''] after:absolute after:hidden checked:after:block after:left-[5px]
                      after:top-[1px] after:w-[6px] after:h-[10px] after:border-white after:border-r-2
                      after:border-b-2 after:rotate-45"
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wider group-hover:underline">
                    Repeat Monthly
                  </span>
                  <span className="text-[10px] opacity-40 font-semibold normal-case tracking-normal">— auto-reschedules after paid</span>
                </label>
              </div>

              <button type="submit" className="w-full bg-black text-white px-8 py-4 text-[10px] font-bold uppercase tracking-widest hover:opacity-80 transition-opacity flex justify-center items-center gap-2 mt-4">
                <Plus size={16}/> Record Bill
              </button>
          </form>

          <div className="lg:col-span-7 border border-black bg-white flex flex-col shadow-none">
            <h3 className="text-lg font-extrabold uppercase tracking-tight mb-0 border-b border-black p-6 py-4 flex justify-between items-center bg-neutral-100">
              Upcoming Bills
            </h3>
          <div className="flex justify-between items-center px-6 py-2 bg-neutral-50 border-t border-b border-black">
            <span className="font-bold text-sm">Upcoming Bills Total</span>
            <span className="font-bold text-sm">{formatPHP(bills.reduce((sum, b) => sum + Number(b.amount), 0))}</span>
          </div>
            
            <div className="overflow-x-auto flex-grow">
              <table className="w-full text-left border-collapse">
                <thead className="text-[10px] font-extrabold uppercase border-b-2 border-black bg-white">
                  <tr>
                    <th className="py-4 px-6">Bill Name</th>
                    <th className="py-4 px-6">Due Date</th>
                    <th className="py-4 px-6 text-right">Amount</th>
                    <th className="py-4 px-6 text-center w-16">Paid</th>
                    <th className="py-4 px-4 text-center w-12">Edit</th>
                    <th className="py-4 px-4 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="text-sm font-semibold">
                  <AnimatePresence>
                    {bills.length === 0 ? (
                      <motion.tr key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <td colSpan={6} className="p-12 text-center text-neutral-400 font-sans uppercase text-[10px] font-bold tracking-widest border-b border-black/10">No pending liabilities.</td>
                      </motion.tr>
                    ) : (
                      bills.map((bill) => (
                        <motion.tr 
                          key={bill.id} 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-b border-black/10 hover:bg-neutral-50 transition-colors"
                        >
                          <td className="py-4 px-6 font-bold">
                            <div className="flex flex-col gap-1">
                              <span>{bill.name}</span>
                              {bill.repeatMonthly && (
                                <span className="text-[9px] font-bold uppercase tracking-wider opacity-50 flex items-center gap-1">
                                  <RotateCcw size={9} /> Monthly
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] border border-black px-2 py-0.5 font-bold">{formatDate(bill.dueDate)}</span>
                              {isDueSoon(bill.dueDate) && (
                                <span title="Due very soon!">
                                  <AlertCircle size={16} className={`text-red-500 animate-pulse ${isDark ? 'invert' : ''}`} />
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right font-extrabold text-base">
                            {typeof bill.amount === 'number' ? formatPHP(bill.amount) : <span className="opacity-30">--</span>}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <button 
                              onClick={() => {
                                const paidAmountInput = prompt('Amount paid (₱):', typeof bill.amount === 'number' ? String(bill.amount) : '');
                                if (paidAmountInput === null) return;
                                const paidAmount = Number(paidAmountInput);
                                if (!Number.isFinite(paidAmount) || paidAmount <= 0) return;
                                if (bill.repeatMonthly) {
                                  const next = advanceBillOneMonth(bill);
                                  setBills((prev) =>
                                    [...prev.filter((b) => b.id !== bill.id), next]
                                      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                                  );
                                } else {
                                  setBills((prev) => prev.filter((b) => b.id !== bill.id));
                                }
                              }}
                              className="p-1 opacity-50 hover:opacity-100 transition-opacity text-black inline-block"
                              aria-label="Mark as Paid"
                              title="Mark as Paid"
                            >
                              <CheckCircle size={20} className="stroke-2" />
                            </button>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                const nextName = prompt('Edit bill name:', bill.name);
                                if (nextName === null) return;
                                if (!nextName.trim()) return;

                                const nextDueDate = prompt('Edit deadline (YYYY-MM-DD):', bill.dueDate);
                                if (nextDueDate === null) return;
                                if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDueDate.trim())) return;

                                const nextRepeatInput = prompt('Repeat monthly? (yes/no):', bill.repeatMonthly ? 'yes' : 'no');
                                if (nextRepeatInput === null) return;
                                const normalized = nextRepeatInput.trim().toLowerCase();
                                const nextRepeatMonthly = normalized === 'yes' || normalized === 'y' || normalized === 'true';

                                setBills((prev) =>
                                  prev
                                    .map((b) =>
                                      b.id === bill.id
                                        ? { ...b, name: nextName.trim(), dueDate: nextDueDate.trim(), repeatMonthly: nextRepeatMonthly }
                                        : b
                                    )
                                    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                                );
                              }}
                              className="p-1 opacity-30 hover:opacity-100 transition-opacity text-black inline-block"
                              aria-label="Edit bill"
                              title="Edit bill"
                            >
                              <Pencil size={15} />
                            </button>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <button
                              onClick={() => handleDeleteBill(bill.id)}
                              className="p-1 opacity-30 hover:opacity-100 transition-opacity text-black inline-block"
                              aria-label="Delete bill"
                              title="Delete bill"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMotorcycleTab = () => {
    const basePriceNumeric = motoProfile.basePrice === '' ? 0 : Number(motoProfile.basePrice);
    const accessoriesTotal = motoAccessories.reduce((acc, a) => acc + (Number.isFinite(a.price) ? a.price : 0), 0);
    const fuelTotal = motoFuelLogs.reduce((acc, x) => acc + (Number.isFinite(x.cost) ? x.cost : 0), 0);
    const maintenanceTotal = motoMaintenanceLogs.reduce((acc, x) => acc + (Number.isFinite(x.cost) ? x.cost : 0), 0);
    const parkingTotal = motoParkingLogs.reduce((acc, x) => acc + (Number.isFinite(x.cost) ? x.cost : 0), 0);
    const totalInvestment = basePriceNumeric + accessoriesTotal + fuelTotal + maintenanceTotal + parkingTotal;

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="border border-black p-8 sm:p-10 bg-white">
          <h2 className="text-3xl font-extrabold uppercase tracking-tighter mb-2">Motorcycle Expense Tracker</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Local Storage Active</p>
        </div>

        <div className="border border-black bg-black text-white p-6 sm:p-8 flex flex-col lg:flex-row gap-6 lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Total Investment</p>
            <div className="text-4xl sm:text-5xl font-extrabold tracking-tighter mt-2">{formatPHP(totalInvestment)}</div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 w-full lg:w-auto">
            {[
              { label: 'Vehicle', value: basePriceNumeric },
              { label: 'Accessories', value: accessoriesTotal },
              { label: 'Gas & Fuel', value: fuelTotal },
              { label: 'Maintenance', value: maintenanceTotal },
              { label: 'Parking', value: parkingTotal },
            ].map((c) => (
              <div key={c.label} className="border border-white/20 bg-black p-3 min-w-[140px]">
                <p className="text-[9px] font-bold uppercase tracking-widest opacity-70">{c.label}</p>
                <p className="text-lg font-extrabold mt-1">{formatPHP(c.value)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-8">
            <div className="border border-black bg-white">
              <div className="border-b border-black p-6 py-4 bg-neutral-100">
                <h3 className="text-lg font-extrabold uppercase tracking-tight">Vehicle Asset</h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-70 mb-2">Motorcycle Name / Model</label>
                  <input
                    type="text"
                    value={motoProfile.model}
                    onChange={(e) => setMotoProfile((prev) => ({ ...prev, model: e.target.value }))}
                    className="w-full border border-black px-4 py-3 focus:outline-none focus:bg-neutral-50 text-sm font-semibold"
                    placeholder="e.g. Honda PCX Roadsync"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-70 mb-2">Base Price (Fixed Cost)</label>
                  <div className="flex items-center">
                    <span className="text-lg font-extrabold mr-2">₱</span>
                    <input
                      type="number"
                      value={motoProfile.basePrice}
                      onChange={(e) =>
                        setMotoProfile((prev) => ({
                          ...prev,
                          basePrice: e.target.value !== '' ? Number(e.target.value) : '',
                        }))
                      }
                      className="w-full bg-transparent border-b-2 border-black/20 px-0 py-2 text-2xl font-extrabold focus:outline-none focus:border-black transition-colors placeholder-black/20"
                      placeholder="0.00"
                      min={0}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-70 mb-2">Current Odometer (KM)</label>
                  <input
                    type="number"
                    value={motoProfile.currentOdometerKm}
                    onChange={(e) =>
                      setMotoProfile((prev) => ({
                        ...prev,
                        currentOdometerKm: e.target.value !== '' ? Number(e.target.value) : '',
                      }))
                    }
                    className="w-full border border-black px-4 py-3 focus:outline-none focus:bg-neutral-50 text-sm font-semibold"
                    placeholder="0"
                    min={0}
                  />
                </div>
              </div>
            </div>

            <div className="border border-black bg-white">
              <div className="border-b border-black p-6 py-4 bg-neutral-100 flex items-center justify-between">
                <h3 className="text-lg font-extrabold uppercase tracking-tight">Accessories</h3>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">{formatPHP(accessoriesTotal)}</span>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-3">
                  {motoAccessories.length === 0 ? (
                    <div className="text-center text-neutral-400 uppercase text-[10px] font-bold tracking-widest py-8 border border-black/10">
                      No accessories added.
                    </div>
                  ) : (
                    <ul className="divide-y divide-black/10 border border-black">
                      {motoAccessories.map((a) => (
                        <li key={a.id} className="p-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate">{a.name}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                              {a.date ? formatDate(a.date) : '--'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <p className="text-sm font-extrabold">{formatPHP(a.price)}</p>
                            <button
                              type="button"
                              onClick={() => {
                                const nextName = prompt('Edit accessory name:', a.name);
                                if (nextName === null) return;
                                if (!nextName.trim()) return;
                                const nextPriceInput = prompt('Edit accessory price (₱):', String(a.price));
                                if (nextPriceInput === null) return;
                                const nextPrice = Number(nextPriceInput);
                                if (!Number.isFinite(nextPrice) || nextPrice < 0) return;
                                const nextDate = prompt('Edit date (YYYY-MM-DD). Leave blank to clear:', a.date || '');
                                if (nextDate === null) return;
                                setMotoAccessories((prev) =>
                                  prev.map((x) =>
                                    x.id === a.id
                                      ? { ...x, name: nextName.trim(), price: nextPrice, date: nextDate.trim() || undefined }
                                      : x
                                  )
                                );
                              }}
                              className="p-1 opacity-40 hover:opacity-100 transition-opacity"
                              aria-label="Edit accessory"
                              title="Edit accessory"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAccessory(a.id)}
                              className="p-1 opacity-40 hover:opacity-100 transition-opacity"
                              aria-label="Delete accessory"
                              title="Delete accessory"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <form onSubmit={handleAddAccessory} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-6">
                      <label className="block text-[10px] font-bold uppercase tracking-wider opacity-70 mb-2">Item Name</label>
                      <input
                        type="text"
                        value={newAccessoryName}
                        onChange={(e) => setNewAccessoryName(e.target.value)}
                        className="w-full border border-black px-3 py-2 focus:outline-none focus:bg-neutral-50 text-sm font-semibold"
                        placeholder="Item name"
                        required
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-bold uppercase tracking-wider opacity-70 mb-2">Price</label>
                      <input
                        type="number"
                        value={newAccessoryPrice}
                        onChange={(e) => setNewAccessoryPrice(e.target.value !== '' ? Number(e.target.value) : '')}
                        className="w-full border border-black px-3 py-2 focus:outline-none focus:bg-neutral-50 text-sm font-semibold"
                        placeholder="0"
                        min={0}
                        required
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-bold uppercase tracking-wider opacity-70 mb-2">Date</label>
                      <input
                        type="date"
                        value={newAccessoryDate}
                        onChange={(e) => setNewAccessoryDate(e.target.value)}
                        className="w-full border border-black px-3 py-2 focus:outline-none focus:bg-neutral-50 text-xs uppercase font-semibold"
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-black text-white px-6 py-3 text-[10px] font-bold uppercase tracking-widest hover:opacity-80 transition-opacity flex items-center justify-center gap-2">
                    <Plus size={16} /> Add Accessory
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="border border-black bg-white h-full flex flex-col">
              <div className="border-b border-black p-6 py-4 bg-neutral-100 flex items-center justify-between">
                <h3 className="text-lg font-extrabold uppercase tracking-tight">Fuel Consumption Log</h3>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">{formatPHP(fuelTotal)}</span>
              </div>
              <div className="p-6 flex-grow flex flex-col gap-6">
                <div className="space-y-3 flex-grow">
                  {motoFuelLogs.length === 0 ? (
                    <div className="text-center text-neutral-400 uppercase text-[10px] font-bold tracking-widest py-8 border border-black/10">
                      No fuel logs added.
                    </div>
                  ) : (
                    <ul className="divide-y divide-black/10 border border-black overflow-hidden">
                      {motoFuelLogs.map((x) => (
                        <li key={x.id} className="p-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate">{formatDate(x.date)} • {x.odometerKm.toLocaleString()} KM</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                              {typeof x.liters === 'number' ? `${x.liters.toFixed(2)} L` : '--'} {x.notes ? `• ${x.notes}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <p className="text-sm font-extrabold">{formatPHP(x.cost)}</p>
                            <button
                              type="button"
                              onClick={() => {
                                const nextDate = prompt('Edit date (YYYY-MM-DD):', x.date);
                                if (nextDate === null) return;
                                if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDate.trim())) return;
                                const nextOdoInput = prompt('Edit odometer (KM):', String(x.odometerKm));
                                if (nextOdoInput === null) return;
                                const nextOdo = Number(nextOdoInput);
                                if (!Number.isFinite(nextOdo) || nextOdo < 0) return;
                                const nextCostInput = prompt('Edit cost (₱):', String(x.cost));
                                if (nextCostInput === null) return;
                                const nextCost = Number(nextCostInput);
                                if (!Number.isFinite(nextCost) || nextCost < 0) return;
                                const nextLitersInput = prompt('Edit liters (optional):', typeof x.liters === 'number' ? String(x.liters) : '');
                                if (nextLitersInput === null) return;
                                const nextNotes = prompt('Edit notes (optional):', x.notes || '');
                                if (nextNotes === null) return;
                                const nextLitersTrim = nextLitersInput.trim();
                                const nextLiters =
                                  nextLitersTrim === '' ? undefined : Number.isFinite(Number(nextLitersTrim)) ? Number(nextLitersTrim) : undefined;
                                setMotoFuelLogs((prev) =>
                                  prev
                                    .map((y) =>
                                      y.id === x.id
                                        ? { ...y, date: nextDate.trim(), odometerKm: nextOdo, cost: nextCost, liters: nextLiters, notes: nextNotes.trim() || undefined }
                                        : y
                                    )
                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                );
                              }}
                              className="p-1 opacity-40 hover:opacity-100 transition-opacity"
                              aria-label="Edit fuel log"
                              title="Edit fuel log"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteFuelLog(x.id)}
                              className="p-1 opacity-40 hover:opacity-100 transition-opacity"
                              aria-label="Delete fuel log"
                              title="Delete fuel log"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <form onSubmit={handleAddFuelLog} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-4">
                      <label className="block text-[10px] font-bold uppercase tracking-wider opacity-70 mb-2">Date</label>
                      <input
                        type="date"
                        value={newFuelDate}
                        onChange={(e) => setNewFuelDate(e.target.value)}
                        className="w-full border border-black px-3 py-2 focus:outline-none focus:bg-neutral-50 text-xs uppercase font-semibold"
                        required
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <label className="block text-[10px] font-bold uppercase tracking-wider opacity-70 mb-2">KM</label>
                      <input
                        type="number"
                        value={newFuelOdometerKm}
                        onChange={(e) => setNewFuelOdometerKm(e.target.value !== '' ? Number(e.target.value) : '')}
                        className="w-full border border-black px-3 py-2 focus:outline-none focus:bg-neutral-50 text-sm font-semibold"
                        placeholder="Odometer"
                        min={0}
                        required
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <label className="block text-[10px] font-bold uppercase tracking-wider opacity-70 mb-2">Amount</label>
                      <input
                        type="number"
                        value={newFuelCost}
                        onChange={(e) => setNewFuelCost(e.target.value !== '' ? Number(e.target.value) : '')}
                        className="w-full border border-black px-3 py-2 focus:outline-none focus:bg-neutral-50 text-sm font-semibold"
                        placeholder="₱"
                        min={0}
                        required
                      />
                    </div>
                    <div className="sm:col-span-6">
                      <label className="block text-[10px] font-bold uppercase tracking-wider opacity-70 mb-2">Liters (Optional)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={newFuelLiters}
                        onChange={(e) => setNewFuelLiters(e.target.value !== '' ? Number(e.target.value) : '')}
                        className="w-full border border-black px-3 py-2 focus:outline-none focus:bg-neutral-50 text-sm font-semibold"
                        placeholder="0.00"
                        min={0}
                      />
                    </div>
                    <div className="sm:col-span-6">
                      <label className="block text-[10px] font-bold uppercase tracking-wider opacity-70 mb-2">Notes (Optional)</label>
                      <input
                        type="text"
                        value={newFuelNotes}
                        onChange={(e) => setNewFuelNotes(e.target.value)}
                        className="w-full border border-black px-3 py-2 focus:outline-none focus:bg-neutral-50 text-sm font-semibold"
                        placeholder="Shell / Petron..."
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-black text-white px-6 py-3 text-[10px] font-bold uppercase tracking-widest hover:opacity-80 transition-opacity flex items-center justify-center gap-2">
                    <Plus size={16} /> Log Gas
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="border border-black bg-white h-full flex flex-col">
              <div className="border-b border-black p-6 py-4 bg-neutral-100 flex items-center justify-between">
                <h3 className="text-lg font-extrabold uppercase tracking-tight">Maintenance & Service</h3>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">{formatPHP(maintenanceTotal)}</span>
              </div>
              <div className="p-6 flex-grow flex flex-col gap-6">
                <div className="space-y-3 flex-grow">
                  {motoMaintenanceLogs.length === 0 ? (
                    <div className="text-center text-neutral-400 uppercase text-[10px] font-bold tracking-widest py-8 border border-black/10">
                      No maintenance logs added.
                    </div>
                  ) : (
                    <ul className="divide-y divide-black/10 border border-black overflow-hidden">
                      {motoMaintenanceLogs.map((x) => (
                        <li key={x.id} className="p-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate">{x.taskName}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                              {formatDate(x.datePerformed)}
                              {typeof x.odometerKm === 'number' ? ` • ${x.odometerKm.toLocaleString()} KM` : ''}
                              {x.remindNextDate ? ` • Remind: ${formatDate(x.remindNextDate)}` : ''}
                              {typeof x.nextServiceKm === 'number' ? ` • Next: ${x.nextServiceKm.toLocaleString()} KM` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <p className="text-sm font-extrabold">{formatPHP(x.cost)}</p>
                            <button
                              type="button"
                              onClick={() => {
                                const nextTaskName = prompt('Edit task name:', x.taskName);
                                if (nextTaskName === null) return;
                                if (!nextTaskName.trim()) return;
                                const nextDatePerformed = prompt('Edit date performed (YYYY-MM-DD):', x.datePerformed);
                                if (nextDatePerformed === null) return;
                                if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDatePerformed.trim())) return;
                                const nextCostInput = prompt('Edit cost (₱):', String(x.cost));
                                if (nextCostInput === null) return;
                                const nextCost = Number(nextCostInput);
                                if (!Number.isFinite(nextCost) || nextCost < 0) return;
                                const nextOdoInput = prompt('Edit odometer (KM) optional:', typeof x.odometerKm === 'number' ? String(x.odometerKm) : '');
                                if (nextOdoInput === null) return;
                                const nextRemind = prompt('Edit remind next date (YYYY-MM-DD) optional:', x.remindNextDate || '');
                                if (nextRemind === null) return;
                                const nextNextKmInput = prompt('Edit next service KM optional:', typeof x.nextServiceKm === 'number' ? String(x.nextServiceKm) : '');
                                if (nextNextKmInput === null) return;
                                const odoTrim = nextOdoInput.trim();
                                const nextKmTrim = nextNextKmInput.trim();
                                const nextOdo =
                                  odoTrim === '' ? undefined : Number.isFinite(Number(odoTrim)) ? Number(odoTrim) : undefined;
                                const nextNextKm =
                                  nextKmTrim === '' ? undefined : Number.isFinite(Number(nextKmTrim)) ? Number(nextKmTrim) : undefined;
                                setMotoMaintenanceLogs((prev) =>
                                  prev
                                    .map((y) =>
                                      y.id === x.id
                                        ? {
                                            ...y,
                                            taskName: nextTaskName.trim(),
                                            datePerformed: nextDatePerformed.trim(),
                                            cost: nextCost,
                                            odometerKm: nextOdo,
                                            remindNextDate: nextRemind.trim() || undefined,
                                            nextServiceKm: nextNextKm,
                                          }
                                        : y
                                    )
                                    .sort((a, b) => new Date(b.datePerformed).getTime() - new Date(a.datePerformed).getTime())
                                );
                              }}
                              className="p-1 opacity-40 hover:opacity-100 transition-opacity"
                              aria-label="Edit maintenance"
                              title="Edit maintenance"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMaintenance(x.id)}
                              className="p-1 opacity-40 hover:opacity-100 transition-opacity"
                              aria-label="Delete maintenance"
                              title="Delete maintenance"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <form onSubmit={handleAddMaintenance} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-7">
                      <label className="block text-[10px] font-bold uppercase tracking-wider opacity-70 mb-2">Task Name</label>
                      <input
                        type="text"
                        value={newMaintenanceTaskName}
                        onChange={(e) => setNewMaintenanceTaskName(e.target.value)}
                        className="w-full border border-black px-3 py-2 focus:outline-none focus:bg-neutral-50 text-sm font-semibold"
                        placeholder="Oil change, tires..."
                        required
                      />
                    </div>
                    <div className="sm:col-span-5">
                      <label className="block text-[10px] font-bold uppercase tracking-wider opacity-70 mb-2">Cost</label>
                      <input
                        type="number"
                        value={newMaintenanceCost}
                        onChange={(e) => setNewMaintenanceCost(e.target.value !== '' ? Number(e.target.value) : '')}
                        className="w-full border border-black px-3 py-2 focus:outline-none focus:bg-neutral-50 text-sm font-semibold"
                        placeholder="₱"
                        min={0}
                        required
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <label className="block text-[10px] font-bold uppercase tracking-wider opacity-70 mb-2">Date Performed</label>
                      <input
                        type="date"
                        value={newMaintenanceDatePerformed}
                        onChange={(e) => setNewMaintenanceDatePerformed(e.target.value)}
                        className="w-full border border-black px-3 py-2 focus:outline-none focus:bg-neutral-50 text-xs uppercase font-semibold"
                        required
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <label className="block text-[10px] font-bold uppercase tracking-wider opacity-70 mb-2">Current Odometer</label>
                      <input
                        type="number"
                        value={newMaintenanceOdometerKm}
                        onChange={(e) => setNewMaintenanceOdometerKm(e.target.value !== '' ? Number(e.target.value) : '')}
                        className="w-full border border-black px-3 py-2 focus:outline-none focus:bg-neutral-50 text-sm font-semibold"
                        placeholder="KM"
                        min={0}
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <label className="block text-[10px] font-bold uppercase tracking-wider opacity-70 mb-2">Next Service KM</label>
                      <input
                        type="number"
                        value={newMaintenanceNextServiceKm}
                        onChange={(e) => setNewMaintenanceNextServiceKm(e.target.value !== '' ? Number(e.target.value) : '')}
                        className="w-full border border-black px-3 py-2 focus:outline-none focus:bg-neutral-50 text-sm font-semibold"
                        placeholder="KM"
                        min={0}
                      />
                    </div>
                    <div className="sm:col-span-12">
                      <label className="block text-[10px] font-bold uppercase tracking-wider opacity-70 mb-2">Remind: Next Date (Optional)</label>
                      <input
                        type="date"
                        value={newMaintenanceRemindDate}
                        onChange={(e) => setNewMaintenanceRemindDate(e.target.value)}
                        className="w-full border border-black px-3 py-2 focus:outline-none focus:bg-neutral-50 text-xs uppercase font-semibold"
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-black text-white px-6 py-3 text-[10px] font-bold uppercase tracking-widest hover:opacity-80 transition-opacity flex items-center justify-center gap-2">
                    <Plus size={16} /> Schedule Maintenance
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        <div className="border border-black bg-white">
          <div className="border-b border-black p-6 py-4 bg-neutral-100 flex items-center justify-between">
            <h3 className="text-lg font-extrabold uppercase tracking-tight">Parking Costs</h3>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">{formatPHP(parkingTotal)}</span>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-3">
              {motoParkingLogs.length === 0 ? (
                <div className="text-center text-neutral-400 uppercase text-[10px] font-bold tracking-widest py-8 border border-black/10">
                  No parking logs added.
                </div>
              ) : (
                <ul className="divide-y divide-black/10 border border-black overflow-hidden">
                  {motoParkingLogs.map((x) => (
                    <li key={x.id} className="p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">
                          {formatDate(x.date)}
                          {x.location ? ` • ${x.location}` : ''}
                        </p>
                        {x.notes ? (
                          <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 truncate">{x.notes}</p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <p className="text-sm font-extrabold">{formatPHP(x.cost)}</p>
                        <button
                          type="button"
                          onClick={() => {
                            const nextDate = prompt('Edit date (YYYY-MM-DD):', x.date);
                            if (nextDate === null) return;
                            if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDate.trim())) return;
                            const nextCostInput = prompt('Edit cost (₱):', String(x.cost));
                            if (nextCostInput === null) return;
                            const nextCost = Number(nextCostInput);
                            if (!Number.isFinite(nextCost) || nextCost < 0) return;
                            const nextLocation = prompt('Edit location (optional):', x.location || '');
                            if (nextLocation === null) return;
                            const nextNotes = prompt('Edit notes (optional):', x.notes || '');
                            if (nextNotes === null) return;
                            setMotoParkingLogs((prev) =>
                              prev
                                .map((y) =>
                                  y.id === x.id
                                    ? {
                                        ...y,
                                        date: nextDate.trim(),
                                        cost: nextCost,
                                        location: nextLocation.trim() || undefined,
                                        notes: nextNotes.trim() || undefined,
                                      }
                                    : y
                                )
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            );
                          }}
                          className="p-1 opacity-40 hover:opacity-100 transition-opacity"
                          aria-label="Edit parking log"
                          title="Edit parking log"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteParkingLog(x.id)}
                          className="p-1 opacity-40 hover:opacity-100 transition-opacity"
                          aria-label="Delete parking log"
                          title="Delete parking log"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <form onSubmit={handleAddParkingLog} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-70 mb-2">Date</label>
                  <input
                    type="date"
                    value={newParkingDate}
                    onChange={(e) => setNewParkingDate(e.target.value)}
                    className="w-full border border-black px-3 py-2 focus:outline-none focus:bg-neutral-50 text-xs uppercase font-semibold"
                    required
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-70 mb-2">Amount</label>
                  <input
                    type="number"
                    value={newParkingCost}
                    onChange={(e) => setNewParkingCost(e.target.value !== '' ? Number(e.target.value) : '')}
                    className="w-full border border-black px-3 py-2 focus:outline-none focus:bg-neutral-50 text-sm font-semibold"
                    placeholder="₱"
                    min={0}
                    required
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-70 mb-2">Location (Optional)</label>
                  <input
                    type="text"
                    value={newParkingLocation}
                    onChange={(e) => setNewParkingLocation(e.target.value)}
                    className="w-full border border-black px-3 py-2 focus:outline-none focus:bg-neutral-50 text-sm font-semibold"
                    placeholder="Mall, office..."
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-70 mb-2">Notes (Optional)</label>
                  <input
                    type="text"
                    value={newParkingNotes}
                    onChange={(e) => setNewParkingNotes(e.target.value)}
                    className="w-full border border-black px-3 py-2 focus:outline-none focus:bg-neutral-50 text-sm font-semibold"
                    placeholder="Overnight, valet..."
                  />
                </div>
              </div>
              <button type="submit" className="w-full sm:w-auto bg-black text-white px-6 py-3 text-[10px] font-bold uppercase tracking-widest hover:opacity-80 transition-opacity flex items-center justify-center gap-2">
                <Plus size={16} /> Log Parking
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  };

  const renderGoogleAITab = () => {
    const totalCollected = googleAIMembers.reduce((acc, m) => acc + m.amount, 0);
    const planCost = googleAIPlanCost === '' ? 0 : Number(googleAIPlanCost);
    const netCost = Math.max(0, planCost - totalCollected);
    
    const totalCollectedStatus = googleAIMembers.filter(m => m.isPaid).reduce((acc, m) => acc + m.amount, 0);
    const totalRemainingToCollect = totalCollected - totalCollectedStatus;
    const equalShare = planCost / 6;

    const advanceReserveTotal = googleAIMembers.reduce((acc, m) => acc + ((m.advanceMonths || 0) * m.amount), 0);
    const advanceMembersCount = googleAIMembers.filter(m => (m.advanceMonths || 0) > 0).length;
    const cycleDetails = getGoogleAICycleDetails();

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Cycle Information & Quick Actions Bar */}
        <div className="border border-black p-4 sm:p-5 bg-neutral-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-black text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <CalendarCheck size={14} />
              <span>Billing Cycle: 24th of Each Month</span>
            </div>
            <div className="text-xs font-bold text-neutral-800">
              <span className="opacity-50 uppercase text-[10px] tracking-wider mr-1.5">Current Cycle:</span>
              <span>{cycleDetails.formattedCycleStart} — {cycleDetails.formattedCycleEnd}</span>
            </div>
            {cycleDetails.isDueToday ? (
              <span className="bg-black text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 border border-black flex items-center gap-1 animate-pulse">
                <Sparkles size={11} /> Due Today (24th)!
              </span>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-wider bg-white border border-black/30 px-2 py-0.5 text-neutral-600">
                Next Due: {cycleDetails.formattedNextCycleDate} ({cycleDetails.daysUntilNext} days)
              </span>
            )}
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSyncToCurrentCycle}
              className="text-[9px] font-black uppercase tracking-wider bg-white hover:bg-neutral-100 text-black px-3 py-2 border border-black transition-colors"
              title="Force sync all member payment dates to current cycle (Sept 24)"
            >
              Sync to Sept 24
            </button>
            <button
              type="button"
              onClick={handleMarkAllGoogleAIPaid}
              className="text-[9px] font-black uppercase tracking-wider bg-white hover:bg-neutral-100 text-black px-3 py-2 border border-black transition-colors"
              title="Mark all members collected for current cycle"
            >
              Mark All Paid
            </button>
            <button
              type="button"
              onClick={handleResetGoogleAICollections}
              className="text-[9px] font-black uppercase tracking-wider bg-white hover:bg-neutral-100 text-black px-3 py-2 border border-black transition-colors"
              title="Reset current cycle status to Sept 24 (preserves advance payments)"
            >
              Reset Cycle
            </button>
            <button
              type="button"
              onClick={handleAdvanceGoogleAICycle}
              className="text-[9px] font-black uppercase tracking-wider bg-black hover:opacity-80 text-white px-3 py-2 border border-black flex items-center gap-1.5 transition-opacity"
              title="Rollover to next monthly cycle (applies advance payments)"
            >
              <FastForward size={12} /> Advance to Next Cycle
            </button>
          </div>
        </div>

        {/* Cycle Notice Toast/Banner */}
        {googleAICycleNotice && (
          <div className="border border-black bg-neutral-100 p-3.5 text-xs font-bold flex items-center justify-between shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-black shrink-0" />
              <span>{googleAICycleNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setGoogleAICycleNotice(null)}
              className="text-[10px] hover:underline font-black uppercase tracking-wider ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="border border-black p-5 flex flex-col justify-between bg-white text-black">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Total Plan Cost</p>
              <div className="text-2xl font-extrabold">{formatPHP(planCost)}</div>
            </div>
            <div className="mt-4 pt-3 border-t border-black/10 flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-wider opacity-50">Set Plan (₱):</span>
              <input
                type="number"
                value={googleAIPlanCost}
                onChange={(e) => setGoogleAIPlanCost(e.target.value !== '' ? Number(e.target.value) : '')}
                className="w-20 bg-transparent border-b border-black text-right text-xs font-bold focus:outline-none focus:border-black transition-colors"
                placeholder="1099"
                min={0}
              />
            </div>
          </div>
          
          <div className="border border-black p-5 flex flex-col justify-between bg-white text-black">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">To Collect (Others)</p>
              <p className="text-2xl font-extrabold">{formatPHP(totalCollected)}</p>
            </div>
            <p className="text-[9px] font-bold uppercase tracking-wider opacity-50 mt-4">
              From {googleAIMembers.length} members
            </p>
          </div>

          <div className="border border-black p-5 flex flex-col justify-between bg-black text-white">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">Your Net Share</p>
              <p className="text-2xl font-extrabold">{formatPHP(netCost)}</p>
            </div>
            <p className="text-[9px] font-bold uppercase tracking-wider opacity-70 mt-4">
              Equal 6-way split is {formatPHP(equalShare)}
            </p>
          </div>

          <div className="border border-black p-5 flex flex-col justify-between bg-white text-black">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Collected This Cycle</p>
              <p className="text-2xl font-extrabold text-neutral-800">
                {formatPHP(totalCollectedStatus)} <span className="text-xs font-normal opacity-50">/ {formatPHP(totalCollected)}</span>
              </p>
            </div>
            <div className="mt-4">
              <div className="w-full bg-neutral-200 h-1.5 rounded-none overflow-hidden border border-black">
                <div 
                  className="bg-black h-full transition-all duration-500" 
                  style={{ width: `${totalCollected > 0 ? (totalCollectedStatus / totalCollected) * 100 : 0}%` }}
                />
              </div>
              <div className="flex justify-between items-center mt-1 text-[8px] font-bold uppercase tracking-wider opacity-50">
                <span>Remaining: {formatPHP(totalRemainingToCollect)}</span>
                <span>{totalCollected > 0 ? Math.round((totalCollectedStatus / totalCollected) * 100) : 0}%</span>
              </div>
            </div>
          </div>

          <div className="border border-black p-5 flex flex-col justify-between bg-white text-black">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Advance Reserve Funds</p>
              <p className="text-2xl font-extrabold">{formatPHP(advanceReserveTotal)}</p>
            </div>
            <div className="mt-4 flex items-center justify-between text-[9px] font-bold uppercase tracking-wider opacity-70">
              <span>{advanceMembersCount} member(s) prepaid ahead</span>
              {advanceMembersCount > 0 && (
                <span className="bg-black text-white px-1.5 py-0.5 text-[8px] font-extrabold">Active</span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Member Form */}
          <form onSubmit={handleAddGoogleAIMember} className="lg:col-span-1 border border-black p-6 bg-white space-y-4 h-fit">
            <h2 className="text-lg font-extrabold uppercase tracking-tight border-b border-black pb-2 mb-4">Add Member</h2>
            
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 opacity-70">Name</label>
              <input 
                type="text" 
                value={newMemberName} 
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full border border-black px-4 py-3 focus:outline-none focus:bg-neutral-50 placeholder-neutral-400 text-sm font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 opacity-70">
                Monthly Amount (₱)
              </label>
              <div className="relative">
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  value={newMemberAmount} 
                  onChange={(e) => setNewMemberAmount(e.target.value !== '' ? Number(e.target.value) : '')}
                  placeholder={equalShare.toFixed(2)}
                  className="w-full border border-black px-4 py-3 focus:outline-none focus:bg-neutral-50 text-sm font-semibold"
                  required
                />
                <button
                  type="button"
                  onClick={() => setNewMemberAmount(Number(equalShare.toFixed(2)))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-extrabold uppercase tracking-wider bg-black text-white px-2 py-1 hover:opacity-80 transition-opacity"
                  title="Use 6-way split default"
                >
                  Set Default
                </button>
              </div>
              <p className="text-[9px] opacity-50 mt-1 font-semibold">
                Equal 6-way share of {formatPHP(planCost)} is {formatPHP(equalShare)}
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 opacity-70">
                Collection Date (24th of the Month)
              </label>
              <input 
                type="date" 
                value={newMemberDate} 
                onChange={(e) => setNewMemberDate(e.target.value)}
                className="w-full border border-black px-4 py-3 focus:outline-none focus:bg-neutral-50 uppercase text-xs font-semibold"
                required
              />
              <p className="text-[9px] opacity-50 mt-1 font-semibold">
                Subscriptions reset every 24th of the month.
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 opacity-70">
                Advance Months Paid (Optional)
              </label>
              <input 
                type="number" 
                min="0"
                max="24"
                value={newMemberAdvanceMonths} 
                onChange={(e) => setNewMemberAdvanceMonths(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full border border-black px-4 py-3 focus:outline-none focus:bg-neutral-50 text-sm font-semibold"
                placeholder="0"
              />
              {newMemberAdvanceMonths > 0 && typeof newMemberAmount === 'number' && (
                <p className="text-[9px] text-emerald-800 font-bold mt-1.5 bg-neutral-100 p-2 border border-black/20">
                  ✨ Prepaying {newMemberAdvanceMonths} month(s) ahead (+{formatPHP(newMemberAdvanceMonths * newMemberAmount)}). Member will be marked as Collected.
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <label className="flex items-center space-x-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={newMemberRepeat}
                  onChange={(e) => setNewMemberRepeat(e.target.checked)}
                  className="sr-only peer"
                />
                <span className="w-5 h-5 border border-black flex items-center justify-center peer-checked:bg-black peer-checked:text-white transition-colors">
                  {newMemberRepeat && <span className="text-[10px] font-bold">✓</span>}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 group-hover:opacity-100 transition-opacity">
                  Repeat Monthly (Every 24th)
                </span>
              </label>
            </div>

            <button 
              type="submit" 
              className="w-full bg-black text-white px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest hover:opacity-80 transition-opacity flex items-center justify-center gap-2 mt-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              <Plus size={16} /> Add Member
            </button>
          </form>

          {/* Members Table */}
          <div className="lg:col-span-2 border border-black bg-white overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-black p-6 py-4 bg-white flex-wrap gap-2">
              <h2 className="text-lg font-extrabold uppercase tracking-tight">Family Members List</h2>
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={handleResetGoogleAICollections}
                  className="text-[10px] font-bold uppercase text-black flex items-center hover:bg-neutral-100 bg-white px-3 py-1.5 border border-black transition-colors"
                >
                  Reset Collections
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto flex-grow">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-black text-[10px] font-extrabold uppercase tracking-tight bg-white">
                    <th className="p-4 sm:p-5 w-1/5">Status</th>
                    <th className="p-4 sm:p-5 w-1/4">Name</th>
                    <th className="p-4 sm:p-5 w-1/5">Monthly Amt</th>
                    <th className="p-4 sm:p-5 w-1/4">Due Date</th>
                    <th className="p-4 sm:p-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm font-semibold">
                  {googleAIMembers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-neutral-400 font-sans uppercase text-[10px] font-bold tracking-widest">
                        No members added yet. Add your 5 shared members to track 24th payments!
                      </td>
                    </tr>
                  ) : (
                    googleAIMembers.map((member) => {
                      const isDue = isDueSoon(member.paymentDate);
                      const cov = getMemberCoverageInfo(member);
                      const hasAdvance = (member.advanceMonths || 0) > 0;

                      return (
                        <tr key={member.id} className="border-b border-black/10 hover:bg-neutral-50 transition-colors">
                          <td className="p-4 sm:p-5">
                            <div className="flex flex-col gap-1 items-start">
                              <button
                                type="button"
                                onClick={() => handleToggleMemberPaid(member.id)}
                                className="flex items-center gap-2 group text-left"
                              >
                                {member.isPaid ? (
                                  <CheckCircle size={18} className="text-black" />
                                ) : (
                                  <Circle size={18} className="text-neutral-300 group-hover:text-black transition-colors" />
                                )}
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${member.isPaid ? 'line-through text-neutral-400' : 'text-black'}`}>
                                  {member.isPaid ? 'Collected' : 'Pending'}
                                </span>
                              </button>
                              {member.isPaid && hasAdvance && (
                                <span className="text-[8px] font-black uppercase tracking-wider bg-black text-white px-1.5 py-0.5 border border-black flex items-center gap-1">
                                  <Sparkles size={9} /> +{member.advanceMonths} mo advance
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 sm:p-5">
                            <span className={member.isPaid ? 'line-through text-neutral-400' : ''}>
                              {member.name}
                            </span>
                            {hasAdvance && (
                              <span className="text-[9px] text-neutral-500 font-bold block mt-0.5">
                                Covered through {cov.formattedCoverageEnd}
                              </span>
                            )}
                            {member.lastPaymentDate && (
                              <span className="text-[9px] text-neutral-500 font-semibold flex items-center gap-1 mt-0.5">
                                <CheckCircle size={10} className="text-emerald-700 shrink-0" />
                                <span>Last paid: <strong>{formatDate(member.lastPaymentDate)}</strong> ({formatPHP(member.lastPaidAmount || member.amount)})</span>
                              </span>
                            )}
                          </td>
                          <td className="p-4 sm:p-5">
                            <span className={member.isPaid ? 'line-through text-neutral-400' : ''}>
                              {formatPHP(member.amount)}
                            </span>
                            {member.repeatMonthly && (
                              <span className="ml-1 text-[8px] bg-neutral-200 text-neutral-600 px-1 py-0.5 font-bold uppercase tracking-widest rounded-none">
                                24th
                              </span>
                            )}
                            {hasAdvance && (
                              <span className="text-[9px] text-neutral-600 block mt-0.5 font-bold">
                                Reserve: +{formatPHP((member.advanceMonths || 0) * member.amount)}
                              </span>
                            )}
                          </td>
                          <td className="p-4 sm:p-5">
                            <div className="flex flex-col">
                              {hasAdvance ? (
                                <>
                                  <span className="text-xs font-bold text-black">
                                    Next: {cov.formattedNextDue}
                                  </span>
                                  <span className="text-[8px] bg-neutral-100 text-black font-extrabold uppercase px-1.5 py-0.5 border border-black/20 mt-1 inline-flex items-center gap-1 w-fit">
                                    <Sparkles size={9} /> Paid {member.advanceMonths} mo ahead
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className={member.isPaid ? 'line-through text-neutral-400' : ''}>
                                    {formatDate(member.paymentDate)}
                                  </span>
                                  {cycleDetails.isDueToday && !member.isPaid ? (
                                    <span className="text-[8px] text-red-600 font-black uppercase tracking-wider flex items-center gap-1 mt-0.5">
                                      <AlertCircle size={10} /> Due Today (24th)!
                                    </span>
                                  ) : isDue && !member.isPaid ? (
                                    <span className="text-[8px] text-red-600 font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5">
                                      <AlertCircle size={10} /> Due Soon
                                    </span>
                                  ) : null}
                                </>
                              )}
                            </div>
                          </td>
                          <td className="p-4 sm:p-5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setHistoryModalMember(member)}
                                className="px-2 py-1 bg-white hover:bg-neutral-100 text-black text-[9px] font-black uppercase tracking-wider transition-colors flex items-center gap-1 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                                title="View member payment history"
                              >
                                <Clock size={11} /> History
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAdvanceModalMember(member);
                                  setAdvanceInputMonths(member.advanceMonths && member.advanceMonths > 0 ? member.advanceMonths : 1);
                                }}
                                className="px-2 py-1 bg-black text-white hover:opacity-80 text-[9px] font-black uppercase tracking-wider transition-opacity flex items-center gap-1 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                                title="Record or manage advance payment"
                              >
                                <CreditCard size={11} /> Advance
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditMember(member)}
                                className="p-1 opacity-60 hover:opacity-100 transition-opacity border border-transparent hover:border-black"
                                title="Edit Member"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMember(member.id)}
                                className="p-1 opacity-60 hover:opacity-100 transition-opacity text-red-600 border border-transparent hover:border-red-600"
                                title="Delete Member"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Advance Payment Modal */}
        {advanceModalMember && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border-2 border-black max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-start justify-between border-b-2 border-black pb-4">
                <div>
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-neutral-500">Google AI Pro • Advance Payment</span>
                  <h3 className="text-xl font-black uppercase tracking-tight mt-0.5">{advanceModalMember.name}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setAdvanceModalMember(null)}
                  className="p-1.5 hover:bg-neutral-100 border border-black transition-colors"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="bg-neutral-50 border border-black p-4 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold opacity-60 uppercase text-[10px] tracking-wider">Monthly Share:</span>
                  <span className="font-extrabold text-sm">{formatPHP(advanceModalMember.amount)} / month</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold opacity-60 uppercase text-[10px] tracking-wider">Current Cycle Status:</span>
                  <span className={`font-extrabold text-[10px] uppercase tracking-wider px-2 py-0.5 ${advanceModalMember.isPaid ? 'bg-black text-white' : 'bg-neutral-200 text-neutral-700'}`}>
                    {advanceModalMember.isPaid ? 'Collected' : 'Pending'}
                  </span>
                </div>
                {advanceModalMember.advanceMonths && advanceModalMember.advanceMonths > 0 ? (
                  <div className="flex justify-between items-center text-emerald-800 font-bold pt-1 border-t border-black/10">
                    <span className="uppercase text-[10px] tracking-wider">Currently Recorded Advance:</span>
                    <span>+{advanceModalMember.advanceMonths} month(s) prepaid ahead</span>
                  </div>
                ) : null}
              </div>

              <form onSubmit={handleSaveAdvancePayment} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 opacity-70">
                    Select Advance Period (Months Ahead)
                  </label>
                  <div className="grid grid-cols-5 gap-2 mb-3">
                    {[1, 2, 3, 6, 12].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setAdvanceInputMonths(num)}
                        className={`py-2 text-xs font-black border border-black uppercase transition-all ${
                          advanceInputMonths === num
                            ? 'bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                            : 'bg-white text-black hover:bg-neutral-100'
                        }`}
                      >
                        +{num} mo
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Custom months:</span>
                    <input
                      type="number"
                      min={1}
                      max={36}
                      value={advanceInputMonths}
                      onChange={(e) => setAdvanceInputMonths(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-24 border border-black px-3 py-1.5 text-sm font-bold text-center focus:outline-none"
                    />
                  </div>
                </div>

                {/* Calculation summary card */}
                {(() => {
                  const totalAdvAmount = advanceInputMonths * advanceModalMember.amount;
                  const cov = getMemberCoverageInfo({
                    ...advanceModalMember,
                    isPaid: true,
                    advanceMonths: advanceInputMonths,
                  });
                  return (
                    <div className="border border-black p-4 bg-white space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="opacity-70 font-semibold">Advance Payment Amount:</span>
                        <span className="text-base font-black">{formatPHP(totalAdvAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs border-t border-black/10 pt-2">
                        <span className="opacity-70 font-semibold">Will be covered until:</span>
                        <span className="font-extrabold text-black">{cov.formattedCoverageEnd}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="opacity-70 font-semibold">Next Payment Due:</span>
                        <span className="font-extrabold text-black">{cov.formattedNextDue} (24th)</span>
                      </div>
                      <p className="text-[10px] text-neutral-600 font-semibold mt-2 pt-2 border-t border-black/10 leading-tight">
                        ℹ️ When the 24th arrives each month, this member will automatically remain marked as <strong className="text-black">Collected</strong> for the next {advanceInputMonths} monthly cycle reset(s).
                      </p>
                    </div>
                  );
                })()}

                <div className="flex items-center justify-between gap-3 pt-2">
                  {advanceModalMember.advanceMonths && advanceModalMember.advanceMonths > 0 ? (
                    <button
                      type="button"
                      onClick={() => handleClearAdvancePayment(advanceModalMember.id)}
                      className="border border-red-600 text-red-600 hover:bg-red-50 text-[10px] font-bold uppercase tracking-wider px-4 py-3 transition-colors"
                    >
                      Clear Advance
                    </button>
                  ) : <div />}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAdvanceModalMember(null)}
                      className="border border-black text-black hover:bg-neutral-100 text-[10px] font-bold uppercase tracking-wider px-4 py-3 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-black text-white hover:opacity-80 text-[10px] font-extrabold uppercase tracking-widest px-6 py-3 border border-black transition-opacity shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    >
                      Save Advance
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Member Payment History Modal */}
        {historyModalMember && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border-2 border-black max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-h-[90vh] flex flex-col">
              <div className="flex items-start justify-between border-b-2 border-black pb-4">
                <div>
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-neutral-500">Google AI Pro • Payment History</span>
                  <h3 className="text-xl font-black uppercase tracking-tight mt-0.5">{historyModalMember.name}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setHistoryModalMember(null)}
                  className="p-1.5 hover:bg-neutral-100 border border-black transition-colors"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="bg-neutral-50 border border-black p-4 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold opacity-60 uppercase text-[10px] tracking-wider">Monthly Share:</span>
                  <span className="font-extrabold text-sm">{formatPHP(historyModalMember.amount)} / month</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold opacity-60 uppercase text-[10px] tracking-wider">Current Cycle Status:</span>
                  <span className={`font-extrabold text-[10px] uppercase tracking-wider px-2 py-0.5 ${historyModalMember.isPaid ? 'bg-black text-white' : 'bg-neutral-200 text-neutral-700'}`}>
                    {historyModalMember.isPaid ? 'Collected for Current Cycle' : 'Pending for Current Cycle'}
                  </span>
                </div>
                {historyModalMember.lastPaymentDate && (
                  <div className="flex justify-between items-center text-black font-bold pt-1 border-t border-black/10">
                    <span className="uppercase text-[10px] tracking-wider opacity-60">Last Recorded Payment:</span>
                    <span>{formatDate(historyModalMember.lastPaymentDate)} ({formatPHP(historyModalMember.lastPaidAmount || historyModalMember.amount)})</span>
                  </div>
                )}
              </div>

              <div className="flex-grow overflow-y-auto space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-600 border-b border-black pb-1">
                  Recorded Payment Log
                </h4>
                {(!historyModalMember.paymentHistory || historyModalMember.paymentHistory.length === 0) ? (
                  <p className="text-xs text-neutral-400 italic py-4 text-center">
                    No individual historical payments recorded yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {historyModalMember.paymentHistory.map((rec) => (
                      <div key={rec.id} className="border border-black p-3 bg-white flex items-center justify-between">
                        <div>
                          <div className="text-xs font-black">{formatPHP(rec.amount)}</div>
                          <div className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider mt-0.5">
                            Cycle: {rec.cycleKey} • Date: {formatDate(rec.date)}
                          </div>
                          {rec.note && (
                            <div className="text-[9px] text-neutral-600 font-medium mt-0.5">{rec.note}</div>
                          )}
                        </div>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 border border-black ${rec.type === 'advance' ? 'bg-black text-white' : 'bg-neutral-100 text-black'}`}>
                          {rec.type === 'advance' ? 'Advance' : 'Regular'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-black">
                <button
                  type="button"
                  onClick={() => setHistoryModalMember(null)}
                  className="bg-black text-white text-[10px] font-extrabold uppercase tracking-widest px-6 py-2.5 border border-black hover:opacity-80"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white pb-10 flex flex-col transition-[filter] duration-300 ${isDark ? 'invert' : ''}`}>
      {!isClient ? null : (
      <div className="w-full max-w-7xl mx-auto flex-grow flex flex-col">
        
        {/* Header */}
        <header className="h-20 border-b-2 border-black flex items-center justify-between px-4 sm:px-8 bg-white shrink-0 mb-8 sm:mb-12 sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex w-10 h-10 bg-black items-center justify-center">
              <span className="text-white font-bold text-xl tracking-tighter">P</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tighter">Personal Dashboard</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 ml-auto overflow-x-auto hide-scrollbar w-full sm:w-auto justify-between sm:justify-start">
            <nav className="flex gap-1">
              {[
                { id: 'tasks', label: 'Tasks' },
                { id: 'work-notes', label: 'Work Notes' },
                { id: 'calendar', label: 'Calendar' },
                { id: 'overtime', label: 'Overtime' },
                { id: 'finance', label: 'Finance' },
                { id: 'motorcycle', label: 'Motorcycle' },
                { id: 'google-ai', label: 'Google AI Pro' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`
                    px-4 sm:px-6 py-2 border border-black font-semibold text-xs sm:text-sm uppercase transition-colors shrink-0
                    ${activeTab === tab.id 
                      ? 'bg-black text-white' 
                      : 'bg-white text-black hover:bg-black hover:text-white'}
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 border border-black bg-white text-black hover:bg-black hover:text-white transition-colors shrink-0 ml-2"
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        {/* Tab Content */}
        <main className="min-h-[60vh] px-4 sm:px-10">
          {activeTab === 'tasks' && renderTasksTab()}
          {activeTab === 'work-notes' && (
            <WorkNotesTab
              workNotes={workNotes}
              setWorkNotes={setWorkNotes}
              tasks={tasks}
              isDark={isDark}
              onNavigateToCalendar={(date) => {
                if (date) setCalendarSelectedDate(date);
                setActiveTab('calendar');
              }}
            />
          )}
          {activeTab === 'calendar' && (
            <CalendarTab
              tasks={tasks}
              setTasks={setTasks}
              workNotes={workNotes}
              setWorkNotes={setWorkNotes}
              isDark={isDark}
              initialSelectedDate={calendarSelectedDate}
              onNavigateToWorkNotes={() => setActiveTab('work-notes')}
              onNavigateToTasks={() => setActiveTab('tasks')}
            />
          )}
          {activeTab === 'overtime' && renderOvertimeTab()}
          {activeTab === 'finance' && renderFinanceTab()}
          {activeTab === 'motorcycle' && renderMotorcycleTab()}
          {activeTab === 'google-ai' && renderGoogleAITab()}
        </main>

      </div>
      )}
    </div>
  );
}
