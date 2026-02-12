import { useEffect } from "react";
import { Alert, Platform } from "react-native";

export const useAndroidNote = (message: string) => {
  useEffect(() => {
    if (Platform.OS === "android") {
      Alert.alert("Note", message);
    }
  }, [message]);
};
