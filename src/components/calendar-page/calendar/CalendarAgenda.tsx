/**
 * CalendarAgenda Component
 * A swipeable calendar agenda with expandable calendar header
 */

import * as Haptics from "expo-haptics";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  CalendarProvider,
  ExpandableCalendar,
  LocaleConfig,
} from "react-native-calendars";

import { AgendaItem } from "./AgendaItem";
import { CalendarHeader } from "./CalendarHeader";
import { EmptyDay } from "./EmptyDay";
import { buildStaticTimeline, formatDayHeader, getDateString } from "./helpers";
import { getMarkedDates, mockTodos } from "./mock-data";
import { getAgendaColors, getTheme } from "./theme";
import type { MarkedDates, Todo, WeekDay } from "./types";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Configure locale for single-letter day names. You can add your own locale here.
// For example, if you want to add a new locale, you can add it like this:
// LocaleConfig.locales["fr"] = {
//   monthNames: ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"],
//   monthNamesShort: ["Jan", "Fev", "Mar", "Avr", "Mai", "Juin", "Juil", "Aou", "Sep", "Oct", "Nov", "Dec"],
//   dayNames: ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"],
//   dayNamesShort: ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"],
//   today: "Aujourd'hui",
// };
LocaleConfig.locales["en"] = {
  monthNames: [
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
  ],
  monthNamesShort: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ],
  dayNames: [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ],
  dayNamesShort: ["S", "M", "T", "W", "T", "F", "S"],
  today: "Today",
};
LocaleConfig.defaultLocale = "en";

interface CalendarAgendaProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onTodoPress?: (todo: Todo) => void;
  onTodoToggle?: (todo: Todo) => void;
  onDateChange?: (date: string) => void;
}

export function CalendarAgenda({
  isDarkMode,
  onToggleTheme,
  onTodoPress,
  onTodoToggle,
  onDateChange,
}: CalendarAgendaProps) {
  // State
  const today = useMemo(() => getDateString(new Date()), []);
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [todos, setTodos] = useState<Todo[]>(mockTodos);

  // Refs
  const scrollViewRef = useRef<ScrollView>(null);
  const isScrollingRef = useRef(false);
  const targetDateRef = useRef<string | null>(null);

  // Theme - memoize based on isDarkMode
  const theme = useMemo(() => getTheme(isDarkMode), [isDarkMode]);
  const colors = useMemo(() => getAgendaColors(isDarkMode), [isDarkMode]);

  // Build static timeline once
  const weekDays = useMemo(() => buildStaticTimeline(60), []);

  // Find index for today
  const todayIndex = useMemo(() => {
    const idx = weekDays.findIndex((d) => d.date === today);
    return idx >= 0 ? idx : Math.floor(weekDays.length / 2);
  }, [weekDays, today]);

  // Generate marked dates for calendar
  const markedDates = useMemo<MarkedDates>(() => {
    const base = getMarkedDates();
    const marked: MarkedDates = {};

    Object.keys(base).forEach((date) => {
      marked[date] = {
        marked: true,
        dotColor: base[date].dotColor,
      };
    });

    // Add selected date styling
    const selectedColor = isDarkMode ? "#FFFFFF" : "#1A1A1A";
    const selectedTextColor = isDarkMode ? "#0A0A0A" : "#FFFFFF";

    if (marked[selectedDate]) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor,
        selectedTextColor,
      };
    } else {
      marked[selectedDate] = {
        selected: true,
        selectedColor,
        selectedTextColor,
      };
    }

    return marked;
  }, [selectedDate, isDarkMode]);

  // Scroll to today on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        x: todayIndex * SCREEN_WIDTH,
        animated: false,
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [todayIndex]);

  // Scroll to date when calendar is pressed
  const scrollToDate = useCallback(
    (date: string) => {
      const index = weekDays.findIndex((d) => d.date === date);
      if (index >= 0 && scrollViewRef.current) {
        targetDateRef.current = date;
        isScrollingRef.current = true;
        scrollViewRef.current.scrollTo({
          x: index * SCREEN_WIDTH,
          animated: true,
        });
        setTimeout(() => {
          isScrollingRef.current = false;
          if (targetDateRef.current === date) {
            targetDateRef.current = null;
          }
        }, 600);
      } else {
        // Date not in timeline, clear target
        targetDateRef.current = null;
      }
    },
    [weekDays]
  );

  // Handlers
  const handleDayPress = useCallback(
    (day: { dateString: string }) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const dateString = day.dateString;

      // Update selected date immediately
      setSelectedDate(dateString);
      onDateChange?.(dateString);

      // Scroll to the date (will only scroll if date is in timeline)
      scrollToDate(dateString);

      // If date is not in timeline, we still want to show it
      // The header will update, but agenda view will show the closest day
      // This is expected behavior for dates outside the 60-day range
    },
    [scrollToDate, onDateChange]
  );

  const handleTodoToggle = useCallback(
    (todo: Todo) => {
      setTodos((prev) =>
        prev.map((t) =>
          t.id === todo.id ? { ...t, completed: !t.completed } : t
        )
      );
      onTodoToggle?.(todo);
    },
    [onTodoToggle]
  );

  const handleTodoPress = useCallback(
    (todo: Todo) => {
      onTodoPress?.(todo);
    },
    [onTodoPress]
  );

  // Get todos for a specific date from local state
  const getTodosForDateLocal = useCallback(
    (date: string): Todo[] => {
      return todos
        .filter((todo) => todo.date === date)
        .sort((a, b) => {
          if (a.time && b.time) return a.time.localeCompare(b.time);
          if (a.time) return -1;
          if (b.time) return 1;
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    },
    [todos]
  );

  // Handle scroll end to sync date
  const handleScrollEnd = useCallback(
    (e: any) => {
      if (isScrollingRef.current) {
        // If we have a target date, verify we reached it
        if (targetDateRef.current) {
          const offsetX = e.nativeEvent.contentOffset.x;
          const index = Math.round(offsetX / SCREEN_WIDTH);
          const targetDay = weekDays[index];

          // If we reached the target, clear it and ensure selectedDate matches
          if (targetDay && targetDay.date === targetDateRef.current) {
            if (selectedDate !== targetDay.date) {
              setSelectedDate(targetDay.date);
              onDateChange?.(targetDay.date);
            }
            targetDateRef.current = null;
          }
        }
        return;
      }

      // Manual scroll - update selected date
      const offsetX = e.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / SCREEN_WIDTH);
      const targetDay = weekDays[index];

      if (targetDay && targetDay.date !== selectedDate) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedDate(targetDay.date);
        onDateChange?.(targetDay.date);
      }
    },
    [weekDays, selectedDate, onDateChange]
  );

  // Today button theme
  const todayBtnTheme = useMemo(
    () => ({
      todayButtonTextColor: colors.accent,
    }),
    [colors.accent]
  );

  // Calendar theme overrides (hide internal month title, keep day labels, rounded rectangle for selected day)
  const calendarTheme = useMemo(
    () => ({
      ...theme,
      monthTextColor: "transparent",
      textMonthFontSize: 0.1,
      "stylesheet.day.basic": {
        base: {
          width: 32,
          height: 32,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
        },
        selected: {
          backgroundColor: theme.selectedDayBackgroundColor,
        },
        today: {
          backgroundColor: theme.selectedDayBackgroundColor,
        },
        text: {
          color: theme.dayTextColor,
          marginTop: 0,
        },
        selectedText: {
          color: theme.selectedDayTextColor,
        },
        todayText: {
          color: theme.selectedDayTextColor,
        },
        disabledText: {
          color: theme.textDisabledColor,
        },
      },
    }),
    [theme]
  );

  // Handle today button press
  const handleTodayPress = useCallback(() => {
    setSelectedDate(today);
    onDateChange?.(today);
    scrollToDate(today);
  }, [today, onDateChange, scrollToDate]);

  // Render day content
  const renderDayContent = (item: WeekDay) => {
    const dayTodos = getTodosForDateLocal(item.date);
    const { day, dayNum } = formatDayHeader(item.moment);

    return (
      <View
        key={item.date}
        style={[styles.dayContainer, { width: SCREEN_WIDTH }]}
      >
        <View style={styles.dayHeader}>
          {/* Date Column */}
          <View style={styles.dateColumn}>
            <Text
              style={[
                styles.dayText,
                { color: item.isToday ? colors.accent : colors.textSecondary },
              ]}
            >
              {day.toUpperCase()}
            </Text>
            <Text
              style={[
                styles.dayNumText,
                { color: item.isToday ? colors.accent : colors.textPrimary },
              ]}
            >
              {dayNum}
            </Text>
          </View>

          {/* Content Column */}
          <View style={styles.contentColumn}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.todoList}
            >
              {dayTodos.length > 0 ? (
                dayTodos.map((todo) => (
                  <AgendaItem
                    key={todo.id}
                    item={todo}
                    isDarkMode={isDarkMode}
                    onPress={handleTodoPress}
                    onToggleComplete={handleTodoToggle}
                  />
                ))
              ) : (
                <EmptyDay isDarkMode={isDarkMode} />
              )}
            </ScrollView>
          </View>
        </View>
      </View>
    );
  };

  // Calendar key for forcing re-render on theme change
  const calendarKey = isDarkMode ? "dark" : "light";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Custom Header */}
      <CalendarHeader
        selectedDate={selectedDate}
        isDarkMode={isDarkMode}
        onToggleTheme={onToggleTheme}
        onTodayPress={handleTodayPress}
      />

      <CalendarProvider theme={todayBtnTheme} date={selectedDate}>
        {/* Expandable Calendar */}
        <ExpandableCalendar
          key={calendarKey}
          calendarStyle={{ backgroundColor: theme.calendarBackground }}
          headerStyle={{ backgroundColor: colors.calendarHeader }}
          theme={calendarTheme}
          current={selectedDate}
          firstDay={1}
          markedDates={markedDates}
          onDayPress={handleDayPress}
          hideArrows
          allowShadow={false}
          initialPosition={ExpandableCalendar.positions.CLOSED}
          hideKnob={false}
        />

        {/* Agenda List */}
        <View
          style={[
            styles.agendaContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <ScrollView
            ref={scrollViewRef}
            horizontal
            contentContainerStyle={{ backgroundColor: "#fffaf5" }}
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScrollEnd}
            onScrollEndDrag={handleScrollEnd}
            scrollEventThrottle={16}
            decelerationRate="fast"
          >
            {weekDays.map((day) => renderDayContent(day))}
          </ScrollView>
        </View>
      </CalendarProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  agendaContainer: {
    flex: 1,
  },
  dayContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  dayHeader: {
    flex: 1,
    flexDirection: "row",
  },
  dateColumn: {
    width: 50,
    alignItems: "center",
    paddingTop: 4,
  },
  dayText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  dayNumText: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: 2,
  },
  contentColumn: {
    flex: 1,
    marginLeft: 16,
  },
  todoList: {
    paddingBottom: 120,
  },
  fab: {
    position: "absolute",
    bottom: 32,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 28,
    fontWeight: "300",
    marginTop: -2,
  },
});

export default React.memo(CalendarAgenda);
