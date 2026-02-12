import { View, Text, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import { FC } from "react";
import { simulatePress } from "@/src/shared/lib/utils/simulate-press";

// perplexity-profile-segmented-control-animation 🔽

type TabContentProps = {
  imageSrc: number;
  title: string;
  description: string;
  buttonText: string;
  buttonIcon: React.ReactNode;
  onButtonPress?: () => void;
};

const TabContent: FC<TabContentProps> = ({
  imageSrc,
  title,
  description,
  buttonText,
  buttonIcon,
  onButtonPress,
}) => {
  return (
    <View
      // borderCurve: "continuous" ensures smooth rounded corners on iOS during
      // tab switches. overflow-hidden: Clips image to container bounds.
      style={{ borderCurve: "continuous" }}
      className="flex-1 w-full rounded-3xl p-7 overflow-hidden"
    >
      <Image
        source={imageSrc}
        contentFit="cover"
        style={StyleSheet.absoluteFill}
        // transition={200}: Cross-fade duration (ms) when image source changes
        // during tab switch. Coordinates with SegmentedControl animation timing
        // for cohesive visual transition between threads/spaces content.
        transition={200}
      />
      <Text className="text-white text-3xl font-medium">{title}</Text>
      <Text className="text-white text-lg mt-3">{description}</Text>
      <Pressable
        onPress={onButtonPress ?? simulatePress}
        // borderCurve: "continuous" maintains visual consistency with container
        // rounded geometry, especially important on iOS for smooth button edges.
        style={{ borderCurve: "continuous" }}
        className="flex-row mt-auto bg-white rounded-full p-4 items-center justify-center gap-2"
      >
        {buttonIcon}

        <Text className="text-black font-medium text-lg">{buttonText}</Text>
      </Pressable>
    </View>
  );
};

export default TabContent;

// perplexity-profile-segmented-control-animation 🔼
