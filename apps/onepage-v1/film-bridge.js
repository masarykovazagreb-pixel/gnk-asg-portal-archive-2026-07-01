(() => {
  'use strict';

  const allControls = () => Array.from(document.querySelectorAll('button,a,[role="button"],input[type="button"],input[type="submit"]'));
  const byText = pattern => allControls().find(element => pattern.test(String(element.textContent || element.value || element.getAttribute('aria-label') || '').trim()));

  function media(sound) {
    document.querySelectorAll('audio,video').forEach(element => {
      element.muted = !sound;
      if ('volume' in element) element.volume = sound ? 1 : 0;
      if (sound) element.play?.().catch(() => null);
      else element.pause?.();
    });
  }

  function sound(on) {
    const control = byText(/sound|zvuk|audio|mute|unmute/i);
    if (control) {
      const text = String(control.textContent || control.getAttribute('aria-label') || '').toLowerCase();
      const pressed = control.getAttribute('aria-pressed');
      const currentlyOff = pressed === 'false' || /off|isklju|mute/.test(text);
      const currentlyOn = pressed === 'true' || /on|uklju|unmute/.test(text);
      if ((on && currentlyOff) || (!on && currentlyOn)) control.click();
    }
    media(on);
  }

  function start() {
    const enter = byText(/enter the code|pokreni|play film|start film|play|start/i);
    if (enter) enter.click();
    setTimeout(() => sound(true), 60);
    setTimeout(() => sound(true), 420);
    setTimeout(() => sound(true), 1100);
    window.parent.postMessage({type:'GNK_CODE_STARTED'}, '*');
  }

  window.addEventListener('message', event => {
    const type = event.data?.type;
    if (type === 'GNK_CODE_PLAY') start();
    if (type === 'GNK_CODE_SOUND_ON') sound(true);
    if (type === 'GNK_CODE_SOUND_OFF') sound(false);
  });

  const params = new URLSearchParams(location.search);
  if (params.get('autoplay') === '1') setTimeout(start, 140);

  document.documentElement.style.overflow = 'hidden';
  if (document.body) document.body.style.overflow = 'hidden';
})();
