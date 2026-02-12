import Constants from "expo-constants";
import { useEffect } from "react";
import { getAppInfoFromTheStore, shouldUpdateApp } from "../utils/version-check";
import { Alert, Platform } from "react-native";
import * as Linking from "expo-linking";
import { MANUAL_ERROR_CAPTURE } from "../utils/sentry";
import { APP_STORE_URL, PLAY_MARKET_URL } from "../constants/links";
import { useAppStore } from "../store/app";

export const useVersionCheck = () => {
  const setIsVersionChecked = useAppStore.use.setIsVersionChecked();
  const setIsNewVersionAvailable = useAppStore.use.setIsNewVersionAvailable();

  const linkToStore = () => {
    const storeLink = Platform.select({
      ios: APP_STORE_URL,
      android: PLAY_MARKET_URL,
    });

    if (storeLink) {
      Linking.openURL(storeLink);
    }
  };

  const checkForUpdate = async () => {
    try {
      const result = await getAppInfoFromTheStore();
      const newestVersion = result?.version;
      const installedVersion = Constants.expoConfig?.version;
      if (installedVersion && newestVersion && shouldUpdateApp(installedVersion, newestVersion)) {
        setIsNewVersionAvailable(true);

        if (__DEV__) {
          Alert.alert(
            "New Version Available",
            "Please pull the latest changes from the repository.",
            [
              {
                text: "Got it",
                isPreferred: true,
                onPress: () => null,
              },
            ]
          );
        } else {
          Alert.alert(
            "New Version Available",
            "Please update the app to get the latest animations and features.",
            [
              {
                text: "Download Now",
                isPreferred: true,
                onPress: () => linkToStore(),
              },
            ]
          );
        }
      }
    } catch (error) {
      MANUAL_ERROR_CAPTURE({
        title: "useVersionCheck > Failed",
        error,
      });
    } finally {
      setIsVersionChecked(true);
    }
  };

  useEffect(() => {
    if (__DEV__) return;
    checkForUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
