import {
  createContext,
  FC,
  PropsWithChildren,
  RefObject,
  useCallback,
  useContext,
  useRef,
} from "react";
import { Dimensions, TextInput } from "react-native";
import { SharedValue, useSharedValue, withTiming } from "react-native-reanimated";

// raycast-home-search-transition-animation 🔽

// Why: Core sizing constants used across header/search transitions.
// Keeping them centralized ensures indicator math, paddings, and width interpolations
// stay in sync when designs change.
export const SEARCHBAR_HEIGHT = 40;
export const EDIT_HOME_CONTAINER_WIDTH = 65;
export const SETTINGS_CONTAINER_WIDTH = 65;
export const CANCEL_CONTAINER_WIDTH = 75;
const LEFT_PADDING = 16;

// Why: Search field width differs between views.
// Favorites keeps both side buttons visible → less width.
// Commands replaces right button with "Cancel" and shifts origin → more width.
export const SEARCHBAR_FAVORITES_WIDTH =
  Dimensions.get("window").width - EDIT_HOME_CONTAINER_WIDTH - SETTINGS_CONTAINER_WIDTH;
export const SEARCHBAR_COMMANDS_WIDTH =
  Dimensions.get("window").width - CANCEL_CONTAINER_WIDTH - LEFT_PADDING;

// Why: Negative drag distances drive the "pull to search" reveal.
// TRIGGER_DRAG_DISTANCE: threshold to switch views (favorites → commands).
// FULL_DRAG_DISTANCE: max distance used to normalize interpolations (e.g., blur opacity).
export const TRIGGER_DRAG_DISTANCE = -100;
export const FULL_DRAG_DISTANCE = -200;

type ScreenView = "favorites" | "commands";

type ContextValue = {
  // Allow null to match useRef<TextInput>(null) initialization pattern
  inputRef: RefObject<TextInput | null>;
  screenView: SharedValue<ScreenView>;
  isListDragging: SharedValue<boolean>;
  offsetY: SharedValue<number>;
  blurIntensity: SharedValue<number>;
  onGoToCommands: () => void;
  onGoToFavorites: () => void;
};

const HomeAnimationContext = createContext<ContextValue>({} as ContextValue);

export const HomeAnimationProvider: FC<PropsWithChildren> = ({ children }) => {
  const inputRef = useRef<TextInput>(null);

  // Why: Shared values coordinate animation state across components without prop-drilling.
  // - screenView drives conditional rendering/interaction of lists and header controls
  // - offsetY reflects ScrollView drag (negative = pull down)
  // - isListDragging gates certain effects (scale on drag, pointer events)
  // - blurIntensity feeds BlurView intensity for platform blur
  const screenView = useSharedValue<ScreenView>("favorites");
  const offsetY = useSharedValue(0);
  const isListDragging = useSharedValue(false);
  const blurIntensity = useSharedValue(0);

  // Why: Transition into command mode focuses input and increases blur for visual depth.
  // withTiming(100) chosen for instant but smooth blur ramp without spring overshoot.
  const onGoToCommands = useCallback(() => {
    screenView.value = "commands";
    blurIntensity.value = withTiming(100);
    inputRef.current?.focus();
  }, []);

  // Why: Returning to favorites drops blur and defocuses input to restore lightweight home.
  // Blur goes to 0 withTiming for subtle fade-out instead of abrupt switch.
  const onGoToFavorites = useCallback(() => {
    screenView.value = "favorites";
    blurIntensity.value = withTiming(0);
    inputRef.current?.blur();
  }, []);

  const value = {
    inputRef,
    screenView,
    isListDragging,
    offsetY,
    blurIntensity,
    onGoToCommands,
    onGoToFavorites,
  };
  return <HomeAnimationContext.Provider value={value}>{children}</HomeAnimationContext.Provider>;
};

export const useHomeAnimation = () => {
  const context = useContext(HomeAnimationContext);

  if (!context) {
    throw new Error("useHomeAnimation must be used within an HomeAnimationProvider");
  }

  return context;
};

// raycast-home-search-transition-animation 🔼
