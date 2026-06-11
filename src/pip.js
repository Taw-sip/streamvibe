'use strict';

(function () {
  function setup() {
    const video = document.getElementById('videoPlayer');
    const btn = document.getElementById('pipBtn');
    if (!video || !btn) {
      setTimeout(setup, 300);
      return;
    }

    video.addEventListener('play', () => {
      btn.style.display = 'flex';
    });
    video.addEventListener('pause', () => {
      btn.style.display = 'flex';
    });

    btn.addEventListener('click', () => togglePip(video));

    // Native web PiP events (desktop)
    video.addEventListener('enterpictureinpicture', () => {
      btn.classList.add('pip-active');
      document.getElementById('pipIconEnter').style.display = 'none';
      document.getElementById('pipIconExit').style.display = 'block';
    });
    video.addEventListener('leavepictureinpicture', () => {
      btn.classList.remove('pip-active');
      document.getElementById('pipIconEnter').style.display = 'block';
      document.getElementById('pipIconExit').style.display = 'none';
    });
  }

  async function togglePip(video) {
    if (!video || video.paused) {
      showToast('Play a channel first', true);
      return;
    }

    // Android native PiP — works even after Home press
    if (
      window.AndroidPip &&
      window.AndroidPip.isSupported &&
      window.AndroidPip.isSupported()
    ) {
      window.AndroidPip.enter();
      showToast('▶  Picture-in-Picture');
      const btn = document.getElementById('pipBtn');
      if (btn) {
        btn.classList.add('pip-active');
        document.getElementById('pipIconEnter').style.display = 'none';
        document.getElementById('pipIconExit').style.display = 'block';
      }
      return;
    }

    // Desktop browser native PiP
    if (document.pictureInPictureEnabled) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await video.requestPictureInPicture();
        }
        return;
      } catch (e) {
        console.warn('[PiP]', e);
      }
    }

    showToast('PiP not supported on this device', true);
  }

  function showToast(msg, isError = false) {
    let t = document.getElementById('pipToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'pipToast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.className = 'pip-toast' + (isError ? ' pip-toast-error' : '');
    t.classList.add('visible');
    clearTimeout(t._x);
    t._x = setTimeout(() => t.classList.remove('visible'), 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
