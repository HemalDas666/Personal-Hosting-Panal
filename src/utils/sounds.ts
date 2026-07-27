let audioCtx: AudioContext | null = null;
let soundEnabled = true;

function getCtx() {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = "sine", volume = 0.15) {
  if (!soundEnabled) return;
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
}

export function playStartup() {
  playTone(523, 0.1);
  setTimeout(() => playTone(659, 0.1), 100);
  setTimeout(() => playTone(784, 0.15), 200);
}

export function playShutdown() {
  playTone(784, 0.1);
  setTimeout(() => playTone(659, 0.1), 100);
  setTimeout(() => playTone(523, 0.15), 200);
}

export function playSuccess() {
  playTone(880, 0.08);
  setTimeout(() => playTone(1108, 0.12), 80);
}

export function playError() {
  playTone(200, 0.15, "square", 0.1);
  setTimeout(() => playTone(180, 0.2, "square", 0.1), 150);
}

export function playPing() {
  playTone(1200, 0.05, "sine", 0.08);
}

export function playRestart() {
  playTone(440, 0.08, "triangle");
  setTimeout(() => playTone(550, 0.08, "triangle"), 100);
  setTimeout(() => playTone(660, 0.08, "triangle"), 200);
  setTimeout(() => playTone(880, 0.12, "triangle"), 300);
}
