import { View, StyleSheet } from "react-native";
import React from "react";
import { cn } from "@/src/shared/lib/utils/cn";

type DividerProps = {
  className?: string;
};

export const Divider = ({ className }: DividerProps) => {
  return (
    <View className={cn("bg-neutral-600 ml-9 -mr-4 my-4", className)} style={styles.hairline} />
  );
};

const styles = StyleSheet.create({
  hairline: {
    height: StyleSheet.hairlineWidth,
  },
});
