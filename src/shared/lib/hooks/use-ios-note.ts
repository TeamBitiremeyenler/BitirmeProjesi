import { useEffect } from "react";
import { Alert, Platform } from "react-native";

export const useIOSNote = (message: string) => {
  useEffect(() => {
    if (Platform.OS === "ios") {
      Alert.alert("Note", message);
    }
  }, [message]);
};
