let ctx: AudioContext | null = null;
let lastAt = 0;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  return ctx;
}

export function unlockChime() {
  const c = audio();
  if (c?.state === "suspended") void c.resume();
}

function strike(c: AudioContext, at: number, freq: number, peak: number, life: number) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  const filter = c.createBiquadFilter();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, at);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2200, at);
  filter.Q.setValueAtTime(0.7, at);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + life);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);
  osc.start(at);
  osc.stop(at + life + 0.05);
}

/** Soft two-note desk bell. One chime per burst, even if several rules trip. */
export function playTripChime() {
  const c = audio();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  const now = c.currentTime;
  if (now - lastAt < 0.8) return;
  lastAt = now;
  // C5 then E5 — short, warm, not an alarm.
  strike(c, now, 523.25, 0.07, 0.55);
  strike(c, now + 0.08, 659.25, 0.055, 0.62);
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
