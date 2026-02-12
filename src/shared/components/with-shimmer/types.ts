import { ReactElement } from "react";
import { ViewStyle } from "react-native";

export interface ShimmerColors {
  start: string;
  middle: string;
  end: string;
}

export interface WithShimmerProps {
  children: ReactElement;
  shimmerStyle?: ViewStyle;
  containerStyle?: ViewStyle;
  duration?: number;
  delay?: number;
  highlightWidth?: number;
  direction?: "ltr" | "rtl";
  angle?: number;
  colors?: ShimmerColors;
}
