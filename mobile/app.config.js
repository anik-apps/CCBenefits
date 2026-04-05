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
      googleServicesFile: "./google-services.json",
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
      "expo-apple-authentication",
      "@react-native-google-signin/google-signin",
    ],
    scheme: "ccbenefits", // Reserved for deep links (notifications, Apple Sign-In)
    extra: {
      eas: {
        projectId: "d9ff5adf-f515-442c-833b-cd22c566541d",
      },
      apiUrl: process.env.CCB_API_URL || "https://ccb.kumaranik.com",
      googleClientId: process.env.GOOGLE_CLIENT_ID || "",
      googleClientIdIos: process.env.GOOGLE_CLIENT_ID_IOS || "",
    },
    owner: "kumaranik",
  },
};
