export type EntryType = 'clock_in' | 'clock_out' | 'break_start' | 'break_end';

export type UserState = 'idle' | 'working' | 'on_break';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at?: string;
}

export interface TimeEntry {
  id: string;
  user_id: string;
  entry_type: EntryType;
  created_at: string;
  reference_date: string;
}

export interface DaySummary {
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  grossMinutes: number;
  breakMinutes: number;
  netMinutes: number;
  entries: TimeEntry[];
}
