const DEFAULT_LOOKAHEAD_MS = 25;
const DEFAULT_SCHEDULE_AHEAD = 0.1;
const DEFAULT_SOUND_PROFILE = {
  accent: { type: "square", frequency: 1400, volume: 0.22, decay: 0.04, duration: 0.05 },
  regular: { type: "square", frequency: 900, volume: 0.16, decay: 0.04, duration: 0.05 },
};

function createClick(audioCtx, time, variant, soundProfile) {
  if (variant === "mute") {
    return;
  }

  const profile = soundProfile || DEFAULT_SOUND_PROFILE;
  const tone = variant === "A" ? profile.accent : profile.regular;
  const decay = tone.decay ?? 0.04;
  const duration = tone.duration ?? 0.05;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = tone.type || "square";
  osc.frequency.value = tone.frequency || 900;

  gain.gain.setValueAtTime(tone.volume ?? 0.16, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + decay);

  osc.connect(gain).connect(audioCtx.destination);
  osc.start(time);
  osc.stop(time + duration);
}

export function createMetronomeAudio() {
  let audioCtx = null;
  let timerId = null;
  let nextNoteTime = 0;
  let currentTick = 0;
  let bpm = 120;
  let beatsPerBar = 4;
  let subdivisionsPerBeat = 1;
  let soundProfile = DEFAULT_SOUND_PROFILE;
  let onTick = () => {};
  let getSoundState = () => "mute";
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;

  function ensureAudioContext() {
    if (audioCtx) {
      return audioCtx;
    }
    if (!AudioContextCtor) {
      throw new Error("Web Audio API not supported.");
    }
    audioCtx = new AudioContextCtor();
    return audioCtx;
  }

  function secondsPerSubdivision() {
    return (60 / bpm) / subdivisionsPerBeat;
  }

  function scheduleTick() {
    if (!audioCtx) {
      return;
    }

    while (nextNoteTime < audioCtx.currentTime + DEFAULT_SCHEDULE_AHEAD) {
      const soundState = getSoundState(currentTick);
      createClick(audioCtx, nextNoteTime, soundState, soundProfile);
      const tickToSend = currentTick;
      const tickTime = nextNoteTime;

      const delayMs = Math.max(0, (tickTime - audioCtx.currentTime) * 1000);
      setTimeout(() => onTick(tickToSend), delayMs);

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
      onTick: nextOnTick,
      getSoundState: nextSoundState,
    }) {
      const ctx = ensureAudioContext();
      if (ctx.state === "suspended" || ctx.state === "interrupted") {
        await ctx.resume();
      }
      bpm = nextBpm;
      beatsPerBar = nextBeatsPerBar;
      subdivisionsPerBeat = nextSubdivisions;
      soundProfile = nextSoundProfile || soundProfile;
      onTick = nextOnTick;
      getSoundState = nextSoundState;

      currentTick = 0;
      nextNoteTime = audioCtx.currentTime + 0.05;

      timerId = setInterval(scheduleTick, DEFAULT_LOOKAHEAD_MS);
    },
    stop() {
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
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
    }) {
      bpm = nextBpm ?? bpm;
      beatsPerBar = nextBeats ?? beatsPerBar;
      subdivisionsPerBeat = nextSubdivs ?? subdivisionsPerBeat;
      soundProfile = nextSoundProfile ?? soundProfile;
    },
    setCallbacks({ onTick: nextOnTick, getSoundState: nextSoundState }) {
      onTick = nextOnTick ?? onTick;
      getSoundState = nextSoundState ?? getSoundState;
    },
  };
}
