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
  const gain = ctx.createGainNode();

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
