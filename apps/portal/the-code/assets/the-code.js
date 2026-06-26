(() => {
  "use strict";

  const root = document.querySelector(".gnk-code");
  if (!root) return;

  const stage = root.querySelector("[data-gnk-code-stage]");
  const scenes = [...root.querySelectorAll("[data-scene]")];
  const durations = [6000, 8500, 8000, 8000, 8000, 999999];
  const targetUtc = Date.parse("2026-10-07T15:30:00Z");

  let current = 0;
  let sceneTimer = null;
  let progressTimer = null;
  let clockTimer = null;
  let terminalTimers = [];
  let audioTimers = [];
  let audioContext = null;
  let audioMaster = null;
  let soundOn = false;

  const soundButton = root.querySelector("[data-gnk-code-sound]");
  const enterButton = root.querySelector("[data-gnk-code-enter]");
  const pad = value => String(Math.floor(value)).padStart(2, "0");

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

  function updateClocks() {
    root.querySelector('[data-clock="new-york"]').textContent = timeAt("America/New_York", true);
    root.querySelector('[data-date="new-york"]').textContent = dateAt("America/New_York");
    root.querySelector('[data-clock="zagreb"]').textContent = timeAt("Europe/Zagreb");
    root.querySelector('[data-clock="london"]').textContent = timeAt("Europe/London");
    root.querySelector('[data-clock="dubai"]').textContent = timeAt("Asia/Dubai");
    root.querySelector('[data-clock="tokyo"]').textContent = timeAt("Asia/Tokyo");
  }

  function updateCountdown() {
    let difference = targetUtc - Date.now();
    if (difference < 0) difference = 0;
    const values = {
      days: difference / 86400000,
      hours: (difference % 86400000) / 3600000,
      minutes: (difference % 3600000) / 60000,
      seconds: (difference % 60000) / 1000
    };
    Object.entries(values).forEach(([key, value]) => {
      root.querySelector(`[data-countdown="${key}"]`).textContent = pad(value);
    });
  }

  function clearTerminalTimers() {
    terminalTimers.forEach(clearTimeout);
    terminalTimers = [];
  }

  function resetTerminal() {
    clearTerminalTimers();
    [1, 2, 3].forEach(number => {
      root.querySelector(`[data-terminal="${number}"]`).className = "is-done";
    });
    root.querySelector('[data-terminal="4"]').className = "is-live";
    [5, 6, 7, 8].forEach(number => {
      root.querySelector(`[data-terminal="${number}"]`).className = "";
    });
  }

  function runTerminal() {
    [5, 6, 7, 8].forEach((number, index) => {
      terminalTimers.push(setTimeout(() => {
        root.querySelector(`[data-terminal="${number - 1}"]`).className = "is-done";
        root.querySelector(`[data-terminal="${number}"]`).className = "is-live";
        impact(index === 3 ? 0.25 : 0.12);
      }, (index + 1) * 950));
    });
    terminalTimers.push(setTimeout(() => {
      root.querySelector('[data-terminal="8"]').className = "is-done";
    }, 5200));
  }

  function startProgress(index, duration) {
    clearInterval(progressTimer);
    const bar = root.querySelector(`[data-progress="${index}"]`);
    root.querySelectorAll("[data-progress]").forEach(item => item.style.width = "0%");
    const started = performance.now();
    progressTimer = setInterval(() => {
      const percentage = Math.min(100, ((performance.now() - started) / duration) * 100);
      bar.style.width = `${percentage}%`;
      if (percentage >= 100) clearInterval(progressTimer);
    }, 40);
  }

  function showScene(index) {
    scenes.forEach((scene, sceneIndex) => {
      scene.classList.remove("is-active", "is-out");
      if (sceneIndex === index) scene.classList.add("is-active");
    });
    startProgress(index, durations[index]);
    if (index === 1) runTerminal();
    if (index === 5) {
      updateClocks();
      updateCountdown();
      clearInterval(clockTimer);
      clockTimer = setInterval(() => {
        updateClocks();
        updateCountdown();
      }, 1000);
    }
    impact(index === 4 ? 0.4 : 0.16);
  }

  function nextScene() {
    if (current >= scenes.length - 1) return;
    scenes[current].classList.add("is-out");
    setTimeout(() => {
      current += 1;
      showScene(current);
      if (current < scenes.length - 1) sceneTimer = setTimeout(nextScene, durations[current]);
    }, 650);
  }

  function startFilm() {
    clearTimeout(sceneTimer);
    clearInterval(progressTimer);
    clearInterval(clockTimer);
    resetTerminal();
    current = 0;
    showScene(0);
    sceneTimer = setTimeout(nextScene, durations[0]);
  }

  function ensureAudio() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioMaster = audioContext.createGain();
      audioMaster.gain.value = 0.3;
      audioMaster.connect(audioContext.destination);
    }
    if (audioContext.state === "suspended") audioContext.resume();
  }

  function oscillator(type, frequency, gain, start, duration) {
    const osc = audioContext.createOscillator();
    const volume = audioContext.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    volume.gain.setValueAtTime(0, start);
    volume.gain.linearRampToValueAtTime(gain, start + 0.04);
    volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(volume);
    volume.connect(audioMaster);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  function impact(level = 0.18) {
    if (!audioContext || !soundOn) return;
    const now = audioContext.currentTime;
    oscillator("sine", 58, level, now, 0.55);
    oscillator("sine", 34, level * 0.7, now, 0.8);
  }

  function tick() {
    if (!audioContext || !soundOn) return;
    const now = audioContext.currentTime;
    oscillator("square", 260, 0.025, now, 0.055);
    oscillator("sine", 48, 0.08, now, 0.23);
  }

  function chord(rootFrequency, start, duration, gain = 0.03) {
    [1, 1.25, 1.5, 2].forEach((multiplier, index) => {
      oscillator(index % 2 ? "triangle" : "sine", rootFrequency * multiplier, gain / (index + 1), start, duration);
    });
  }

  function soundtrackLoop() {
    if (!soundOn) return;
    ensureAudio();
    const now = audioContext.currentTime + 0.05;
    chord(55, now, 14, 0.065);
    chord(65.4, now + 8, 14, 0.05);
    chord(73.4, now + 16, 14, 0.055);
    chord(82.4, now + 24, 14, 0.06);
    for (let index = 0; index < 64; index += 1) audioTimers.push(setTimeout(tick, index * 500));
    audioTimers.push(
      setTimeout(() => impact(0.3), 15000),
      setTimeout(() => impact(0.45), 30000),
      setTimeout(soundtrackLoop, 32000)
    );
  }

  function startSound() {
    if (soundOn) return;
    ensureAudio();
    soundOn = true;
    soundButton.textContent = "■ SOUND";
    soundButton.setAttribute("aria-pressed", "true");
    soundtrackLoop();
  }

  function stopSound() {
    soundOn = false;
    audioTimers.forEach(clearTimeout);
    audioTimers = [];
    soundButton.textContent = "▶ SOUND";
    soundButton.setAttribute("aria-pressed", "false");
  }

  soundButton.addEventListener("click", () => {
    soundOn ? stopSound() : startSound();
  });

  enterButton.addEventListener("click", () => {
    stage.classList.add("has-entered");
    startSound();
    startFilm();
  });

  updateClocks();
  updateCountdown();
  startFilm();
})();
