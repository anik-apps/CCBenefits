export default {
  expo: {
    name: "CCBenefits",
    slug: "ccbenefits",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#0a0a0f",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.anikapps.ccbenefits",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#0a0a0f",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.anikapps.ccbenefits",
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || "./google-services.json",
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      "expo-secure-store",
      [
        "expo-notifications",
        {
          icon: "./assets/icon.png",
          color: "#c9a84c",
        },
      ],
      "expo-splash-screen",
      "expo-web-browser",
      "expo-apple-authentication",
    ],
    scheme: "ccbenefits",
    extra: {
      eas: {
        projectId: "d9ff5adf-f515-442c-833b-cd22c566541d",
      },
      googleClientId: process.env.GOOGLE_CLIENT_ID || "",
      googleClientIdAndroid: process.env.GOOGLE_CLIENT_ID_ANDROID || "",
      googleClientIdIos: process.env.GOOGLE_CLIENT_ID_IOS || "",
    },
    owner: "kumaranik",
  },
};
