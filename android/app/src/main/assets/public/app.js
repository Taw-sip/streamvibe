/* =============================================
   StreamVibe — Live Sports TV | app.js
   ============================================= */

'use strict';

// ── Constants ──────────────────────────────────
const SIDEBAR_MAX = 80;

const CAT_META = {
  'All':             { icon: '📺', color: '#f97316' },
  'Favorites':       { icon: '⭐', color: '#fbbf24' },
  'World Cup':       { icon: '🏆', color: '#a78bfa' },
  'Football':        { icon: '⚽', color: '#10b981' },
  'Cricket':         { icon: '🏏', color: '#3b82f6' }
};
function getCatMeta(g) { return CAT_META[g] || { icon: '🏆', color: '#a78bfa' }; }

// ── State ──────────────────────────────────────
let allChannels      = [];
let filteredChannels = [];
let currentChannel   = null;
let activeCategory   = 'All';
let hls              = null;
let searchQuery      = '';
let currentPage      = 1;
let searchTimer      = null;
let streamTimeout    = null;
let favorites        = JSON.parse(localStorage.getItem('streamvibe_favorites') || '[]');

// ── DOM refs ───────────────────────────────────
const $  = id => document.getElementById(id);
const categoryPills     = $('categoryPills');
const channelList       = $('channelList');
const searchInput       = $('searchInput');
const searchClear       = $('searchClear');
const sidebarSearchInput = $('sidebarSearchInput');
const sidebarSearchClear = $('sidebarSearchClear');
const channelCount      = $('channelCount');
const channelListLabel  = $('channelListLabel');
const listCountBadge    = $('listCountBadge');
const nowPlayingBar     = $('nowPlayingBar');
const npbLogo           = $('npbLogo');
const npbName           = $('npbName');
const npbGroup          = $('npbGroup');
const videoPlayer       = $('videoPlayer');
const playerPlaceholder = $('playerPlaceholder');
const playerOverlay     = $('playerOverlay');
const overlayLogo       = $('overlayLogo');
const overlayName       = $('overlayName');
const overlayGroup      = $('overlayGroup');
const loadingRing       = $('loadingRing');
const errorOverlay      = $('errorOverlay');
const retryBtn          = $('retryBtn');
const mobileSidebarToggle = $('mobileSidebarToggle');
const sidebar           = document.querySelector('.sidebar');

// ── Init ───────────────────────────────────────
function init() {
  try {
    // Set default video sound volume to 100%
    if (videoPlayer) {
      videoPlayer.volume = 1;
    }

    if (typeof CHANNELS_DATA === 'undefined' || !Array.isArray(CHANNELS_DATA)) {
      throw new Error('channels.js not loaded');
    }
    allChannels = CHANNELS_DATA;
    channelCount.textContent = `${allChannels.length} Channels`;
    buildCategories();
    applyFilters();

  } catch (err) {
    console.error(err);
    channelList.innerHTML = `
      <div class="sidebar-empty">
        <div class="sidebar-empty-icon">⚠️</div>
        <p>Could not load channels</p>
        <span>Make sure channels.js is in the same folder.</span>
      </div>`;
  }
}

// ── Build categories ───────────────────────────
function buildCategories() {
  const counts = {
    'All': allChannels.length,
    'Favorites': favorites.length,
    'World Cup': allChannels.filter(c => c.group === 'World Cup').length,
    'Football': allChannels.filter(c => c.group === 'Football').length,
    'Cricket': allChannels.filter(c => c.group === 'Cricket').length
  };

  const groups = [
    ['All', counts['All']],
    ['Favorites', counts['Favorites']],
    ['World Cup', counts['World Cup']],
    ['Football', counts['Football']],
    ['Cricket', counts['Cricket']]
  ];

  categoryPills.innerHTML = '';
  const frag = document.createDocumentFragment();
  groups.forEach(([group, count]) => {
    const meta = getCatMeta(group);
    const btn  = document.createElement('button');
    btn.className    = 'cat-pill' + (group === activeCategory ? ' active' : '');
    btn.dataset.group = group;
    btn.innerHTML = `
      <span class="cat-pill-icon">${meta.icon}</span>
      <span>${esc(group)}</span>
      <span class="cat-pill-count">${count}</span>`;
    btn.addEventListener('click', () => selectCategory(group));
    frag.appendChild(btn);
  });
  categoryPills.appendChild(frag);
}

function selectCategory(group) {
  activeCategory = group;
  currentPage = 1;
  categoryPills.querySelectorAll('.cat-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.group === group);
  });
  applyFilters();
  if (window.innerWidth <= 900) sidebar.classList.remove('open');
}

// ── Filter & render channels ───────────────────
function applyFilters() {
  let list;
  if (activeCategory === 'All') {
    list = allChannels;
  } else if (activeCategory === 'Favorites') {
    list = allChannels.filter(c => favorites.includes(c.name));
  } else {
    list = allChannels.filter(c => (c.group || 'General Sports') === activeCategory);
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(c => c.name.toLowerCase().includes(q));
  }

  filteredChannels = list;

  const label = activeCategory === 'All' ? 'All Channels' : activeCategory;
  channelListLabel.textContent = label;
  listCountBadge.textContent   = filteredChannels.length;

  renderChannelList();
}

// ── Sidebar channel list ───────────────────────
function renderChannelList() {
  channelList.innerHTML = '';
  const items = filteredChannels.slice(0, SIDEBAR_MAX);

  if (!items.length) {
    channelList.innerHTML = `
      <div class="sidebar-empty">
        <div class="sidebar-empty-icon">📡</div>
        <p>No channels found</p>
        <span>${searchQuery ? 'Try a different search term' : 'No channels in this category'}</span>
      </div>`;
    return;
  }

  const frag = document.createDocumentFragment();
  items.forEach(ch => {
    const isActive = currentChannel && currentChannel.name === ch.name;
    const isFav = favorites.includes(ch.name);
    const btn = document.createElement('button');
    btn.className = 'ch-item' + (isActive ? ' active' : '');
    btn.innerHTML = `
      <img class="ch-thumb" src="${ch.logo || ''}" alt="${esc(ch.name)}" loading="lazy"
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2238%22 height=%2228%22><rect width=%2238%22 height=%2228%22 fill=%22%23252535%22 rx=%224%22/><text x=%2219%22 y=%2219%22 font-size=%2211%22 fill=%22%235a5a72%22 text-anchor=%22middle%22>TV</text></svg>'" />
      <span class="ch-name">${esc(ch.name)}</span>
      <button class="ch-fav-btn${isFav ? ' active' : ''}" aria-label="Favorite">
        <svg class="star-icon" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
      </button>
      <svg class="ch-play-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
    
    btn.querySelector('.ch-fav-btn').addEventListener('click', (e) => {
      toggleFavorite(ch.name, e);
    });
    btn.addEventListener('click', (e) => {
      if (e.target.closest('.ch-fav-btn')) return;
      playChannel(ch);
    });
    frag.appendChild(btn);
  });

  if (filteredChannels.length > SIDEBAR_MAX) {
    const hint = document.createElement('div');
    hint.style.cssText = 'text-align:center;padding:8px 0;font-size:.75rem;color:var(--text3)';
    hint.textContent = `+ ${filteredChannels.length - SIDEBAR_MAX} more — use search`;
    frag.appendChild(hint);
  }
  channelList.appendChild(frag);
}


// ── Toggle favorite ────────────────────────────
function toggleFavorite(name, e) {
  if (e) e.stopPropagation();
  const idx = favorites.indexOf(name);
  if (idx === -1) {
    favorites.push(name);
  } else {
    favorites.splice(idx, 1);
  }
  localStorage.setItem('streamvibe_favorites', JSON.stringify(favorites));
  buildCategories();
  applyFilters();
}

// ── Play channel ───────────────────────────────
function playChannel(ch) {
  currentChannel = ch;

  playerPlaceholder.style.display = 'none';
  videoPlayer.style.display       = 'block';
  errorOverlay.style.display      = 'none';
  loadingRing.style.display       = 'flex';
  playerOverlay.style.display     = 'none';

  if (window.innerWidth <= 900) {
    document.querySelector('.player-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  destroyPlayer();

  nowPlayingBar.style.display = 'flex';
  npbLogo.src             = ch.logo || '';
  npbLogo.alt             = ch.name;
  npbName.textContent     = ch.name;
  npbGroup.textContent    = ch.group || 'General';

  updateActiveStates();

  setTimeout(() => {
    const active = channelList.querySelector('.ch-item.active');
    if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 50);

  loadStream(ch);
}

function updateActiveStates() {
  channelList.querySelectorAll('.ch-item').forEach(el => {
    el.classList.toggle('active', el.querySelector('.ch-name')?.textContent === currentChannel?.name);
  });
}

// ── HLS stream ─────────────────────────────────
function destroyPlayer() {
  if (streamTimeout) { clearTimeout(streamTimeout); streamTimeout = null; }
  if (hls) { hls.destroy(); hls = null; }
  videoPlayer.src = '';
}

function showOverlay(ch) {
  loadingRing.style.display   = 'none';
  playerOverlay.style.display = 'block';
  overlayLogo.src             = ch.logo || '';
  overlayName.textContent     = ch.name;
  overlayGroup.textContent    = ch.group || 'General';
  videoPlayer.play().catch(() => {});
  setTimeout(() => { playerOverlay.style.display = 'none'; }, 4000);
}

function loadStream(ch) {
  const url = ch.url;

  streamTimeout = setTimeout(() => {
    loadingRing.style.display  = 'none';
    errorOverlay.style.display = 'flex';
    errorOverlay.querySelector('.error-title').textContent    = 'Stream Unavailable';
    errorOverlay.querySelector('.error-subtitle').textContent = 'This channel may be temporarily offline or geo-restricted.';
    if (hls) { hls.destroy(); hls = null; }
  }, 15000);

  if (Hls.isSupported()) {
    hls = new Hls({ enableWorker: true, lowLatencyMode: true, backBufferLength: 15, maxBufferLength: 20 });
    hls.loadSource(url);
    hls.attachMedia(videoPlayer);
    hls.on(Hls.Events.MANIFEST_PARSED, () => { clearTimeout(streamTimeout); showOverlay(ch); });
    hls.on(Hls.Events.ERROR, (_, data) => {
      if (data.fatal) {
        clearTimeout(streamTimeout);
        loadingRing.style.display  = 'none';
        errorOverlay.style.display = 'flex';
        hls.destroy(); hls = null;
      }
    });
  } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
    videoPlayer.src = url;
    videoPlayer.addEventListener('loadedmetadata', () => { clearTimeout(streamTimeout); showOverlay(ch); }, { once: true });
    videoPlayer.addEventListener('error', () => {
      clearTimeout(streamTimeout);
      loadingRing.style.display  = 'none';
      errorOverlay.style.display = 'flex';
    }, { once: true });
  } else {
    clearTimeout(streamTimeout);
    loadingRing.style.display  = 'none';
    errorOverlay.style.display = 'flex';
  }
}

// ── Search ─────────────────────────────────────
function syncSearch(value) {
  searchQuery = value.trim();
  const showClear = searchQuery.length > 0;
  
  if (searchInput) {
    searchInput.value = value;
    searchClear.classList.toggle('visible', showClear);
  }
  if (sidebarSearchInput) {
    sidebarSearchInput.value = value;
    sidebarSearchClear.classList.toggle('visible', showClear);
  }
}

if (searchInput) {
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    syncSearch(searchInput.value);
    searchTimer = setTimeout(() => { applyFilters(); }, 300);
  });
}
if (sidebarSearchInput) {
  sidebarSearchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    syncSearch(sidebarSearchInput.value);
    searchTimer = setTimeout(() => { applyFilters(); }, 300);
  });
}

if (searchClear) {
  searchClear.addEventListener('click', () => {
    syncSearch('');
    searchInput.focus();
    applyFilters();
  });
}
if (sidebarSearchClear) {
  sidebarSearchClear.addEventListener('click', () => {
    syncSearch('');
    sidebarSearchInput.focus();
    applyFilters();
  });
}

// ── Retry ──────────────────────────────────────
retryBtn.addEventListener('click', () => {
  if (!currentChannel) return;
  errorOverlay.style.display = 'none';
  loadingRing.style.display  = 'flex';
  loadStream(currentChannel);
});

// ── Keyboard ───────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.target === searchInput || e.target === sidebarSearchInput) return;
  if (e.key === '/') {
    e.preventDefault();
    if (window.innerWidth <= 900 && sidebarSearchInput) {
      sidebarSearchInput.focus();
    } else if (searchInput) {
      searchInput.focus();
    }
  }
  if (e.key === ' ' && currentChannel) { e.preventDefault(); videoPlayer.paused ? videoPlayer.play() : videoPlayer.pause(); }
});

// ── Utility ────────────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Start ──────────────────────────────────────
init();
