import React, { FC } from "react";
import { Text, TextProps } from "react-native";
import { cn } from "../lib/utils/cn";

interface Props extends TextProps {
  className?: string;
}

export const AppText: FC<Props> = ({ className, ...props }) => {
  return <Text className={cn("text-foreground font-sans-normal", className)} {...props} />;
};
