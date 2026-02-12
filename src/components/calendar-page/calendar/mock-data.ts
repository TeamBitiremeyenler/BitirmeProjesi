/**
 * Mock Todo Data
 */

import type { Todo } from "./types";

function getDateString(daysFromToday: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().split("T")[0];
}

export const mockTodos: Todo[] = [
  {
    id: "1",
    title: "Weekly Product Sync <> Si Min",
    description: "Discuss product roadmap and upcoming features",
    date: getDateString(0),
    time: "16:00",
    endTime: "16:15",
    completed: false,
    priority: "high",
    category: "Meetings",
    categoryColor: "#6366F1",
  },
  {
    id: "2",
    title: "Weekly Product Sync <> Wallace",
    description: "Review sprint progress",
    date: getDateString(0),
    time: "16:15",
    endTime: "16:30",
    completed: false,
    priority: "high",
    category: "Meetings",
    categoryColor: "#6366F1",
  },
  {
    id: "3",
    title: "Weekly Product Sync <> Eko",
    description: "Design review session",
    date: getDateString(0),
    time: "16:30",
    endTime: "16:45",
    completed: false,
    priority: "medium",
    category: "Meetings",
    categoryColor: "#6366F1",
  },
  {
    id: "4",
    title: "Weekly Product Sync <> Jian Jie",
    description: "Engineering sync",
    date: getDateString(0),
    time: "16:45",
    endTime: "17:00",
    completed: false,
    priority: "medium",
    category: "Meetings",
    categoryColor: "#6366F1",
  },

  {
    id: "5",
    title: "Watch Ryan Hoover Seminar",
    description: "ProductHunt founder sharing insights on launching products",
    date: getDateString(1),
    completed: false,
    priority: "medium",
    category: "Learning",
    categoryColor: "#10B981",
  },
  {
    id: "6",
    title: "[Research] Detailed competitor analysis",
    description: "Analyze top 5 competitors in the market",
    date: getDateString(1),
    completed: false,
    priority: "high",
    category: "Research",
    categoryColor: "#F59E0B",
  },

  {
    id: "7",
    title: "The Vanishing Half, by Brit Bennett",
    description: "Book club discussion",
    date: getDateString(2),
    completed: false,
    priority: "low",
    category: "bookworms",
    categoryColor: "#EC4899",
  },
  {
    id: "8",
    title: "Utopia Avenue, by David Mitchell",
    description: "Finish reading chapters 5-8",
    date: getDateString(2),
    completed: false,
    priority: "low",
    category: "bookworms",
    categoryColor: "#EC4899",
  },
  {
    id: "9",
    title: "Look at migrating from Sendgrid",
    description: "Research cheaper email alternatives",
    date: getDateString(2),
    completed: false,
    priority: "medium",
    category: "Development",
    categoryColor: "#8B5CF6",
  },

  {
    id: "10",
    title: "Q4 Planning Session",
    description: "Annual planning with leadership team",
    date: getDateString(3),
    time: "09:00",
    endTime: "12:00",
    completed: false,
    priority: "high",
    category: "Meetings",
    categoryColor: "#6366F1",
  },
  {
    id: "11",
    title: "Update portfolio website",
    description: "Add new projects and refresh design",
    date: getDateString(3),
    completed: false,
    priority: "low",
    category: "Personal",
    categoryColor: "#06B6D4",
  },

  {
    id: "12",
    title: "Dentist Appointment",
    description: "Regular checkup",
    date: getDateString(4),
    time: "14:30",
    endTime: "15:00",
    completed: false,
    priority: "medium",
    category: "Health",
    categoryColor: "#EF4444",
  },
  {
    id: "13",
    title: "Prepare presentation slides",
    description: "For the investor meeting next week",
    date: getDateString(4),
    completed: false,
    priority: "high",
    category: "Work",
    categoryColor: "#6366F1",
  },

  {
    id: "14",
    title: "Team lunch",
    description: "Monthly team bonding",
    date: getDateString(5),
    time: "12:00",
    endTime: "14:00",
    completed: false,
    priority: "low",
    category: "Social",
    categoryColor: "#F97316",
  },

  {
    id: "15",
    title: "Code review session",
    description: "Review PRs from the team",
    date: getDateString(6),
    time: "10:00",
    endTime: "11:30",
    completed: false,
    priority: "medium",
    category: "Development",
    categoryColor: "#8B5CF6",
  },
  {
    id: "16",
    title: "Gym - Leg Day",
    description: "Don't skip leg day!",
    date: getDateString(6),
    time: "18:00",
    endTime: "19:30",
    completed: false,
    priority: "medium",
    category: "Health",
    categoryColor: "#EF4444",
  },

  {
    id: "17",
    title: "Submit expense reports",
    date: getDateString(-1),
    completed: true,
    priority: "medium",
    category: "Admin",
    categoryColor: "#64748B",
  },
  {
    id: "18",
    title: "Review contract draft",
    date: getDateString(-1),
    completed: true,
    priority: "high",
    category: "Legal",
    categoryColor: "#6366F1",
  },
  {
    id: "19",
    title: "Finalize budget proposal",
    date: getDateString(-2),
    completed: true,
    priority: "high",
    category: "Finance",
    categoryColor: "#10B981",
  },
];

export function getTodosForDate(date: string): Todo[] {
  return mockTodos
    .filter((todo) => todo.date === date)
    .sort((a, b) => {
      if (a.time && b.time) {
        return a.time.localeCompare(b.time);
      }
      if (a.time) return -1;
      if (b.time) return 1;

      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
}

export function getMarkedDates(): Record<string, { marked: boolean; dotColor: string }> {
  const marked: Record<string, { marked: boolean; dotColor: string }> = {};

  mockTodos.forEach((todo) => {
    if (!marked[todo.date]) {
      marked[todo.date] = {
        marked: true,
        dotColor: todo.categoryColor || "#6366F1",
      };
    }
  });

  return marked;
}

