import { createMetronomeAudio } from "./audio.js";
import { createUI } from "./ui.js";

const tempoValue = document.getElementById("tempo-value");
const tempoUp = document.getElementById("tempo-up");
const tempoDown = document.getElementById("tempo-down");
const tempoBlock = document.getElementById("tempo-block");
const togglePlay = document.getElementById("toggle-play");
const timeSignatureSelect = document.getElementById("time-signature");
const subdivisionSelect = document.getElementById("subdivision");
const subdivisionGrid = document.getElementById("subdivision-grid");

const TIME_SIGNATURES = [
  { label: "4/4", beatsPerBar: 4, noteValue: 4 },
  { label: "2/4", beatsPerBar: 2, noteValue: 4 },
  { label: "3/4", beatsPerBar: 3, noteValue: 4 },
  { label: "5/4", beatsPerBar: 5, noteValue: 4 },
  { label: "6/8", beatsPerBar: 6, noteValue: 8 },
  { label: "7/8", beatsPerBar: 7, noteValue: 8 },
];

const SUBDIVISIONS = [
  { label: "Quarter", perBeat: 1 },
  { label: "Eighth", perBeat: 2 },
  { label: "Triplet", perBeat: 3 },
  { label: "Sixteenth", perBeat: 4 },
];

const state = {
  bpm: 120,
  isPlaying: false,
  timeSignatureIndex: 0,
  subdivisionIndex: 0,
  activeIndex: 0,
  soundStates: [],
};

const ui = createUI({
  tempoValue,
  tempoUp,
  tempoDown,
  togglePlay,
  timeSignatureSelect,
  subdivisionSelect,
  subdivisionGrid,
});

const audio = createMetronomeAudio();

function totalSubdivisions() {
  return (
    TIME_SIGNATURES[state.timeSignatureIndex].beatsPerBar *
    SUBDIVISIONS[state.subdivisionIndex].perBeat
  );
}

function initSoundStates() {
  const total = totalSubdivisions();
  const perBeat = SUBDIVISIONS[state.subdivisionIndex].perBeat;
  const nextStates = [];
  for (let i = 0; i < total; i += 1) {
    if (i === 0) {
      nextStates.push("A");
    } else if (i % perBeat === 0) {
      nextStates.push("B");
    } else {
      nextStates.push("B");
    }
  }
  state.soundStates = nextStates;
}

function render() {
  ui.setTempoDisplay(state.bpm);
  ui.setPlayState(state.isPlaying);
  ui.renderSubdivisionGrid({
    totalSubdivisions: totalSubdivisions(),
    subdivisionsPerBeat: SUBDIVISIONS[state.subdivisionIndex].perBeat,
    soundStates: state.soundStates,
    activeIndex: state.activeIndex,
  });
}

function updateAudioSettings() {
  const timeSignature = TIME_SIGNATURES[state.timeSignatureIndex];
  const subdivision = SUBDIVISIONS[state.subdivisionIndex];

  audio.update({
    bpm: state.bpm,
    beatsPerBar: timeSignature.beatsPerBar,
    subdivisionsPerBeat: subdivision.perBeat,
  });
}

async function startPlayback() {
  const timeSignature = TIME_SIGNATURES[state.timeSignatureIndex];
  const subdivision = SUBDIVISIONS[state.subdivisionIndex];

  await audio.start({
    bpm: state.bpm,
    beatsPerBar: timeSignature.beatsPerBar,
    subdivisionsPerBeat: subdivision.perBeat,
    onTick: (tickIndex) => {
      state.activeIndex = tickIndex;
      render();
    },
    getSoundState: (tickIndex) => state.soundStates[tickIndex] || "mute",
  });
}

async function togglePlayback() {
  if (state.isPlaying) {
    state.isPlaying = false;
    audio.stop();
    state.activeIndex = 0;
    render();
    return;
  }

  state.isPlaying = true;
  try {
    await startPlayback();
  } catch (error) {
    console.warn("Failed to start audio playback.", error);
    state.isPlaying = false;
  }
  render();
}

function adjustTempo(delta) {
  state.bpm = Math.min(300, Math.max(20, state.bpm + delta));
  updateAudioSettings();
  render();
}

function setupControls() {
  ui.populateSelect(timeSignatureSelect, TIME_SIGNATURES);
  ui.populateSelect(subdivisionSelect, SUBDIVISIONS);
  ui.setSelectValue(timeSignatureSelect, state.timeSignatureIndex);
  ui.setSelectValue(subdivisionSelect, state.subdivisionIndex);

  const unlockAudio = () => {
    void audio.resume();
  };
  ["pointerdown", "touchstart", "mousedown"].forEach((eventName) => {
    document.addEventListener(eventName, unlockAudio, {
      once: true,
      passive: true,
    });
  });

  tempoUp.addEventListener("click", () => adjustTempo(1));
  tempoDown.addEventListener("click", () => adjustTempo(-1));

  tempoBlock.addEventListener("wheel", (event) => {
    event.preventDefault();
    adjustTempo(event.deltaY > 0 ? -1 : 1);
  });

  togglePlay.addEventListener("click", () => {
    void togglePlayback();
  });

  timeSignatureSelect.addEventListener("change", (event) => {
    state.timeSignatureIndex = Number(event.target.value);
    initSoundStates();
    updateAudioSettings();
    render();
  });

  subdivisionSelect.addEventListener("change", (event) => {
    state.subdivisionIndex = Number(event.target.value);
    initSoundStates();
    updateAudioSettings();
    render();
  });

  subdivisionGrid.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }
    const index = Number(target.dataset.index);
    state.soundStates[index] = ui.nextSoundState(state.soundStates[index]);
    render();
  });

  document.addEventListener("keydown", (event) => {
    const tag = event.target?.tagName;
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") {
      return;
    }
    if (event.code === "Space") {
      event.preventDefault();
      togglePlayback();
      return;
    }
    if (event.key === "j") {
      adjustTempo(-1);
    } else if (event.key === "k") {
      adjustTempo(1);
    } else if (event.key === "J") {
      adjustTempo(-5);
    } else if (event.key === "K") {
      adjustTempo(5);
    }
  });
}

initSoundStates();
setupControls();
render();
