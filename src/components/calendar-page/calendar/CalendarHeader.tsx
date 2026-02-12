/**
 * CalendarHeader Component
 */

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { getAgendaColors } from "./theme";
import { ArrowLeft, ChevronLeft } from "lucide-react-native";
import { router } from "expo-router";

interface CalendarHeaderProps {
    selectedDate: string;
    isDarkMode: boolean;
    onToggleTheme: () => void;
    onTodayPress: () => void;
}

function formatHeaderDate(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];

    const day = date.getDate();
    const month = months[date.getMonth()];

    // Check if it's today, tomorrow, or yesterday
    if (date.toDateString() === today.toDateString()) {
        return `Today, ${day} ${month}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
        return `Tomorrow, ${day} ${month}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
        return `Yesterday, ${day} ${month}`;
    }

    // For other days, show day name
    const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
    ];
    return `${days[date.getDay()]}, ${day} ${month}`;
}

function isToday(dateString: string): boolean {
    const date = new Date(dateString);
    const today = new Date();
    return date.toDateString() === today.toDateString();
}

export function CalendarHeader({
    selectedDate,
    isDarkMode,
    onToggleTheme,
    onTodayPress,
}: CalendarHeaderProps) {
    const colors = getAgendaColors(isDarkMode);
    const isSelectedToday = isToday(selectedDate);

    const handleToggle = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onToggleTheme();
    };

    const handleTodayPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onTodayPress();
    };

    return (
        <View
            style={[styles.container, { backgroundColor: colors.calendarHeader }]}
        >
            <TouchableOpacity onPress={() => router.replace("/home")}>
                <ChevronLeft size={24} />
            </TouchableOpacity>
            {/* Title */}
            <Text style={[styles.title, { color: colors.textPrimary }]}>
                {formatHeaderDate(selectedDate)}
            </Text>
            {/* Today Button */}
            <View style={styles.todayButtonContainer}>
                <TouchableOpacity
                    onPress={handleTodayPress}
                    style={[
                        styles.todayButton,
                        {
                            backgroundColor: isSelectedToday
                                ? colors.accent
                                : colors.cardBackground,
                        },
                    ]}
                    activeOpacity={0.7}
                    disabled={isSelectedToday}
                >
                    <Text
                        style={[
                            styles.todayButtonText,
                            {
                                color: isSelectedToday
                                    ? isDarkMode
                                        ? "#0A0A0A"
                                        : "#FFFFFF"
                                    : colors.textSecondary,
                            },
                        ]}
                    >
                        Today
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    title: {
        fontSize: 15,
        fontWeight: "500",
        color: "#6B6560",
    },
    todayButtonContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    todayButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    todayButtonText: {
        fontSize: 14,
        fontWeight: "600",
    },
    themeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
    },
});

export default React.memo(CalendarHeader);
