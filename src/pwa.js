/* =============================================
   StreamVibe — PWA Logic (pwa.js)
   ============================================= */

'use strict';

// ── Service Worker Registration ──────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        console.log('[PWA] Service Worker registered:', reg.scope);

        // Check for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] New content available — reload to update.');
            }
          });
        });
      })
      .catch(err => console.warn('[PWA] SW registration failed:', err));
  });
}

// ── Install Prompt (Add to Home Screen) ──────
let deferredInstallPrompt = null;
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  if (installBtn) installBtn.style.display = 'flex';
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    console.log('[PWA] Install outcome:', outcome);
    deferredInstallPrompt = null;
    installBtn.style.display = 'none';
  });
}

window.addEventListener('appinstalled', () => {
  console.log('[PWA] App installed successfully');
  if (installBtn) installBtn.style.display = 'none';
  deferredInstallPrompt = null;
});

// ── Deep Link / Shortcut Category Routing ────
// Handles ?cat=World+Cup shortcuts from manifest
(function handleDeepLink() {
  const params = new URLSearchParams(window.location.search);
  const cat = params.get('cat');
  if (!cat) return;

  // Wait for app to initialize, then switch category
  const trySelect = (attempts = 0) => {
    if (typeof selectCategory === 'function') {
      selectCategory(cat);
    } else if (attempts < 20) {
      setTimeout(() => trySelect(attempts + 1), 150);
    }
  };
  // Small delay to let app.js init() run first
  setTimeout(() => trySelect(), 300);
})();

// ── Standalone (installed PWA) tweaks ────────
if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
  document.documentElement.classList.add('pwa-standalone');
  console.log('[PWA] Running as installed app');
}

// ── Media Session API (lock screen controls) ─
function updateMediaSession(channel) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: channel.name,
    artist: channel.group || 'Live TV',
    album: 'StreamVibe',
    artwork: channel.logo ? [
      { src: channel.logo, sizes: '96x96',  type: 'image/png' },
      { src: channel.logo, sizes: '128x128', type: 'image/png' },
    ] : []
  });
  navigator.mediaSession.setActionHandler('play',  () => { videoPlayer.play(); });
  navigator.mediaSession.setActionHandler('pause', () => { videoPlayer.pause(); });
  navigator.mediaSession.setActionHandler('stop',  () => { videoPlayer.pause(); });
}

// Hook into playChannel — extend after app.js defines it
window.addEventListener('DOMContentLoaded', () => {
  const video = document.getElementById('videoPlayer');
  if (!video) return;

  // Update MediaSession whenever a channel starts playing
  const origPlay = video.play.bind(video);
  video.play = function (...args) {
    if (window._currentChannelForPWA) {
      updateMediaSession(window._currentChannelForPWA);
    }
    return origPlay(...args);
  };
});

// Expose hook so app.js can set the current channel for MediaSession
// app.js calls playChannel(ch) — we patch via a global
const _origDesc = Object.getOwnPropertyDescriptor(window, 'currentChannel');
let _channelProxy = null;
try {
  Object.defineProperty(window, '_pwaCurrentChannel', {
    set(val) { _channelProxy = val; updateMediaSession(val); },
    get() { return _channelProxy; },
    configurable: true
  });
} catch (_) {}

// ── Prevent sleep on mobile during playback ───
let wakeLock = null;
async function requestWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    console.log('[PWA] Wake lock acquired');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch (err) {
    console.warn('[PWA] Wake lock failed:', err);
  }
}
async function releaseWakeLock() {
  if (wakeLock) { await wakeLock.release(); wakeLock = null; }
}

document.addEventListener('DOMContentLoaded', () => {
  const video = document.getElementById('videoPlayer');
  if (!video) return;
  video.addEventListener('play',  () => requestWakeLock());
  video.addEventListener('pause', () => releaseWakeLock());
  video.addEventListener('ended', () => releaseWakeLock());
});

// Re-acquire wake lock if page becomes visible again while playing
document.addEventListener('visibilitychange', () => {
  const video = document.getElementById('videoPlayer');
  if (document.visibilityState === 'visible' && video && !video.paused) {
    requestWakeLock();
  }
});
