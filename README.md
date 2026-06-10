# StreamVibe Android App 📱

A native Android WebView app wrapping your StreamVibe Live TV website.

---

## 🚀 How to Build the APK (No Android Studio needed)

### Method 1: GitHub Actions (FREE, Recommended)

This is the easiest way. GitHub will build the APK for you in the cloud.

**Step 1 — Create a free GitHub account**
→ Go to https://github.com and sign up (free)

**Step 2 — Create a new repository**
1. Click the **+** icon → "New repository"
2. Name it: `streamvibe-app`
3. Set it to **Public** (required for free Actions)
4. Click "Create repository"

**Step 3 — Upload these files**
1. On the repo page, click **"uploading an existing file"**
2. Drag and drop the **entire contents** of this zip (not the zip itself)
   - Make sure the folder structure is preserved:
     ```
     android/
     src/
     .github/
     package.json
     capacitor.config.json
     README.md
     ```
3. Scroll down → click **"Commit changes"**

**Step 4 — Watch it build**
1. Click the **"Actions"** tab at the top of your repo
2. You'll see "Build StreamVibe APK" running
3. Wait ~3-5 minutes for it to finish (green checkmark ✅)

**Step 5 — Download your APK**
1. Click on the completed workflow run
2. Scroll to the bottom → **Artifacts** section
3. Click **"StreamVibe-debug-apk"** to download
4. Unzip → you'll find `app-debug.apk`

**Step 6 — Install on your phone**
1. Send the APK to your Android phone (WhatsApp, email, USB, etc.)
2. On your phone: Settings → Security → **Enable "Unknown Sources"** (or "Install unknown apps")
3. Open the APK file → tap Install
4. Open **StreamVibe** from your app drawer 🎉

---

### Method 2: Build locally with Android Studio

If you want to install Android Studio later:

1. Download Android Studio: https://developer.android.com/studio
2. Open the `android/` folder as a project
3. Wait for Gradle sync
4. Build → Generate Signed APK (or just Run on your device)

---

## 📱 App Features

All features from the website work in the app:

- ✅ 120+ live sports channels
- ✅ HLS stream playback (via WebView hardware acceleration)
- ✅ Fullscreen video with landscape auto-rotate
- ✅ Search channels
- ✅ Favorites (saved locally)
- ✅ Category filtering (World Cup, Cricket, Football)
- ✅ Back button support
- ✅ Screen stays on during playback
- ✅ Dark UI matching the website exactly

---

## 🔧 Updating Channels

To update channels in the app:
1. Edit `src/channels.js`
2. Copy the updated file to `android/app/src/main/assets/public/channels.js`
3. Commit to GitHub → Actions will build a new APK automatically

---

## 📁 Project Structure

```
streamvibe-app/
├── src/                    ← Your web app (HTML/CSS/JS)
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   ├── channels.js
│   ├── pwa.js
│   ├── sw.js
│   └── icons/
├── android/                ← Android project
│   ├── app/
│   │   └── src/main/
│   │       ├── AndroidManifest.xml
│   │       ├── assets/public/  ← Web files bundled here
│   │       ├── java/.../MainActivity.kt
│   │       └── res/            ← Icons, colors, styles
│   ├── build.gradle
│   ├── settings.gradle
│   └── gradlew
├── .github/workflows/
│   └── build-apk.yml       ← GitHub Actions build config
├── capacitor.config.json
└── package.json
```

---

## ⚠️ Notes

- The APK produced by GitHub Actions is a **debug APK** — perfectly fine for personal use and sideloading
- To publish to Google Play Store you'd need a signed release APK (ask if you need help with this)
- Minimum Android version: **5.1 (API 22)** — works on virtually all modern Android phones
