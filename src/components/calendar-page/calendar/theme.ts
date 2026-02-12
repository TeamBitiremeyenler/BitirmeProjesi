/**
 * Calendar theme configuration
 */

export const themeColor = "#1A1A1A"; // Primary dark
export const accentColor = "#E8E4DF";

// Light mode 
export const lightCalendarTheme = {
    backgroundColor: "#F5F1EC",
    calendarBackground: "#F5F1EC",
    textSectionTitleColor: "#8B8680",
    selectedDayBackgroundColor: "#1A1A1A",
    selectedDayTextColor: "#FFFFFF",
    todayTextColor: "#1A1A1A",
    dayTextColor: "#1A1A1A",
    textDisabledColor: "#C4C0BB",
    dotColor: "#1A1A1A",
    selectedDotColor: "#FFFFFF",
    arrowColor: "#1A1A1A",
    monthTextColor: "#8B8680",
    indicatorColor: "#000",
    textDayFontWeight: "500" as const,
    textMonthFontWeight: "600" as const,
    textDayHeaderFontWeight: "500" as const,
    textDayFontSize: 17,
    textMonthFontSize: 15,
    textDayHeaderFontSize: 14,
    borderRadius: 8,
};

// Dark mode 
export const darkCalendarTheme = {
    backgroundColor: "#0A0A0A",
    calendarBackground: "#0A0A0A",
    textSectionTitleColor: "#6B6B6B",
    selectedDayBackgroundColor: "#FFFFFF",
    selectedDayTextColor: "#0A0A0A",
    todayTextColor: "#FFFFFF",
    dayTextColor: "#E5E5E5",
    textDisabledColor: "#3A3A3A",
    dotColor: "#FFFFFF",
    selectedDotColor: "#0A0A0A",
    arrowColor: "#FFFFFF",
    monthTextColor: "#6B6B6B",
    indicatorColor: "#FFFFFF",
    textDayFontWeight: "500" as const,
    textMonthFontWeight: "600" as const,
    textDayHeaderFontWeight: "500" as const,
    textDayFontSize: 17,
    textMonthFontSize: 15,
    textDayHeaderFontSize: 14,
    borderRadius: 8,
};

export function getTheme(isDarkMode: boolean) {
    return isDarkMode ? darkCalendarTheme : lightCalendarTheme;
}

// Agenda colors 
export const agendaColors = {
    light: {
        background: "#fffaf5",
        calendarHeader: "#F5F1EC",
        calendarBody: "#FFFFFF",
        cardBackground: "#FFFFFF",
        cardBorder: "#E8E4DF",
        textPrimary: "#1A1A1A",
        textSecondary: "#6B6560",
        textMuted: "#9B9590",
        accent: "#1A1A1A",
        accentLight: "#F0EDE8",
        success: "#2D8A56",
        successLight: "#E8F5EC",
        warning: "#C4820D",
        warningLight: "#FEF5E7",
        danger: "#D93636",
        dangerLight: "#FDECEC",
        tabBar: "#F5F1EC",
        tabBarBorder: "#E8E4DF",
    },
    dark: {
        background: "#0A0A0A",
        calendarHeader: "#0A0A0A",
        calendarBody: "#0A0A0A",
        cardBackground: "#1A1A1A",
        cardBorder: "#2A2A2A",
        textPrimary: "#FFFFFF",
        textSecondary: "#9B9B9B",
        textMuted: "#6B6B6B",
        accent: "#FFFFFF",
        accentLight: "#1A1A1A",
        success: "#4ADE80",
        successLight: "#14532D",
        warning: "#FBBF24",
        warningLight: "#422006",
        danger: "#F87171",
        dangerLight: "#450A0A",
        tabBar: "#0A0A0A",
        tabBarBorder: "#1A1A1A",
    },
};

export function getAgendaColors(isDarkMode: boolean) {
    return isDarkMode ? agendaColors.dark : agendaColors.light;
}
