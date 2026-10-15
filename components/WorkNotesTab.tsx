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
  Tag, 
  AlertCircle,
  Search,
  Filter,
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
  'To Do',
  'In Progress',
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
  const [newContent, setNewContent] = useState('');
  const [showNotesField, setShowNotesField] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterTimeframe, setFilterTimeframe] = useState<'All' | 'Today' | 'Week' | 'Month'>('All');
  const [showCompletedArchive, setShowCompletedArchive] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Edit Modal State
  const [editingNote, setEditingNote] = useState<WorkNote | null>(null);

  // Live busy check for form date
  const formDateBusy = useMemo(() => {
    return checkDateBusyStatus(newDate, tasks, workNotes);
  }, [newDate, tasks, workNotes]);

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
      content: newContent.trim(),
      isCompleted,
      createdAt: new Date().toISOString(),
    };

    setWorkNotes((prev) => [newNote, ...prev]);
    setNewTitle('');
    setNewHours('');
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
    const text = `• [${statusText.toUpperCase()}] ${note.title} (${note.date})${hoursText}${
      note.content ? `\n  - ${note.content.replace(/\n/g, '\n  - ')}` : ''
    }`;
    navigator.clipboard.writeText(text);
    setCopiedId(note.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote || !editingNote.title.trim()) return;

    const isCompleted = editingNote.status === 'Completed';
    setWorkNotes((prev) =>
      prev.map((n) =>
        n.id === editingNote.id ? { ...editingNote, isCompleted } : n
      )
    );
    setEditingNote(null);
  };

  // Filtered Notes
  const filteredNotes = useMemo(() => {
    return workNotes
      .filter((note) => {
        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesTitle = note.title.toLowerCase().includes(q);
          const matchesContent = note.content.toLowerCase().includes(q);
          const matchesCat = note.category.toLowerCase().includes(q);
          if (!matchesTitle && !matchesContent && !matchesCat) return false;
        }

        // Category Filter
        if (filterCategory !== 'All' && note.category !== filterCategory) {
          return false;
        }

        // Status Filter
        if (filterStatus !== 'All') {
          const currentStatus = note.status || (note.isCompleted ? 'Completed' : 'In Progress');
          if (currentStatus !== filterStatus) return false;
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

  // Status badge styling helper
  const renderStatusBadge = (status?: WorkStatus, isCompleted?: boolean) => {
    const s = status || (isCompleted ? 'Completed' : 'In Progress');
    if (s === 'Completed') {
      return (
        <span className="px-2 py-0.5 bg-black text-white text-[9px] font-black uppercase tracking-wider border border-black shrink-0">
          ✓ Completed
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
  const inProgressCount = workNotes.filter((n) => n.status === 'In Progress' && !n.isCompleted).length;
  const blockedCount = workNotes.filter((n) => n.status === 'Blocked' && !n.isCompleted).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Tracker Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="border border-black p-5 flex flex-col justify-center items-center bg-white text-black">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Active Work</p>
          <p className="text-3xl sm:text-4xl font-extrabold">{activeCount}</p>
          <span className="text-[9px] font-bold opacity-60 uppercase mt-0.5">items to track</span>
        </div>
        <div className="border border-black p-5 flex flex-col justify-center items-center bg-black text-white">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">In Progress</p>
          <p className="text-3xl sm:text-4xl font-extrabold">{inProgressCount}</p>
          <span className="text-[9px] opacity-70 uppercase mt-0.5">actively ongoing</span>
        </div>
        <div className="border border-black p-5 flex flex-col justify-center items-center bg-white text-black">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Completed</p>
          <p className="text-3xl sm:text-4xl font-extrabold">{completedCount}</p>
          <span className="text-[9px] font-bold opacity-60 uppercase mt-0.5">finished deliverables</span>
        </div>
        <div className="border border-black p-5 flex flex-col justify-center items-center bg-white text-black">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Blocked Items</p>
          <p className="text-3xl sm:text-4xl font-extrabold text-red-600">{blockedCount}</p>
          <span className="text-[9px] font-bold text-red-600 uppercase mt-0.5">needs attention</span>
        </div>
      </div>

      {/* Streamlined Quick-Add Work Item Form (Task-Style) */}
      <form onSubmit={handleAddWorkItem} className="border border-black p-6 bg-white space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-black gap-2">
          <div className="flex items-center gap-2">
            <Briefcase size={18} />
            <h2 className="text-lg font-extrabold uppercase tracking-tight">Track New Work</h2>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
            Fast work logger with status &amp; hours tracking
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
              className="w-full border border-black px-3 py-3 focus:outline-none focus:bg-neutral-50 text-xs font-semibold appearance-none bg-white rounded-none"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 opacity-70">
              Status
            </label>
            <select 
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as WorkStatus)}
              className="w-full border border-black px-3 py-3 focus:outline-none focus:bg-neutral-50 text-xs font-semibold appearance-none bg-white rounded-none"
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

        {/* Optional Hours & Details toggle */}
        <div className="flex items-center gap-4 pt-1">
          <div className="w-40">
            <input 
              type="text" 
              value={newHours} 
              onChange={(e) => setNewHours(e.target.value)}
              placeholder="Hours (e.g. 2h)"
              className="w-full border border-black px-3 py-2 text-xs font-semibold placeholder-neutral-400 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowNotesField(!showNotesField)}
            className="text-[10px] font-bold uppercase tracking-wider underline hover:opacity-60 flex items-center gap-1"
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
              placeholder="Search work tasks & deliverables..."
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
        <div className="border-b border-black p-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-extrabold uppercase tracking-tight">Active Work Queue</h2>
            <span className="text-xs font-bold px-2 py-0.5 bg-black text-white uppercase">
              {activeWorkList.length} Active
            </span>
          </div>

          {activeWorkList.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const text = activeWorkList
                  .map((n) => `• [${(n.status || 'Active').toUpperCase()}] ${n.title} (${n.date})${n.hours ? ` [${n.hours}]` : ''}${n.content ? `\n  - ${n.content.replace(/\n/g, '\n  - ')}` : ''}`)
                  .join('\n\n');
                navigator.clipboard.writeText(text);
                alert('Active work tasks copied to clipboard for standup!');
              }}
              className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 border border-black hover:bg-black hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Copy size={12} /> <span>Copy Standup List</span>
            </button>
          )}
        </div>

        {activeWorkList.length === 0 ? (
          <div className="p-16 text-center text-neutral-500 uppercase tracking-widest text-sm font-bold">
            No active work tasks found. Log your work above!
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

                          {/* Status Badge with quick dropdown */}
                          <div className="relative group inline-block">
                            {renderStatusBadge(note.status, note.isCompleted)}
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
                        </div>

                        {/* Date and Busy Indicator */}
                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase opacity-70">
                          <span>Date: {note.date}</span>
                          {noteDateBusy.isBusy ? (
                            <span className="text-red-700 font-extrabold flex items-center gap-1">
                              ● Busy (10AM–7PM)
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
                        className="border border-black text-[10px] font-bold uppercase px-2 py-1 bg-white focus:outline-none mr-1"
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

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Status</label>
                  <select
                    value={editingNote.status || (editingNote.isCompleted ? 'Completed' : 'In Progress')}
                    onChange={(e) => setEditingNote({ ...editingNote, status: e.target.value as WorkStatus })}
                    className="w-full border border-black px-2 py-2 text-xs font-semibold focus:outline-none bg-white rounded-none"
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
                    className="w-full border border-black px-2 py-2 text-xs font-semibold focus:outline-none bg-white rounded-none"
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
