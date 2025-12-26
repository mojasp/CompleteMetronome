import type { SoundProfile, SoundState } from "./types.js";

const DEFAULT_LOOKAHEAD_MS = 25;
const DEFAULT_SCHEDULE_AHEAD = 0.1;
const CLICK_GAIN_MULTIPLIER = 1;
const OUTPUT_GAIN = 1;
const COMPRESSOR_THRESHOLD = -10;
const COMPRESSOR_RATIO = 12;
const COMPRESSOR_KNEE = 12;
const COMPRESSOR_ATTACK = 0.003;
const COMPRESSOR_RELEASE = 0.18;
const DEFAULT_SOUND_PROFILE: SoundProfile = {
  accent: { type: "triangle", frequency: 1200, volume: 0.18, decay: 0.05, duration: 0.06 },
  regular: { type: "triangle", frequency: 760, volume: 0.13, decay: 0.05, duration: 0.06 },
};

function createClick(
  audioCtx: AudioContext,
  time: number,
  variant: SoundState,
  soundProfile: SoundProfile | undefined,
  outputNode: AudioNode,
) {
  if (variant === "mute") {
    return;
  }

  const profile = soundProfile || DEFAULT_SOUND_PROFILE;
  const tone = variant === "A" ? profile.accent : profile.regular;
  const decay = tone.decay ?? 0.04;
  const duration = tone.duration ?? 0.05;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = tone.type ?? "square";
  osc.frequency.value = tone.frequency ?? 900;

  const baseGain = tone.volume ?? 0.16;
  gain.gain.setValueAtTime(baseGain * CLICK_GAIN_MULTIPLIER, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + decay);

  osc.connect(gain).connect(outputNode);
  osc.start(time);
  osc.stop(time + duration);
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
  const AudioContextCtor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

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
        createClick(ctx, nextNoteTime, soundState, soundProfile, outputNode);
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
    },
  };
}
