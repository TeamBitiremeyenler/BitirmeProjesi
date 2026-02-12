import React, { FC } from "react";
import { Path } from "@shopify/react-native-skia";
import { DerivedValue } from "react-native-reanimated";

type Props = {
  path: string;
  strokeWidth: DerivedValue<number>;
  opacity: DerivedValue<number>;
};

export const SkiaCorner: FC<Props> = ({ path, strokeWidth, opacity }) => {
  return (
    <Path
      path={path}
      color="white"
      style="stroke"
      strokeWidth={strokeWidth}
      strokeJoin="round"
      strokeCap="round"
      opacity={opacity}
    />
  );
};
