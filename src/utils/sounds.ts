// Web Audio API sound effects for Ludo game

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

export function playDiceRollSound(durationMs = 600) {
  const ctx = getAudioContext();
  const duration = durationMs / 1000;

  // Create noise buffer for dice rattle
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    // Rattling noise with amplitude envelope
    const t = i / bufferSize;
    const envelope = Math.pow(1 - t, 0.5) * 0.3;
    // Add some rhythmic "clicks" to simulate dice bouncing
    const clickRate = 15 + t * 30;
    const click = Math.sin(i / (ctx.sampleRate / clickRate / (2 * Math.PI))) > 0.7 ? 1 : 0;
    data[i] = (Math.random() * 2 - 1) * envelope * (0.3 + click * 0.7);
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 2000;
  filter.Q.value = 1;

  source.connect(filter);
  filter.connect(ctx.destination);
  source.start();
}

export function playTokenMoveSound() {
  const ctx = getAudioContext();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.08);

  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.12);
}

export function playTokenKillSound() {
  const ctx = getAudioContext();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(400, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);

  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.3);
}

export function playCaptureSound() {
  const ctx = getAudioContext();

  // Impact hit
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = "square";
  osc1.frequency.setValueAtTime(300, ctx.currentTime);
  osc1.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.15);
  gain1.gain.setValueAtTime(0.25, ctx.currentTime);
  gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start();
  osc1.stop(ctx.currentTime + 0.2);

  // Crunch noise
  const bufferSize = ctx.sampleRate * 0.15;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const t = i / bufferSize;
    data[i] = (Math.random() * 2 - 1) * 0.3 * Math.pow(1 - t, 2);
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(ctx.destination);
  src.start(ctx.currentTime + 0.05);
}

export function playHomeFinishSound() {
  const ctx = getAudioContext();
  const t = ctx.currentTime;

  // Ascending chime sequence
  const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const start = t + i * 0.1;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.15, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.25);
  });
}
