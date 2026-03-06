/* ============================================================
   audio.js — Synthesized sound effects via Web Audio API
   No external audio files needed — all sounds generated in code.
   ============================================================ */

const AudioManager = (() => {
  let ctx = null;
  let enabled = true;
  let volume = 0.3;

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // ── Utility: play a simple tone ──
  function playTone(freq, duration, type = 'sine', vol = volume, detune = 0) {
    if (!enabled) return;
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    gain.gain.setValueAtTime(vol * 0.5, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + duration);
  }

  // ── Utility: noise burst ──
  function playNoise(duration, vol = volume * 0.15) {
    if (!enabled) return;
    const c = getCtx();
    const bufferSize = c.sampleRate * duration;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }
    const source = c.createBufferSource();
    source.buffer = buffer;
    const gain = c.createGain();
    gain.gain.value = vol;
    source.connect(gain);
    gain.connect(c.destination);
    source.start();
  }

  return {
    // Click — short snappy blip
    click() {
      playTone(880, 0.08, 'square', volume * 0.15);
      playTone(1200, 0.04, 'sine', volume * 0.1);
    },

    // Critical hit — dramatic double blip
    crit() {
      playTone(1200, 0.1, 'sawtooth', volume * 0.2);
      setTimeout(() => playTone(1600, 0.15, 'square', volume * 0.25), 50);
    },

    // Level up — ascending arpeggio
    levelUp() {
      [523, 659, 784, 1047].forEach((freq, i) => {
        setTimeout(() => playTone(freq, 0.2, 'sine', volume * 0.25), i * 80);
      });
    },

    // Achievement — triumphant chord
    achievement() {
      playTone(523, 0.4, 'sine', volume * 0.2);
      playTone(659, 0.4, 'sine', volume * 0.2);
      playTone(784, 0.4, 'sine', volume * 0.2);
      setTimeout(() => {
        playTone(1047, 0.5, 'sine', volume * 0.25);
      }, 200);
    },

    // Purchase — kaching
    purchase() {
      playTone(1500, 0.06, 'square', volume * 0.15);
      setTimeout(() => playTone(2000, 0.1, 'sine', volume * 0.2), 60);
    },

    // Error / can't afford — low buzz
    error() {
      playTone(200, 0.15, 'sawtooth', volume * 0.15);
      setTimeout(() => playTone(160, 0.12, 'sawtooth', volume * 0.12), 80);
    },

    // Incident alert — alarm
    incident() {
      playTone(800, 0.15, 'square', volume * 0.25);
      setTimeout(() => playTone(600, 0.15, 'square', volume * 0.25), 180);
      setTimeout(() => playTone(800, 0.15, 'square', volume * 0.25), 360);
    },

    // Promotion — epic ascending fanfare
    promotion() {
      const notes = [392, 494, 587, 659, 784, 988, 1175];
      notes.forEach((freq, i) => {
        setTimeout(() => playTone(freq, 0.35, 'sine', volume * 0.3), i * 100);
      });
    },

    // Recruit hero — welcome chime
    recruit() {
      playTone(659, 0.15, 'sine', volume * 0.2);
      setTimeout(() => playTone(784, 0.15, 'sine', volume * 0.2), 100);
      setTimeout(() => playTone(1047, 0.25, 'sine', volume * 0.25), 200);
    },

    // Minigame click — rapid tap
    minigameClick() {
      playTone(600 + Math.random() * 400, 0.04, 'square', volume * 0.1);
    },

    // Minigame success — celebration
    minigameWin() {
      [784, 988, 1175, 1318, 1568].forEach((f, i) => {
        setTimeout(() => playTone(f, 0.25, 'sine', volume * 0.3), i * 70);
      });
    },

    // Minigame fail — sad descend
    minigameFail() {
      [440, 392, 330, 262].forEach((f, i) => {
        setTimeout(() => playTone(f, 0.2, 'sine', volume * 0.2), i * 100);
      });
    },

    // Combo milestone (every 10x)
    comboMilestone() {
      playTone(1047, 0.08, 'sine', volume * 0.2);
      playTone(1318, 0.08, 'sine', volume * 0.15);
    },

    // Skill unlock
    skillUnlock() {
      playTone(523, 0.1, 'sine', volume * 0.2);
      setTimeout(() => playTone(784, 0.15, 'sine', volume * 0.2), 80);
      setTimeout(() => playTone(1047, 0.25, 'sine', volume * 0.25), 160);
    },

    // Getters/setters
    get enabled() { return enabled; },
    set enabled(v) { enabled = v; },
    get volume() { return volume; },
    set volume(v) { volume = Math.max(0, Math.min(1, v)); },
    toggle() { enabled = !enabled; return enabled; },
  };
})();

window.SFX = AudioManager;
