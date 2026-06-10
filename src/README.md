# StreamVibe — Live Sports TV PWA

A Progressive Web App (PWA) for live sports TV streaming. Installable on any device, works offline for the UI, and plays live HLS streams.

## 📁 Files
```
StreamVibe/
├── index.html      ← Main HTML (PWA meta + manifest link)
├── style.css       ← All styles (+ install button styles)
├── app.js          ← Channel list, player, search, favorites
├── channels.js     ← Channel data (CHANNELS_DATA array)
├── pwa.js          ← Service Worker registration, install prompt, Wake Lock, MediaSession
├── sw.js           ← Service Worker (caching strategy)
├── manifest.json   ← PWA manifest (name, icons, shortcuts, colors)
└── icons/
    ├── icon.svg        ← Scalable SVG icon
    ├── icon-192.png    ← 192×192 PNG (Android home screen)
    └── icon-512.png    ← 512×512 PNG (splash screen)
```

## 🚀 How to Deploy (Required for PWA to work)

**PWA features require HTTPS.** You must host the files on a server — opening `index.html` directly as a local file won't register the service worker or show the install prompt.

### Option 1 — Netlify (Free, Easiest)
1. Go to https://netlify.com → Log in
2. Drag and drop the entire `StreamVibe` folder onto the Netlify dashboard
3. Done — you'll get a free HTTPS URL instantly

### Option 2 — GitHub Pages (Free)
1. Create a new GitHub repository
2. Upload all files to the repo root
3. Go to Settings → Pages → select `main` branch → Save
4. Your site will be live at `https://yourusername.github.io/repo-name`

### Option 3 — Local Testing with HTTPS
```bash
# Install live-server globally
npm install -g live-server

# Run from the StreamVibe folder
cd StreamVibe
live-server --https
```

### Option 4 — Any Static Host
Upload all files to Vercel, Firebase Hosting, Cloudflare Pages, etc.

## 📱 PWA Features Added
- **Installable** — "Add to Home Screen" / Install button on desktop Chrome
- **Service Worker** — Caches all app assets for fast load & offline UI
- **Web App Manifest** — App name, icons, theme color, standalone display
- **App Shortcuts** — Long-press icon to jump to World Cup / Cricket / Football
- **Wake Lock API** — Prevents phone screen from sleeping during playback
- **Media Session API** — Shows channel name + controls on lock screen / notification bar
- **Deep Links** — `?cat=Cricket` URLs work from shortcuts
- **Safe Area Insets** — Notch/status bar handled correctly on iOS

## ✏️ Customization
- Edit `channels.js` to add/remove channels
- Edit `manifest.json` to change app name or theme color
- Replace `icons/icon.svg` with your own logo (regenerate PNGs with `cairosvg`)
