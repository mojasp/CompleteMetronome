import { createMetronomeAudio } from "./audio.js";
import { createUI } from "./ui.js";

const tempoValue = document.getElementById("tempo-value");
const tempoWheelValue = document.getElementById("tempo-wheel-value");
const tempoUp = document.getElementById("tempo-up");
const tempoDown = document.getElementById("tempo-down");
const tempoBlock = document.getElementById("tempo-block");
const tempoWheel = document.getElementById("tempo-wheel");
const soundProfileSelect = document.getElementById("sound-profile");
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

const SOUND_PROFILES = [
  {
    label: "Bright",
    accent: { type: "square", frequency: 1400, volume: 0.22, decay: 0.04, duration: 0.05 },
    regular: { type: "square", frequency: 900, volume: 0.16, decay: 0.04, duration: 0.05 },
  },
  {
    label: "Wood",
    accent: { type: "triangle", frequency: 1200, volume: 0.18, decay: 0.05, duration: 0.06 },
    regular: { type: "triangle", frequency: 760, volume: 0.13, decay: 0.05, duration: 0.06 },
  },
  {
    label: "Soft",
    accent: { type: "sine", frequency: 1100, volume: 0.2, decay: 0.08, duration: 0.09 },
    regular: { type: "sine", frequency: 720, volume: 0.14, decay: 0.08, duration: 0.09 },
  },
  {
    label: "Sharp",
    accent: { type: "square", frequency: 1800, volume: 0.2, decay: 0.03, duration: 0.04 },
    regular: { type: "square", frequency: 1200, volume: 0.13, decay: 0.03, duration: 0.04 },
  },
];

const BPM_MIN = 20;
const BPM_MAX = 300;
const BPM_PER_DEGREE = 0.25;

const state = {
  bpm: 120,
  isPlaying: false,
  timeSignatureIndex: 0,
  subdivisionIndex: 0,
  soundProfileIndex: 0,
  activeIndex: 0,
  soundStates: [],
};

const ui = createUI({
  tempoValue,
  tempoWheelValue,
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
  updateWheelDisplay();
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
    soundProfile: SOUND_PROFILES[state.soundProfileIndex],
  });
}

async function startPlayback() {
  const timeSignature = TIME_SIGNATURES[state.timeSignatureIndex];
  const subdivision = SUBDIVISIONS[state.subdivisionIndex];

  await audio.start({
    bpm: state.bpm,
    beatsPerBar: timeSignature.beatsPerBar,
    subdivisionsPerBeat: subdivision.perBeat,
    soundProfile: SOUND_PROFILES[state.soundProfileIndex],
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
  setTempo(state.bpm + delta);
}

function setTempo(nextBpm) {
  state.bpm = Math.min(BPM_MAX, Math.max(BPM_MIN, nextBpm));
  updateAudioSettings();
  render();
}

function setSoundProfile(nextIndex) {
  state.soundProfileIndex = Math.max(0, Math.min(SOUND_PROFILES.length - 1, nextIndex));
  updateAudioSettings();
  render();
}

function angleFromPointer(event, element) {
  const rect = element.getBoundingClientRect();
  const x = event.clientX - (rect.left + rect.width / 2);
  const y = event.clientY - (rect.top + rect.height / 2);
  const angle = Math.atan2(y, x) * (180 / Math.PI);
  return (angle + 450) % 360;
}

function normalizeAngleDelta(delta) {
  if (delta > 180) {
    return delta - 360;
  }
  if (delta < -180) {
    return delta + 360;
  }
  return delta;
}

function updateWheelDisplay() {
  tempoWheel.setAttribute("aria-valuenow", String(state.bpm));
}

function attachWheelControls() {
  if (!window.matchMedia("(max-width: 720px)").matches) {
    return;
  }

  let isActive = false;
  let lastAngle = 0;

  const handlePointer = (event) => {
    if (!isActive) {
      return;
    }
    event.preventDefault();
    const angle = angleFromPointer(event, tempoWheel);
    const delta = normalizeAngleDelta(angle - lastAngle);
    lastAngle = angle;
    if (Math.abs(delta) < 0.1) {
      return;
    }
    setTempo(state.bpm + Math.round(delta * BPM_PER_DEGREE));
  };

  const handlePointerUp = (event) => {
    if (!isActive) {
      return;
    }
    tempoWheel.releasePointerCapture(event.pointerId);
    isActive = false;
  };

  tempoWheel.addEventListener("pointerdown", (event) => {
    isActive = true;
    tempoWheel.setPointerCapture(event.pointerId);
    lastAngle = angleFromPointer(event, tempoWheel);
    handlePointer(event);
  });
  tempoWheel.addEventListener("pointermove", handlePointer);
  tempoWheel.addEventListener("pointerup", handlePointerUp);
  tempoWheel.addEventListener("pointercancel", handlePointerUp);
}

function setupControls() {
  ui.populateSelect(timeSignatureSelect, TIME_SIGNATURES);
  ui.populateSelect(subdivisionSelect, SUBDIVISIONS);
  ui.populateSelect(soundProfileSelect, SOUND_PROFILES);
  ui.setSelectValue(timeSignatureSelect, state.timeSignatureIndex);
  ui.setSelectValue(subdivisionSelect, state.subdivisionIndex);
  ui.setSelectValue(soundProfileSelect, state.soundProfileIndex);

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

  attachWheelControls();

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

  soundProfileSelect.addEventListener("change", (event) => {
    setSoundProfile(Number(event.target.value));
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
