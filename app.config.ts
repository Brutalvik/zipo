// app.config.ts
import "dotenv/config";

module.exports = {
  name: "Zipo",
  slug: "zipo-app",
  version: "1.0.0",
  scheme: "zipo",

  extra: {
    firebaseConfig: {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
    },
    // Allows other environment variables to be passed
    eas: {
      projectId: "your-eas-project-id",
    },
  },
};
