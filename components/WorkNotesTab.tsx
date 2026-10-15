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
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  WorkNote, 
  WorkNoteCategory, 
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

export default function WorkNotesTab({
  workNotes,
  setWorkNotes,
  tasks,
  isDark,
  onNavigateToCalendar,
}: WorkNotesTabProps) {
  const todayStr = useMemo(() => formatDateToYYYYMMDD(new Date()), []);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(todayStr);
  const [newTime, setNewTime] = useState('');
  const [newCategory, setNewCategory] = useState<WorkNoteCategory>('Development');
  const [newContent, setNewContent] = useState('');

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterTimeframe, setFilterTimeframe] = useState<'All' | 'Today' | 'Week' | 'Month'>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Edit Modal State
  const [editingNote, setEditingNote] = useState<WorkNote | null>(null);

  // Busy status check for currently selected date in form
  const formDateBusy = useMemo(() => {
    return checkDateBusyStatus(newDate, tasks, workNotes);
  }, [newDate, tasks, workNotes]);

  // Edit date busy status check
  const editDateBusy = useMemo(() => {
    if (!editingNote) return null;
    return checkDateBusyStatus(editingNote.date, tasks, workNotes);
  }, [editingNote, tasks, workNotes]);

  const handleAddWorkNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newNote: WorkNote = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      date: newDate || todayStr,
      time: newTime.trim() || undefined,
      category: newCategory,
      content: newContent.trim(),
      isCompleted: false,
      createdAt: new Date().toISOString(),
    };

    setWorkNotes((prev) => [newNote, ...prev]);
    setNewTitle('');
    setNewContent('');
    setNewTime('');
  };

  const handleToggleComplete = (id: string) => {
    setWorkNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isCompleted: !n.isCompleted } : n))
    );
  };

  const handleDeleteNote = (id: string) => {
    setWorkNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleCopyNote = (note: WorkNote) => {
    const text = `[${note.category.toUpperCase()}] ${note.title} (${note.date}${note.time ? ` ${note.time}` : ''})${
      note.content ? `\n${note.content}` : ''
    }`;
    navigator.clipboard.writeText(text);
    setCopiedId(note.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote || !editingNote.title.trim()) return;

    setWorkNotes((prev) =>
      prev.map((n) => (n.id === editingNote.id ? editingNote : n))
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
        // Sort descending by date, then time
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return (b.time || '').localeCompare(a.time || '');
      });
  }, [workNotes, searchQuery, filterCategory, filterTimeframe, todayStr]);

  // Group notes by date for clean viewing
  const groupedNotes = useMemo(() => {
    const map = new Map<string, WorkNote[]>();
    for (const note of filteredNotes) {
      const list = map.get(note.date) || [];
      list.push(note);
      map.set(note.date, list);
    }
    return Array.from(map.entries());
  }, [filteredNotes]);

  // Statistics
  const totalNotes = workNotes.length;
  const todayNotesCount = workNotes.filter((n) => n.date === todayStr).length;
  const completedCount = workNotes.filter((n) => n.isCompleted).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border border-black p-6 flex flex-col justify-center items-center bg-white text-black">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Total Work Notes</p>
          <p className="text-4xl font-extrabold">{totalNotes}</p>
        </div>
        <div className="border border-black p-6 flex flex-col justify-center items-center bg-black text-white">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">Today&apos;s Notes</p>
          <p className="text-4xl font-extrabold">{todayNotesCount}</p>
        </div>
        <div className="border border-black p-6 flex flex-col justify-center items-center bg-white text-black">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Completed / Done</p>
          <p className="text-4xl font-extrabold">{completedCount}</p>
        </div>
      </div>

      {/* Add Work Note Form */}
      <form onSubmit={handleAddWorkNote} className="border border-black p-6 bg-white space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-black gap-2">
          <h2 className="text-lg font-extrabold uppercase tracking-tight flex items-center gap-2">
            <FileText size={18} /> New Work Note
          </h2>
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
            Log your daily work, meetings &amp; deliverables
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Title */}
          <div className="md:col-span-6">
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 opacity-70">
              Work Title / Activity <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              value={newTitle} 
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Implement user authentication, Standup call, Code review"
              className="w-full border border-black px-4 py-3 focus:outline-none focus:bg-neutral-50 placeholder-neutral-400 text-sm font-semibold"
              required
            />
          </div>

          {/* Category */}
          <div className="md:col-span-3">
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 opacity-70">
              Category
            </label>
            <select 
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as WorkNoteCategory)}
              className="w-full border border-black px-4 py-3 focus:outline-none focus:bg-neutral-50 text-sm font-semibold appearance-none bg-white rounded-none"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Time / Duration */}
          <div className="md:col-span-3">
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 opacity-70">
              Time / Slot <span className="opacity-50 font-normal">(Optional)</span>
            </label>
            <input 
              type="text" 
              value={newTime} 
              onChange={(e) => setNewTime(e.target.value)}
              placeholder="e.g. 10:00 - 12:00 or 2h"
              className="w-full border border-black px-4 py-3 focus:outline-none focus:bg-neutral-50 placeholder-neutral-400 text-sm font-semibold"
            />
          </div>

          {/* Date Picker with Live Busy Indicator */}
          <div className="md:col-span-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider opacity-70">
                Date <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setNewDate(todayStr)}
                  className="text-[9px] font-bold uppercase px-2 py-0.5 border border-black hover:bg-black hover:text-white transition-colors"
                >
                  Today
                </button>
              </div>
            </div>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full border border-black px-4 py-3 focus:outline-none focus:bg-neutral-50 uppercase text-xs font-semibold"
              required
            />

            {/* Live Busy Status Feedback */}
            {newDate && (
              <div className="mt-2">
                {formDateBusy.isBusy ? (
                  <div className="border border-red-600 bg-red-50 p-2.5 text-red-900 text-xs font-semibold flex items-start gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 shrink-0 mt-1 animate-pulse" />
                    <div>
                      <p className="font-extrabold uppercase text-[11px] tracking-wider text-red-700">
                        🔴 BUSY SCHEDULE: {formDateBusy.busyReason}
                      </p>
                      {formDateBusy.isWorkHours && (
                        <p className="text-[10px] text-red-800 mt-0.5">
                          Standard Mon–Fri Work Hours active (10:00 AM – 7:00 PM).
                        </p>
                      )}
                      {formDateBusy.tasksOnDate.length > 0 && (
                        <p className="text-[10px] text-red-800 mt-0.5">
                          {formDateBusy.tasksOnDate.length} deadline(s):{' '}
                          {formDateBusy.tasksOnDate.map((t) => t.text).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="border border-green-600 bg-green-50 p-2 text-green-900 text-xs font-semibold flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-600 shrink-0" />
                    <p className="font-bold text-[10px] uppercase tracking-wider text-green-700">
                      🟢 AVAILABLE: Weekend (No conflicting tasks scheduled)
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Details / Content */}
          <div className="md:col-span-6">
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 opacity-70">
              Work Details / Notes <span className="opacity-50 normal-case font-semibold tracking-normal">(Multi-line, accomplishments, blockers)</span>
            </label>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="- Built new API endpoint&#10;- Resolved bug in checkout flow&#10;- Next step: QA testing"
              rows={4}
              className="w-full border border-black px-4 py-3 focus:outline-none focus:bg-neutral-50 placeholder-neutral-400 text-sm font-semibold resize-none"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button 
            type="submit" 
            className="w-full sm:w-auto bg-black text-white px-8 py-3 text-[10px] font-bold uppercase tracking-widest hover:opacity-80 transition-opacity flex items-center justify-center space-x-2"
          >
            <Plus size={16} /> <span>Save Work Note</span>
          </button>
          {onNavigateToCalendar && (
            <button
              type="button"
              onClick={() => onNavigateToCalendar(newDate)}
              className="w-full sm:w-auto border border-black bg-white text-black px-6 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-100 transition-colors flex items-center justify-center space-x-2"
            >
              <CalendarIcon size={14} /> <span>View Schedule on Calendar</span>
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
              placeholder="Search work notes..."
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

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pt-1 text-[10px] font-bold uppercase tracking-wider">
          <span className="opacity-60 mr-1 text-[9px] shrink-0">Category:</span>
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

      {/* Work Notes List */}
      <div className="border border-black bg-white">
        <div className="border-b border-black p-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold uppercase tracking-tight flex items-center gap-2">
            <span>Work Log Entries</span>
            <span className="text-xs font-semibold opacity-60">({filteredNotes.length})</span>
          </h2>
          {filteredNotes.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const allText = filteredNotes
                  .map((n) => `• [${n.date}] ${n.title}${n.content ? `\n  ${n.content.replace(/\n/g, '\n  ')}` : ''}`)
                  .join('\n\n');
                navigator.clipboard.writeText(allText);
                alert('All filtered work notes copied to clipboard!');
              }}
              className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 border border-black hover:bg-black hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Copy size={12} /> <span>Copy All</span>
            </button>
          )}
        </div>

        {groupedNotes.length === 0 ? (
          <div className="p-16 text-center text-neutral-500 uppercase tracking-widest text-sm font-bold">
            No work notes found. Add your first note above!
          </div>
        ) : (
          <div className="divide-y divide-black/20">
            {groupedNotes.map(([dateKey, notes]) => {
              const dateBusy = checkDateBusyStatus(dateKey, tasks, workNotes);
              const formattedDateHeader = new Date(dateKey + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });
              const isToday = dateKey === todayStr;

              return (
                <div key={dateKey} className="p-4 sm:p-6 space-y-4">
                  {/* Date Group Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-black/10">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black uppercase tracking-wider">
                        {formattedDateHeader}
                      </span>
                      {isToday && (
                        <span className="px-2 py-0.5 bg-black text-white text-[9px] font-bold uppercase tracking-wider">
                          Today
                        </span>
                      )}
                      {dateBusy.isBusy ? (
                        <span className="px-2 py-0.5 border border-red-600 bg-red-50 text-red-700 text-[9px] font-bold uppercase tracking-wider">
                          Busy Day (10AM–7PM)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 border border-green-600 bg-green-50 text-green-700 text-[9px] font-bold uppercase tracking-wider">
                          Free Day
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold uppercase opacity-50">
                      {notes.length} {notes.length === 1 ? 'entry' : 'entries'}
                    </span>
                  </div>

                  {/* Notes under this Date */}
                  <ul className="space-y-3">
                    <AnimatePresence mode="popLayout">
                      {notes.map((note) => (
                        <motion.li
                          layout
                          key={note.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          transition={{ duration: 0.2 }}
                          className={`border border-black p-4 transition-colors hover:bg-neutral-50 ${
                            note.isCompleted ? 'bg-neutral-50/80 opacity-70' : 'bg-white'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <button
                                type="button"
                                onClick={() => handleToggleComplete(note.id)}
                                className="mt-1 focus:outline-none shrink-0"
                                aria-label="Toggle Complete"
                              >
                                {note.isCompleted ? (
                                  <CheckCircle size={18} className="text-black" />
                                ) : (
                                  <Circle size={18} className="text-black" />
                                )}
                              </button>

                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={`text-sm font-bold text-black ${
                                      note.isCompleted ? 'line-through text-neutral-500' : ''
                                    }`}
                                  >
                                    {note.title}
                                  </span>
                                  <span className="px-2 py-0.5 border border-black text-[9px] font-bold uppercase tracking-wider bg-neutral-100">
                                    {note.category}
                                  </span>
                                  {note.time && (
                                    <span className="px-2 py-0.5 border border-black/40 text-[9px] font-semibold text-neutral-600 flex items-center gap-1">
                                      <Clock size={10} /> {note.time}
                                    </span>
                                  )}
                                </div>

                                {note.content && (
                                  <p className="text-xs text-neutral-700 font-normal leading-relaxed whitespace-pre-wrap mt-2 pt-2 border-t border-black/10">
                                    {note.content}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1 self-end sm:self-start shrink-0">
                              <button
                                type="button"
                                onClick={() => handleCopyNote(note)}
                                className="p-1.5 opacity-60 hover:opacity-100 transition-opacity"
                                title="Copy note for standup"
                                aria-label="Copy note"
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
                                className="p-1.5 opacity-60 hover:opacity-100 transition-opacity"
                                title="Edit work note"
                                aria-label="Edit work note"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteNote(note.id)}
                                className="p-1.5 opacity-60 hover:opacity-100 transition-opacity hover:text-red-600"
                                title="Delete work note"
                                aria-label="Delete work note"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Work Note Modal */}
      {editingNote && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="border-2 border-black bg-white max-w-lg w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-black pb-2">
              <h3 className="text-base font-extrabold uppercase tracking-tight">Edit Work Note</h3>
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
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Title</label>
                <input
                  type="text"
                  value={editingNote.title}
                  onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                  className="w-full border border-black px-3 py-2 text-sm font-semibold focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Category</label>
                  <select
                    value={editingNote.category}
                    onChange={(e) => setEditingNote({ ...editingNote, category: e.target.value as WorkNoteCategory })}
                    className="w-full border border-black px-3 py-2 text-xs font-semibold focus:outline-none bg-white rounded-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Time / Slot (Optional)</label>
                <input
                  type="text"
                  value={editingNote.time || ''}
                  onChange={(e) => setEditingNote({ ...editingNote, time: e.target.value })}
                  placeholder="e.g. 10:00 - 12:00"
                  className="w-full border border-black px-3 py-2 text-xs font-semibold focus:outline-none"
                />
              </div>

              {/* Busy Alert for Edit Modal */}
              {editDateBusy && editDateBusy.isBusy && (
                <div className="border border-red-600 bg-red-50 p-2 text-red-900 text-xs font-semibold">
                  <p className="font-bold text-[10px] uppercase tracking-wider text-red-700">
                    🔴 Busy Day: {editDateBusy.busyReason}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Details / Notes</label>
                <textarea
                  value={editingNote.content}
                  onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                  rows={4}
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
                  <Trash2 size={13} /> <span>Delete Note</span>
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
