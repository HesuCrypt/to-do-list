export type TaskCategory = 'Work' | 'Personal' | 'Urgent' | 'None';

export type Task = {
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

export type WorkNoteCategory = 'Development' | 'Meeting' | 'Review' | 'Admin' | 'Design' | 'General';

export type WorkStatus = 'To Do' | 'In Progress' | 'In Progress - No ETA' | 'Blocked' | 'Completed';

export type WorkNote = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM or time range
  hours?: string; // e.g. "2h" or "1.5"
  eta?: string; // e.g. "No ETA" or "Today 5 PM", "2026-10-20"
  status?: WorkStatus;
  category: WorkNoteCategory;
  content: string;
  isCompleted?: boolean;
  createdAt: string;
};

export type BusyCheckResult = {
  isBusy: boolean;
  isWorkHours: boolean; // Mon-Fri 10:00 AM - 7:00 PM
  workHoursLabel: string;
  tasksOnDate: Task[];
  workNotesOnDate: WorkNote[];
  summaryText: string;
  busyReason: string;
};

/**
 * Checks if a task occurs on a given date (YYYY-MM-DD).
 * Supports single deadline dates, or date ranges with startDate and endDate.
 */
export function isTaskOnDate(task: Task, dateStr: string): boolean {
  if (!dateStr) return false;
  const target = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.trim();

  const start = task.startDate ? (task.startDate.includes('T') ? task.startDate.split('T')[0] : task.startDate.trim()) : null;
  const end = task.endDate ? (task.endDate.includes('T') ? task.endDate.split('T')[0] : task.endDate.trim()) : null;
  const deadline = task.deadline ? (task.deadline.includes('T') ? task.deadline.split('T')[0] : task.deadline.trim()) : null;

  if (start && end) {
    return target >= start && target <= end;
  }
  if (start && !end) {
    if (deadline && deadline > start) {
      return target >= start && target <= deadline;
    }
    return target === start;
  }
  if (!start && end) {
    return target <= end;
  }
  if (deadline) {
    return target === deadline;
  }
  return false;
}

/**
 * Checks if a given date string is busy.
 * Mon-Fri 10:00 AM - 7:00 PM is automatically busy.
 * Days with scheduled tasks or work notes are also marked busy.
 */
export function checkDateBusyStatus(
  dateStr: string,
  tasks: Task[] = [],
  workNotes: WorkNote[] = []
): BusyCheckResult {
  if (!dateStr) {
    return {
      isBusy: false,
      isWorkHours: false,
      workHoursLabel: 'Mon–Fri 10:00 AM – 7:00 PM',
      tasksOnDate: [],
      workNotesOnDate: [],
      summaryText: '',
      busyReason: '',
    };
  }

  const cleanDateStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.trim();
  const parts = cleanDateStr.split('-').map(Number);
  let dayOfWeek = -1;

  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    dayOfWeek = d.getDay(); // 0 is Sun, 1 is Mon, ..., 5 is Fri, 6 is Sat
  }

  const isWorkHours = dayOfWeek >= 1 && dayOfWeek <= 5;

  const tasksOnDate = tasks.filter((t) => isTaskOnDate(t, cleanDateStr));

  const workNotesOnDate = workNotes.filter((w) => {
    if (!w.date) return false;
    const noteDate = w.date.includes('T') ? w.date.split('T')[0] : w.date.trim();
    return noteDate === cleanDateStr;
  });

  const activeWorkNotesOnDate = workNotesOnDate.filter((w) => !w.isCompleted);
  const totalItems = tasksOnDate.length + activeWorkNotesOnDate.length;
  const isBusy = isWorkHours || totalItems > 0;

  let busyReason = '';
  if (isWorkHours && totalItems > 0) {
    busyReason = `Work Hours (10:00 AM - 7:00 PM) + ${totalItems} Item${totalItems > 1 ? 's' : ''}`;
  } else if (isWorkHours) {
    busyReason = 'Mon–Fri Work Hours (10:00 AM - 7:00 PM)';
  } else if (totalItems > 0) {
    busyReason = `${totalItems} Item${totalItems > 1 ? 's' : ''} Scheduled`;
  }

  let summaryText = '';
  if (isWorkHours) {
    summaryText = 'Busy: Mon–Fri Work Hours (10:00 AM – 7:00 PM)';
    if (totalItems > 0) {
      summaryText += ` • ${totalItems} item${totalItems > 1 ? 's' : ''} scheduled`;
    }
  } else if (totalItems > 0) {
    summaryText = `Busy: ${totalItems} item${totalItems > 1 ? 's' : ''} scheduled`;
  } else {
    summaryText = 'Available / Free (Weekend, no tasks)';
  }

  return {
    isBusy,
    isWorkHours,
    workHoursLabel: 'Mon–Fri 10:00 AM – 7:00 PM',
    tasksOnDate,
    workNotesOnDate,
    summaryText,
    busyReason,
  };
}

export function formatDateToYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formats a 24-hour time string (HH:MM or H:MM) or an hour number to 12-hour AM/PM format.
 * e.g. "14:00" -> "2:00 PM", 14 -> "2:00 PM", "09:30" -> "9:30 AM"
 */
export function formatTime12Hour(timeStrOrHour?: string | number | null): string {
  if (timeStrOrHour === undefined || timeStrOrHour === null || timeStrOrHour === '') return '';

  if (typeof timeStrOrHour === 'number') {
    const period = timeStrOrHour >= 12 ? 'PM' : 'AM';
    const hour12 = timeStrOrHour % 12 === 0 ? 12 : timeStrOrHour % 12;
    return `${hour12}:00 ${period}`;
  }

  const trimmed = timeStrOrHour.trim();
  if (!trimmed) return '';

  // If already formatted with AM/PM
  if (/am|pm/i.test(trimmed)) {
    return trimmed;
  }

  // If it's a date-time ISO string like 2026-10-19T14:30:00
  const timeOnly = trimmed.includes('T') ? trimmed.split('T')[1] : trimmed;
  const parts = timeOnly.split(':');
  if (parts.length >= 2) {
    const h = parseInt(parts[0], 10);
    const m = parts[1].padStart(2, '0').slice(0, 2);
    if (!isNaN(h)) {
      const period = h >= 12 ? 'PM' : 'AM';
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      return `${hour12}:${m} ${period}`;
    }
  }

  return trimmed;
}

/**
 * Parses user input (which may be 12-hour like "2:30 PM", "2pm", or 24-hour like "14:30")
 * into a standard "HH:MM" string.
 */
export function parseTimeToStandard(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  const match12 = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (match12) {
    let hour = parseInt(match12[1], 10);
    const minutes = match12[2] || '00';
    const period = match12[3].toLowerCase();
    if (period === 'pm' && hour < 12) hour += 12;
    if (period === 'am' && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${minutes}`;
  }
  return trimmed;
}
