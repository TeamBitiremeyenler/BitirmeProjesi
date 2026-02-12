import React, { FC } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { BlurView, BlurViewProps } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import { cn } from "../lib/utils/cn";
import { colorKit } from "reanimated-color-picker";

type Props = {
  position?: "top" | "bottom";
  height?: number;
  blurViewProps?: BlurViewProps;
};

export const ProgressiveBlurView: FC<Props> = ({
  position = "top",
  height = 100,
  blurViewProps,
}) => {
  return (
    <View
      className={cn(
        "absolute left-0 right-0 pointer-events-none",
        position === "top" ? "top-0" : "bottom-0"
      )}
      style={[
        {
          position: "absolute",
          height,
        },
      ]}
    >
      {Platform.OS === "ios" ? (
        <MaskedView
          maskElement={
            <LinearGradient
              locations={position === "top" ? [0.5, 0.75, 1] : [0, 0.25, 0.5]}
              colors={
                position === "top"
                  ? ["black", colorKit.setAlpha("black", 0.5).hex(), "transparent"]
                  : ["transparent", colorKit.setAlpha("black", 0.5).hex(), "black"]
              }
              style={StyleSheet.absoluteFill}
            />
          }
          style={[StyleSheet.absoluteFill]}
        >
          <BlurView
            style={[StyleSheet.absoluteFill, blurViewProps?.style]}
            intensity={blurViewProps?.intensity ?? 20}
            {...blurViewProps}
          />
        </MaskedView>
      ) : (
        <LinearGradient
          style={StyleSheet.absoluteFillObject}
          colors={
            position === "top"
              ? [colorKit.setAlpha("#000", 0.9).hex(), colorKit.setAlpha("#000", 0).hex()]
              : [colorKit.setAlpha("#000", 0).hex(), colorKit.setAlpha("#000", 0.9).hex()]
          }
        />
      )}
    </View>
  );
};
