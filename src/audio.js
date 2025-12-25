const DEFAULT_LOOKAHEAD_MS = 25;
const DEFAULT_SCHEDULE_AHEAD = 0.1;

function createClick(audioCtx, time, variant) {
  if (variant === "mute") {
    return;
  }

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const frequency = variant === "A" ? 1400 : 900;
  const volume = variant === "A" ? 0.22 : 0.16;

  osc.type = "square";
  osc.frequency.value = frequency;

  gain.gain.setValueAtTime(volume, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);

  osc.connect(gain).connect(audioCtx.destination);
  osc.start(time);
  osc.stop(time + 0.05);
}

export function createMetronomeAudio() {
  let audioCtx = null;
  let timerId = null;
  let nextNoteTime = 0;
  let currentTick = 0;
  let bpm = 120;
  let beatsPerBar = 4;
  let subdivisionsPerBeat = 1;
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
      createClick(audioCtx, nextNoteTime, soundState);
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
    update({ bpm: nextBpm, beatsPerBar: nextBeats, subdivisionsPerBeat: nextSubdivs }) {
      bpm = nextBpm ?? bpm;
      beatsPerBar = nextBeats ?? beatsPerBar;
      subdivisionsPerBeat = nextSubdivs ?? subdivisionsPerBeat;
    },
    setCallbacks({ onTick: nextOnTick, getSoundState: nextSoundState }) {
      onTick = nextOnTick ?? onTick;
      getSoundState = nextSoundState ?? getSoundState;
    },
  };
}
