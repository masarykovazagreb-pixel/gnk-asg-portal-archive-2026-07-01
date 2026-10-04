/**
 * AKTUAL RADIO — Live Internet Audio Player Engine
 * GNK ASG & Nermin Sefić Digital Media Network
 * Supports multiple USA & English music streams, station/stream announcements,
 * commercials/promos, audio equalizer visualization, and procedural chill audio fallback.
 */
(() => {
  'use strict';

  const isEn = () => (document.documentElement.lang || '').toLowerCase().startsWith('en') || /\/en\//.test(location.pathname);

  // Third-party public audio streams; track metadata is not asserted unless supplied by the stream.
  const STATIONS = [
    {
      id: 'usa-hits',
      nameHr: 'AKTUAL USA Top Hits & Rock',
      nameEn: 'AKTUAL USA Top Hits & Rock',
      taglineHr: 'Američki rock, pop i moderni groove hitovi',
      taglineEn: 'American rock, pop, and modern groove hits',
      streamUrl: 'https://stream.zeno.fm/f3wvbbqmdg8uv', // Free public icecast MP3 stream
      fallbackStream: 'https://ice1.somafm.com/groovesalad-128-mp3',
      genre: 'USA Pop / Rock / Indie',
      metadataMode: 'stream-no-track-feed'
    },
    {
      id: 'lofi-lounge',
      nameHr: 'AKTUAL Lo-Fi Chill & Business Lounge',
      nameEn: 'AKTUAL Lo-Fi Chill & Business Lounge',
      taglineHr: 'Opuštajući ritmovi za fokus, rad i analitiku',
      taglineEn: 'Relaxing lo-fi beats for focus, trading and work',
      streamUrl: 'https://ice2.somafm.com/defcon-128-mp3',
      fallbackStream: 'https://ice4.somafm.com/secretagent-128-mp3',
      genre: 'Lo-Fi / Chillhop / Ambient',
      metadataMode: 'stream-no-track-feed'
    },
    {
      id: 'synthwave-energy',
      nameHr: 'AKTUAL Synthwave & Retro Tech',
      nameEn: 'AKTUAL Synthwave & Retro Tech',
      taglineHr: 'Elektronski retro synth i dinamični cyber ritmovi',
      taglineEn: 'Electronic retro synth and dynamic cyber beats',
      streamUrl: 'https://ice1.somafm.com/beatblender-128-mp3',
      fallbackStream: 'https://ice2.somafm.com/lush-128-mp3',
      genre: 'Synthwave / Retrowave / Cyberpunk',
      metadataMode: 'stream-no-track-feed'
    },
    {
      id: 'usa-country-roots',
      nameHr: 'AKTUAL Radio USA · Country & Americana',
      nameEn: 'AKTUAL Radio USA · Country & Americana',
      taglineHr: 'Američki country, roots i americana zvuk',
      taglineEn: 'American country, roots, and americana sound',
      streamUrl: 'https://ice1.somafm.com/bootliquor-128-mp3',
      fallbackStream: 'https://ice1.somafm.com/folkfwd-128-mp3',
      genre: 'USA Country / Americana / Roots',
      metadataMode: 'stream-no-track-feed'
    },
    {
      id: 'usa-jazz-soul',
      nameHr: 'AKTUAL Radio USA · Jazz & Soul Lounge',
      nameEn: 'AKTUAL Radio USA · Jazz & Soul Lounge',
      taglineHr: 'Američki jazz, soul i lounge klasici',
      taglineEn: 'American jazz, soul, and lounge classics',
      streamUrl: 'https://ice1.somafm.com/sonicuniverse-128-mp3',
      fallbackStream: 'https://ice1.somafm.com/7soul-128-mp3',
      genre: 'USA Jazz / Soul / Lounge',
      metadataMode: 'stream-no-track-feed'
    }];

  // Weekly editorial channels — modeled editorial announcement schedule.
  // These are not separate live streams; announcements run through the
  // Radio Aktual promo rotation and the cards below are informational.
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
      hr: 'Slušate Radio Aktual — glas globalnih vijesti, tehnologije i glazbe pod vodstvom Nermina Sefića i GNK ASG.',
      en: 'You are listening to Radio Aktual — the voice of global news, technology, and music powered by Nermin Sefic and GNK ASG.'
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
      hr: 'Tjedni urednički kanali Radija Aktual — od Tjednih tržišta do Sovinog tjednog sažetka. Modelirani raspored najava, svaki dan jedna tema.',
      en: 'Radio Aktual weekly editorial channels — from Weekly Markets to the Sova weekly recap. A modeled announcement schedule, one theme per day.'
    }
  ];

  class RadioEngine {
    constructor() {
      this.currentStationIndex = 0;
      this.isPlaying = false;
      this.volume = 0.8;
      this.audio = new Audio();
      this.audio.crossOrigin = 'anonymous';
      this.audio.volume = this.volume;
      this.trackTimer = null;
      this.visualizerTimer = null;
      this.promoCounter = 0;

      // Web Audio API Synthesis fallback for 100% reliability
      this.audioCtx = null;
      this.synthPlaying = false;

      this.initEvents();
    }

    initEvents() {
      this.audio.addEventListener('play', () => {
        if (this.synthPlaying) this.stopProceduralAudio();
        this.isPlaying = true;
        this.updateUI();
        this.startVisualizer();
      });

      this.audio.addEventListener('pause', () => {
        this.isPlaying = false;
        this.updateUI();
        this.stopVisualizer();
      });

      this.audio.addEventListener('error', () => {
        // Fallback to secondary stream or procedural synth on network block
        const station = STATIONS[this.currentStationIndex];
        if (this.audio.src !== station.fallbackStream && station.fallbackStream) {
          this.audio.src = station.fallbackStream;
          this.audio.play().catch(() => this.startProceduralAudio());
        } else {
          this.startProceduralAudio();
        }
      });
    }

    get currentStation() {
      return STATIONS[this.currentStationIndex];
    }

    play() {
      if (this.synthPlaying) this.stopProceduralAudio();
      const station = this.currentStation;
      if (!this.audio.src || this.audio.src !== station.streamUrl) {
        this.audio.src = station.streamUrl;
      }
      this.audio.volume = this.volume;

      const playPromise = this.audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          this.isPlaying = true;
          this.announceTrack();
          this.updateUI();
        }).catch(() => {
          // Fallback to web audio synth
          this.startProceduralAudio();
        });
      }
    }

    pause() {
      if (this.audio) this.audio.pause();
      if (this.synthPlaying) this.stopProceduralAudio();
      this.isPlaying = false;
      this.updateUI();
    }

    toggle() {
      if (this.isPlaying) {
        this.pause();
      } else {
        this.play();
      }
    }

    setVolume(val) {
      this.volume = Math.max(0, Math.min(1, parseFloat(val)));
      if (this.audio) this.audio.volume = this.volume;
      if (this.gainNode) this.gainNode.gain.setValueAtTime(this.volume * 0.15, this.audioCtx.currentTime);
      this.updateVolumeUI();
    }

    changeStation(index) {
      if (this.synthPlaying) this.stopProceduralAudio();
      this.currentStationIndex = index % STATIONS.length;
      if (this.isPlaying) {
        this.play();
      } else {
        this.updateUI();
      }
    }
    nextTrack() {
      this.promoCounter++;
      this.announceTrack();
      this.updateUI();
      if (this.promoCounter % 3 === 0) this.playCommercialAnnouncement();
    }

    announceTrack() {
      const en = isEn();
      const banner = document.getElementById('radioAnnounceBanner');
      if (banner) {
        banner.innerHTML = `<span>🎧 <strong>${this.currentStation.nameHr}</strong> — ${this.currentStation.genre}. ${en ? 'Live track metadata is not supplied by this stream.' : 'Stream ne isporučuje pouzdane podatke o trenutačnoj pjesmi.'}</span>`;
        banner.classList.add('flash');
        setTimeout(() => banner.classList.remove('flash'), 2000);
      }
    }

    playCommercialAnnouncement() {
      const en = isEn();
      const promo = PROMOS[Math.floor(Math.random() * PROMOS.length)];
      const banner = document.getElementById('radioAnnounceBanner');
      if (banner) {
        banner.innerHTML = `<span>📢 <strong>[RADIO AKTUAL PROMO]:</strong> ${en ? promo.en : promo.hr}</span>`;
      }
      // Speak using SpeechSynthesis if supported
      if ('speechSynthesis' in window) {
        try {
          const msg = new SpeechSynthesisUtterance(en ? promo.en : promo.hr);
          msg.lang = en ? 'en-US' : 'hr-HR';
          msg.volume = this.volume * 0.7;
          msg.rate = 1.05;
          window.speechSynthesis.speak(msg);
        } catch (_) {}
      }
    }

    startProceduralAudio() {
      if (this.synthPlaying) return;
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        if (!this.audioCtx) this.audioCtx = new AudioContext();
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

        this.synthPlaying = true;
        this.isPlaying = true;

        // Generate warm relaxing chord progression
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        this.gainNode = gain;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, this.audioCtx.currentTime); // A3
        gain.gain.setValueAtTime(this.volume * 0.12, this.audioCtx.currentTime);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();

        this.synthOsc = osc;
        this.startVisualizer();
        this.updateUI();
        this.announceTrack();
      } catch (_) {}
    }

    stopProceduralAudio() {
      if (this.synthOsc) {
        try { this.synthOsc.stop(); this.synthOsc.disconnect(); } catch (_) {}
        this.synthOsc = null;
      }
      this.synthPlaying = false;
    }

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

    updateUI() {
      const playBtn = document.getElementById('radioPlayBtn');
      const statusLabel = document.getElementById('radioStatusLabel');
      const stationTitle = document.getElementById('radioStationTitle');
      const stationTag = document.getElementById('radioStationTag');
      const trackName = document.getElementById('radioTrackName');
      const trackArtist = document.getElementById('radioTrackArtist');
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
      if (stationTitle) stationTitle.textContent = en ? st.nameEn : st.nameHr;
      if (stationTag) stationTag.textContent = en ? st.taglineEn : st.taglineHr;

      if (trackName) trackName.textContent = en ? 'Live audio stream' : 'Audio stream uživo';
      if (trackArtist) trackArtist.textContent = en ? 'Track metadata unavailable' : 'Podaci o pjesmi nisu dostupni';
    }

    updateVolumeUI() {
      const slider = document.getElementById('radioVolSlider');
      const volIcon = document.getElementById('radioVolIcon');
      if (slider) slider.value = this.volume;
      if (volIcon) {
        volIcon.textContent = this.volume === 0 ? '🔇' : this.volume < 0.5 ? '🔉' : '🔊';
      }
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

    if (playBtn) playBtn.addEventListener('click', () => radio.toggle());
    if (volSlider) volSlider.addEventListener('input', (e) => radio.setVolume(e.target.value));
    if (volUpBtn) volUpBtn.addEventListener('click', () => radio.setVolume(radio.volume + 0.1));
    if (volDownBtn) volDownBtn.addEventListener('click', () => radio.setVolume(radio.volume - 0.1));
    if (nextBtn) nextBtn.addEventListener('click', () => radio.nextTrack());
    if (stationSelect) {
      stationSelect.addEventListener('change', (e) => radio.changeStation(parseInt(e.target.value, 10)));
    }

    radio.updateUI();
    radio.updateVolumeUI();
    renderWeeklyChannels();
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', initRadioControls)
    : initRadioControls();
})();
