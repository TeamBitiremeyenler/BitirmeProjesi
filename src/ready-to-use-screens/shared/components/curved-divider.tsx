import React, { memo, useId } from "react";
import { View, useWindowDimensions } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import Svg, { Defs, Pattern, Path, Rect } from "react-native-svg";

type Props = {
  style?: any;
  variant?: "line" | "wave";
  color?: string;
  strokeWidth?: number;
  wavelength?: number;
  amplitude?: number;
  height?: number;
  width?: number;
};

const CurvedDivider = ({
  style,
  variant = "wave",
  color = "#ffe5db30",
  strokeWidth = 2,
  wavelength,
  amplitude,
  height,
  width,
}: Props) => {
  const id = useId();
  const patternId = `divider-wave-${id}`;
  const { width: screenWidth } = useWindowDimensions();

  const dividerWidth = width ?? screenWidth;
  const dividerHeight = height ?? 20;

  if (variant === "wave") {
    const wlRandom = Math.random() * 16 + 16;
    const ampRandom = Math.random() * 6 + 6;

    const wl = Math.max(4, wavelength ?? Math.floor(wlRandom)); // default wavelength
    const amp = Math.max(1, amplitude ?? Math.floor(ampRandom)); // default amplitude
    const ph = Math.max(16, Math.ceil(amp * 2 + strokeWidth + 4)); // pattern height
    const baseline = ph / 2;

    const c1x = wl * (Math.random() * 0.3 + 0.3);
    const c2x = wl * (Math.random() * 0.3 + 0.3);
    const d = `M0,${baseline} C ${c1x},${baseline - amp} ${c2x},${baseline + amp} ${wl},${baseline}`;

    return (
      <Animated.View
        entering={FadeIn.duration(400)}
        style={[{ width: dividerWidth, height: dividerHeight }, style]}
      >
        <Svg
          width={dividerWidth}
          height={dividerHeight}
          viewBox={`0 0 ${dividerWidth} ${dividerHeight}`}
          preserveAspectRatio="none"
        >
          <Defs>
            <Pattern id={patternId} width={wl} height={ph} patternUnits="userSpaceOnUse">
              <Path
                d={d}
                fill="none"
                stroke={color}
                strokeOpacity={0.3}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </Pattern>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${patternId})`} />
        </Svg>
      </Animated.View>
    );
  }

  // Default: simple straight divider line
  return (
    <View
      style={[
        {
          height: 1,
          width: dividerWidth,
          backgroundColor: "rgba(115, 115, 115, 0.3)",
        },
        style,
      ]}
    />
  );
};

export default memo(CurvedDivider);
