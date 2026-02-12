import { cn } from "@/src/shared/lib/utils/cn";
import React, { FC, PropsWithChildren } from "react";
import { View, StyleSheet } from "react-native";

type Props = {
  className?: string;
};

export const IconContainer: FC<PropsWithChildren<Props>> = ({ className, children }) => {
  return (
    <View className={cn("self-start mt-0.5 rounded-[5px] p-1", className)} style={styles.container}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderCurve: "continuous",
  },
});
