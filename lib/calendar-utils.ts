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
