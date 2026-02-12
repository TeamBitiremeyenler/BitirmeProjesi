import { FC } from "react";
import { Alert, Pressable } from "react-native";
import { Scan } from "lucide-react-native";
import { useRouter } from "expo-router";
import { fireHaptic } from "../../../lib/utils/fire-haptic";
import { useCameraPermissions } from "expo-camera";
import * as Linking from "expo-linking";

export const QrScannerButton: FC = () => {
  const [status, requestPermission] = useCameraPermissions();

  const router = useRouter();

  const handlePress = () => {
    if (status?.granted) {
      fireHaptic();
      router.push("/qr-scanner");
    } else if (!status?.granted && status?.canAskAgain) {
      requestPermission();
    } else if (!status?.granted && !status?.canAskAgain) {
      Alert.alert(
        "Camera permission required",
        "Please grant camera permission to use this feature.",
        [
          {
            text: "Grant Permissions",
            style: "default",
            isPreferred: true,
            onPress: () => {
              Linking.openSettings();
            },
          },
          {
            text: "Dismiss",
            style: "destructive",
          },
        ]
      );
    }
  };

  return (
    <Pressable className="p-2" hitSlop={12} onPress={handlePress}>
      <Scan size={20} color="#FFFFF5" strokeWidth={2.5} />
    </Pressable>
  );
};
