import { createMetronomeAudio } from "./audio.js";
import { createUI } from "./ui.js";
import type { SoundProfile, SoundState } from "./types.js";

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element: ${id}`);
  }
  return element as T;
}

const tempoValue = getElement<HTMLElement>("tempo-value");
const tempoInput = getElement<HTMLInputElement>("tempo-input");
const tempoWheelValue = getElement<HTMLElement>("tempo-wheel-value");
const tempoUp = getElement<HTMLButtonElement>("tempo-up");
const tempoDown = getElement<HTMLButtonElement>("tempo-down");
const tempoBlock = getElement<HTMLDivElement>("tempo-block");
const tempoDisplay = getElement<HTMLDivElement>("tempo-display");
const tempoWheel = getElement<HTMLDivElement>("tempo-wheel");
const soundProfileSelect = getElement<HTMLSelectElement>("sound-profile");
const togglePlay = getElement<HTMLButtonElement>("toggle-play");
const timeSignatureSelect = getElement<HTMLSelectElement>("time-signature");
const subdivisionSelect = getElement<HTMLSelectElement>("subdivision");
const subdivisionGrid = getElement<HTMLDivElement>("subdivision-grid");

type TimeSignature = {
  label: string;
  beatsPerBar: number;
  noteValue: number;
};

type Subdivision = {
  label: string;
  perBeat: number;
};

type SoundProfileOption = SoundProfile & { label: string };

const TIME_SIGNATURES: TimeSignature[] = [
  { label: "4/4", beatsPerBar: 4, noteValue: 4 },
  { label: "2/4", beatsPerBar: 2, noteValue: 4 },
  { label: "3/4", beatsPerBar: 3, noteValue: 4 },
  { label: "5/4", beatsPerBar: 5, noteValue: 4 },
  { label: "6/8", beatsPerBar: 6, noteValue: 8 },
  { label: "7/8", beatsPerBar: 7, noteValue: 8 },
];

const SUBDIVISIONS: Subdivision[] = [
  { label: "Quarter", perBeat: 1 },
  { label: "Eighth", perBeat: 2 },
  { label: "Triplet", perBeat: 3 },
  { label: "Sixteenth", perBeat: 4 },
];

const SOUND_PROFILES: SoundProfileOption[] = [
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

type MetronomeState = {
  bpm: number;
  isPlaying: boolean;
  timeSignatureIndex: number;
  subdivisionIndex: number;
  soundProfileIndex: number;
  activeIndex: number;
  soundStates: SoundState[];
};

const state: MetronomeState = {
  bpm: 120,
  isPlaying: false,
  timeSignatureIndex: 0,
  subdivisionIndex: 0,
  soundProfileIndex: 1,
  activeIndex: 0,
  soundStates: [],
};

const ui = createUI({
  tempoValue,
  tempoInput,
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
  const nextStates: SoundState[] = [];
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
    onTick: (tickIndex: number) => {
      state.activeIndex = tickIndex;
      render();
    },
    getSoundState: (tickIndex: number) => state.soundStates[tickIndex] || "mute",
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

function adjustTempo(delta: number) {
  setTempo(state.bpm + delta);
}

function setTempo(nextBpm: number) {
  state.bpm = Math.min(BPM_MAX, Math.max(BPM_MIN, nextBpm));
  updateAudioSettings();
  render();
}

function setSoundProfile(nextIndex: number) {
  state.soundProfileIndex = Math.max(0, Math.min(SOUND_PROFILES.length - 1, nextIndex));
  updateAudioSettings();
  render();
}

function angleFromPointer(event: PointerEvent, element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const x = event.clientX - (rect.left + rect.width / 2);
  const y = event.clientY - (rect.top + rect.height / 2);
  const angle = Math.atan2(y, x) * (180 / Math.PI);
  return (angle + 450) % 360;
}

function normalizeAngleDelta(delta: number) {
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

  const handlePointer = (event: PointerEvent) => {
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

  const handlePointerUp = (event: PointerEvent) => {
    if (!isActive) {
      return;
    }
    tempoWheel.releasePointerCapture(event.pointerId);
    isActive = false;
  };

  tempoWheel.addEventListener("pointerdown", (event: PointerEvent) => {
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

  const tempoInputMedia = window.matchMedia("(max-width: 720px)");

  const beginTempoEdit = () => {
    if (tempoInputMedia.matches) {
      return;
    }
    tempoDisplay.classList.add("is-editing");
    tempoInput.value = String(state.bpm);
    tempoInput.focus();
    tempoInput.select();
  };

  const endTempoEdit = (commit: boolean) => {
    if (!tempoDisplay.classList.contains("is-editing")) {
      return;
    }
    if (commit) {
      const nextValue = Number(tempoInput.value);
      if (Number.isFinite(nextValue)) {
        setTempo(Math.round(nextValue));
      }
    }
    tempoDisplay.classList.remove("is-editing");
    tempoInput.value = String(state.bpm);
  };

  tempoValue.addEventListener("click", beginTempoEdit);
  tempoInput.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      endTempoEdit(true);
    } else if (event.key === "Escape") {
      event.preventDefault();
      endTempoEdit(false);
    }
  });
  tempoInput.addEventListener("blur", () => endTempoEdit(true));

  tempoBlock.addEventListener("wheel", (event: WheelEvent) => {
    event.preventDefault();
    adjustTempo(event.deltaY > 0 ? -1 : 1);
  });

  attachWheelControls();

  togglePlay.addEventListener("click", () => {
    void togglePlayback();
  });

  timeSignatureSelect.addEventListener("change", (event: Event) => {
    const target = event.target as HTMLSelectElement | null;
    if (!target) {
      return;
    }
    state.timeSignatureIndex = Number(target.value);
    initSoundStates();
    updateAudioSettings();
    render();
  });

  subdivisionSelect.addEventListener("change", (event: Event) => {
    const target = event.target as HTMLSelectElement | null;
    if (!target) {
      return;
    }
    state.subdivisionIndex = Number(target.value);
    initSoundStates();
    updateAudioSettings();
    render();
  });

  soundProfileSelect.addEventListener("change", (event: Event) => {
    const target = event.target as HTMLSelectElement | null;
    if (!target) {
      return;
    }
    setSoundProfile(Number(target.value));
  });

  subdivisionGrid.addEventListener("click", (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }
    const index = Number(target.dataset.index);
    state.soundStates[index] = ui.nextSoundState(state.soundStates[index]);
    render();
  });

  document.addEventListener("keydown", (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName;
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
