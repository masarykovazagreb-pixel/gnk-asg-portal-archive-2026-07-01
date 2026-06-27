(() => {
  "use strict";

  const root = document.querySelector(".gnk-code");
  if (!root) return;

  const stage = root.querySelector("[data-gnk-code-stage]");
  const scenes = Array.from(root.querySelectorAll("[data-scene]"));
  const startButton = root.querySelector("[data-gnk-code-enter]");
  const soundButton = root.querySelector("[data-gnk-code-sound]");
  const finalIndex = scenes.length - 1;
  const durations = [6000, 8500, 8000, 8000, 8000];
  const targetUtc = Date.parse("2026-10-07T15:30:00Z");

  let current = finalIndex;
  let sceneTimer = 0;
  let progressTimer = 0;
  let clockTimer = 0;
  let terminalTimers = [];
  let hasPlayed = false;
  let soundOn = false;
  let audioContext = null;

  const pad = value => String(Math.floor(value)).padStart(2, "0");

  function setText(selector, value) {
    const node = root.querySelector(selector);
    if (node) node.textContent = value;
  }

  function timeAt(timeZone, includeSeconds = false) {
    return new Date().toLocaleTimeString("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      second: includeSeconds ? "2-digit" : undefined,
      hour12: false
    });
  }

  function dateAt(timeZone) {
    return new Date().toLocaleDateString("en-US", {
      timeZone,
      weekday: "short",
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
  }

  function updateLiveData() {
    setText('[data-clock="new-york"]', timeAt("America/New_York", true));
    setText('[data-date="new-york"]', dateAt("America/New_York"));
    setText('[data-clock="zagreb"]', timeAt("Europe/Zagreb"));
    setText('[data-clock="london"]', timeAt("Europe/London"));
    setText('[data-clock="dubai"]', timeAt("Asia/Dubai"));
    setText('[data-clock="tokyo"]', timeAt("Asia/Tokyo"));

    const remaining = Math.max(0, targetUtc - Date.now());
    const values = {
      days: remaining / 86400000,
      hours: (remaining % 86400000) / 3600000,
      minutes: (remaining % 3600000) / 60000,
      seconds: (remaining % 60000) / 1000
    };
    Object.entries(values).forEach(([key, value]) => {
      setText(`[data-countdown="${key}"]`, pad(value));
    });
  }

  function startLiveClock() {
    updateLiveData();
    clearInterval(clockTimer);
    clockTimer = window.setInterval(updateLiveData, 1000);
  }

  function clearTerminalTimers() {
    terminalTimers.forEach(window.clearTimeout);
    terminalTimers = [];
  }

  function resetTerminal() {
    clearTerminalTimers();
    [1, 2, 3].forEach(number => {
      const node = root.querySelector(`[data-terminal="${number}"]`);
      if (node) node.className = "is-done";
    });
    const fourth = root.querySelector('[data-terminal="4"]');
    if (fourth) fourth.className = "is-live";
    [5, 6, 7, 8].forEach(number => {
      const node = root.querySelector(`[data-terminal="${number}"]`);
      if (node) node.className = "";
    });
  }

  function runTerminal() {
    [5, 6, 7, 8].forEach((number, index) => {
      terminalTimers.push(window.setTimeout(() => {
        const previous = root.querySelector(`[data-terminal="${number - 1}"]`);
        const next = root.querySelector(`[data-terminal="${number}"]`);
        if (previous) previous.className = "is-done";
        if (next) next.className = "is-live";
        audioImpact(index === 3 ? 0.16 : 0.08);
      }, (index + 1) * 950));
    });
    terminalTimers.push(window.setTimeout(() => {
      const last = root.querySelector('[data-terminal="8"]');
      if (last) last.className = "is-done";
    }, 5200));
  }

  function clearPlayback() {
    window.clearTimeout(sceneTimer);
    window.clearInterval(progressTimer);
    clearTerminalTimers();
  }

  function resetProgress() {
    root.querySelectorAll("[data-progress]").forEach(bar => {
      bar.style.width = "0%";
    });
  }

  function finishProgress(index) {
    const bar = root.querySelector(`[data-progress="${index}"]`);
    if (bar) bar.style.width = "100%";
  }

  function animateProgress(index, duration) {
    window.clearInterval(progressTimer);
    const bar = root.querySelector(`[data-progress="${index}"]`);
    if (!bar || !duration) return;
    bar.style.width = "0%";
    const startedAt = performance.now();
    progressTimer = window.setInterval(() => {
      const value = Math.min(100, ((performance.now() - startedAt) / duration) * 100);
      bar.style.width = `${value}%`;
      if (value >= 100) window.clearInterval(progressTimer);
    }, 40);
  }

  function activate(index) {
    scenes.forEach((scene, sceneIndex) => {
      scene.classList.toggle("is-active", sceneIndex === index);
      scene.classList.remove("is-out");
      scene.setAttribute("aria-hidden", sceneIndex === index ? "false" : "true");
    });
    current = index;
  }

  function showLiveState() {
    clearPlayback();
    resetProgress();
    activate(finalIndex);
    finishProgress(finalIndex);
    startLiveClock();
    stage?.classList.remove("has-entered");
    stage?.setAttribute("data-playback-state", hasPlayed ? "complete" : "ready-live");
    if (startButton) startButton.textContent = hasPlayed ? "REPLAY THE CODE" : "START THE CODE";
    window.parent?.postMessage({type: "gnk-code-playback", state: hasPlayed ? "complete" : "ready-live"}, "*");
  }

  function showFilmScene(index) {
    activate(index);
    animateProgress(index, durations[index]);
    if (index === 1) runTerminal();
    audioImpact(index === 4 ? 0.18 : 0.08);
  }

  function advance() {
    finishProgress(current);
    if (current >= durations.length - 1) {
      hasPlayed = true;
      sceneTimer = window.setTimeout(showLiveState, 350);
      return;
    }

    const next = current + 1;
    sceneTimer = window.setTimeout(() => {
      showFilmScene(next);
      sceneTimer = window.setTimeout(advance, durations[next]);
    }, 250);
  }

  function startFilm() {
    clearPlayback();
    resetTerminal();
    resetProgress();
    stage?.classList.add("has-entered");
    stage?.setAttribute("data-playback-state", "playing");
    showFilmScene(0);
    sceneTimer = window.setTimeout(advance, durations[0]);
    window.parent?.postMessage({type: "gnk-code-playback", state: "playing"}, "*");
  }

  function ensureAudio() {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === "suspended") audioContext.resume();
  }

  function audioImpact(level = 0.08) {
    if (!soundOn) return;
    ensureAudio();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(52, audioContext.currentTime);
    gain.gain.setValueAtTime(level, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.45);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.5);
  }

  function setSound(next) {
    soundOn = next;
    if (soundOn) ensureAudio();
    if (soundButton) {
      soundButton.textContent = soundOn ? "■ SOUND" : "▶ SOUND";
      soundButton.setAttribute("aria-pressed", soundOn ? "true" : "false");
    }
  }

  startButton?.addEventListener("click", () => {
    setSound(true);
    startFilm();
  });

  soundButton?.addEventListener("click", () => setSound(!soundOn));

  window.addEventListener("message", event => {
    if (event.data?.type === "gnk-code-start") startFilm();
  });

  showLiveState();
})();
