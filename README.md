# Mood Verse

A modern web application that analyzes your mood using TensorFlow.js face detection and provides personalized recommendations for music, movies, and activities.

## Features

- Real-time face detection using TensorFlow.js
- Mood analysis and personalized recommendations
- Continuous recommendations mode with confidence threshold controls
- Personalized ranking based on your previous recommendation clicks
- Camera permission denied/blocked in-app recovery flow
- Optional AI mood coach tips (free Hugging Face API with local fallback)
- Firebase authentication
- Interactive mood quiz
- Responsive design with Tailwind CSS
- Installable web app (PWA)
- Android app wrapper via Capacitor

## Tech Stack

- React
- TypeScript
- TensorFlow.js
- Firebase Authentication
- Tailwind CSS
- Zustand for state management

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/mood-verse.git
```

2. Install dependencies:
```bash
cd mood-verse
npm install
```

3. Set up Firebase:
   - Create a new Firebase project
   - Enable Email/Password authentication
   - Copy your Firebase config
   - Update `src/lib/firebase.ts` with your config

4. Start the development server:
```bash
npm run dev
```

## Optional AI Setup (Free)

You can enable AI coach tips using Hugging Face's free-tier Inference API.

1. Create a token at https://huggingface.co/settings/tokens
2. Copy `.env.example` to `.env`
3. Set:

```env
VITE_HF_API_TOKEN=your_token_here
```

If no token is provided, Mood Verse still works and falls back to local tip generation.

## Deployment

To access the live application, visit the following URL:
[https://yourusername.github.io/mood-verse](https://yourusername.github.io/mood-verse)

## Web App (PWA)

Mood Verse now works as an installable web app.

1. Build the app:
```bash
npm run build
```

2. Preview production build locally:
```bash
npm run preview:pwa
```

3. Open the app in Chrome and use Install App from the browser menu.

## Android App

Mood Verse includes an Android project using Capacitor. This wraps your built web app as a native Android application.

Branding already applied:
- App name: Mood Verse
- Custom launcher icon theme
- Branded splash screen

1. Build and sync web assets into Android:
```bash
npm run android:sync
```

2. Open in Android Studio:
```bash
npm run android:open
```

3. In Android Studio, run on emulator/device or generate APK/AAB:
   - Build > Build Bundle(s) / APK(s) > Build APK(s)

4. Optional CLI run (requires Android SDK setup):
```bash
npm run android:run
```

### Google Login on Android (Native)

Google login is implemented with native Capacitor Firebase Authentication on Android.

Required Firebase setup:
1. Firebase Console > Authentication > Sign-in method > Enable Google.
2. Firebase Console > Project settings > Your apps > Android app `com.moodverse.app`.
3. Add SHA-1 and SHA-256 fingerprints for debug and release builds.
4. Ensure `android/app/google-services.json` exists for your Firebase project.

Get debug SHA fingerprints:
```bash
cd android
gradlew.bat signingReport
```

## APK / AAB Release Checklist

1. Build and sync assets:
```bash
npm run android:sync
```

2. Generate debug APK quickly:
```bash
npm run android:apk:debug
```
Output path:
`android/app/build/outputs/apk/debug/app-debug.apk`

3. Configure release signing in Android Studio:
- Open Android Studio via `npm run android:open`
- Open `Build > Generate Signed Bundle / APK`
- Create/select keystore
- Choose AAB (Play Store) or APK (direct install)

### Env-Based Signing (CLI + CI Friendly)

Release signing is configured via environment variables in Gradle.

Required variables:
- `MOODVERSE_KEYSTORE_PATH`
- `MOODVERSE_KEYSTORE_PASSWORD`
- `MOODVERSE_KEY_ALIAS`
- `MOODVERSE_KEY_PASSWORD`

Template file:
- `.env.android.example`

PowerShell example (current session):
```powershell
$env:MOODVERSE_KEYSTORE_PATH="C:\path\to\moodverse-release.jks"
$env:MOODVERSE_KEYSTORE_PASSWORD="your_keystore_password"
$env:MOODVERSE_KEY_ALIAS="your_key_alias"
$env:MOODVERSE_KEY_PASSWORD="your_key_password"
```

cmd example (current session):
```bat
set MOODVERSE_KEYSTORE_PATH=C:\path\to\moodverse-release.jks
set MOODVERSE_KEYSTORE_PASSWORD=your_keystore_password
set MOODVERSE_KEY_ALIAS=your_key_alias
set MOODVERSE_KEY_PASSWORD=your_key_password
```

4. Optional release bundle from CLI (after signing config is set in Gradle):
```bash
npm run android:bundle:release
```

If signing variables are missing, Gradle blocks release builds with a clear error.

5. Test checklist before shipping:
- Camera permission flow works on first launch
- Mood detection works after permission grant
- SOS support modal opens and links work
- App opens offline after first install (PWA cache)

## Notes

- The Vite base path is configured for cross-platform usage (web + Android assets).
- If you change web code, run `npm run android:sync` before rebuilding Android.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
