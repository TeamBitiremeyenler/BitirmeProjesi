/**
 * AgendaItem Component
 * Renders a single todo item in the agenda list
 */

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as Haptics from "expo-haptics";

import type { Todo } from "./types";
import { getAgendaColors } from "./theme";

interface AgendaItemProps {
  item: Todo;
  isDarkMode: boolean;
  onPress?: (item: Todo) => void;
  onToggleComplete?: (item: Todo) => void;
}

export function AgendaItem({
  item,
  isDarkMode,
  onPress,
  onToggleComplete,
}: AgendaItemProps) {
  const colors = getAgendaColors(isDarkMode);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(item);
  };

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToggleComplete?.(item);
  };

  const getPriorityColor = () => {
    switch (item.priority) {
      case "high":
        return colors.danger;
      case "medium":
        return colors.warning;
      case "low":
        return colors.textMuted;
      default:
        return colors.textMuted;
    }
  };

  const formatTime = (time?: string, endTime?: string) => {
    if (!time) return null;
    if (endTime) {
      return `${time} - ${endTime}`;
    }
    return time;
  };

  const timeDisplay = formatTime(item.time, item.endTime);

  const categoryBgColor = isDarkMode
    ? `${item.categoryColor}30`
    : `${item.categoryColor}15`;

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={[
        styles.container,
        {
          backgroundColor: colors.cardBackground,
          borderColor: colors.cardBorder,
          opacity: item.completed ? 0.6 : 1,
        },
      ]}
    >
      {/* Left accent bar */}
      <View
        style={[
          styles.accentBar,
          { backgroundColor: item.categoryColor || colors.accent },
        ]}
      />

      {/* Content */}
      <View style={styles.content}>
        {/* Header row */}
        <View style={styles.headerRow}>
          <Text
            style={[
              styles.title,
              {
                color: colors.textPrimary,
                textDecorationLine: item.completed ? "line-through" : "none",
              },
            ]}
            numberOfLines={2}
          >
            {item.title}
          </Text>

          {/* Checkbox */}
          <TouchableOpacity
            onPress={handleToggle}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={[
              styles.checkbox,
              {
                borderColor: item.completed ? colors.success : colors.cardBorder,
                backgroundColor: item.completed ? colors.success : "transparent",
              },
            ]}
          >
            {item.completed && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Time row */}
        {timeDisplay && (
          <Text style={[styles.time, { color: colors.textSecondary }]}>
            {timeDisplay}
          </Text>
        )}

        {/* Footer row */}
        <View style={styles.footerRow}>
          {item.category && (
            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: categoryBgColor },
              ]}
            >
              <View
                style={[
                  styles.categoryDot,
                  { backgroundColor: item.categoryColor || colors.accent },
                ]}
              />
              <Text
                style={[
                  styles.categoryText,
                  { color: item.categoryColor || colors.accent },
                ]}
              >
                {item.category}
              </Text>
            </View>
          )}

          {/* Priority indicator */}
          <View style={styles.priorityContainer}>
            <View
              style={[
                styles.priorityDot,
                { backgroundColor: getPriorityColor() },
              ]}
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  accentBar: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 14,
    paddingLeft: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
    lineHeight: 20,
  },
  time: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: "500",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 8,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "600",
  },
  priorityContainer: {
    marginLeft: "auto",
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
});

export default React.memo(AgendaItem);
