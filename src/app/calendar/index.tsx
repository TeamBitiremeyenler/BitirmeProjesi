import { CalendarAgenda } from "@/src/components/calendar-page/calendar/CalendarAgenda";

export default function Calendar() {
    return (
        <CalendarAgenda
            isDarkMode={false}
            onToggleTheme={() => { }}
            onTodoPress={(todo) => console.log("Todo pressed:", todo)}
            onTodoToggle={(todo) => console.log("Todo toggled:", todo)}
            onDateChange={(date) => console.log("Date changed:", date)}
        />
    );
}