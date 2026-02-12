import { useEffect, useState } from "react";
import { Keyboard } from "react-native";

export const useMaxKeyboardHeight = () => {
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);

  useEffect(() => {
    let keyboardShowEvent = Keyboard.addListener("keyboardDidShow", keyboardDidShow);
    return () => {
      keyboardShowEvent.remove();
    };
  }, []);

  const keyboardDidShow = (frames: any) => {
    setKeyboardHeight(frames.endCoordinates.height);
  };

  return keyboardHeight;
};
