const fs = require('fs');

// Only point at a Google services file that exists (missing files break `expo start` config parsing).
const existing = (p) => (p && fs.existsSync(p) ? p : undefined);

export default ({ config }) => {
  return {
    ...config,
    name: 'Bloom & Bump',
    slug: 'newlifejournal',
    ios: {
      ...config.ios,
      googleServicesFile: existing(process.env.GOOGLE_SERVICES_INFO_PLIST || './GoogleService-Info.plist'),
    },
    android: {
      ...config.android,
      // EAS: upload google-services.json as a file env var named GOOGLE_SERVICES_JSON.
      googleServicesFile: existing(process.env.GOOGLE_SERVICES_JSON || './google-services.json'),
    },
    extra: {
      ...config.extra,

      // Firebase configuration from environment variables
      firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,

      // Google OAuth configuration
      googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,

      // Legal pages (required by both stores). Host them anywhere public.
      privacyPolicyUrl: process.env.EXPO_PUBLIC_PRIVACY_URL,
      termsUrl: process.env.EXPO_PUBLIC_TERMS_URL,
      supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL,

      // NOTE: AI provider API keys (Anthropic/OpenAI/Gemini/custom) used to
      // live here and get bundled into the shipped app, where anyone could
      // extract them from the JS bundle and use them for free / rack up your
      // bill. They now live ONLY in the Cloud Functions runtime (Secret
      // Manager) — see functions/src/aiChat.ts. Do not add them back here.
    },
  };
};
