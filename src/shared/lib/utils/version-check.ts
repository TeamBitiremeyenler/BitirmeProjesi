import { Platform } from "react-native";
import Constants from "expo-constants";

const bundleInfo = Platform.select({
  ios: {
    id: Constants.expoConfig?.ios?.bundleIdentifier ?? "your.bundle.id",
  },
  android: {
    id: Constants.expoConfig?.android?.package ?? "your.bundle.id",
  },
});

interface AppInfoFromStore {
  version: string;
  storeUrl: string;
}

export async function getInfoFromAppStore(country = ""): Promise<AppInfoFromStore | null> {
  try {
    const response = await fetch(
      `https://itunes.apple.com/lookup?bundleId=${bundleInfo?.id}&country=${country}`,
      { cache: "no-store" }
    );

    const data = (await response.json()) as {
      results: { trackViewUrl: string; version: string }[];
    };

    return {
      storeUrl: data?.results[0]?.trackViewUrl ?? "",
      version: data?.results[0]?.version ?? "",
    };
  } catch (e) {
    return null;
  }
}

export async function getInfoFromPlayStore(country = ""): Promise<AppInfoFromStore | null> {
  try {
    const storeUrl = `https://play.google.com/store/apps/details?id=${bundleInfo?.id}&hl=en&gl=US`;
    const response = await fetch(storeUrl, { cache: "no-store" });
    const data = await response.text();

    const match = data.match(/Current Version.+?>([\d.-]+)<\/span>/);

    if (match) {
      const latestVersion = match[1].trim();
      return { version: latestVersion, storeUrl };
    }

    const matchNewLayout = data.match(/\[\[\["([\d-.]+?)"\]\]/);

    if (matchNewLayout) {
      const latestVersion = matchNewLayout[1].trim();
      return { version: latestVersion, storeUrl };
    }

    return null;
  } catch (e) {
    return null;
  }
}

export async function getAppInfoFromTheStore(country = ""): Promise<AppInfoFromStore | null> {
  const selectedFunction = Platform.select({
    ios: getInfoFromAppStore,
    android: getInfoFromPlayStore,
  });

  if (selectedFunction) {
    return selectedFunction(country);
  }

  return null;
}

export function shouldUpdateApp(installedVersion: string, newestVersion: string): boolean {
  if (!installedVersion || !newestVersion) return false;

  const installed = installedVersion.split(".").map(Number);
  const newest = newestVersion.split(".").map(Number);

  for (let i = 0; i < Math.max(installed.length, newest.length); i++) {
    const installedPart = installed[i] || 0;
    const newestPart = newest[i] || 0;

    if (installedPart < newestPart) {
      return true;
    } else if (installedPart > newestPart) {
      return false;
    }
  }

  return false;
}
