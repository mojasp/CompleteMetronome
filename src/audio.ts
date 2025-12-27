import type { SoundProfile, SoundProfileTone, SoundState } from "./types.js";

const DEFAULT_LOOKAHEAD_MS = 25;
const DEFAULT_SCHEDULE_AHEAD = 0.1;
const CLICK_GAIN_MULTIPLIER = 1;
const OUTPUT_GAIN = 1;
const COMPRESSOR_THRESHOLD = -10;
const COMPRESSOR_RATIO = 12;
const COMPRESSOR_KNEE = 12;
const COMPRESSOR_ATTACK = 0.003;
const COMPRESSOR_RELEASE = 0.18;
const LOUD_CLICK_DRIVE = 2.6;
const LOUD_CLICK_PRESENCE_DB = 6;
const LOUD_CLICK_HIGHPASS = 650;
const LOUD_CLICK_PRESENCE_HZ = 3200;
const DEFAULT_SAMPLED_CLICK_ID = "assets/click-sampled.wav";
const DEFAULT_SOUND_PROFILE: SoundProfile = {
  accent: { type: "triangle", frequency: 1200, volume: 0.18, decay: 0.055, duration: 0.07 },
  regular: { type: "triangle", frequency: 760, volume: 0.13, decay: 0.055, duration: 0.07 },
};

let loudClickCurve: Float32Array<ArrayBuffer> | null = null;
let sampleCache:
  | {
      ctx: AudioContext;
      buffers: Map<string, AudioBuffer>;
      inflight: Map<string, Promise<AudioBuffer>>;
    }
  | null = null;

function getLoudClickCurve() {
  if (loudClickCurve) {
    return loudClickCurve;
  }
  const samples = 1024;
  const curveBuffer = new ArrayBuffer(samples * Float32Array.BYTES_PER_ELEMENT);
  const curve = new Float32Array(curveBuffer);
  const amount = 2.2;
  for (let i = 0; i < samples; i += 1) {
    const x = (i * 2) / (samples - 1) - 1;
    curve[i] = Math.tanh(amount * x);
  }
  loudClickCurve = curve;
  return curve;
}

function getSampleCache(ctx: AudioContext) {
  if (!sampleCache || sampleCache.ctx !== ctx) {
    sampleCache = {
      ctx,
      buffers: new Map(),
      inflight: new Map(),
    };
  }
  return sampleCache;
}

function resolveSampleId(tone: SoundProfileTone) {
  return tone.sampleId ?? DEFAULT_SAMPLED_CLICK_ID;
}

function collectSampleIds(profile: SoundProfile | undefined) {
  if (!profile) {
    return [];
  }
  const ids = new Set<string>();
  const tones = [profile.accent, profile.regular];
  tones.forEach((tone) => {
    if (tone.preset === "sampled") {
      ids.add(resolveSampleId(tone));
    }
  });
  return Array.from(ids);
}

function getSampleBuffer(ctx: AudioContext, sampleId: string) {
  const cache = getSampleCache(ctx);
  return cache.buffers.get(sampleId) ?? null;
}

async function loadSampleBuffer(ctx: AudioContext, sampleId: string) {
  const cache = getSampleCache(ctx);
  const existing = cache.buffers.get(sampleId);
  if (existing) {
    return existing;
  }
  const inflight = cache.inflight.get(sampleId);
  if (inflight) {
    return inflight;
  }
  const promise = (async () => {
    const response = await fetch(sampleId);
    if (!response.ok) {
      throw new Error(`Failed to load sample: ${sampleId}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = await ctx.decodeAudioData(arrayBuffer);
    cache.buffers.set(sampleId, buffer);
    cache.inflight.delete(sampleId);
    return buffer;
  })().catch((error) => {
    cache.inflight.delete(sampleId);
    throw error;
  });
  cache.inflight.set(sampleId, promise);
  return promise;
}

async function preloadSampleBuffers(ctx: AudioContext, sampleIds: string[]) {
  if (!sampleIds.length) {
    return;
  }
  await Promise.all(sampleIds.map((sampleId) => loadSampleBuffer(ctx, sampleId)));
}

function createLoudClick(
  audioCtx: AudioContext,
  time: number,
  tone: SoundProfileTone,
  outputNode: AudioNode,
  noiseBuffer: AudioBuffer,
) {
  const decay = tone.decay ?? 0.03;
  const duration = tone.duration ?? 0.05;
  const baseFrequency = tone.frequency ?? 2400;
  const baseGain = (tone.volume ?? 0.22) * CLICK_GAIN_MULTIPLIER;

  const clickBus = audioCtx.createGain();
  clickBus.gain.setValueAtTime(1, time);

  const toneGain = audioCtx.createGain();
  toneGain.gain.setValueAtTime(0.0001, time);
  toneGain.gain.exponentialRampToValueAtTime(baseGain * 1.4, time + 0.0012);
  toneGain.gain.exponentialRampToValueAtTime(0.0001, time + Math.max(0.018, decay));

  const osc = audioCtx.createOscillator();
  osc.type = tone.type ?? "square";
  osc.frequency.setValueAtTime(baseFrequency * 1.2, time);
  osc.frequency.exponentialRampToValueAtTime(baseFrequency, time + 0.018);
  osc.connect(toneGain).connect(clickBus);
  osc.start(time);
  osc.stop(time + duration);

  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = noiseBuffer;

  const snapFilter = audioCtx.createBiquadFilter();
  snapFilter.type = "bandpass";
  snapFilter.frequency.setValueAtTime(baseFrequency * 1.6, time);
  snapFilter.Q.value = 0.9;

  const snapHighpass = audioCtx.createBiquadFilter();
  snapHighpass.type = "highpass";
  snapHighpass.frequency.setValueAtTime(1400, time);

  const snapGain = audioCtx.createGain();
  snapGain.gain.setValueAtTime(0.0001, time);
  snapGain.gain.exponentialRampToValueAtTime(baseGain * 1.15, time + 0.0006);
  snapGain.gain.exponentialRampToValueAtTime(0.0001, time + Math.min(0.012, decay));

  noiseSource.connect(snapFilter).connect(snapHighpass).connect(snapGain).connect(clickBus);
  noiseSource.start(time);
  noiseSource.stop(time + Math.min(0.02, duration));

  const highpass = audioCtx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.setValueAtTime(LOUD_CLICK_HIGHPASS, time);

  const drive = audioCtx.createGain();
  drive.gain.setValueAtTime(LOUD_CLICK_DRIVE, time);

  const shaper = audioCtx.createWaveShaper();
  shaper.curve = getLoudClickCurve();
  shaper.oversample = "4x";

  const presence = audioCtx.createBiquadFilter();
  presence.type = "peaking";
  presence.frequency.setValueAtTime(LOUD_CLICK_PRESENCE_HZ, time);
  presence.Q.value = 0.8;
  presence.gain.value = LOUD_CLICK_PRESENCE_DB;

  clickBus.connect(highpass).connect(drive).connect(shaper).connect(presence).connect(outputNode);
}

function createStackedClick(
  audioCtx: AudioContext,
  time: number,
  tone: SoundProfileTone,
  outputNode: AudioNode,
  noiseBuffer: AudioBuffer,
) {
  const decay = tone.decay ?? 0.03;
  const duration = tone.duration ?? 0.05;
  const baseFrequency = tone.frequency ?? 2100;
  const baseGain = (tone.volume ?? 0.22) * CLICK_GAIN_MULTIPLIER;

  const stackedGain = audioCtx.createGain();
  stackedGain.gain.setValueAtTime(0.0001, time);
  stackedGain.gain.exponentialRampToValueAtTime(baseGain * 1.35, time + 0.001);
  stackedGain.gain.exponentialRampToValueAtTime(0.0001, time + Math.max(0.02, decay));

  const partials = [
    { ratio: 1, gain: 0.6, detune: -6 },
    { ratio: 1.45, gain: 0.35, detune: 3 },
    { ratio: 2.2, gain: 0.25, detune: -2 },
    { ratio: 3.1, gain: 0.18, detune: 1 },
  ];

  partials.forEach(({ ratio, gain, detune }) => {
    const osc = audioCtx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(baseFrequency * ratio, time);
    osc.detune.setValueAtTime(detune, time);

    const oscGain = audioCtx.createGain();
    oscGain.gain.setValueAtTime(gain, time);
    osc.connect(oscGain).connect(stackedGain);
    osc.start(time);
    osc.stop(time + duration);
  });

  const sparkleOsc = audioCtx.createOscillator();
  sparkleOsc.type = "sine";
  sparkleOsc.frequency.setValueAtTime(baseFrequency * 4.4, time);

  const sparkleGain = audioCtx.createGain();
  sparkleGain.gain.setValueAtTime(0.0001, time);
  sparkleGain.gain.exponentialRampToValueAtTime(baseGain * 0.45, time + 0.0006);
  sparkleGain.gain.exponentialRampToValueAtTime(0.0001, time + Math.min(0.01, decay));
  sparkleOsc.connect(sparkleGain).connect(stackedGain);
  sparkleOsc.start(time);
  sparkleOsc.stop(time + Math.min(0.02, duration));

  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = noiseBuffer;

  const noiseBandpass = audioCtx.createBiquadFilter();
  noiseBandpass.type = "bandpass";
  noiseBandpass.frequency.setValueAtTime(baseFrequency * 2.6, time);
  noiseBandpass.Q.value = 1.4;

  const noiseHighpass = audioCtx.createBiquadFilter();
  noiseHighpass.type = "highpass";
  noiseHighpass.frequency.setValueAtTime(1200, time);

  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0.0001, time);
  noiseGain.gain.exponentialRampToValueAtTime(baseGain * 0.7, time + 0.0005);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + Math.min(0.014, decay));

  noiseSource.connect(noiseBandpass).connect(noiseHighpass).connect(noiseGain).connect(stackedGain);
  noiseSource.start(time);
  noiseSource.stop(time + Math.min(0.02, duration));

  stackedGain.connect(outputNode);
}

function createSampledClick(
  audioCtx: AudioContext,
  time: number,
  tone: SoundProfileTone,
  outputNode: AudioNode,
) {
  const sampleId = resolveSampleId(tone);
  const buffer = getSampleBuffer(audioCtx, sampleId);
  if (!buffer) {
    return;
  }
  const gainValue = (tone.volume ?? 1) * CLICK_GAIN_MULTIPLIER;
  const gainNode = audioCtx.createGain();
  gainNode.gain.setValueAtTime(gainValue, time);

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(gainNode).connect(outputNode);
  source.start(time);
}

function createClick(
  audioCtx: AudioContext,
  time: number,
  variant: SoundState,
  soundProfile: SoundProfile | undefined,
  outputNode: AudioNode,
  noiseBuffer: AudioBuffer,
) {
  if (variant === "mute") {
    return;
  }

  const profile = soundProfile || DEFAULT_SOUND_PROFILE;
  const tone = variant === "A" ? profile.accent : profile.regular;
  if (tone.preset === "sampled") {
    createSampledClick(audioCtx, time, tone, outputNode);
    return;
  }
  if (tone.preset === "loud") {
    createLoudClick(audioCtx, time, tone, outputNode, noiseBuffer);
    return;
  }
  if (tone.preset === "stacked") {
    createStackedClick(audioCtx, time, tone, outputNode, noiseBuffer);
    return;
  }
  const decay = tone.decay ?? 0.04;
  const duration = tone.duration ?? 0.05;

  const baseFrequency = tone.frequency ?? 900;
  const baseGain = (tone.volume ?? 0.16) * CLICK_GAIN_MULTIPLIER;
  const bodyDecay = Math.max(decay, 0.03);
  const bodyDuration = Math.max(duration, 0.05);

  const bodyGain = audioCtx.createGain();
  bodyGain.gain.setValueAtTime(0.0001, time);
  bodyGain.gain.exponentialRampToValueAtTime(baseGain, time + 0.003);
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, time + bodyDecay);

  const oscPrimary = audioCtx.createOscillator();
  oscPrimary.type = tone.type ?? "triangle";
  oscPrimary.frequency.setValueAtTime(baseFrequency * 1.08, time);
  oscPrimary.frequency.exponentialRampToValueAtTime(baseFrequency, time + 0.03);

  const oscBody = audioCtx.createOscillator();
  oscBody.type = "sine";
  oscBody.frequency.setValueAtTime(baseFrequency * 0.5, time);
  oscBody.frequency.exponentialRampToValueAtTime(baseFrequency * 0.45, time + 0.04);

  oscPrimary.connect(bodyGain);
  oscBody.connect(bodyGain);
  bodyGain.connect(outputNode);

  oscPrimary.start(time);
  oscBody.start(time);
  oscPrimary.stop(time + bodyDuration);
  oscBody.stop(time + bodyDuration);

  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = noiseBuffer;

  const noiseFilter = audioCtx.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.setValueAtTime(baseFrequency * 3.2, time);
  noiseFilter.Q.value = 1.1;

  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0.0001, time);
  noiseGain.gain.exponentialRampToValueAtTime(baseGain * 0.55, time + 0.001);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + Math.min(0.02, bodyDecay));

  noiseSource.connect(noiseFilter).connect(noiseGain).connect(outputNode);
  noiseSource.start(time);
  noiseSource.stop(time + Math.min(0.03, bodyDuration));
}

type StartOptions = {
  bpm: number;
  beatsPerBar: number;
  subdivisionsPerBeat: number;
  soundProfile: SoundProfile;
  volume: number;
  onTick: (tickIndex: number) => void;
  getSoundState: (tickIndex: number) => SoundState;
};

type UpdateOptions = Partial<{
  bpm: number;
  beatsPerBar: number;
  subdivisionsPerBeat: number;
  soundProfile: SoundProfile;
  volume: number;
}>;

type MetronomeAudio = {
  start: (options: StartOptions) => Promise<void>;
  stop: () => void;
  resume: () => Promise<void>;
  update: (options: UpdateOptions) => void;
};

export function createMetronomeAudio(): MetronomeAudio {
  let audioCtx: AudioContext | null = null;
  let timerId: ReturnType<typeof setInterval> | null = null;
  let nextNoteTime = 0;
  let currentTick = 0;
  let bpm = 120;
  let beatsPerBar = 4;
  let subdivisionsPerBeat = 1;
  let soundProfile = DEFAULT_SOUND_PROFILE;
  let volume = 1;
  let onTick: (tickIndex: number) => void = () => {};
  let getSoundState: (tickIndex: number) => SoundState = () => "mute";
  let pendingTickTimeouts: Array<ReturnType<typeof setTimeout>> = [];
  let outputNode: AudioNode | null = null;
  let masterGain: GainNode | null = null;
  let compressor: DynamicsCompressorNode | null = null;
  let noiseBuffer: AudioBuffer | null = null;
  const AudioContextCtor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  function getNoiseBuffer(ctx: AudioContext) {
    if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) {
      return noiseBuffer;
    }
    const length = Math.floor(ctx.sampleRate * 0.03);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    noiseBuffer = buffer;
    return buffer;
  }

  function applyVolume() {
    if (!masterGain) {
      return;
    }
    masterGain.gain.value = OUTPUT_GAIN * volume;
    if (!compressor) {
      return;
    }
    outputNode = volume > 1 ? compressor : masterGain;
  }

  function ensureAudioContext() {
    if (audioCtx) {
      return audioCtx;
    }
    if (!AudioContextCtor) {
      throw new Error("Web Audio API not supported.");
    }
    audioCtx = new AudioContextCtor();
    compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.value = COMPRESSOR_THRESHOLD;
    compressor.ratio.value = COMPRESSOR_RATIO;
    compressor.knee.value = COMPRESSOR_KNEE;
    compressor.attack.value = COMPRESSOR_ATTACK;
    compressor.release.value = COMPRESSOR_RELEASE;

    masterGain = audioCtx.createGain();
    applyVolume();
    compressor.connect(masterGain).connect(audioCtx.destination);
    outputNode = masterGain;
    return audioCtx;
  }

  function secondsPerSubdivision() {
    return (60 / bpm) / subdivisionsPerBeat;
  }

  function scheduleTick() {
    const ctx = audioCtx;
    if (!ctx) {
      return;
    }

    while (nextNoteTime < ctx.currentTime + DEFAULT_SCHEDULE_AHEAD) {
      const soundState = getSoundState(currentTick);
      if (outputNode) {
        createClick(ctx, nextNoteTime, soundState, soundProfile, outputNode, getNoiseBuffer(ctx));
      }
      const tickToSend = currentTick;
      const tickTime = nextNoteTime;

      const delayMs = Math.max(0, (tickTime - ctx.currentTime) * 1000);
      const timeoutId = setTimeout(() => onTick(tickToSend), delayMs);
      pendingTickTimeouts.push(timeoutId);

      nextNoteTime += secondsPerSubdivision();
      currentTick = (currentTick + 1) % (beatsPerBar * subdivisionsPerBeat);
    }
  }

  return {
    async start({
      bpm: nextBpm,
      beatsPerBar: nextBeatsPerBar,
      subdivisionsPerBeat: nextSubdivisions,
      soundProfile: nextSoundProfile,
      volume: nextVolume,
      onTick: nextOnTick,
      getSoundState: nextSoundState,
    }: StartOptions) {
      const ctx = ensureAudioContext();
      if (ctx.state === "suspended" || ctx.state === "interrupted") {
        await ctx.resume();
      }
      try {
        await preloadSampleBuffers(ctx, collectSampleIds(nextSoundProfile));
      } catch (error) {
        console.warn("Failed to preload sampled clicks.", error);
      }
      bpm = nextBpm;
      beatsPerBar = nextBeatsPerBar;
      subdivisionsPerBeat = nextSubdivisions;
      soundProfile = nextSoundProfile || soundProfile;
      volume = nextVolume ?? volume;
      applyVolume();
      onTick = nextOnTick;
      getSoundState = nextSoundState;

      currentTick = 0;
      nextNoteTime = ctx.currentTime + 0.12;
      pendingTickTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
      pendingTickTimeouts = [];

      timerId = setInterval(scheduleTick, DEFAULT_LOOKAHEAD_MS);
    },
    stop() {
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
      pendingTickTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
      pendingTickTimeouts = [];
    },
    async resume() {
      const ctx = ensureAudioContext();
      if (ctx.state === "suspended" || ctx.state === "interrupted") {
        await ctx.resume();
      }
    },
    update({
      bpm: nextBpm,
      beatsPerBar: nextBeats,
      subdivisionsPerBeat: nextSubdivs,
      soundProfile: nextSoundProfile,
      volume: nextVolume,
    }: UpdateOptions) {
      bpm = nextBpm ?? bpm;
      beatsPerBar = nextBeats ?? beatsPerBar;
      subdivisionsPerBeat = nextSubdivs ?? subdivisionsPerBeat;
      soundProfile = nextSoundProfile ?? soundProfile;
      volume = nextVolume ?? volume;
      applyVolume();
      if (audioCtx && nextSoundProfile) {
        void preloadSampleBuffers(audioCtx, collectSampleIds(nextSoundProfile)).catch((error) => {
          console.warn("Failed to preload sampled clicks.", error);
        });
      }
    },
  };
}
