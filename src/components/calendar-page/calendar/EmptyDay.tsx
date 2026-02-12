/**
 * EmptyDay Component
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { getAgendaColors } from "./theme";

interface EmptyDayProps {
  isDarkMode: boolean;
}

export function EmptyDay({ isDarkMode }: EmptyDayProps) {
  const colors = getAgendaColors(isDarkMode);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDarkMode ? colors.cardBackground : `${colors.cardBorder}40`,
          borderColor: colors.cardBorder,
        },
      ]}
    >
      <Text style={styles.emoji}>☀️</Text>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        No tasks for today
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Enjoy your free time!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
  },
  emoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
});

export default React.memo(EmptyDay);
