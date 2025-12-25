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
const tempoBlock = getElement<HTMLDivElement>("tempo-block");
const tempoDisplay = getElement<HTMLDivElement>("tempo-display");
const tempoWheel = getElement<HTMLDivElement>("tempo-wheel");
const soundProfileSelect = getElement<HTMLSelectElement>("sound-profile");
const togglePlay = getElement<HTMLButtonElement>("toggle-play");
const trainerDisclosure = getElement<HTMLButtonElement>("trainer-disclosure");
const trainerPanel = getElement<HTMLDivElement>("trainer-panel");
const trainerBarsSelect = getElement<HTMLSelectElement>("trainer-bars");
const trainerBpmSelect = getElement<HTMLSelectElement>("trainer-bpm");
const trainerSecondsSelect = getElement<HTMLSelectElement>("trainer-seconds");
const trainerSecondsBpmSelect = getElement<HTMLSelectElement>("trainer-seconds-bpm");
const randomMuteDisclosure = getElement<HTMLButtonElement>("random-mute-disclosure");
const randomMutePanel = getElement<HTMLDivElement>("random-mute-panel");
const randomMutePercentSelect = getElement<HTMLSelectElement>("random-mute-percent");
const randomMuteGradualToggle = getElement<HTMLInputElement>("random-mute-gradual");
const randomMuteCountInToggle = getElement<HTMLInputElement>("random-mute-countin");
const randomMuteCountInBarsSelect = getElement<HTMLSelectElement>("random-mute-countin-bars");
const accentDisclosure = getElement<HTMLButtonElement>("accent-disclosure");
const accentPanel = getElement<HTMLDivElement>("accent-panel");
const accentBarsSelect = getElement<HTMLSelectElement>("accent-bars");
const timeSignatureNumeratorSelect = getElement<HTMLSelectElement>("time-signature-numerator");
const timeSignatureDenominatorSelect = getElement<HTMLSelectElement>("time-signature-denominator");
const subdivisionSelect = getElement<HTMLSelectElement>("subdivision");
const subdivisionGrid = getElement<HTMLDivElement>("subdivision-grid");

type TimeSignature = {
  label: string;
  beatsPerBar: number;
};

type Subdivision = {
  label: string;
  perBeat: number;
};

type SoundProfileOption = SoundProfile & { label: string };

const MAX_NUMERATOR = 32;
const NUMERATORS = Array.from({ length: MAX_NUMERATOR - 1 }, (_, index) => index + 2);
const DENOMINATORS = [1, 2, 4, 8, 16];
const TIME_SIGNATURES: TimeSignature[] = NUMERATORS.map((beats) => ({
  label: String(beats),
  beatsPerBar: beats,
}));

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
const TRAINER_BARS = Array.from({ length: 12 }, (_, index) => index + 1);
const TRAINER_BPM_STEPS = [1, 2, 3, 4, 5, 8, 10];
const TRAINER_SECONDS = Array.from({ length: 36 }, (_, index) => (index + 1) * 10);
const ACCENT_BARS = Array.from({ length: 63 }, (_, index) => index + 2);
const RANDOM_MUTE_PERCENTS = Array.from({ length: 21 }, (_, index) => index * 5);
const RANDOM_MUTE_COUNTIN_BARS = Array.from({ length: 65 }, (_, index) => index);
const RANDOM_MUTE_RAMP_BARS = 16;

type MetronomeState = {
  bpm: number;
  isPlaying: boolean;
  timeSignatureNumeratorIndex: number;
  timeSignatureDenominatorIndex: number;
  subdivisionIndex: number;
  soundProfileIndex: number;
  activeIndex: number;
  soundStates: SoundState[];
  trainerBarsIndex: number;
  trainerBpmIndex: number;
  trainerSecondsIndex: number;
  trainerSecondsBpmIndex: number;
  trainerMode: "bars" | "seconds";
  trainerConfigured: boolean;
  trainerEnabled: boolean;
  barCount: number;
  accentBarsIndex: number;
  accentEnabled: boolean;
  accentConfigured: boolean;
  randomMutePercentIndex: number;
  randomMuteGradual: boolean;
  randomMuteCountInEnabled: boolean;
  randomMuteCountInBarsIndex: number;
  randomMuteEnabled: boolean;
  randomMuteConfigured: boolean;
};

const state: MetronomeState = {
  bpm: 120,
  isPlaying: false,
  timeSignatureNumeratorIndex: NUMERATORS.indexOf(4),
  timeSignatureDenominatorIndex: DENOMINATORS.indexOf(4),
  subdivisionIndex: 0,
  soundProfileIndex: 1,
  activeIndex: -1,
  soundStates: [],
  trainerBarsIndex: 3,
  trainerBpmIndex: 1,
  trainerSecondsIndex: 0,
  trainerSecondsBpmIndex: 1,
  trainerMode: "bars",
  trainerConfigured: false,
  trainerEnabled: false,
  barCount: 0,
  accentBarsIndex: ACCENT_BARS.indexOf(12),
  accentEnabled: false,
  accentConfigured: false,
  randomMutePercentIndex: 2,
  randomMuteGradual: false,
  randomMuteCountInEnabled: false,
  randomMuteCountInBarsIndex: 0,
  randomMuteEnabled: false,
  randomMuteConfigured: false,
};

const ui = createUI({
  tempoValue,
  tempoInput,
  tempoWheelValue,
  togglePlay,
  subdivisionSelect,
  subdivisionGrid,
});

const audio = createMetronomeAudio();
let trainerIntervalId: ReturnType<typeof setInterval> | null = null;

function totalSubdivisions() {
  return (
    TIME_SIGNATURES[state.timeSignatureNumeratorIndex].beatsPerBar *
    SUBDIVISIONS[state.subdivisionIndex].perBeat
  );
}

function initSoundStates() {
  const total = totalSubdivisions();
  const perBeat = SUBDIVISIONS[state.subdivisionIndex].perBeat;
  const nextStates: SoundState[] = [];
  for (let i = 0; i < total; i += 1) {
    nextStates.push("B");
  }
  state.soundStates = nextStates;
}

function render() {
  ui.setTempoDisplay(state.bpm);
  ui.setPlayState(state.isPlaying);
  const trainerBars = TRAINER_BARS[state.trainerBarsIndex];
  const trainerStep = TRAINER_BPM_STEPS[state.trainerBpmIndex];
  trainerDisclosure.textContent = state.trainerConfigured
    ? state.trainerMode === "seconds"
      ? `Trainer: +${TRAINER_BPM_STEPS[state.trainerSecondsBpmIndex]} BPM every ${
          TRAINER_SECONDS[state.trainerSecondsIndex]
        } seconds`
      : `Trainer: +${trainerStep} BPM every ${trainerBars} bars`
    : "Trainer";
  trainerDisclosure.classList.toggle("is-enabled", state.trainerEnabled);
  trainerDisclosure.classList.toggle("is-disabled", !state.trainerEnabled);
  const randomMutePercent = RANDOM_MUTE_PERCENTS[state.randomMutePercentIndex];
  randomMuteDisclosure.textContent = state.randomMuteConfigured
    ? `Random mute: ${randomMutePercent}%`
    : "Random mute";
  randomMuteDisclosure.classList.toggle("is-enabled", state.randomMuteEnabled);
  randomMuteDisclosure.classList.toggle("is-disabled", !state.randomMuteEnabled);
  updateRandomMuteVisual();
  randomMuteGradualToggle.checked = state.randomMuteGradual;
  randomMuteCountInToggle.checked = state.randomMuteCountInEnabled;
  randomMuteCountInBarsSelect.disabled = !state.randomMuteCountInEnabled;
  const accentBars = ACCENT_BARS[state.accentBarsIndex];
  accentDisclosure.textContent = state.accentConfigured
    ? `Accent every ${accentBars} bars`
    : "Accent";
  accentDisclosure.classList.toggle("is-enabled", state.accentEnabled);
  accentDisclosure.classList.toggle("is-disabled", !state.accentEnabled);
  updateWheelDisplay();
  ui.renderSubdivisionGrid({
    totalSubdivisions: totalSubdivisions(),
    subdivisionsPerBeat: SUBDIVISIONS[state.subdivisionIndex].perBeat,
    soundStates: state.soundStates,
    activeIndex: state.activeIndex,
  });
}

function updateAudioSettings() {
  const timeSignature = TIME_SIGNATURES[state.timeSignatureNumeratorIndex];
  const subdivision = SUBDIVISIONS[state.subdivisionIndex];

  audio.update({
    bpm: state.bpm,
    beatsPerBar: timeSignature.beatsPerBar,
    subdivisionsPerBeat: subdivision.perBeat,
    soundProfile: SOUND_PROFILES[state.soundProfileIndex],
  });
}

function randomMuteRampProgress() {
  if (!state.randomMuteEnabled || !state.randomMuteGradual) {
    return null;
  }
  let barsElapsed = state.barCount;
  if (state.randomMuteCountInEnabled) {
    const countInBars = RANDOM_MUTE_COUNTIN_BARS[state.randomMuteCountInBarsIndex];
    if (barsElapsed <= countInBars) {
      return 0;
    }
    barsElapsed -= countInBars;
  }
  return Math.min(1, Math.max(0, barsElapsed / RANDOM_MUTE_RAMP_BARS));
}

function updateRandomMuteVisual() {
  const progress = randomMuteRampProgress();
  if (progress === null) {
    randomMuteDisclosure.classList.remove("is-ramping");
    randomMuteDisclosure.style.removeProperty("--fill");
    return;
  }
  randomMuteDisclosure.classList.add("is-ramping");
  randomMuteDisclosure.style.setProperty("--fill", `${Math.round(progress * 100)}%`);
}

function currentRandomMuteProbability() {
  if (!state.randomMuteEnabled) {
    return 0;
  }
  const target = RANDOM_MUTE_PERCENTS[state.randomMutePercentIndex] / 100;
  let barsElapsed = state.barCount;
  if (state.randomMuteCountInEnabled) {
    const countInBars = RANDOM_MUTE_COUNTIN_BARS[state.randomMuteCountInBarsIndex];
    if (barsElapsed <= countInBars) {
      return 0;
    }
    barsElapsed -= countInBars;
  }
  if (state.randomMuteGradual) {
    const rampFactor = Math.min(1, Math.max(0, barsElapsed / RANDOM_MUTE_RAMP_BARS));
    return target * rampFactor;
  }
  return target;
}

function stopTrainerInterval() {
  if (trainerIntervalId) {
    clearInterval(trainerIntervalId);
    trainerIntervalId = null;
  }
}

function startTrainerInterval() {
  stopTrainerInterval();
  if (!state.isPlaying || !state.trainerEnabled || state.trainerMode !== "seconds") {
    return;
  }
  const intervalSeconds = TRAINER_SECONDS[state.trainerSecondsIndex];
  const increment = TRAINER_BPM_STEPS[state.trainerSecondsBpmIndex];
  trainerIntervalId = setInterval(() => {
    setTempo(state.bpm + increment);
  }, intervalSeconds * 1000);
}

async function startPlayback() {
  const timeSignature = TIME_SIGNATURES[state.timeSignatureNumeratorIndex];
  const subdivision = SUBDIVISIONS[state.subdivisionIndex];

  state.barCount = 0;
  startTrainerInterval();

  await audio.start({
    bpm: state.bpm,
    beatsPerBar: timeSignature.beatsPerBar,
    subdivisionsPerBeat: subdivision.perBeat,
    soundProfile: SOUND_PROFILES[state.soundProfileIndex],
    onTick: (tickIndex: number) => {
      state.activeIndex = tickIndex;
      ui.setActiveSubdivision(tickIndex);
      if (tickIndex === 0) {
        if (state.trainerEnabled) {
          if (state.trainerMode === "bars") {
            const barsInterval = TRAINER_BARS[state.trainerBarsIndex];
            if (state.barCount % barsInterval === 0) {
              const increment = TRAINER_BPM_STEPS[state.trainerBpmIndex];
              setTempo(state.bpm + increment);
            }
          }
        }
        updateRandomMuteVisual();
      }
    },
    getSoundState: (tickIndex: number) => {
      const baseState = state.soundStates[tickIndex] || "mute";
      let resolvedState = baseState;
      if (tickIndex === 0) {
        state.barCount += 1;
        if (state.accentEnabled && baseState !== "A") {
          const accentEvery = ACCENT_BARS[state.accentBarsIndex];
          const shouldAccent = (state.barCount - 1) % accentEvery === 0;
          resolvedState = shouldAccent ? "A" : baseState;
        }
      }
      if (resolvedState === "mute") {
        return "mute";
      }
      const probability = currentRandomMuteProbability();
      if (probability > 0 && Math.random() < probability) {
        return "mute";
      }
      return resolvedState;
    },
  });
}

async function togglePlayback() {
  if (state.isPlaying) {
    state.isPlaying = false;
    audio.stop();
    stopTrainerInterval();
    state.activeIndex = -1;
    state.barCount = 0;
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
  ui.populateSelect(timeSignatureNumeratorSelect, TIME_SIGNATURES);
  ui.populateSelect(
    timeSignatureDenominatorSelect,
    DENOMINATORS.map((value) => ({ label: String(value) })),
  );
  ui.populateSelect(subdivisionSelect, SUBDIVISIONS);
  ui.populateSelect(soundProfileSelect, SOUND_PROFILES);
  ui.populateSelect(
    trainerBarsSelect,
    TRAINER_BARS.map((value) => ({ label: String(value) })),
  );
  ui.populateSelect(
    trainerBpmSelect,
    TRAINER_BPM_STEPS.map((value) => ({ label: String(value) })),
  );
  ui.populateSelect(
    trainerSecondsSelect,
    TRAINER_SECONDS.map((value) => ({ label: String(value) })),
  );
  ui.populateSelect(
    trainerSecondsBpmSelect,
    TRAINER_BPM_STEPS.map((value) => ({ label: String(value) })),
  );
  ui.populateSelect(
    randomMutePercentSelect,
    RANDOM_MUTE_PERCENTS.map((value) => ({ label: String(value) })),
  );
  ui.populateSelect(
    randomMuteCountInBarsSelect,
    RANDOM_MUTE_COUNTIN_BARS.map((value) => ({ label: String(value) })),
  );
  ui.populateSelect(
    accentBarsSelect,
    ACCENT_BARS.map((value) => ({ label: String(value) })),
  );
  ui.setSelectValue(timeSignatureNumeratorSelect, state.timeSignatureNumeratorIndex);
  ui.setSelectValue(timeSignatureDenominatorSelect, state.timeSignatureDenominatorIndex);
  ui.setSelectValue(subdivisionSelect, state.subdivisionIndex);
  ui.setSelectValue(soundProfileSelect, state.soundProfileIndex);
  ui.setSelectValue(trainerBarsSelect, state.trainerBarsIndex);
  ui.setSelectValue(trainerBpmSelect, state.trainerBpmIndex);
  ui.setSelectValue(trainerSecondsSelect, state.trainerSecondsIndex);
  ui.setSelectValue(trainerSecondsBpmSelect, state.trainerSecondsBpmIndex);
  ui.setSelectValue(randomMutePercentSelect, state.randomMutePercentIndex);
  ui.setSelectValue(randomMuteCountInBarsSelect, state.randomMuteCountInBarsIndex);
  ui.setSelectValue(accentBarsSelect, state.accentBarsIndex);

  const unlockAudio = () => {
    void audio.resume();
  };
  ["pointerdown", "touchstart", "mousedown"].forEach((eventName) => {
    document.addEventListener(eventName, unlockAudio, {
      once: true,
      passive: true,
    });
  });

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

  trainerDisclosure.addEventListener("click", () => {
    if (state.trainerEnabled) {
      state.trainerEnabled = false;
      trainerPanel.classList.remove("is-open");
      trainerDisclosure.setAttribute("aria-expanded", "false");
      stopTrainerInterval();
      render();
      return;
    }
    state.trainerEnabled = true;
    state.trainerConfigured = true;
    trainerPanel.classList.add("is-open");
    trainerDisclosure.setAttribute("aria-expanded", "true");
    startTrainerInterval();
    render();
  });

  randomMuteDisclosure.addEventListener("click", () => {
    if (state.randomMuteEnabled) {
      state.randomMuteEnabled = false;
      randomMutePanel.classList.remove("is-open");
      randomMuteDisclosure.setAttribute("aria-expanded", "false");
      render();
      return;
    }
    state.randomMuteEnabled = true;
    state.randomMuteConfigured = true;
    randomMutePanel.classList.add("is-open");
    randomMuteDisclosure.setAttribute("aria-expanded", "true");
    render();
  });

  accentDisclosure.addEventListener("click", () => {
    if (state.accentEnabled) {
      state.accentEnabled = false;
      accentPanel.classList.remove("is-open");
      accentDisclosure.setAttribute("aria-expanded", "false");
      render();
      return;
    }
    state.accentEnabled = true;
    state.accentConfigured = true;
    accentPanel.classList.add("is-open");
    accentDisclosure.setAttribute("aria-expanded", "true");
    render();
  });

  document.addEventListener("click", (event: MouseEvent) => {
    if (!accentPanel.classList.contains("is-open")) {
      return;
    }
    const target = event.target as Node | null;
    if (!target) {
      return;
    }
    if (accentPanel.contains(target) || accentDisclosure.contains(target)) {
      return;
    }
    accentPanel.classList.remove("is-open");
    accentDisclosure.setAttribute("aria-expanded", "false");
  });

  document.addEventListener("click", (event: MouseEvent) => {
    if (!trainerPanel.classList.contains("is-open")) {
      return;
    }
    const target = event.target as Node | null;
    if (!target) {
      return;
    }
    if (trainerPanel.contains(target) || trainerDisclosure.contains(target)) {
      return;
    }
    trainerPanel.classList.remove("is-open");
    trainerDisclosure.setAttribute("aria-expanded", "false");
  });

  document.addEventListener("click", (event: MouseEvent) => {
    if (!randomMutePanel.classList.contains("is-open")) {
      return;
    }
    const target = event.target as Node | null;
    if (!target) {
      return;
    }
    if (randomMutePanel.contains(target) || randomMuteDisclosure.contains(target)) {
      return;
    }
    randomMutePanel.classList.remove("is-open");
    randomMuteDisclosure.setAttribute("aria-expanded", "false");
  });

  timeSignatureNumeratorSelect.addEventListener("change", (event: Event) => {
    const target = event.target as HTMLSelectElement | null;
    if (!target) {
      return;
    }
    state.timeSignatureNumeratorIndex = Number(target.value);
    initSoundStates();
    updateAudioSettings();
    render();
  });

  timeSignatureDenominatorSelect.addEventListener("change", (event: Event) => {
    const target = event.target as HTMLSelectElement | null;
    if (!target) {
      return;
    }
    state.timeSignatureDenominatorIndex = Number(target.value);
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

  trainerBarsSelect.addEventListener("change", (event: Event) => {
    const target = event.target as HTMLSelectElement | null;
    if (!target) {
      return;
    }
    state.trainerBarsIndex = Number(target.value);
    state.trainerMode = "bars";
    state.trainerConfigured = true;
    stopTrainerInterval();
    render();
  });

  trainerBpmSelect.addEventListener("change", (event: Event) => {
    const target = event.target as HTMLSelectElement | null;
    if (!target) {
      return;
    }
    state.trainerBpmIndex = Number(target.value);
    state.trainerMode = "bars";
    state.trainerConfigured = true;
    stopTrainerInterval();
    render();
  });

  trainerSecondsSelect.addEventListener("change", (event: Event) => {
    const target = event.target as HTMLSelectElement | null;
    if (!target) {
      return;
    }
    state.trainerSecondsIndex = Number(target.value);
    state.trainerMode = "seconds";
    state.trainerConfigured = true;
    startTrainerInterval();
    render();
  });

  trainerSecondsBpmSelect.addEventListener("change", (event: Event) => {
    const target = event.target as HTMLSelectElement | null;
    if (!target) {
      return;
    }
    state.trainerSecondsBpmIndex = Number(target.value);
    state.trainerMode = "seconds";
    state.trainerConfigured = true;
    startTrainerInterval();
    render();
  });

  randomMutePercentSelect.addEventListener("change", (event: Event) => {
    const target = event.target as HTMLSelectElement | null;
    if (!target) {
      return;
    }
    state.randomMutePercentIndex = Number(target.value);
    state.randomMuteConfigured = true;
    render();
  });

  randomMuteGradualToggle.addEventListener("change", () => {
    state.randomMuteGradual = randomMuteGradualToggle.checked;
    state.randomMuteConfigured = true;
    render();
  });

  randomMuteCountInToggle.addEventListener("change", () => {
    state.randomMuteCountInEnabled = randomMuteCountInToggle.checked;
    state.randomMuteConfigured = true;
    render();
  });

  randomMuteCountInBarsSelect.addEventListener("change", (event: Event) => {
    const target = event.target as HTMLSelectElement | null;
    if (!target) {
      return;
    }
    state.randomMuteCountInBarsIndex = Number(target.value);
    state.randomMuteConfigured = true;
    render();
  });

  accentBarsSelect.addEventListener("change", (event: Event) => {
    const target = event.target as HTMLSelectElement | null;
    if (!target) {
      return;
    }
    state.accentBarsIndex = Number(target.value);
    state.accentConfigured = true;
    render();
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
