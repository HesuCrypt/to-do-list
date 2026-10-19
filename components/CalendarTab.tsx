'use client';

import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle, 
  Circle, 
  Plus, 
  AlertCircle,
  FileText,
  Briefcase,
  Check,
  X,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Task, 
  TaskCategory, 
  WorkNote, 
  checkDateBusyStatus, 
  formatDateToYYYYMMDD 
} from '@/lib/calendar-utils';

interface CalendarTabProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  workNotes: WorkNote[];
  setWorkNotes: React.Dispatch<React.SetStateAction<WorkNote[]>>;
  isDark: boolean;
  initialSelectedDate?: string;
  onNavigateToWorkNotes?: (date?: string) => void;
  onNavigateToTasks?: () => void;
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CalendarTab({
  tasks,
  setTasks,
  workNotes,
  setWorkNotes,
  isDark,
  initialSelectedDate,
  onNavigateToWorkNotes,
  onNavigateToTasks,
}: CalendarTabProps) {
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => formatDateToYYYYMMDD(today), [today]);

  // Current viewed month and year
  const [currentDate, setCurrentDate] = useState(() => {
    if (initialSelectedDate) {
      const [y, m] = initialSelectedDate.split('-').map(Number);
      if (!isNaN(y) && !isNaN(m)) return new Date(y, m - 1, 1);
    }
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  // Selected date for day inspector
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    initialSelectedDate || todayStr
  );

  // Quick add modal state
  const [quickAddType, setQuickAddType] = useState<'task' | 'note' | null>(null);
  const [quickAddText, setQuickAddText] = useState('');
  const [quickAddTime, setQuickAddTime] = useState('14:00');
  const [quickAddCategory, setQuickAddCategory] = useState<string>('Work');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleGoToToday = () => {
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDateStr(todayStr);
  };

  // Month grid calculation
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const totalDaysInMonth = lastDayOfMonth.getDate();

    // Day of week for first day (0 = Sun, 1 = Mon, ..., 6 = Sat)
    // We want Mon as index 0, Sun as index 6
    const firstDayIndex = (firstDayOfMonth.getDay() + 6) % 7;

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
    }> = [];

    // Prev month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dStr = formatDateToYYYYMMDD(prevDate);
      days.push({
        dateStr: dStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        isSelected: dStr === selectedDateStr,
      });
    }

    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const d = new Date(year, month, i);
      const dStr = formatDateToYYYYMMDD(d);
      days.push({
        dateStr: dStr,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: dStr === todayStr,
        isSelected: dStr === selectedDateStr,
      });
    }

    // Next month padding to fill out 35 or 42 cells (5 or 6 rows)
    const remainingCells = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
      const nextDate = new Date(year, month + 1, i);
      const dStr = formatDateToYYYYMMDD(nextDate);
      days.push({
        dateStr: dStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        isSelected: dStr === selectedDateStr,
      });
    }

    return days;
  }, [year, month, todayStr, selectedDateStr]);

  // Selected date data
  const selectedBusyStatus = useMemo(() => {
    return checkDateBusyStatus(selectedDateStr, tasks, workNotes);
  }, [selectedDateStr, tasks, workNotes]);

  const selectedDateFormatted = useMemo(() => {
    if (!selectedDateStr) return '';
    const d = new Date(selectedDateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [selectedDateStr]);

  // Tasks and Work Notes on selected date
  const selectedTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (!t.deadline) return false;
      const d = t.deadline.includes('T') ? t.deadline.split('T')[0] : t.deadline.trim();
      return d === selectedDateStr;
    });
  }, [tasks, selectedDateStr]);

  const selectedWorkNotes = useMemo(() => {
    return workNotes.filter((w) => {
      if (!w.date) return false;
      const d = w.date.includes('T') ? w.date.split('T')[0] : w.date.trim();
      return d === selectedDateStr;
    });
  }, [workNotes, selectedDateStr]);

  const handleToggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isCompleted: !t.isCompleted } : t))
    );
  };

  const handleToggleWorkNote = (id: string) => {
    setWorkNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isCompleted: !n.isCompleted } : n))
    );
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleDeleteWorkNote = (id: string) => {
    setWorkNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddText.trim()) return;

    if (quickAddType === 'task') {
      const deadline = quickAddTime ? `${selectedDateStr}T${quickAddTime}` : selectedDateStr;
      const newTask: Task = {
        id: crypto.randomUUID(),
        text: quickAddText.trim(),
        deadline,
        isImportant: false,
        isCompleted: false,
        category: (quickAddCategory as TaskCategory) || 'Work',
      };
      setTasks((prev) => [newTask, ...prev]);
    } else if (quickAddType === 'note') {
      const newNote: WorkNote = {
        id: crypto.randomUUID(),
        title: quickAddText.trim(),
        date: selectedDateStr,
        time: quickAddTime || undefined,
        category: 'Development',
        status: 'In Progress',
        content: '',
        isCompleted: false,
        createdAt: new Date().toISOString(),
      };
      setWorkNotes((prev) => [newNote, ...prev]);
    }

    setQuickAddText('');
    setQuickAddType(null);
  };

  // Month stats
  const monthStats = useMemo(() => {
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const monthTasks = tasks.filter((t) => t.deadline && t.deadline.startsWith(monthPrefix));
    const monthNotes = workNotes.filter((w) => w.date && w.date.startsWith(monthPrefix));
    return {
      totalTasks: monthTasks.length,
      completedTasks: monthTasks.filter((t) => t.isCompleted).length,
      totalNotes: monthNotes.length,
    };
  }, [tasks, workNotes, year, month]);

  // Hourly timeline slots (8am to 8pm)
  const timelineHours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Month Overview Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="border border-black p-5 flex flex-col justify-center items-center bg-white text-black">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Schedule Rule</p>
          <p className="text-sm font-extrabold uppercase text-center">Mon–Fri 10AM–7PM</p>
          <span className="text-[9px] font-bold text-red-600 uppercase tracking-wider mt-0.5">● Automatic Busy</span>
        </div>
        <div className="border border-black p-5 flex flex-col justify-center items-center bg-black text-white">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">Month Tasks</p>
          <p className="text-3xl font-extrabold">{monthStats.totalTasks}</p>
          <span className="text-[9px] opacity-70">({monthStats.completedTasks} completed)</span>
        </div>
        <div className="border border-black p-5 flex flex-col justify-center items-center bg-white text-black">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Month Work Notes</p>
          <p className="text-3xl font-extrabold">{monthStats.totalNotes}</p>
          <span className="text-[9px] opacity-60">logged this month</span>
        </div>
        <div className="border border-black p-5 flex flex-col justify-center items-center bg-white text-black">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Selected Date</p>
          <p className="text-xs font-black uppercase text-center">{selectedDateStr}</p>
          <span className={`text-[10px] font-extrabold uppercase mt-1 px-2 py-0.5 ${
            selectedBusyStatus.isBusy ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
          }`}>
            {selectedBusyStatus.isBusy ? 'BUSY' : 'AVAILABLE'}
          </span>
        </div>
      </div>

      {/* Calendar Controls & Month Title */}
      <div className="border border-black bg-white p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black pb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <button
              type="button"
              onClick={handleGoToToday}
              className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 border border-black hover:bg-black hover:text-white transition-colors"
            >
              Today
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-2 border border-black bg-white hover:bg-black hover:text-white transition-colors"
              aria-label="Previous Month"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 border border-black bg-white hover:bg-black hover:text-white transition-colors"
              aria-label="Next Month"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-wider pt-1 opacity-80">
          <span className="opacity-50">Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-red-600 border border-black inline-block" />
            <span>Red = Busy Day (Mon–Fri 10AM–7PM / Tasks)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-white border border-green-600 inline-block text-green-700" />
            <span>Green = Available (Weekend, No Tasks)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-black inline-block" />
            <span>Task Scheduled</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
            <span>Work Note</span>
          </div>
        </div>
      </div>

      {/* Main Grid & Selected Day Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Calendar Month Grid */}
        <div className="lg:col-span-8 border border-black bg-white">
          {/* Day of week headers */}
          <div className="grid grid-cols-7 border-b border-black text-center bg-neutral-100">
            {DAYS_OF_WEEK.map((day, idx) => {
              const isWeekend = idx >= 5;
              return (
                <div 
                  key={day} 
                  className={`py-2 text-[10px] sm:text-xs font-black uppercase tracking-wider border-r last:border-r-0 border-black ${
                    isWeekend ? 'bg-neutral-200/60 text-neutral-700' : 'text-black'
                  }`}
                >
                  {day}
                  {!isWeekend && (
                    <span className="block text-[8px] font-normal text-red-600 tracking-normal">10–7</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Day cells grid */}
          <div className="grid grid-cols-7 divide-y divide-black/20">
            {calendarDays.map((day) => {
              const dayBusy = checkDateBusyStatus(day.dateStr, tasks, workNotes);
              const dayTasks = tasks.filter((t) => {
                if (!t.deadline) return false;
                const d = t.deadline.includes('T') ? t.deadline.split('T')[0] : t.deadline.trim();
                return d === day.dateStr;
              });
              const dayNotes = workNotes.filter((w) => {
                if (!w.date) return false;
                const d = w.date.includes('T') ? w.date.split('T')[0] : w.date.trim();
                return d === day.dateStr;
              });

              return (
                <button
                  key={day.dateStr}
                  type="button"
                  onClick={() => setSelectedDateStr(day.dateStr)}
                  className={`
                    min-h-[92px] sm:min-h-[115px] p-1.5 sm:p-2 text-left flex flex-col justify-between border-r border-black/20 last:border-r-0 transition-all relative
                    ${day.isSelected ? 'ring-2 ring-black bg-neutral-100 z-10' : 'hover:bg-neutral-50'}
                    ${!day.isCurrentMonth ? 'opacity-30 bg-neutral-50/50' : 'bg-white'}
                  `}
                >
                  {/* Top Bar inside cell: Day Number + Status Badge */}
                  <div className="flex items-start justify-between w-full">
                    <span
                      className={`text-xs sm:text-sm font-extrabold ${
                        day.isToday
                          ? 'w-6 h-6 rounded-none bg-black text-white flex items-center justify-center text-[10px]'
                          : day.isSelected
                          ? 'text-black underline underline-offset-2'
                          : 'text-black'
                      }`}
                    >
                      {day.dayNumber}
                    </span>

                    {/* RED BUSY indicator / pill */}
                    {dayBusy.isBusy ? (
                      <span
                        className="px-1 py-0.2 sm:px-1.5 sm:py-0.5 bg-red-600 text-white text-[8px] sm:text-[9px] font-black uppercase tracking-wider shrink-0"
                        title={dayBusy.summaryText}
                      >
                        BUSY
                      </span>
                    ) : (
                      <span
                        className="text-[8px] font-bold text-green-700 uppercase tracking-wider opacity-70"
                        title="Available / Free Weekend"
                      >
                        Free
                      </span>
                    )}
                  </div>

                  {/* Automatic Mon-Fri schedule note in cell */}
                  {dayBusy.isWorkHours && (
                    <div className="text-[8px] font-bold text-red-600 uppercase tracking-tight truncate w-full mt-0.5">
                      10am–7pm Shift
                    </div>
                  )}

                  {/* Tasks and Work Notes preview badges in cell */}
                  <div className="space-y-1 w-full mt-1 overflow-hidden">
                    {dayTasks.slice(0, 2).map((t) => (
                      <div
                        key={t.id}
                        className={`text-[8px] sm:text-[9px] px-1 py-0.5 border truncate font-bold ${
                          t.isCompleted
                            ? 'border-neutral-300 bg-neutral-100 line-through text-neutral-400'
                            : 'border-black bg-neutral-900 text-white'
                        }`}
                        title={t.text}
                      >
                        {t.text}
                      </div>
                    ))}
                    {dayTasks.length > 2 && (
                      <div className="text-[8px] font-bold text-neutral-500">
                        +{dayTasks.length - 2} more task{dayTasks.length - 2 > 1 ? 's' : ''}
                      </div>
                    )}

                    {dayNotes.length > 0 && dayTasks.length < 2 && (
                      <div className="text-[8px] text-blue-700 font-bold truncate flex items-center gap-0.5">
                        <FileText size={8} /> {dayNotes.length} note{dayNotes.length > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>

                  {/* Bottom selection accent */}
                  {day.isSelected && (
                    <div className="w-full h-1 bg-black absolute bottom-0 left-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Inspector / Agenda Panel */}
        <div className="lg:col-span-4 border border-black bg-white p-5 sm:p-6 space-y-6">
          <div className="border-b border-black pb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 block">Day Agenda</span>
            <h3 className="text-lg font-black uppercase tracking-tight">{selectedDateFormatted}</h3>
          </div>

          {/* BUSY STATUS BANNER (RED IF BUSY) */}
          {selectedBusyStatus.isBusy ? (
            <div className="border-2 border-red-600 bg-red-50 p-4 text-red-950 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-600 shrink-0 animate-pulse" />
                <h4 className="font-black uppercase text-xs sm:text-sm tracking-wider text-red-700">
                  🔴 BUSY DAY DETECTED
                </h4>
              </div>
              <p className="text-xs font-bold text-red-900">
                {selectedBusyStatus.busyReason}
              </p>
              {selectedBusyStatus.isWorkHours && (
                <div className="text-[11px] text-red-800 bg-red-100/80 p-2 border border-red-300 font-medium">
                  <strong>Automatic Schedule:</strong> Monday to Friday 10:00 AM – 7:00 PM blocked for work shift.
                </div>
              )}
            </div>
          ) : (
            <div className="border-2 border-green-600 bg-green-50 p-4 text-green-950 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-600 shrink-0" />
                <h4 className="font-black uppercase text-xs sm:text-sm tracking-wider text-green-700">
                  🟢 AVAILABLE / FREE
                </h4>
              </div>
              <p className="text-xs font-semibold text-green-900">
                Weekend with no scheduled tasks or deadlines.
              </p>
            </div>
          )}

          {/* Quick Add Buttons for Selected Date */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setQuickAddType('task')}
              className="py-2.5 px-3 border border-black bg-black text-white text-[10px] font-bold uppercase tracking-wider hover:opacity-80 flex items-center justify-center gap-1.5"
            >
              <Plus size={14} /> <span>Add Task</span>
            </button>
            <button
              type="button"
              onClick={() => setQuickAddType('note')}
              className="py-2.5 px-3 border border-black bg-white text-black text-[10px] font-bold uppercase tracking-wider hover:bg-neutral-100 flex items-center justify-center gap-1.5"
            >
              <FileText size={14} /> <span>Add Note</span>
            </button>
          </div>

          {/* Quick Add Form */}
          {quickAddType && (
            <form onSubmit={handleQuickAdd} className="border border-black p-3 bg-neutral-50 space-y-3">
              <div className="flex items-center justify-between border-b border-black pb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">
                  Quick Add {quickAddType === 'task' ? 'Task' : 'Work Note'} for {selectedDateStr}
                </span>
                <button
                  type="button"
                  onClick={() => setQuickAddType(null)}
                  className="text-xs hover:opacity-60"
                >
                  <X size={14} />
                </button>
              </div>
              <input
                type="text"
                value={quickAddText}
                onChange={(e) => setQuickAddText(e.target.value)}
                placeholder={quickAddType === 'task' ? 'Task title...' : 'Work note title...'}
                className="w-full border border-black px-3 py-2 text-xs font-semibold bg-white focus:outline-none"
                autoFocus
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold uppercase opacity-60 mb-1">Time (HH:MM)</label>
                  <input
                    type="time"
                    value={quickAddTime}
                    onChange={(e) => setQuickAddTime(e.target.value)}
                    className="w-full border border-black px-2 py-1.5 text-xs font-semibold bg-white focus:outline-none"
                  />
                </div>
                {quickAddType === 'task' && (
                  <div>
                    <label className="block text-[9px] font-bold uppercase opacity-60 mb-1">Category</label>
                    <select
                      value={quickAddCategory}
                      onChange={(e) => setQuickAddCategory(e.target.value)}
                      className="w-full border border-black px-2 py-1.5 text-xs font-semibold bg-white focus:outline-none"
                    >
                      <option value="Work">Work</option>
                      <option value="Personal">Personal</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                )}
              </div>
              <button
                type="submit"
                className="w-full bg-black text-white py-2 text-[10px] font-bold uppercase tracking-wider hover:opacity-80"
              >
                Save to {selectedDateStr}
              </button>
            </form>
          )}

          {/* Visual Day Hourly Timeline */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-70">
              Timeline (10AM–7PM Work Hours)
            </h4>
            <div className="border border-black divide-y divide-black/10 text-xs">
              {timelineHours.map((hour) => {
                const hourFormatted = `${hour < 10 ? '0' + hour : hour}:00`;
                const isWorkHourSlot = selectedBusyStatus.isWorkHours && hour >= 10 && hour <= 18;
                
                // Find tasks matching this hour
                const matchingTasks = selectedTasks.filter((t) => {
                  if (!t.deadline || !t.deadline.includes('T')) return false;
                  const timePart = t.deadline.split('T')[1];
                  const taskHour = parseInt(timePart.split(':')[0], 10);
                  return taskHour === hour;
                });

                return (
                  <div
                    key={hour}
                    className={`flex items-start p-1.5 sm:p-2 text-[11px] gap-2 ${
                      isWorkHourSlot ? 'bg-red-50/80' : 'bg-white'
                    }`}
                  >
                    <span className="w-12 font-mono font-bold opacity-60 shrink-0 text-[10px]">
                      {hourFormatted}
                    </span>
                    <div className="flex-1 space-y-1">
                      {isWorkHourSlot && hour === 10 && (
                        <span className="inline-block text-[9px] font-extrabold uppercase text-red-700 bg-red-100 px-1.5 py-0.5 border border-red-300">
                          Work Shift Starts (10:00 AM)
                        </span>
                      )}
                      {isWorkHourSlot && hour > 10 && hour < 18 && (
                        <span className="text-[9px] font-semibold text-red-600/80">
                          Work Shift Active
                        </span>
                      )}
                      {isWorkHourSlot && hour === 18 && (
                        <span className="inline-block text-[9px] font-extrabold uppercase text-red-700 bg-red-100 px-1.5 py-0.5 border border-red-300">
                          Work Shift Ends at 7:00 PM
                        </span>
                      )}
                      {matchingTasks.map((t) => (
                        <div
                          key={t.id}
                          className="px-2 py-1 bg-black text-white text-[10px] font-bold uppercase tracking-wider flex items-center justify-between"
                        >
                          <span>{t.text}</span>
                          <span className="text-[9px] opacity-70">{t.category}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tasks List on this Date */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                Tasks on this Date ({selectedTasks.length})
              </h4>
              {onNavigateToTasks && (
                <button
                  type="button"
                  onClick={onNavigateToTasks}
                  className="text-[9px] font-bold uppercase underline hover:opacity-60"
                >
                  Go to Tasks tab
                </button>
              )}
            </div>

            {selectedTasks.length === 0 ? (
              <p className="text-xs text-neutral-400 italic">No tasks scheduled for this day.</p>
            ) : (
              <ul className="space-y-2 border border-black p-3 divide-y divide-black/10">
                {selectedTasks.map((task) => (
                  <li key={task.id} className="pt-2 first:pt-0 flex items-start gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleToggleTask(task.id)}
                      className="mt-0.5 focus:outline-none shrink-0"
                    >
                      {task.isCompleted ? (
                        <CheckCircle size={16} className="text-black" />
                      ) : (
                        <Circle size={16} className="text-black" />
                      )}
                    </button>
                    <div className="space-y-0.5 flex-1">
                      <p
                        className={`text-xs font-bold leading-tight ${
                          task.isCompleted ? 'line-through text-neutral-400' : 'text-black'
                        }`}
                      >
                        {task.text}
                      </p>
                      <div className="flex items-center gap-2 text-[9px] font-semibold opacity-60">
                        <span>{task.category}</span>
                        {task.deadline && task.deadline.includes('T') && (
                          <span>Due: {task.deadline.split('T')[1]}</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1 opacity-40 hover:opacity-100 hover:text-red-600 transition-all shrink-0"
                      title="Delete task"
                      aria-label="Delete task"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Work Notes on this Date */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                Work Notes on this Date ({selectedWorkNotes.length})
              </h4>
              {onNavigateToWorkNotes && (
                <button
                  type="button"
                  onClick={() => onNavigateToWorkNotes(selectedDateStr)}
                  className="text-[9px] font-bold uppercase underline hover:opacity-60"
                >
                  Open in Work Notes
                </button>
              )}
            </div>

            {selectedWorkNotes.length === 0 ? (
              <p className="text-xs text-neutral-400 italic">No work notes logged for this day.</p>
            ) : (
              <ul className="space-y-2 border border-black p-3 divide-y divide-black/10">
                {selectedWorkNotes.map((note) => (
                  <li key={note.id} className="pt-2 first:pt-0 flex items-start gap-2.5 justify-between">
                    <div className="flex items-start gap-2.5 flex-1">
                      <button
                        type="button"
                        onClick={() => handleToggleWorkNote(note.id)}
                        className="mt-0.5 focus:outline-none shrink-0"
                      >
                        {note.isCompleted ? (
                          <CheckCircle size={16} className="text-black" />
                        ) : (
                          <Circle size={16} className="text-black" />
                        )}
                      </button>
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p
                            className={`text-xs font-bold leading-tight ${
                              note.isCompleted ? 'line-through text-neutral-400' : 'text-black'
                            }`}
                          >
                            {note.title}
                          </p>
                          {(note.status === 'In Progress - No ETA' || (note.status === 'In Progress' && note.eta === 'No ETA')) && (
                            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-950 border border-black text-[8px] font-black uppercase">
                              No ETA
                            </span>
                          )}
                          {note.status === 'In Progress' && note.eta !== 'No ETA' && (
                            <span className="px-1.5 py-0.2 bg-neutral-100 text-black border border-black text-[8px] font-bold uppercase">
                              In Progress
                            </span>
                          )}
                          {note.status === 'Blocked' && (
                            <span className="px-1.5 py-0.2 bg-red-600 text-white border border-black text-[8px] font-bold uppercase">
                              Blocked
                            </span>
                          )}
                          {note.category && (
                            <span className="px-1.5 py-0.2 bg-neutral-50 text-neutral-600 border border-neutral-300 text-[8px] font-semibold uppercase">
                              {note.category}
                            </span>
                          )}
                          {note.hours && (
                            <span className="text-[9px] font-semibold text-neutral-500">
                              [{note.hours}]
                            </span>
                          )}
                          {note.eta && note.eta !== 'No ETA' && (
                            <span className="text-[9px] font-semibold text-neutral-500">
                              (ETA: {note.eta})
                            </span>
                          )}
                        </div>
                        {note.content && (
                          <p className="text-[10px] text-neutral-600 line-clamp-2">
                            {note.content}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteWorkNote(note.id)}
                      className="p-1 opacity-40 hover:opacity-100 hover:text-red-600 transition-all shrink-0"
                      title="Delete work note"
                      aria-label="Delete work note"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
