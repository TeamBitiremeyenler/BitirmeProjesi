import { simulatePress } from "@/src/shared/lib/utils/simulate-press";
import { Mic } from "lucide-react-native";
import React, { FC } from "react";
import { Pressable } from "react-native";

// perplexity-chat-input-on-focus-animation 🔽

export const MicButton: FC = () => {
  return (
    <Pressable
      onPress={simulatePress}
      className="p-2 rounded-full items-center justify-center bg-neutral-700/90"
    >
      <Mic size={18} color="white" />
    </Pressable>
  );
};

// perplexity-chat-input-on-focus-animation 🔼
