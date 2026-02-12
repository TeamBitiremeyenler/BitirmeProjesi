import type { WeekDay } from "./types";

/**
 * Converts a Date object to ISO date string (YYYY-MM-DD)
 */
export function getDateString(date: Date): string {
    return date.toISOString().split("T")[0];
}

/**
 * Formats a date into day name and day number
 * @returns Object with day abbreviation (e.g., "M") and padded day number (e.g., "05")
 */
export function formatDayHeader(date: Date): { day: string; dayNum: string } {
    const days = ["S", "M", "T", "W", "T", "F", "S"];
    return {
        day: days[date.getDay()],
        dayNum: date.getDate().toString().padStart(2, "0"),
    };
}

/**
 * Builds a static timeline of days centered on today
 * @param totalDays - Total number of days to generate (default: 60)
 * @returns Array of WeekDay objects representing the timeline
 */
export function buildStaticTimeline(totalDays: number = 60): WeekDay[] {
    const days: WeekDay[] = [];
    const today = new Date();
    const halfDays = Math.floor(totalDays / 2);

    for (let i = -halfDays; i <= halfDays; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);

        days.push({
            date: getDateString(date),
            moment: new Date(date),
            isToday: i === 0,
        });
    }

    return days;
}

