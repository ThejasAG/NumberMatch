import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.numbermatch.game",
  appName: "Number Match",
  webDir: "dist",
  bundledWebRuntime: false,
  android: {
    backgroundColor: "#101418"
  }
};

export default config;
