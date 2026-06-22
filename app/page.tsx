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
  Moon
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

// --- TYPES ---
type TaskCategory = 'Work' | 'Personal' | 'Urgent' | 'None';

type Task = {
  id: string;
  text: string;
  description?: string;
  deadline: string;
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

type HomePaidState = {
  meralco?: string;
  wifi?: string;
  samsung?: string;
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
  // Time-only value (HH:MM)
  if (/^\d{2}:\d{2}$/.test(dateString)) {
    const [h, m] = dateString.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  const date = new Date(dateString);
  // Ensure we get valid date
  if (isNaN(date.getTime())) return dateString;
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' };
  // Check if it's just a date without time
  if (dateString.length <= 10) {
    options.hour = undefined;
    options.minute = undefined;
    // Add timezone adjustment context if needed or just use UTC to avoid off-by-one errors with YYYY-MM-DD
    return new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', options);
  }
  return date.toLocaleDateString('en-US', options);
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

// --- MAIN COMPONENT ---
export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'tasks' | 'overtime' | 'finance'>('tasks');

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
  const [homePrice, setHomePrice] = useState<number | ''>('');
  const [bankBalance, setBankBalance] = useState<number | ''>('');
  
  const [bills, setBills] = useState<Bill[]>([]);
  const [newBillName, setNewBillName] = useState('');
  const [newBillDate, setNewBillDate] = useState('');
  const [newBillRepeatMonthly, setNewBillRepeatMonthly] = useState(false);

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

      const storedWorkLogs = localStorage.getItem('dash_workLogs');
      if (storedWorkLogs) setWorkLogs(JSON.parse(storedWorkLogs));

      const storedBills = localStorage.getItem('dash_bills');
      if (storedBills) setBills(JSON.parse(storedBills));

      const storedHomePrice = localStorage.getItem('dash_homePrice');
      if (storedHomePrice && storedHomePrice !== '') setHomePrice(Number(storedHomePrice));

      const storedBankBalance = localStorage.getItem('dash_bankBalance');
      if (storedBankBalance && storedBankBalance !== '') setBankBalance(Number(storedBankBalance));

      const storedMeralcoBill = localStorage.getItem('dash_meralcoBill');
      if (storedMeralcoBill && storedMeralcoBill !== '') setMeralcoBill(Number(storedMeralcoBill));

      const storedSamsungRemaining = localStorage.getItem('dash_samsungRemaining');
      if (storedSamsungRemaining && storedSamsungRemaining !== '') setSamsungRemaining(Number(storedSamsungRemaining));
      else setSamsungRemaining(SAMSUNG_START_BALANCE);

      const storedHomePaid = localStorage.getItem('dash_homePaid');
      if (storedHomePaid) setHomePaid(JSON.parse(storedHomePaid));

      const storedTheme = localStorage.getItem('dash_theme');
      if (storedTheme === 'dark') setIsDark(true);
    });
  }, []);

  useEffect(() => {
    if (isClient) localStorage.setItem('dash_tasks', JSON.stringify(tasks));
  }, [tasks, isClient]);

  useEffect(() => {
    if (isClient) localStorage.setItem('dash_workLogs', JSON.stringify(workLogs));
  }, [workLogs, isClient]);

  useEffect(() => {
    if (isClient) localStorage.setItem('dash_bills', JSON.stringify(bills));
  }, [bills, isClient]);

  useEffect(() => {
    if (isClient) localStorage.setItem('dash_homePrice', homePrice.toString());
  }, [homePrice, isClient]);

  useEffect(() => {
    if (isClient) localStorage.setItem('dash_bankBalance', bankBalance.toString());
  }, [bankBalance, isClient]);

  useEffect(() => {
    if (isClient) localStorage.setItem('dash_meralcoBill', meralcoBill.toString());
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

  const calculateLoggedHours = (inTime: string, outTime: string) => {
    if (!inTime || !outTime) return '';
    const [inH, inM] = inTime.split(':').map(Number);
    const [outH, outM] = outTime.split(':').map(Number);
    let diff = (outH * 60 + outM) - (inH * 60 + inM);
    if (diff < 0) diff += 24 * 60;
    return Number((diff / 60).toFixed(2));
  };

  const getMonthKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  const getNextDueDate = (dayOfMonth: number) => {
    const now = new Date();
    const dueThisMonth = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
    if (now.getTime() <= dueThisMonth.getTime()) return dueThisMonth;
    return new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth);
  };

  const handlePayAllHomeUtilities = () => {
    const monthKey = getMonthKey(new Date());
    const remaining = samsungRemaining === '' ? 0 : Number(samsungRemaining);
    const shouldPaySamsung = remaining > 0 && homePaid.samsung !== monthKey;

    setHomePaid((prev) => ({
      ...prev,
      meralco: monthKey,
      wifi: monthKey,
      ...(remaining > 0 ? { samsung: monthKey } : {}),
    }));

    if (shouldPaySamsung) {
      const payment = Math.min(SAMSUNG_BILL, remaining);
      setSamsungRemaining(Math.max(0, remaining - payment));
    }
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
    setTasks(tasks.filter((t) => t.id !== id));
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

  const advanceBillOneMonth = (bill: Bill): Bill => {
    const d = new Date(bill.dueDate + 'T00:00:00');
    d.setMonth(d.getMonth() + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return { ...bill, id: crypto.randomUUID(), dueDate: `${yyyy}-${mm}-${dd}` };
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
      <div className="grid grid-cols-2 gap-4">
        <div className="border border-black p-6 flex flex-col justify-center items-center bg-white text-black">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Active Tasks</p>
          <p className="text-4xl font-extrabold">{activeTasksCount}</p>
        </div>
        <div className="border border-black p-6 flex flex-col justify-center items-center bg-black text-white">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">Completed Tasks</p>
          <p className="text-4xl font-extrabold">{completedTasksCount}</p>
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
                <input
                  type="time"
                  value={newTaskDeadlineTime}
                  onChange={(e) => setNewTaskDeadlineTime(e.target.value)}
                  className="w-full border border-black px-4 py-3 focus:outline-none focus:bg-neutral-50 uppercase text-xs font-semibold"
                />
              </div>
            ) : (
              <input
                type="date"
                value={newTaskDeadline}
                onChange={(e) => setNewTaskDeadline(e.target.value)}
                className="w-full border border-black px-4 py-3 focus:outline-none focus:bg-neutral-50 uppercase text-xs font-semibold"
              />
            )}
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
        <button type="submit" className="w-full md:w-auto bg-black text-white px-8 py-3 text-[10px] font-bold uppercase tracking-widest hover:opacity-80 transition-opacity flex items-center justify-center space-x-2">
          <Plus size={16} /> <span>Submit Task</span>
        </button>
      </form>

      {/* Task List */}
      <div className="border border-black bg-white">
        <div className="border-b border-black p-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-lg font-extrabold uppercase tracking-tight">Tasks Queue</h2>
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
                        {task.deadline && (
                          <p className="text-[10px] uppercase font-semibold opacity-70 flex items-center mt-1">
                            Due: {formatDate(task.deadline)}
                          </p>
                        )}
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
                            ? prompt('Edit deadline time (HH:MM). Leave blank for date-only:', currentTime)
                            : '';
                          if (nextTime === null) return;

                          const nextDeadline = nextDate.trim()
                            ? nextTime && nextTime.trim()
                              ? `${nextDate.trim()}T${nextTime.trim()}`
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
                          {task.deadline && (
                            <p className="text-[10px] uppercase font-semibold opacity-70 flex items-center mt-1">
                              Due: {formatDate(task.deadline)}
                            </p>
                          )}
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
                              ? prompt('Edit deadline time (HH:MM). Leave blank for date-only:', currentTime)
                              : '';
                            if (nextTime === null) return;

                            const nextDeadline = nextDate.trim()
                              ? nextTime && nextTime.trim()
                                ? `${nextDate.trim()}T${nextTime.trim()}`
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
                <label className="block text-[10px] font-bold uppercase mb-2 opacity-70">Time In</label>
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
                <label className="block text-[10px] font-bold uppercase mb-2 opacity-70">Time Out</label>
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
    const debtNumeric = homePrice === '' ? 0 : Number(homePrice);
    const bankNumeric = bankBalance === '' ? 0 : Number(bankBalance);
    const remainingDebt = Math.max(0, debtNumeric - bankNumeric);

    const meralcoNumeric = meralcoBill === '' ? 0 : Number(meralcoBill);
    const samsungRemainingNumeric = samsungRemaining === '' ? 0 : Number(samsungRemaining);
    const samsungPaymentDue = samsungRemainingNumeric > 0 ? Math.min(SAMSUNG_BILL, samsungRemainingNumeric) : 0;
    const totalUtilities = meralcoNumeric + WIFI_BILL + samsungPaymentDue;

    const dueDate = new Date(2026, 5, 25, 12, 0, 0); // June 25, 2026 (noon to avoid UTC offset shift)
    const currentMonthKey = getMonthKey(new Date());
    const isMeralcoPaid = homePaid.meralco === currentMonthKey;
    const isWifiPaid = homePaid.wifi === currentMonthKey;
    const isSamsungPaid = homePaid.samsung === currentMonthKey;
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
        
        {/* Debt Calculator */}
        <div className="border border-black flex flex-col md:flex-row shadow-none">
          <div className="bg-white p-8 sm:p-10 flex-grow border-b md:border-b-0 md:border-r border-black">
            <h2 className="text-3xl font-extrabold uppercase tracking-tighter mb-8 pb-4 flex flex-col">
              Finance Tracking
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-50 mt-1">PHP ₱ Allocation Module</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider opacity-50 mb-2">Total Home Price / Setup</label>
                <div className="flex items-center">
                  <span className="text-xl font-extrabold mr-2">₱</span>
                  <input 
                    type="number" 
                    value={homePrice}
                    onChange={(e) => setHomePrice(e.target.value !== '' ? Number(e.target.value) : '')}
                    className="w-full bg-transparent border-b-2 border-black/20 px-0 py-2 text-2xl font-extrabold focus:outline-none focus:border-black transition-colors placeholder-black/20"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider opacity-50 mb-2">Current Bank Allocation</label>
                <div className="flex items-center">
                  <span className="text-xl font-extrabold mr-2">₱</span>
                  <input 
                    type="number" 
                    value={bankBalance}
                    onChange={(e) => setBankBalance(e.target.value !== '' ? Number(e.target.value) : '')}
                    className="w-full bg-transparent border-b-2 border-black/20 px-0 py-2 text-2xl font-extrabold focus:outline-none focus:border-black transition-colors placeholder-black/20"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="bg-black text-white p-8 sm:p-10 shrink-0 flex flex-col justify-center min-w-[300px]">
             <label className="block text-[10px] font-bold uppercase tracking-wider opacity-70 mb-2 border-b border-white/20 pb-2">Remaining Target Setup</label>
             <div className="text-3xl sm:text-4xl font-extrabold tracking-tighter mt-2 break-all">
               {formatPHP(remainingDebt)}
             </div>
          </div>
        </div>

        {/* Home Utilities */}
        <div className="border border-black flex flex-col md:flex-row shadow-none">
          <div className="bg-white p-8 sm:p-10 flex-grow border-b md:border-b-0 md:border-r border-black">
            <div className="flex items-start justify-between gap-4 mb-6 pb-2 border-b border-black">
              <h2 className="text-xl font-extrabold uppercase tracking-tight">
                Home Utilities & Fixed Costs
              </h2>
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
                { id: 'overtime', label: 'Overtime' },
                { id: 'finance', label: 'Finance' },
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
            <a
              href="/Bertillo_Louisse_resume.pdf"
              download="Bertillo_Louisse_resume.pdf"
              className="px-4 sm:px-6 py-2 border border-black font-semibold text-xs sm:text-sm uppercase transition-colors shrink-0 bg-white text-black hover:bg-black hover:text-white"
            >
              Download Resume
            </a>
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
          {activeTab === 'overtime' && renderOvertimeTab()}
          {activeTab === 'finance' && renderFinanceTab()}
        </main>

      </div>
      )}
    </div>
  );
}
