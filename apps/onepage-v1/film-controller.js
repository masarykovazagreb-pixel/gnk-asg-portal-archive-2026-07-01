(() => {
  'use strict';

  const labels = {
    hr: {
      kicker: 'CJELOVITI FILM · 12–13 SCENA · ZVUK',
      play: 'Pokreni film',
      replay: 'Pokreni ponovno',
      note: 'Početni kadar ostaje miran. Klik pokreće cijeli THE CODE i uključuje zvuk.',
      soundOn: 'Zvuk uključen',
      soundOff: 'Zvuk isključen',
      playing: 'Film je pokrenut · zvuk je uključen'
    },
    en: {
      kicker: 'COMPLETE FILM · 12–13 SCENES · SOUND',
      play: 'Play film',
      replay: 'Play again',
      note: 'The opening frame remains still. Click to play the complete THE CODE film with sound.',
      soundOn: 'Sound on',
      soundOff: 'Sound off',
      playing: 'Film is playing · sound is on'
    }
  };

  let mounted = false;
  let playing = false;
  let soundOn = true;

  function language() {
    return document.documentElement.lang === 'en' ? 'en' : 'hr';
  }

  function postToFilm(type) {
    const frame = document.querySelector('.code-stage iframe');
    if (!frame?.contentWindow) return;
    frame.contentWindow.postMessage({type}, '*');
  }

  function startFilm() {
    const stage = document.querySelector('.code-stage');
    const frame = stage?.querySelector('iframe');
    if (!stage || !frame) return;

    const base = '/film/the-code/?embed=1&autoplay=1&sound=1';
    frame.src = `${base}&restart=${Date.now()}`;
    frame.setAttribute('allow', 'autoplay; fullscreen');
    frame.setAttribute('scrolling', 'no');
    playing = true;
    soundOn = true;
    stage.classList.add('is-playing');
    updateControls();

    const signal = () => {
      postToFilm('GNK_CODE_PLAY');
      postToFilm('GNK_CODE_SOUND_ON');
    };
    frame.addEventListener('load', () => {
      signal();
      setTimeout(signal, 350);
      setTimeout(signal, 1100);
    }, {once: true});
    setTimeout(signal, 150);
  }

  function toggleSound() {
    soundOn = !soundOn;
    postToFilm(soundOn ? 'GNK_CODE_SOUND_ON' : 'GNK_CODE_SOUND_OFF');
    updateControls();
  }

  function updateControls() {
    const l = labels[language()];
    const replay = document.querySelector('[data-film-replay]');
    const sound = document.querySelector('[data-film-sound]');
    const state = document.querySelector('[data-film-state]');
    if (replay) replay.textContent = l.replay;
    if (sound) sound.textContent = soundOn ? l.soundOn : l.soundOff;
    if (state) state.textContent = playing ? l.playing : '';
  }

  function removeUnapprovedLogos() {
    document.querySelectorAll('.identity img,.company-mark img').forEach(image => image.remove());
  }

  function mount() {
    const stage = document.querySelector('.code-stage');
    const frame = stage?.querySelector('iframe');
    const lock = stage?.querySelector('.code-lock');
    if (!stage || !frame || !lock || mounted) return false;
    mounted = true;

    removeUnapprovedLogos();
    frame.src = '/film/the-code/?embed=1';
    frame.setAttribute('allow', 'autoplay; fullscreen');
    frame.setAttribute('scrolling', 'no');
    frame.setAttribute('tabindex', '-1');

    const l = labels[language()];
    lock.innerHTML = `
      <div class="film-launch-panel">
        <span class="film-kicker">${l.kicker}</span>
        <button class="film-play" type="button" data-film-play>
          <span class="film-play-icon" aria-hidden="true">▶</span>
          <span>${l.play}</span>
        </button>
        <span class="film-launch-note">${l.note}</span>
      </div>`;

    const controls = document.createElement('div');
    controls.className = 'film-controls';
    controls.innerHTML = `
      <button class="film-control" type="button" data-film-replay>${l.replay}</button>
      <button class="film-control" type="button" data-film-sound>${l.soundOn}</button>
      <span class="film-state" data-film-state></span>`;
    stage.append(controls);

    lock.querySelector('[data-film-play]')?.addEventListener('click', startFilm);
    controls.querySelector('[data-film-replay]')?.addEventListener('click', startFilm);
    controls.querySelector('[data-film-sound]')?.addEventListener('click', toggleSound);

    window.addEventListener('message', event => {
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'GNK_CODE_STARTED') {
        playing = true;
        soundOn = true;
        stage.classList.add('is-playing');
        updateControls();
      }
      if (event.data.type === 'GNK_CODE_ENDED') {
        playing = false;
        updateControls();
      }
    });
    return true;
  }

  const observer = new MutationObserver(() => {
    removeUnapprovedLogos();
    if (mount()) observer.disconnect();
  });
  observer.observe(document.documentElement, {childList: true, subtree: true});
  mount();
})();
