import { useSharedValue } from "react-native-reanimated";
import { Animated } from "react-native";
import { TabNavigationState, ParamListBase } from "@react-navigation/native";
import { useEffect } from "react";

type Params = {
  position: Animated.AnimatedInterpolation<number>;
  state: TabNavigationState<ParamListBase>;
};

/**
 * Hook that transforms Animated value of position from material top tabs to
 * reanimated shared value. This allows to use material top tab with reanimated
 * components.
 *
 * It also returns dummy opacity style to trigger re-render of children
 * components when active tab changes.
 */

export const useReanimatedTopTabsIndex = ({ position, state }: Params) => {
  const activeTabIndex = useSharedValue(0);

  // We need it to trigger update of Animated position
  const inputRange = state.routes.map((_, i) => i);
  const outputRange = state.routes.map(() => 1);
  const dummyOpacity = position.interpolate({
    inputRange,
    outputRange,
  });

  useEffect(() => {
    const id = position.addListener(({ value }) => {
      activeTabIndex.value = value;
    });

    return () => {
      position.removeListener(id);
    };
  }, []);

  return { activeTabIndex, dummyOpacity };
};
