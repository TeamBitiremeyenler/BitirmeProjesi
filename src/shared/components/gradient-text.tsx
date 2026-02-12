import React from "react";
import { Text, TextProps, StyleSheet } from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient, LinearGradientProps } from "expo-linear-gradient";

type GradientTextProps = {
  text: string;
  gradientProps?: Partial<LinearGradientProps>;
  className?: string;
  textProps?: TextProps;
};

export const GradientText = ({ text, gradientProps, className, textProps }: GradientTextProps) => {
  return (
    <MaskedView
      maskElement={
        <Text className={className} {...textProps}>
          {text}
        </Text>
      }
    >
      <LinearGradient
        colors={gradientProps?.colors ?? ["blue", "yellow", "blue"]}
        start={gradientProps?.start ?? { x: 0, y: 0 }}
        end={gradientProps?.end ?? { x: 1, y: 0 }}
        style={[StyleSheet.absoluteFill, gradientProps?.style]}
        {...gradientProps}
      />
      <Text className={className} {...textProps} style={{ opacity: 0 }}>
        {text}
      </Text>
    </MaskedView>
  );
};
