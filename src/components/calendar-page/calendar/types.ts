/**
 * Calendar and Todo Types
 */

export interface Todo {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD format
  time?: string; // HH:mm format
  endTime?: string; // HH:mm format
  completed: boolean;
  priority: "low" | "medium" | "high";
  category?: string;
  categoryColor?: string;
}

export interface DayData {
  date: string;
  todos: Todo[];
}

export interface MarkedDate {
  marked?: boolean;
  dotColor?: string;
  selected?: boolean;
  selectedColor?: string;
  selectedTextColor?: string;
  dots?: Array<{ color: string; key: string }>;
}

export interface MarkedDates {
  [date: string]: MarkedDate;
}

export interface WeekDay {
  date: string;
  moment: Date;
  isToday: boolean;
}

