/**
 * AKTUAL MEDIA RADIO — Live Internet Audio Player Engine
 * GNK ASG & Nermin Sefić Digital Media Network
 * Supports multiple USA & English music streams, labelled station buttons, volume steps,
 * natural-voice station jingles (music ducks under the voice), Media Session controls
 * and a BroadcastChannel bridge for the floating portal controller.
 */
(() => {
  'use strict';

  const isEn = () => (document.documentElement.lang || '').toLowerCase().startsWith('en') || /\/en\//.test(location.pathname) || new URLSearchParams(location.search).get('lang') === 'en';

  // Third-party public audio streams; track metadata is not asserted unless supplied by the stream.
  // The first station is the one that opens by default.
  const STATIONS = [
    {
      id: 'synthwave-energy',
      label: 'Synthwave',
      nameHr: 'AKTUAL MEDIA Synthwave & Retro Tech',
      nameEn: 'AKTUAL MEDIA Synthwave & Retro Tech',
      taglineHr: 'Elektronski retro synth i dinamični cyber ritmovi',
      taglineEn: 'Electronic retro synth and dynamic cyber beats',
      streamUrl: 'https://ice1.somafm.com/beatblender-128-mp3',
      fallbackStream: 'https://ice2.somafm.com/lush-128-mp3',
      genre: 'Synthwave / Retrowave / Cyberpunk',
      metadataMode: 'stream-no-track-feed'
    },
    {
      id: 'usa-rock',
      label: 'USA Rock',
      nameHr: 'AKTUAL MEDIA RADIO USA · Rock',
      nameEn: 'AKTUAL MEDIA RADIO USA · Rock',
      taglineHr: 'Američki rock — album rock i klasici sa Zapadne obale',
      taglineEn: 'American rock — album rock and West Coast classics',
      streamUrl: 'https://ice5.somafm.com/seventies-128-mp3', // SomaFM Left Coast 70s
      fallbackStream: 'https://ice6.somafm.com/seventies-128-mp3',
      genre: 'USA Rock / Classic Rock',
      metadataMode: 'stream-no-track-feed'
    },
    {
      id: 'usa-hits',
      label: 'USA Hits',
      nameHr: 'AKTUAL MEDIA USA Top Hits',
      nameEn: 'AKTUAL MEDIA USA Top Hits',
      taglineHr: 'Američki pop i moderni groove hitovi',
      taglineEn: 'American pop and modern groove hits',
      streamUrl: 'https://stream.zeno.fm/f3wvbbqmdg8uv', // Free public icecast MP3 stream
      fallbackStream: 'https://ice1.somafm.com/groovesalad-128-mp3',
      genre: 'USA Pop / Indie',
      metadataMode: 'stream-no-track-feed'
    },
    {
      id: 'lofi-lounge',
      label: 'Lo-Fi',
      nameHr: 'AKTUAL MEDIA Lo-Fi Chill & Business Lounge',
      nameEn: 'AKTUAL MEDIA Lo-Fi Chill & Business Lounge',
      taglineHr: 'Opuštajući ritmovi za fokus, rad i analitiku',
      taglineEn: 'Relaxing lo-fi beats for focus, trading and work',
      streamUrl: 'https://ice2.somafm.com/defcon-128-mp3',
      fallbackStream: 'https://ice4.somafm.com/secretagent-128-mp3',
      genre: 'Lo-Fi / Chillhop / Ambient',
      metadataMode: 'stream-no-track-feed'
    },
    {
      id: 'usa-country-roots',
      label: 'Country',
      nameHr: 'AKTUAL MEDIA RADIO USA · Country & Americana',
      nameEn: 'AKTUAL MEDIA RADIO USA · Country & Americana',
      taglineHr: 'Američki country, roots i americana zvuk',
      taglineEn: 'American country, roots, and americana sound',
      streamUrl: 'https://ice1.somafm.com/bootliquor-128-mp3',
      fallbackStream: 'https://ice1.somafm.com/folkfwd-128-mp3',
      genre: 'USA Country / Americana / Roots',
      metadataMode: 'stream-no-track-feed'
    },
    {
      id: 'usa-jazz-soul',
      label: 'Jazz & Soul',
      nameHr: 'AKTUAL MEDIA RADIO USA · Jazz & Soul Lounge',
      nameEn: 'AKTUAL MEDIA RADIO USA · Jazz & Soul Lounge',
      taglineHr: 'Američki jazz, soul i lounge klasici',
      taglineEn: 'American jazz, soul, and lounge classics',
      streamUrl: 'https://ice1.somafm.com/sonicuniverse-128-mp3',
      fallbackStream: 'https://ice1.somafm.com/7soul-128-mp3',
      genre: 'USA Jazz / Soul / Lounge',
      metadataMode: 'stream-no-track-feed'
    }];

  // Natural-voice station idents ("Vi slušate AKTUAL RADIO"), played over the music
  // on every channel roughly every three songs and on station changes.
  const JINGLES = [
    '/radio/jingles/aktual-radio-jingle-1.mp3',
    '/radio/jingles/aktual-radio-jingle-2.mp3',
    '/radio/jingles/aktual-radio-jingle-3.mp3',
    '/radio/jingles/aktual-radio-jingle-4.mp3'
  ];
  // Spremni, ali na javnom radiju ISKLJUČENI dok ih vlasnik ne odobri (JINGLES_APPROVED = true).
  // Pregled uživo bez uključivanja za sve: /radio/?jingles=1 ili /radio/player/?jingles=1
  const JINGLES_APPROVED = false;
  const JINGLES_ON = JINGLES_APPROVED || new URLSearchParams(location.search).get('jingles') === '1';
  const JINGLE_FIRST_MS = 30 * 1000;            // first ident shortly after tuning in
  const JINGLE_EVERY_MS = [10.5 * 60 * 1000, 12 * 60 * 1000]; // ≈ every 3 songs (streams expose no track boundaries)
  const JINGLE_MIN_GAP_MS = 60 * 1000;
  const DUCK_LEVEL = 0.28;                      // music level under the voice (share of the listener volume)

  // Weekly editorial channels — modeled editorial announcement schedule.
  // These are not separate live streams; announcements run through the
  // AKTUAL MEDIA RADIO promo rotation and the cards below are informational.
  const WEEKLY_CHANNELS = [
    { dayHr: 'Ponedjeljak', dayEn: 'Monday', nameHr: 'AKTUAL Tjedna tržišta', nameEn: 'AKTUAL Weekly Markets', descHr: 'Otvaranje tjednog ciklusa: pregled tržišnih tema s poveznicama na sekciju Tržišta.', descEn: 'Opening the weekly cycle: market topics with links to the Markets section.' },
    { dayHr: 'Utorak', dayEn: 'Tuesday', nameHr: 'AKTUAL Tehnologija i AI', nameEn: 'AKTUAL Tech & AI', descHr: 'Tjedni tehnološki blok: javno dostupne teme iz tehnologije i umjetne inteligencije.', descEn: 'Weekly technology block: public technology and AI topics.' },
    { dayHr: 'Srijeda', dayEn: 'Wednesday', nameHr: 'AKTUAL Grupa i projekti', nameEn: 'AKTUAL Group & Projects', descHr: 'Pregled grupne mreže i modeliranih projekata GNK ASG i GNK DINAMO Ltd. grupe.', descEn: 'Overview of the group network and modeled projects of GNK ASG and the GNK DINAMO Ltd. group.' },
    { dayHr: 'Četvrtak', dayEn: 'Thursday', nameHr: 'AKTUAL Digitalna radna snaga', nameEn: 'AKTUAL Digital Workforce', descHr: 'Operativni blok o modeliranoj digitalnoj radnoj snazi i Worker formatima.', descEn: 'Operational block on the modeled digital workforce and Worker formats.' },
    { dayHr: 'Petak', dayEn: 'Friday', nameHr: 'AKTUAL Analize tjedna', nameEn: 'AKTUAL Weekly Analyses', descHr: 'Najave i sažetci objavljenih analiza, objava i komentara.', descEn: 'Announcements and recaps of published analyses, publications, and commentary.' },
    { dayHr: 'Subota', dayEn: 'Saturday', nameHr: 'AKTUAL Sportski desk', nameEn: 'AKTUAL Sports Desk', descHr: 'Sportske teme isključivo kao uredničko izvještavanje, bez partnerskih tvrdnji.', descEn: 'Sports topics strictly as editorial reporting, with no partnership claims.' },
    { dayHr: 'Nedjelja', dayEn: 'Sunday', nameHr: 'AKTUAL Sova — tjedni sažetak', nameEn: 'AKTUAL Sova — Weekly Recap', descHr: 'Zatvaranje ciklusa: tjedni sažetak deska prema vodiču Aktual Sova.', descEn: 'Closing the cycle: the weekly desk recap following the Aktual Sova guide.' }
  ];

  const PROMOS = [
    {
      hr: 'Slušate AKTUAL MEDIA RADIO — glas globalnih vijesti, tehnologije i glazbe pod vodstvom Nermina Sefića i GNK ASG.',
      en: 'You are listening to AKTUAL MEDIA RADIO — the voice of global news, technology, and music powered by Nermin Sefic and GNK ASG.'
    },
    {
      hr: 'GNK ASG d.o.o. i GNK DINAMO Ltd. Group — 1.573 modelirana profila digitalne radne snage, 9 modeliranih projekata i dvosatni puls tržišta.',
      en: 'GNK ASG and GNK DINAMO Ltd. Group — 1,573 modeled digital-workforce profiles, 9 modeled projects, and a 2-hour market pulse.'
    },
    {
      hr: 'World Monitor & Regional Incident Desk — pregled javno dostupnih, izvorno označenih podataka o događajima.',
      en: 'World Monitor & Regional Incident Desk — a view of source-labelled public event data.'
    },
    {
      hr: 'Tjedni urednički kanali AKTUAL MEDIA RADIO — od Tjednih tržišta do Sovinog tjednog sažetka. Modelirani raspored najava, svaki dan jedna tema.',
      en: 'AKTUAL MEDIA RADIO weekly editorial channels — from Weekly Markets to the Sova weekly recap. A modeled announcement schedule, one theme per day.'
    }
  ];

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const stationIndexById = (id) => STATIONS.findIndex((s) => s.id === id);

  class RadioEngine {
    constructor() {
      const requested = stationIndexById(new URLSearchParams(location.search).get('station') || '');
      this.currentStationIndex = requested >= 0 ? requested : 0;
      this.isPlaying = false;
      this.volume = 0.8;
      // No crossOrigin: the visualiser is decorative, so streams without CORS headers still play.
      this.audio = new Audio();
      this.audio.preload = 'none';
      this.audio.volume = this.volume;
      this.trackTimer = null;
      this.visualizerTimer = null;
      this.promoCounter = 0;
      this.failedInRow = 0;
      this.watchdog = null;

      // Jingle state
      this.jingle = null;
      this.jingleIndex = Math.floor(Math.random() * JINGLES.length);
      this.jingleTimer = null;
      this.jingleDueAt = 0;
      this.jingleRemaining = JINGLE_FIRST_MS;
      this.lastJingleAt = 0;
      this.duckFactor = 1;
      this.duckTimer = null;

      this.floatPos = null; // last floating-controller position (memory only, shared over the channel)
      this.channel = null;
      try { this.channel = new BroadcastChannel('aktual-media-radio-v1'); } catch (_) {}
      this.initEvents();
      this.initPersistentBridge();
      this.initMediaSession();
    }

    initEvents() {
      this.audio.addEventListener('playing', () => {
        clearTimeout(this.watchdog);
        this.isPlaying = true;
        this.failedInRow = 0;
        this.updateUI();
        this.startVisualizer();
        this.updateMediaSession();
        this.broadcastState();
        this.scheduleJingle();
      });

      this.audio.addEventListener('pause', () => {
        this.isPlaying = false;
        this.pauseJingleSchedule();
        this.updateUI();
        this.stopVisualizer();
        this.updateMediaSession();
        this.broadcastState();
      });

      this.audio.addEventListener('error', () => {
        if (!this.audio.getAttribute('src')) return;
        // Fallback to the secondary stream, then to the next station
        const station = this.currentStation;
        if (station.fallbackStream && this.audio.src !== station.fallbackStream) {
          this.startStream(station.fallbackStream);
        } else {
          this.handleStationFailure();
        }
      });
    }

    get currentStation() {
      return STATIONS[this.currentStationIndex];
    }

    stationName(st = this.currentStation) { return isEn() ? st.nameEn : st.nameHr; }
    stationTagline(st = this.currentStation) { return isEn() ? st.taglineEn : st.taglineHr; }

    initPersistentBridge() {
      if (!this.channel) return;
      this.channel.addEventListener('message', (event) => {
        const msg = event.data || {};
        if (msg.type === 'PING') {
          this.channel.postMessage({ type: 'PLAYER_READY', source: 'radio-player' });
          this.broadcastState();
          return;
        }
        if (msg.type === 'FLOAT_POS') {
          this.floatPos = msg.payload || null; // null = back to the default corner
          return;
        }
        if (msg.type !== 'COMMAND' || !msg.payload) return;
        const p = msg.payload;
        const action = p.action;
        if (action === 'PLAY') this.play();
        else if (action === 'PAUSE') this.pause();
        else if (action === 'NEXT') this.nextTrack();
        else if (action === 'SYNC') this.broadcastState();
        else if (action === 'STATION') {
          const idx = typeof p.id === 'string' ? stationIndexById(p.id) : Number(p.index);
          if (idx >= 0 && idx < STATIONS.length) this.changeStation(idx, { autoplay: p.play !== false });
        }
        else if (action === 'VOLUME_UP') this.setVolume(this.volume + 0.1);
        else if (action === 'VOLUME_DOWN') this.setVolume(this.volume - 0.1);
        else if (action === 'VOLUME' && Number.isFinite(Number(p.value))) this.setVolume(Number(p.value));
      });
      this.channel.postMessage({ type: 'PLAYER_READY', source: 'radio-player' });
      window.addEventListener('beforeunload', () => {
        try { this.channel.postMessage({ type: 'PLAYER_CLOSED', source: 'radio-player' }); } catch (_) {}
      });
    }

    broadcastState() {
      if (!this.channel) return;
      const st = this.currentStation;
      try {
        this.channel.postMessage({
          type: 'STATE',
          source: 'radio-player',
          payload: {
            playing: !!this.isPlaying,
            stationIndex: this.currentStationIndex,
            stationId: st.id,
            stationLabel: st.label,
            stationName: this.stationName(st),
            stationTag: this.stationTagline(st),
            volume: Math.round(this.volume * 100) / 100,
            stations: STATIONS.map((s) => ({ id: s.id, label: s.label })),
            floatPos: this.floatPos
          }
        });
      } catch (_) {}
    }

    initMediaSession() {
      if (!('mediaSession' in navigator)) return;
      const safeSet = (action, handler) => {
        try { navigator.mediaSession.setActionHandler(action, handler); } catch (_) {}
      };
      safeSet('play', () => this.play());
      safeSet('pause', () => this.pause());
      safeSet('nexttrack', () => this.changeStation((this.currentStationIndex + 1) % STATIONS.length));
      safeSet('previoustrack', () => this.changeStation((this.currentStationIndex - 1 + STATIONS.length) % STATIONS.length));
      this.updateMediaSession();
    }

    updateMediaSession() {
      if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
      const st = this.currentStation;
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: this.stationName(st),
          artist: 'AKTUAL MEDIA RADIO',
          album: st.genre,
          artwork: [
            { src: '/assets/app-icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
            { src: '/assets/app-icon-512.svg', sizes: '512x512', type: 'image/svg+xml' }
          ]
        });
        navigator.mediaSession.playbackState = this.isPlaying ? 'playing' : 'paused';
      } catch (_) {}
    }

    play() {
      const station = this.currentStation;
      const keep = this.audio.src && (this.audio.src === station.streamUrl || this.audio.src === station.fallbackStream);
      this.startStream(keep ? null : station.streamUrl);
    }

    // Single entry point for (re)starting a stream: volume, start watchdog, play.
    startStream(url) {
      if (url) this.audio.src = url;
      this.applyMusicVolume();
      clearTimeout(this.watchdog);
      const attempt = this.audio.src;
      this.watchdog = setTimeout(() => {
        // Connected but no audio after 15 s: treat like a stream error (fallback / next station).
        if (this.audio.src === attempt && !this.audio.paused && this.audio.readyState < 3) this.audio.dispatchEvent(new Event('error'));
      }, 15000);
      const playPromise = this.audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          this.isPlaying = true;
          this.announceTrack();
          this.updateUI();
          this.updateMediaSession();
          this.broadcastState();
        }).catch((err) => this.onPlayRejected(err));
      }
    }

    onPlayRejected(err) {
      if (err && err.name === 'NotAllowedError') {
        // Browser autoplay policy: wait for a click on PLAY in this window.
        this.isPlaying = false;
        this.setBanner(isEn() ? '▶ Press PLAY to start the radio in this window.' : '▶ Pritisnite PLAY za početak radija u ovom prozoru.');
        this.updateUI();
        this.broadcastState();
        return;
      }
      // AbortError: superseded by a newer load. Source failures also fire the element's
      // own 'error' event, which drives the fallback logic — nothing to do here.
    }

    handleStationFailure() {
      const en = isEn();
      const failed = this.currentStation;
      this.failedInRow += 1;
      if (this.failedInRow >= STATIONS.length) {
        clearTimeout(this.watchdog);
        this.audio.pause();
        this.audio.removeAttribute('src');
        this.isPlaying = false;
        this.failedInRow = 0;
        this.setBanner(en ? 'Streams are temporarily unavailable. Please try again shortly.' : 'Streamovi trenutačno nisu dostupni. Pokušajte ponovno za koju minutu.');
        this.updateUI();
        this.broadcastState();
        return;
      }
      this.setBanner(en ? `${failed.label} is unavailable right now — switching to the next station.` : `${failed.label} trenutačno nije dostupan — prebacujem na sljedeću stanicu.`);
      this.currentStationIndex = (this.currentStationIndex + 1) % STATIONS.length;
      this.startStream(this.currentStation.streamUrl);
      this.updateUI();
      this.broadcastState();
    }

    pause() {
      clearTimeout(this.watchdog);
      if (this.audio) this.audio.pause();
      this.stopJingle();
      this.isPlaying = false;
      this.updateUI();
      this.updateMediaSession();
      this.broadcastState();
    }

    toggle() {
      if (this.isPlaying) {
        this.pause();
      } else {
        this.play();
      }
    }

    applyMusicVolume() {
      if (this.audio) this.audio.volume = Math.max(0, Math.min(1, this.volume * this.duckFactor));
      if (this.jingle) this.jingle.volume = Math.max(0, Math.min(1, this.volume));
    }

    setVolume(val) {
      this.volume = Math.round(Math.max(0, Math.min(1, parseFloat(val))) * 100) / 100;
      this.applyMusicVolume();
      this.updateVolumeUI();
      this.broadcastState();
    }

    changeStation(index, opts = {}) {
      const next = ((index % STATIONS.length) + STATIONS.length) % STATIONS.length;
      const changed = next !== this.currentStationIndex;
      if (!changed && this.isPlaying) { this.updateUI(); this.broadcastState(); return; }
      this.currentStationIndex = next;
      this.failedInRow = 0;
      if (this.isPlaying || opts.autoplay) {
        this.startStream(this.currentStation.streamUrl);
        if (changed) this.queueTransitionJingle();
        this.updateUI();        // odmah označi novu stanicu (ne čekaj spajanje streama)
        this.broadcastState();
      } else {
        this.updateUI();
        this.updateMediaSession();
        this.broadcastState();
      }
    }

    nextTrack() {
      this.promoCounter++;
      this.announceTrack();
      this.updateUI();
      if (this.promoCounter % 3 === 0) this.playCommercialAnnouncement();
    }

    setBanner(html, flash = true) {
      const banner = document.getElementById('radioAnnounceBanner');
      if (!banner) return;
      banner.innerHTML = `<span>${html}</span>`;
      if (flash) {
        banner.classList.add('flash');
        setTimeout(() => banner.classList.remove('flash'), 2000);
      }
    }

    announceTrack() {
      const en = isEn();
      this.setBanner(`🎧 <strong>${esc(this.stationName())}</strong> — ${esc(this.currentStation.genre)}. ${en ? 'Live track metadata is not supplied by this stream.' : 'Stream ne isporučuje pouzdane podatke o trenutačnoj pjesmi.'}`);
    }

    playCommercialAnnouncement() {
      const en = isEn();
      const promo = PROMOS[Math.floor(Math.random() * PROMOS.length)];
      this.setBanner(`📢 <strong>[RADIO AKTUAL PROMO]:</strong> ${esc(en ? promo.en : promo.hr)}`, false);
      // Natural recorded voice instead of synthetic speech
      if (this.isPlaying) this.playJingle();
    }

    // ---------- jingles ----------
    scheduleJingle(delay) {
      if (!JINGLES_ON || !this.isPlaying || this.jingle) return;
      clearTimeout(this.jingleTimer);
      const ms = typeof delay === 'number' ? delay : this.jingleRemaining;
      this.jingleDueAt = Date.now() + ms;
      this.jingleTimer = setTimeout(() => this.playJingle(), ms);
    }

    pauseJingleSchedule() {
      if (this.jingleTimer) {
        clearTimeout(this.jingleTimer);
        this.jingleTimer = null;
        this.jingleRemaining = Math.max(5000, this.jingleDueAt - Date.now());
      }
    }

    nextJingleGap() {
      const [a, b] = JINGLE_EVERY_MS;
      return a + Math.random() * (b - a);
    }

    queueTransitionJingle() {
      if (Date.now() - this.lastJingleAt < JINGLE_MIN_GAP_MS) return;
      this.jingleRemaining = 1800; // a short ident right after the station change
      if (this.isPlaying) this.scheduleJingle(1800);
    }

    duckTo(target, ms) {
      clearInterval(this.duckTimer);
      const start = this.duckFactor;
      const steps = Math.max(1, Math.round(ms / 30));
      let i = 0;
      this.duckTimer = setInterval(() => {
        i += 1;
        this.duckFactor = start + (target - start) * (i / steps);
        this.applyMusicVolume();
        if (i >= steps) { clearInterval(this.duckTimer); this.duckTimer = null; }
      }, 30);
    }

    playJingle() {
      clearTimeout(this.jingleTimer);
      this.jingleTimer = null;
      if (!JINGLES_ON || !this.isPlaying || this.jingle || !JINGLES.length) return;
      const src = JINGLES[this.jingleIndex % JINGLES.length];
      this.jingleIndex += 1;
      const j = new Audio(src);
      j.preload = 'auto';
      this.jingle = j;
      this.applyMusicVolume();
      const finish = () => {
        if (this.jingle !== j) return;
        this.jingle = null;
        this.duckTo(1, 900);
        this.lastJingleAt = Date.now();
        this.jingleRemaining = this.nextJingleGap();
        this.scheduleJingle();
      };
      j.addEventListener('ended', finish, { once: true });
      j.addEventListener('error', finish, { once: true });
      this.duckTo(DUCK_LEVEL, 350);
      setTimeout(() => {
        if (this.jingle !== j) return;
        j.play().catch(finish);
      }, 250);
    }

    stopJingle() {
      if (this.jingle) {
        try { this.jingle.pause(); } catch (_) {}
        this.jingle = null;
      }
      clearInterval(this.duckTimer);
      this.duckTimer = null;
      this.duckFactor = 1;
      this.applyMusicVolume();
      this.pauseJingleSchedule();
    }

    // ---------- visuals ----------
    startVisualizer() {
      const bars = document.querySelectorAll('.eq-bar');
      if (!bars.length) return;
      this.stopVisualizer();
      this.visualizerTimer = setInterval(() => {
        bars.forEach(bar => {
          const h = Math.floor(Math.random() * 26) + 6;
          bar.style.height = `${h}px`;
        });
      }, 100);
    }

    stopVisualizer() {
      if (this.visualizerTimer) clearInterval(this.visualizerTimer);
      const bars = document.querySelectorAll('.eq-bar');
      bars.forEach(bar => bar.style.height = '4px');
    }

    renderStationChips() {
      const wrap = document.getElementById('radioStationChips');
      if (!wrap) return;
      const en = isEn();
      if (!wrap.dataset.ready) {
        wrap.innerHTML = STATIONS.map((s, i) => `<button type="button" class="rp-chip" data-station-index="${i}" title="${esc(en ? s.nameEn : s.nameHr)}">${esc(s.label)}</button>`).join('');
        wrap.setAttribute('role', 'group');
        wrap.setAttribute('aria-label', en ? 'Stations' : 'Stanice');
        wrap.addEventListener('click', (e) => {
          const b = e.target.closest('[data-station-index]');
          if (!b) return;
          const idx = parseInt(b.dataset.stationIndex, 10);
          if (idx === this.currentStationIndex && this.isPlaying) return;
          this.changeStation(idx, { autoplay: true });
        });
        wrap.dataset.ready = '1';
      }
      wrap.querySelectorAll('[data-station-index]').forEach((b) => {
        const on = parseInt(b.dataset.stationIndex, 10) === this.currentStationIndex;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }

    updateUI() {
      const playBtn = document.getElementById('radioPlayBtn');
      const statusLabel = document.getElementById('radioStatusLabel');
      const stationTitle = document.getElementById('radioStationTitle');
      const stationTag = document.getElementById('radioStationTag');
      const trackName = document.getElementById('radioTrackName');
      const trackArtist = document.getElementById('radioTrackArtist');
      const stationSelect = document.getElementById('radioStationSelect');
      const en = isEn();

      if (playBtn) {
        playBtn.innerHTML = this.isPlaying
          ? (en ? '❚❚ PAUSE' : '❚❚ PAUZA')
          : (en ? '▶ START RADIO' : '▶ POKRENI RADIO');
        playBtn.classList.toggle('is-playing', this.isPlaying);
      }

      if (statusLabel) {
        statusLabel.innerHTML = this.isPlaying
          ? `<span class="radio-live-dot"></span> ${en ? 'ON AIR · STREAMING LIVE' : 'UŽIVO U ETERU · PRIJENOS'}`
          : `○ ${en ? 'RADIO STANDBY' : 'RADIO U PRIPRAVNOSTI'}`;
        statusLabel.className = this.isPlaying ? 'radio-status live' : 'radio-status';
      }

      const st = this.currentStation;
      if (stationTitle) stationTitle.textContent = this.stationName(st);
      if (stationTag) stationTag.textContent = this.stationTagline(st);
      if (stationSelect && String(stationSelect.value) !== String(this.currentStationIndex)) stationSelect.value = String(this.currentStationIndex);

      if (trackName) trackName.textContent = en ? 'Live audio stream' : 'Audio stream uživo';
      if (trackArtist) trackArtist.textContent = en ? 'Track metadata unavailable' : 'Podaci o pjesmi nisu dostupni';
      this.renderStationChips();
    }

    updateVolumeUI() {
      const slider = document.getElementById('radioVolSlider');
      const volIcon = document.getElementById('radioVolIcon');
      const volValue = document.getElementById('radioVolValue');
      if (slider) slider.value = this.volume;
      if (volIcon) {
        volIcon.textContent = this.volume === 0 ? '🔇' : this.volume < 0.5 ? '🔉' : '🔊';
      }
      if (volValue) volValue.textContent = `${Math.round(this.volume * 100)}%`;
    }
  }

  // Weekly editorial channels — informational cards (no separate live stream).
  function renderWeeklyChannels() {
    const wrap = document.getElementById('radioWeeklyChannels');
    if (!wrap) return;
    const en = isEn();
    wrap.innerHTML = WEEKLY_CHANNELS.map(ch => (
      `<div class="tabloid-wire-card weekly-channel-card">` +
      `<div class="idea-top"><span class="wire-badge">${en ? ch.dayEn : ch.dayHr}</span>` +
      `<span>${en ? 'MODELED SCHEDULE' : 'MODELIRANI RASPORED'}</span></div>` +
      `<strong>${en ? ch.nameEn : ch.nameHr}</strong>` +
      `<p style="margin:6px 0 0;color:#cbd5e1;font-size:.85rem;line-height:1.5">${en ? ch.descEn : ch.descHr}</p>` +
      `</div>`
    )).join('');
  }

  // Global instance
  window.__aktualRadio = new RadioEngine();

  // Attach controls on DOM load
  function initRadioControls() {
    const radio = window.__aktualRadio;
    const playBtn = document.getElementById('radioPlayBtn');
    const volSlider = document.getElementById('radioVolSlider');
    const volUpBtn = document.getElementById('radioVolUp');
    const volDownBtn = document.getElementById('radioVolDown');
    const stationSelect = document.getElementById('radioStationSelect');
    const nextBtn = document.getElementById('radioNextBtn');

    if (stationSelect) {
      // Options always mirror the station list above (order, names).
      stationSelect.innerHTML = STATIONS.map((s, i) => `<option value="${i}">${esc(isEn() ? s.nameEn : s.nameHr)}</option>`).join('');
      stationSelect.value = String(radio.currentStationIndex);
      stationSelect.addEventListener('change', (e) => radio.changeStation(parseInt(e.target.value, 10)));
    }
    if (playBtn) playBtn.addEventListener('click', () => radio.toggle());
    if (volSlider) volSlider.addEventListener('input', (e) => radio.setVolume(e.target.value));
    if (volUpBtn) volUpBtn.addEventListener('click', () => radio.setVolume(radio.volume + 0.1));
    if (volDownBtn) volDownBtn.addEventListener('click', () => radio.setVolume(radio.volume - 0.1));
    if (nextBtn) nextBtn.addEventListener('click', () => radio.nextTrack());

    radio.updateUI();
    radio.updateVolumeUI();
    renderWeeklyChannels();
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', initRadioControls)
    : initRadioControls();
})();
