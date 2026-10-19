'use client';

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Pencil, 
  CheckCircle, 
  Circle, 
  Copy, 
  Check, 
  Calendar as CalendarIcon, 
  Clock, 
  Search, 
  Briefcase, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle, 
  PlayCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  WorkNote, 
  WorkNoteCategory, 
  WorkStatus, 
  Task, 
  checkDateBusyStatus, 
  formatDateToYYYYMMDD 
} from '@/lib/calendar-utils';

interface WorkNotesTabProps {
  workNotes: WorkNote[];
  setWorkNotes: React.Dispatch<React.SetStateAction<WorkNote[]>>;
  tasks: Task[];
  isDark: boolean;
  onNavigateToCalendar?: (date?: string) => void;
}

const CATEGORIES: WorkNoteCategory[] = [
  'Development',
  'Meeting',
  'Review',
  'Admin',
  'Design',
  'General',
];

const STATUS_LIST: WorkStatus[] = [
  'In Progress',
  'In Progress - No ETA',
  'To Do',
  'Blocked',
  'Completed',
];

export default function WorkNotesTab({
  workNotes,
  setWorkNotes,
  tasks,
  isDark,
  onNavigateToCalendar,
}: WorkNotesTabProps) {
  const todayStr = useMemo(() => formatDateToYYYYMMDD(new Date()), []);

  // Quick Add Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(todayStr);
  const [newCategory, setNewCategory] = useState<WorkNoteCategory>('Development');
  const [newStatus, setNewStatus] = useState<WorkStatus>('In Progress');
  const [newHours, setNewHours] = useState('');
  const [newEta, setNewEta] = useState('');
  const [newContent, setNewContent] = useState('');
  const [showNotesField, setShowNotesField] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterTimeframe, setFilterTimeframe] = useState<'All' | 'Today' | 'Week' | 'Month'>('All');
  const [showCompletedArchive, setShowCompletedArchive] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [standupCopiedToast, setStandupCopiedToast] = useState(false);

  // Edit Modal State
  const [editingNote, setEditingNote] = useState<WorkNote | null>(null);

  // Live busy check for form date
  const formDateBusy = useMemo(() => {
    return checkDateBusyStatus(newDate, tasks, workNotes);
  }, [newDate, tasks, workNotes]);

  // Filtered Notes & Lists (declared before handlers that use them)
  const filteredNotes = useMemo(() => {
    return workNotes
      .filter((note) => {
        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesTitle = note.title.toLowerCase().includes(q);
          const matchesContent = note.content.toLowerCase().includes(q);
          const matchesCat = note.category.toLowerCase().includes(q);
          const matchesEta = note.eta ? note.eta.toLowerCase().includes(q) : false;
          const matchesStatus = (note.status || '').toLowerCase().includes(q);
          if (!matchesTitle && !matchesContent && !matchesCat && !matchesEta && !matchesStatus) return false;
        }

        // Category Filter
        if (filterCategory !== 'All' && note.category !== filterCategory) {
          return false;
        }

        // Status Filter
        if (filterStatus !== 'All') {
          const currentStatus = note.status || (note.isCompleted ? 'Completed' : 'In Progress');
          if (filterStatus === 'In Progress') {
            if (currentStatus !== 'In Progress' && currentStatus !== 'In Progress - No ETA') return false;
          } else if (filterStatus === 'In Progress - No ETA') {
            const isNoEta = currentStatus === 'In Progress - No ETA' || (currentStatus === 'In Progress' && note.eta === 'No ETA');
            if (!isNoEta) return false;
          } else {
            if (currentStatus !== filterStatus) return false;
          }
        }

        // Timeframe filter
        if (filterTimeframe === 'Today') {
          return note.date === todayStr;
        } else if (filterTimeframe === 'Week') {
          const now = new Date();
          const day = now.getDay();
          const diffToMon = (day === 0 ? -6 : 1) - day;
          const mon = new Date(now);
          mon.setDate(now.getDate() + diffToMon);
          const sun = new Date(mon);
          sun.setDate(mon.getDate() + 6);
          const noteD = new Date(note.date + 'T00:00:00');
          return noteD >= mon && noteD <= sun;
        } else if (filterTimeframe === 'Month') {
          const [y, m] = todayStr.split('-');
          return note.date.startsWith(`${y}-${m}`);
        }

        return true;
      })
      .sort((a, b) => {
        // Sort descending by date
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return (b.hours || '').localeCompare(a.hours || '');
      });
  }, [workNotes, searchQuery, filterCategory, filterStatus, filterTimeframe, todayStr]);

  const activeWorkList = useMemo(() => {
    return filteredNotes.filter((n) => !n.isCompleted && n.status !== 'Completed');
  }, [filteredNotes]);

  const completedWorkList = useMemo(() => {
    return filteredNotes.filter((n) => n.isCompleted || n.status === 'Completed');
  }, [filteredNotes]);

  const handleAddWorkItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const isCompleted = newStatus === 'Completed';

    const newNote: WorkNote = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      date: newDate || todayStr,
      category: newCategory,
      status: newStatus,
      hours: newHours.trim() || undefined,
      eta: newEta.trim() || (newStatus === 'In Progress - No ETA' ? 'No ETA' : undefined),
      content: newContent.trim(),
      isCompleted,
      createdAt: new Date().toISOString(),
    };

    setWorkNotes((prev) => [newNote, ...prev]);
    setNewTitle('');
    setNewHours('');
    setNewEta('');
    setNewContent('');
    setShowNotesField(false);
  };

  const handleToggleComplete = (id: string) => {
    setWorkNotes((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n;
        const nextCompleted = !n.isCompleted;
        return {
          ...n,
          isCompleted: nextCompleted,
          status: nextCompleted ? 'Completed' : (n.status === 'Completed' ? 'In Progress' : n.status || 'In Progress'),
        };
      })
    );
  };

  const handleChangeStatus = (id: string, nextStatus: WorkStatus) => {
    setWorkNotes((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n;
        return {
          ...n,
          status: nextStatus,
          isCompleted: nextStatus === 'Completed',
          eta: nextStatus === 'In Progress - No ETA' ? (n.eta || 'No ETA') : n.eta,
        };
      })
    );
  };

  const handleDeleteNote = (id: string) => {
    setWorkNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleCopyNote = (note: WorkNote) => {
    const statusText = note.status || (note.isCompleted ? 'Completed' : 'In Progress');
    const hoursText = note.hours ? ` [${note.hours}]` : '';
    const etaText = note.eta ? ` [ETA: ${note.eta}]` : (note.status === 'In Progress - No ETA' ? ' [No ETA]' : '');
    const text = `• [${statusText.toUpperCase()}] ${note.title} (${note.date})${hoursText}${etaText}${
      note.content ? `\n  - ${note.content.replace(/\n/g, '\n  - ')}` : ''
    }`;
    navigator.clipboard.writeText(text);
    setCopiedId(note.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyStandupList = () => {
    if (activeWorkList.length === 0) return;
    const text = activeWorkList
      .map((n) => {
        const statusText = n.status || 'Active';
        const hoursText = n.hours ? ` [${n.hours}]` : '';
        const etaText = n.eta ? ` [ETA: ${n.eta}]` : (n.status === 'In Progress - No ETA' ? ' [No ETA]' : '');
        return `• [${statusText.toUpperCase()}] ${n.title} (${n.date})${hoursText}${etaText}${
          n.content ? `\n  - ${noteTitleWithBullets(n.content)}` : ''
        }`;
      })
      .join('\n\n');
    navigator.clipboard.writeText(text);
    setStandupCopiedToast(true);
    setTimeout(() => setStandupCopiedToast(false), 2500);
  };

  const noteTitleWithBullets = (content: string) => {
    return content.replace(/\n/g, '\n  - ');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote || !editingNote.title.trim()) return;

    const isCompleted = editingNote.status === 'Completed';
    const noteToSave: WorkNote = {
      ...editingNote,
      isCompleted,
      eta: editingNote.eta?.trim() || (editingNote.status === 'In Progress - No ETA' ? 'No ETA' : undefined),
    };
    setWorkNotes((prev) =>
      prev.map((n) =>
        n.id === editingNote.id ? noteToSave : n
      )
    );
    setEditingNote(null);
  };

  // Status badge styling helper
  const renderStatusBadge = (status?: WorkStatus, isCompleted?: boolean, eta?: string) => {
    const s = status || (isCompleted ? 'Completed' : 'In Progress');
    if (s === 'Completed') {
      return (
        <span className="px-2 py-0.5 bg-black text-white text-[9px] font-black uppercase tracking-wider border border-black shrink-0">
          ✓ Completed
        </span>
      );
    }
    if (s === 'In Progress - No ETA' || (s === 'In Progress' && eta === 'No ETA')) {
      return (
        <span className="px-2 py-0.5 bg-amber-100 text-amber-950 text-[9px] font-black uppercase tracking-wider border border-black shrink-0 flex items-center gap-1">
          <Clock size={10} className="text-amber-800" /> In Progress · No ETA
        </span>
      );
    }
    if (s === 'In Progress') {
      return (
        <span className="px-2 py-0.5 bg-neutral-100 text-black text-[9px] font-black uppercase tracking-wider border border-black shrink-0 flex items-center gap-1">
          <PlayCircle size={10} className="text-black" /> In Progress
        </span>
      );
    }
    if (s === 'Blocked') {
      return (
        <span className="px-2 py-0.5 bg-red-600 text-white text-[9px] font-black uppercase tracking-wider border border-black shrink-0 flex items-center gap-1">
          <AlertTriangle size={10} /> Blocked
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 bg-white text-black text-[9px] font-bold uppercase tracking-wider border border-black shrink-0">
        To Do
      </span>
    );
  };

  // Metrics
  const activeCount = workNotes.filter((n) => !n.isCompleted && n.status !== 'Completed').length;
  const completedCount = workNotes.filter((n) => n.isCompleted || n.status === 'Completed').length;
  const inProgressCount = workNotes.filter((n) => (n.status === 'In Progress' || n.status === 'In Progress - No ETA') && !n.isCompleted).length;
  const noEtaCount = workNotes.filter((n) => (n.status === 'In Progress - No ETA' || n.eta === 'No ETA') && !n.isCompleted).length;
  const blockedCount = workNotes.filter((n) => n.status === 'Blocked' && !n.isCompleted).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Toast Notification for Standup Copy */}
      <AnimatePresence>
        {standupCopiedToast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-6 right-6 z-50 bg-black text-white px-5 py-3 border-2 border-white shadow-2xl flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider"
          >
            <Check size={16} className="text-green-400" />
            <span>Active standup list copied to clipboard!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Tracker Summary Cards with Interactive Filter Clicking */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setFilterStatus('All')}
          className={`border border-black p-5 flex flex-col justify-center items-center text-left transition-all ${
            filterStatus === 'All' ? 'bg-white text-black ring-2 ring-black' : 'bg-white text-black hover:bg-neutral-50'
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Active Work</p>
          <p className="text-3xl sm:text-4xl font-extrabold">{activeCount}</p>
          <span className="text-[9px] font-bold opacity-60 uppercase mt-0.5">items to track</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'In Progress' ? 'All' : 'In Progress')}
          className={`border border-black p-5 flex flex-col justify-center items-center text-left transition-all ${
            filterStatus === 'In Progress' ? 'bg-black text-white ring-2 ring-neutral-400' : 'bg-black text-white hover:bg-neutral-900'
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">In Progress</p>
          <p className="text-3xl sm:text-4xl font-extrabold">{inProgressCount}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap justify-center">
            <span className="text-[9px] opacity-70 uppercase">actively ongoing</span>
            {noEtaCount > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-400 text-black text-[8px] font-black uppercase tracking-wider border border-black">
                {noEtaCount} No ETA
              </span>
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'Completed' ? 'All' : 'Completed')}
          className={`border border-black p-5 flex flex-col justify-center items-center text-left transition-all ${
            filterStatus === 'Completed' ? 'bg-white text-black ring-2 ring-black' : 'bg-white text-black hover:bg-neutral-50'
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Completed</p>
          <p className="text-3xl sm:text-4xl font-extrabold">{completedCount}</p>
          <span className="text-[9px] font-bold opacity-60 uppercase mt-0.5">finished deliverables</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'Blocked' ? 'All' : 'Blocked')}
          className={`border border-black p-5 flex flex-col justify-center items-center text-left transition-all ${
            filterStatus === 'Blocked' ? 'bg-white text-black ring-2 ring-red-600' : 'bg-white text-black hover:bg-neutral-50'
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Blocked Items</p>
          <p className="text-3xl sm:text-4xl font-extrabold text-red-600">{blockedCount}</p>
          <span className="text-[9px] font-bold text-red-600 uppercase mt-0.5">needs attention</span>
        </button>
      </div>

      {/* Streamlined Quick-Add Work Item Form */}
      <form onSubmit={handleAddWorkItem} className="border border-black p-6 bg-white space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-black gap-2">
          <div className="flex items-center gap-2">
            <Briefcase size={18} />
            <h2 className="text-lg font-extrabold uppercase tracking-tight">Track New Work</h2>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
            Fast work logger with status, ETA &amp; hours tracking
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Work Item Title */}
          <div className="md:col-span-5">
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 opacity-70">
              Work Description / Task <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              value={newTitle} 
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Build authentication endpoints, Review PR #12, Fix bug"
              className="w-full border border-black px-4 py-3 focus:outline-none focus:bg-neutral-50 placeholder-neutral-400 text-sm font-semibold"
              required
            />
          </div>

          {/* Category */}
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 opacity-70">
              Category
            </label>
            <select 
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as WorkNoteCategory)}
              className="w-full border border-black px-3 py-3 focus:outline-none focus:bg-neutral-50 text-xs font-semibold appearance-none bg-white rounded-none cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Status (Includes 'In Progress - No ETA') */}
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 opacity-70">
              Status
            </label>
            <select 
              value={newStatus}
              onChange={(e) => {
                const val = e.target.value as WorkStatus;
                setNewStatus(val);
                if (val === 'In Progress - No ETA' && !newEta) {
                  setNewEta('No ETA');
                }
              }}
              className="w-full border border-black px-3 py-3 focus:outline-none focus:bg-neutral-50 text-xs font-semibold appearance-none bg-white rounded-none cursor-pointer"
            >
              {STATUS_LIST.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Date Picker with Live Red Busy Feedback */}
          <div className="md:col-span-3">
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 opacity-70">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full border border-black px-3 py-3 focus:outline-none focus:bg-neutral-50 uppercase text-xs font-semibold"
              required
            />
            {newDate && (
              <div className="mt-1.5">
                {formDateBusy.isBusy ? (
                  <div className="border border-red-600 bg-red-50 p-1.5 text-red-900 text-xs font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-600 shrink-0 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-700">
                      🔴 BUSY: {formDateBusy.busyReason}
                    </span>
                  </div>
                ) : (
                  <div className="border border-green-600 bg-green-50 p-1.5 text-green-900 text-xs font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-600 shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-green-700">
                      🟢 AVAILABLE
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Hours, ETA with Quick Presets, and Details Toggle */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <div className="w-36">
            <input 
              type="text" 
              value={newHours} 
              onChange={(e) => setNewHours(e.target.value)}
              placeholder="Hours (e.g. 2h)"
              className="w-full border border-black px-3 py-2 text-xs font-semibold placeholder-neutral-400 focus:outline-none focus:bg-neutral-50"
            />
          </div>

          {/* ETA Input with Fast Quick-Select Chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-44">
              <input 
                type="text" 
                value={newEta} 
                onChange={(e) => setNewEta(e.target.value)}
                placeholder="ETA (e.g. No ETA, 5 PM)"
                className="w-full border border-black px-3 py-2 text-xs font-semibold placeholder-neutral-400 focus:outline-none focus:bg-neutral-50"
              />
            </div>
            <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider">
              <button
                type="button"
                onClick={() => {
                  setNewStatus('In Progress - No ETA');
                  setNewEta('No ETA');
                }}
                className={`px-2 py-1.5 border border-black transition-all ${
                  newStatus === 'In Progress - No ETA' || newEta === 'No ETA'
                    ? 'bg-amber-100 text-amber-950 border-black font-extrabold'
                    : 'bg-white hover:bg-neutral-100 text-black'
                }`}
                title="Set status to In Progress - No ETA"
              >
                + No ETA
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewEta('Today EOD');
                  if (newStatus === 'To Do') setNewStatus('In Progress');
                }}
                className="px-2 py-1.5 border border-black bg-white hover:bg-neutral-100 text-black transition-colors"
              >
                Today EOD
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewEta('Tomorrow');
                  if (newStatus === 'To Do') setNewStatus('In Progress');
                }}
                className="px-2 py-1.5 border border-black bg-white hover:bg-neutral-100 text-black transition-colors"
              >
                Tomorrow
              </button>
              {newEta && (
                <button
                  type="button"
                  onClick={() => setNewEta('')}
                  className="px-1.5 py-1.5 text-neutral-400 hover:text-black transition-colors text-xs"
                  title="Clear ETA"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowNotesField(!showNotesField)}
            className="text-[10px] font-bold uppercase tracking-wider underline hover:opacity-60 flex items-center gap-1 ml-auto"
          >
            {showNotesField ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            <span>{showNotesField ? 'Hide Notes' : '+ Add Details / Bullets (Optional)'}</span>
          </button>
        </div>

        {showNotesField && (
          <div>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Add key deliverables, meeting bullets, PR links, blockers..."
              rows={3}
              className="w-full border border-black px-4 py-3 focus:outline-none focus:bg-neutral-50 placeholder-neutral-400 text-xs font-semibold resize-none"
            />
          </div>
        )}

        {/* Submit & Calendar Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button 
            type="submit" 
            className="w-full sm:w-auto bg-black text-white px-8 py-3 text-[10px] font-bold uppercase tracking-widest hover:opacity-80 transition-opacity flex items-center justify-center space-x-2"
          >
            <Plus size={16} /> <span>Submit Work Task</span>
          </button>
          {onNavigateToCalendar && (
            <button
              type="button"
              onClick={() => onNavigateToCalendar(newDate)}
              className="w-full sm:w-auto border border-black bg-white text-black px-6 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-100 transition-colors flex items-center justify-center space-x-2"
            >
              <CalendarIcon size={14} /> <span>View Calendar</span>
            </button>
          )}
        </div>
      </form>

      {/* Filter and Search Bar */}
      <div className="border border-black bg-white p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search work tasks, status, ETA, notes..."
              className="w-full border border-black pl-9 pr-4 py-2 text-xs font-semibold focus:outline-none focus:bg-neutral-50"
            />
          </div>

          {/* Timeframe Filter */}
          <div className="flex gap-1 text-[10px] font-bold uppercase tracking-wider overflow-x-auto hide-scrollbar">
            {(['All', 'Today', 'Week', 'Month'] as const).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setFilterTimeframe(tf)}
                className={`px-3 py-1.5 border border-black transition-colors shrink-0 ${
                  filterTimeframe === tf ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
                }`}
              >
                {tf === 'All' ? 'All Dates' : tf === 'Week' ? 'This Week' : tf === 'Month' ? 'This Month' : 'Today'}
              </button>
            ))}
          </div>
        </div>

        {/* Status & Category Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-black/10 text-[10px] font-bold uppercase tracking-wider">
          {/* Status Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
            <span className="opacity-60 text-[9px] mr-1">Status:</span>
            {['All', ...STATUS_LIST].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 border border-black transition-colors shrink-0 ${
                  filterStatus === st ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
            <span className="opacity-60 text-[9px] mr-1">Category:</span>
            {['All', ...CATEGORIES].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCategory(cat)}
                className={`px-2.5 py-1 border border-black transition-colors shrink-0 ${
                  filterCategory === cat ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ACTIVE WORK LIST (CHECKLIST TRACKER) */}
      <div className="border border-black bg-white">
        <div className="border-b border-black p-6 py-4 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-extrabold uppercase tracking-tight">Active Work Queue</h2>
            <span className="text-xs font-bold px-2 py-0.5 bg-black text-white uppercase">
              {activeWorkList.length} Active
            </span>
            {filterStatus !== 'All' && (
              <span className="text-[10px] font-semibold px-2 py-0.5 border border-black bg-neutral-100">
                Filtered: {filterStatus}
              </span>
            )}
          </div>

          {activeWorkList.length > 0 && (
            <button
              type="button"
              onClick={handleCopyStandupList}
              className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 border border-black hover:bg-black hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Copy size={12} /> <span>Copy Standup List</span>
            </button>
          )}
        </div>

        {activeWorkList.length === 0 ? (
          <div className="p-16 text-center text-neutral-500 uppercase tracking-widest text-sm font-bold space-y-2">
            <p>No active work tasks found matching filter.</p>
            {filterStatus !== 'All' && (
              <button
                type="button"
                onClick={() => setFilterStatus('All')}
                className="text-xs text-black underline uppercase font-extrabold"
              >
                Clear filter
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-black/10 flex flex-col">
            <AnimatePresence mode="popLayout">
              {activeWorkList.map((note) => {
                const noteDateBusy = checkDateBusyStatus(note.date, tasks, workNotes);

                return (
                  <motion.li
                    layout
                    key={note.id}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:bg-neutral-50"
                  >
                    <div className="flex items-start space-x-3 flex-1">
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={() => handleToggleComplete(note.id)}
                        className="mt-0.5 focus:outline-none shrink-0"
                        title="Click to mark completed"
                        aria-label="Toggle Complete"
                      >
                        <Circle size={20} className="text-black hover:scale-110 transition-transform" />
                      </button>

                      <div className="space-y-1.5 flex-1">
                        {/* Title & Badges */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-black leading-snug">
                            {note.title}
                          </span>

                          {/* Status Badge */}
                          <div className="inline-block">
                            {renderStatusBadge(note.status, note.isCompleted, note.eta)}
                          </div>

                          {/* Category Badge */}
                          <span className="px-2 py-0.5 border border-black text-[9px] font-bold uppercase tracking-wider bg-neutral-100">
                            {note.category}
                          </span>

                          {/* Hours badge */}
                          {note.hours && (
                            <span className="px-2 py-0.5 border border-black/40 text-[9px] font-semibold text-neutral-700 flex items-center gap-1">
                              <Clock size={10} /> {note.hours}
                            </span>
                          )}

                          {/* ETA Badge (if custom text other than No ETA) */}
                          {note.eta && note.eta !== 'No ETA' && (
                            <span className="px-2 py-0.5 border border-black/40 text-[9px] font-semibold text-neutral-800 flex items-center gap-1 bg-white">
                              <CalendarIcon size={10} /> ETA: {note.eta}
                            </span>
                          )}
                        </div>

                        {/* Date and Busy Indicator */}
                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase opacity-70">
                          <span>Date: {note.date}</span>
                          {noteDateBusy.isBusy ? (
                            <span className="text-red-700 font-extrabold flex items-center gap-1">
                              ● Busy ({noteDateBusy.busyReason})
                            </span>
                          ) : (
                            <span className="text-green-700 font-bold">
                              ● Open Schedule
                            </span>
                          )}
                        </div>

                        {/* Content details if present */}
                        {note.content && (
                          <p className="text-xs text-neutral-600 font-normal leading-relaxed whitespace-pre-wrap pt-1 max-w-prose">
                            {note.content}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action buttons (Right side) */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      {/* Quick Status Selector */}
                      <select
                        value={note.status || 'In Progress'}
                        onChange={(e) => handleChangeStatus(note.id, e.target.value as WorkStatus)}
                        className="border border-black text-[10px] font-bold uppercase px-2 py-1 bg-white focus:outline-none mr-1 cursor-pointer"
                        title="Change Status"
                      >
                        {STATUS_LIST.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => handleCopyNote(note)}
                        className="p-1.5 opacity-50 hover:opacity-100 transition-opacity"
                        title="Copy task for standup"
                        aria-label="Copy task"
                      >
                        {copiedId === note.id ? (
                          <Check size={16} className="text-green-600" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditingNote(note)}
                        className="p-1.5 opacity-50 hover:opacity-100 transition-opacity"
                        title="Edit work task"
                        aria-label="Edit work task"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1.5 opacity-50 hover:opacity-100 transition-opacity hover:text-red-600"
                        title="Delete work task"
                        aria-label="Delete work task"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}

        {/* Collapsible Completed Work / Archive Section */}
        {completedWorkList.length > 0 && (
          <div className="border-t border-black bg-neutral-50">
            <button
              type="button"
              onClick={() => setShowCompletedArchive(!showCompletedArchive)}
              className="w-full flex items-center justify-between p-4 sm:p-5 text-xs font-bold uppercase tracking-widest hover:bg-neutral-100 transition-colors focus:outline-none"
            >
              <span className="flex items-center gap-2">
                <CheckCircle size={16} />
                Completed Work ({completedWorkList.length})
              </span>
              <span>{showCompletedArchive ? 'Hide' : 'Show'}</span>
            </button>

            {showCompletedArchive && (
              <ul className="divide-y divide-black/10 border-t border-black flex flex-col bg-white">
                <AnimatePresence mode="popLayout">
                  {completedWorkList.map((note) => (
                    <motion.li
                      layout
                      key={note.id}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:bg-neutral-50 opacity-60 grayscale"
                    >
                      <div className="flex items-start space-x-3 flex-1">
                        <button
                          type="button"
                          onClick={() => handleToggleComplete(note.id)}
                          className="mt-0.5 focus:outline-none shrink-0"
                          title="Click to mark incomplete"
                          aria-label="Toggle Incomplete"
                        >
                          <CheckCircle size={20} className="text-black" />
                        </button>

                        <div className="space-y-1 flex-1">
                          <p className="text-sm font-bold line-through text-black">
                            {note.title}
                            <span className="inline-block ml-3 px-2 py-0.5 border border-black text-[9px] font-bold uppercase tracking-wider">
                              {note.category}
                            </span>
                            {note.hours && (
                              <span className="inline-block ml-2 px-2 py-0.5 border border-black/40 text-[9px] font-semibold">
                                {note.hours}
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] uppercase font-semibold opacity-70">
                            Completed Date: {note.date}
                          </p>
                          {note.content && (
                            <p className="text-xs text-neutral-500 font-normal leading-relaxed whitespace-pre-wrap">
                              {note.content}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingNote(note)}
                          className="p-1.5 opacity-50 hover:opacity-100 transition-opacity"
                          title="Edit work task"
                          aria-label="Edit work task"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-1.5 opacity-50 hover:opacity-100 transition-opacity hover:text-red-600"
                          title="Delete work task"
                          aria-label="Delete work task"
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

      {/* Edit Work Task Modal */}
      {editingNote && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="border-2 border-black bg-white max-w-lg w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-black pb-2">
              <h3 className="text-base font-extrabold uppercase tracking-tight">Edit Work Task</h3>
              <button
                type="button"
                onClick={() => setEditingNote(null)}
                className="text-xs font-bold uppercase tracking-wider px-2 py-1 border border-black hover:bg-black hover:text-white"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Work Description</label>
                <input
                  type="text"
                  value={editingNote.title}
                  onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                  className="w-full border border-black px-3 py-2 text-sm font-semibold focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Status</label>
                  <select
                    value={editingNote.status || (editingNote.isCompleted ? 'Completed' : 'In Progress')}
                    onChange={(e) => {
                      const val = e.target.value as WorkStatus;
                      setEditingNote({ 
                        ...editingNote, 
                        status: val,
                        eta: val === 'In Progress - No ETA' && !editingNote.eta ? 'No ETA' : editingNote.eta,
                      });
                    }}
                    className="w-full border border-black px-2 py-2 text-xs font-semibold focus:outline-none bg-white rounded-none cursor-pointer"
                  >
                    {STATUS_LIST.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Category</label>
                  <select
                    value={editingNote.category}
                    onChange={(e) => setEditingNote({ ...editingNote, category: e.target.value as WorkNoteCategory })}
                    className="w-full border border-black px-2 py-2 text-xs font-semibold focus:outline-none bg-white rounded-none cursor-pointer"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Hours / Time</label>
                  <input
                    type="text"
                    value={editingNote.hours || ''}
                    onChange={(e) => setEditingNote({ ...editingNote, hours: e.target.value })}
                    placeholder="e.g. 2h"
                    className="w-full border border-black px-2 py-2 text-xs font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">ETA</label>
                  <input
                    type="text"
                    value={editingNote.eta || ''}
                    onChange={(e) => setEditingNote({ ...editingNote, eta: e.target.value })}
                    placeholder="e.g. No ETA, 5 PM"
                    className="w-full border border-black px-2 py-2 text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              {/* Quick ETA presets in Edit Modal */}
              <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider flex-wrap">
                <span className="opacity-60 text-[8px]">Quick ETA:</span>
                <button
                  type="button"
                  onClick={() => setEditingNote({ ...editingNote, status: 'In Progress - No ETA', eta: 'No ETA' })}
                  className="px-2 py-1 border border-black bg-amber-50 hover:bg-amber-100 text-amber-950 transition-colors"
                >
                  No ETA
                </button>
                <button
                  type="button"
                  onClick={() => setEditingNote({ ...editingNote, eta: 'Today EOD' })}
                  className="px-2 py-1 border border-black bg-white hover:bg-neutral-100 transition-colors"
                >
                  Today EOD
                </button>
                <button
                  type="button"
                  onClick={() => setEditingNote({ ...editingNote, eta: 'Tomorrow' })}
                  className="px-2 py-1 border border-black bg-white hover:bg-neutral-100 transition-colors"
                >
                  Tomorrow
                </button>
                {editingNote.eta && (
                  <button
                    type="button"
                    onClick={() => setEditingNote({ ...editingNote, eta: undefined })}
                    className="px-2 py-1 text-neutral-400 hover:text-black transition-colors"
                  >
                    Clear ETA
                  </button>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Date</label>
                <input
                  type="date"
                  value={editingNote.date}
                  onChange={(e) => setEditingNote({ ...editingNote, date: e.target.value })}
                  className="w-full border border-black px-3 py-2 text-xs font-semibold focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Notes / Details</label>
                <textarea
                  value={editingNote.content}
                  onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                  rows={3}
                  className="w-full border border-black px-3 py-2 text-xs font-semibold focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-black">
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteNote(editingNote.id);
                    setEditingNote(null);
                  }}
                  className="px-4 py-2 border border-red-600 bg-red-50 text-red-700 text-xs font-bold uppercase tracking-wider hover:bg-red-600 hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <Trash2 size={13} /> <span>Delete</span>
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingNote(null)}
                    className="px-4 py-2 border border-black text-xs font-bold uppercase tracking-wider hover:bg-neutral-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-black text-white text-xs font-bold uppercase tracking-wider hover:opacity-80"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
