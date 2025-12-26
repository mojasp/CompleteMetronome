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
const soundProfilePicker = getElement<HTMLDivElement>("sound-profile-picker");
const soundProfileTrigger = getElement<HTMLButtonElement>("sound-profile-trigger");
const volumeInput = getElement<HTMLInputElement>("volume");
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
const randomMuteRampInput = getElement<HTMLInputElement>("random-mute-ramp");
const randomMuteRampValue = getElement<HTMLElement>("random-mute-ramp-value");
const randomMuteCountInToggle = getElement<HTMLInputElement>("random-mute-countin");
const randomMuteCountInBarsSelect = getElement<HTMLSelectElement>("random-mute-countin-bars");
const accentDisclosure = getElement<HTMLButtonElement>("accent-disclosure");
const accentPanel = getElement<HTMLDivElement>("accent-panel");
const accentBarsSelect = getElement<HTMLSelectElement>("accent-bars");
const accentWheelField = getElement<HTMLDivElement>("accent-wheel-field");
const accentBarsTrigger = getElement<HTMLButtonElement>("accent-bars-trigger");
const accentBarsPicker = getElement<HTMLDivElement>("accent-bars-picker");
const accentHost = getElement<HTMLDivElement>("accent-host");
const accentBlock = getElement<HTMLDivElement>("accent-block");
const selectors = getElement<HTMLDivElement>("selectors");
const themeToggle = getElement<HTMLButtonElement>("theme-toggle");
const timeSignatureNumeratorSelect = getElement<HTMLSelectElement>("time-signature-numerator");
const timeSignatureDenominatorSelect = getElement<HTMLSelectElement>("time-signature-denominator");
const numeratorPicker = getElement<HTMLDivElement>("numerator-picker");
const denominatorPicker = getElement<HTMLDivElement>("denominator-picker");
const subdivisionSelect = getElement<HTMLSelectElement>("subdivision");
const subdivisionPicker = getElement<HTMLDivElement>("subdivision-picker");
const numeratorTrigger = getElement<HTMLButtonElement>("numerator-trigger");
const denominatorTrigger = getElement<HTMLButtonElement>("denominator-trigger");
const subdivisionTrigger = getElement<HTMLButtonElement>("subdivision-trigger");
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

const MAX_NUMERATOR = 16;
const NUMERATORS = Array.from({ length: MAX_NUMERATOR - 1 }, (_, index) => index + 2);
const DENOMINATORS = [2, 4, 8, 16];
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
    label: "Click",
    accent: { type: "square", frequency: 2100, volume: 0.22, decay: 0.025, duration: 0.04 },
    regular: { type: "square", frequency: 2000, volume: 0.2, decay: 0.025, duration: 0.04 },
  },
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
const TRAINER_BARS = Array.from({ length: 12 }, (_, index) => index + 1);
const TRAINER_BPM_STEPS = [1, 2, 3, 4, 5, 8, 10];
const TRAINER_SECONDS = Array.from({ length: 36 }, (_, index) => (index + 1) * 10);
const ACCENT_BARS = Array.from({ length: 63 }, (_, index) => index + 2);
const RANDOM_MUTE_PERCENTS = Array.from({ length: 21 }, (_, index) => index * 5);
const RANDOM_MUTE_COUNTIN_BARS = Array.from({ length: 65 }, (_, index) => index);
const BPM_PER_DEGREE = 0.4;
const VOLUME_MIN = 0;
const VOLUME_MAX = 1000;
const VOLUME_DEFAULT = 500;
const VOLUME_MIDPOINT = 500;
const VOLUME_MAX_GAIN = 30;
const THEME_PREFERENCE_KEY = "theme-preference";

type MetronomeState = {
  bpm: number;
  isPlaying: boolean;
  timeSignatureNumeratorIndex: number;
  timeSignatureDenominatorIndex: number;
  subdivisionIndex: number;
  soundProfileIndex: number;
  activeIndex: number;
  soundStates: SoundState[];
  volumeControl: number;
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
  randomMuteRampSpeed: number;
  randomMuteCountInEnabled: boolean;
  randomMuteCountInBarsIndex: number;
  randomMuteEnabled: boolean;
  randomMuteConfigured: boolean;
};

type ThemePreference = "system" | "light" | "dark";

const state: MetronomeState = {
  bpm: 120,
  isPlaying: false,
  timeSignatureNumeratorIndex: NUMERATORS.indexOf(4),
  timeSignatureDenominatorIndex: DENOMINATORS.indexOf(4),
  subdivisionIndex: 0,
  soundProfileIndex: 0,
  activeIndex: -1,
  soundStates: [],
  volumeControl: VOLUME_DEFAULT,
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
  randomMutePercentIndex: RANDOM_MUTE_PERCENTS.indexOf(35),
  randomMuteRampSpeed: 100,
  randomMuteCountInEnabled: true,
  randomMuteCountInBarsIndex: RANDOM_MUTE_COUNTIN_BARS.indexOf(2),
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
let wheelPickers: Array<{
  sync: (shouldScroll: boolean) => void;
  resize: () => void;
  isScrolling: () => boolean;
  close: () => void;
  isOpen: () => boolean;
  contains: (target: Node) => boolean;
}> = [];
let accentWheelPicker: ReturnType<typeof createWheelPicker> | null = null;

function totalSubdivisions() {
  return (
    TIME_SIGNATURES[state.timeSignatureNumeratorIndex].beatsPerBar *
    SUBDIVISIONS[state.subdivisionIndex].perBeat
  );
}

function initSoundStates() {
  const total = totalSubdivisions();
  const nextStates: SoundState[] = [];
  for (let i = 0; i < total; i += 1) {
    nextStates.push("B");
  }
  state.soundStates = nextStates;
}

function render() {
  ui.setTempoDisplay(state.bpm);
  ui.setPlayState(state.isPlaying);
  wheelPickers.forEach((picker) => picker.sync(!picker.isScrolling()));
  if (accentWheelPicker) {
    accentWheelPicker.sync(!accentWheelPicker.isScrolling());
  }
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
  const rampBars = rampBarsFromSpeed(state.randomMuteRampSpeed);
  randomMuteRampInput.value = String(state.randomMuteRampSpeed);
  randomMuteRampValue.textContent = rampBars <= 0 ? "Immediate" : `${rampBars} bars`;
  randomMuteCountInToggle.checked = state.randomMuteCountInEnabled;
  randomMuteCountInBarsSelect.disabled = !state.randomMuteCountInEnabled;
  volumeInput.value = String(state.volumeControl);
  const accentBars = ACCENT_BARS[state.accentBarsIndex];
  accentDisclosure.textContent = state.accentConfigured
    ? `Accent every ${accentBars} bars`
    : "None";
  accentDisclosure.classList.toggle("is-enabled", state.accentEnabled);
  accentDisclosure.classList.toggle("is-disabled", !state.accentEnabled);
  updateWheelDisplay();
  layoutGridColumns();
  ui.renderSubdivisionGrid({
    totalSubdivisions: totalSubdivisions(),
    subdivisionsPerBeat: SUBDIVISIONS[state.subdivisionIndex].perBeat,
    soundStates: state.soundStates,
    activeIndex: state.activeIndex,
  });
}

function setTimeSignatureNumeratorIndex(nextIndex: number, syncPicker = true) {
  const clamped = Math.max(0, Math.min(TIME_SIGNATURES.length - 1, nextIndex));
  state.timeSignatureNumeratorIndex = clamped;
  ui.setSelectValue(timeSignatureNumeratorSelect, clamped);
  initSoundStates();
  updateAudioSettings();
  if (syncPicker) {
    wheelPickers.forEach((picker) => picker.sync(!picker.isScrolling()));
  }
  render();
}

function setTimeSignatureDenominatorIndex(nextIndex: number, syncPicker = true) {
  const clamped = Math.max(0, Math.min(DENOMINATORS.length - 1, nextIndex));
  state.timeSignatureDenominatorIndex = clamped;
  ui.setSelectValue(timeSignatureDenominatorSelect, clamped);
  initSoundStates();
  updateAudioSettings();
  if (syncPicker) {
    wheelPickers.forEach((picker) => picker.sync(!picker.isScrolling()));
  }
  render();
}

function setSubdivisionIndex(nextIndex: number, syncPicker = true) {
  const clamped = Math.max(0, Math.min(SUBDIVISIONS.length - 1, nextIndex));
  state.subdivisionIndex = clamped;
  ui.setSelectValue(subdivisionSelect, clamped);
  initSoundStates();
  updateAudioSettings();
  if (syncPicker) {
    wheelPickers.forEach((picker) => picker.sync(!picker.isScrolling()));
  }
  render();
}

function setAccentBarsIndex(nextIndex: number, syncPicker = true) {
  const clamped = Math.max(0, Math.min(ACCENT_BARS.length - 1, nextIndex));
  state.accentBarsIndex = clamped;
  state.accentConfigured = true;
  ui.setSelectValue(accentBarsSelect, clamped);
  if (syncPicker) {
    wheelPickers.forEach((picker) => picker.sync(!picker.isScrolling()));
  }
  render();
}

function createWheelPicker({
  field,
  trigger,
  picker,
  options,
  getIndex,
  setIndex,
  bindTrigger = true,
  onSelect,
}: {
  field: HTMLDivElement;
  trigger: HTMLButtonElement;
  picker: HTMLDivElement;
  options: Array<{ label: string }>;
  getIndex: () => number;
  setIndex: (index: number, syncPicker?: boolean) => void;
  bindTrigger?: boolean;
  onSelect?: () => void;
}) {
  let items: HTMLButtonElement[] = [];
  let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
  let isScrolling = false;
  let spacerTop: HTMLDivElement | null = null;
  let spacerBottom: HTMLDivElement | null = null;
  let isOpen = false;
  let suppressScroll = false;

  const scrollToIndex = (index: number) => {
    const item = items[index];
    if (!item) {
      return;
    }
    const target = item.offsetTop + item.offsetHeight / 2 - picker.clientHeight / 2;
    picker.scrollTop = target;
  };

  const sync = (shouldScroll: boolean) => {
    if (!items.length) {
      return;
    }
    const activeIndex = getIndex();
    trigger.textContent = options[activeIndex]?.label ?? "";
    items.forEach((item, index) => {
      const isActive = index === activeIndex;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    if (!shouldScroll) {
      return;
    }
    scrollToIndex(activeIndex);
  };

  const resize = () => {
    if (!spacerTop || !spacerBottom || !items.length) {
      return;
    }
    const itemHeight = items[0].getBoundingClientRect().height;
    const pickerHeight = picker.getBoundingClientRect().height;
    const spacerHeight = Math.max(0, (pickerHeight - itemHeight) / 2);
    spacerTop.style.height = `${spacerHeight}px`;
    spacerBottom.style.height = `${spacerHeight}px`;
  };

  picker.innerHTML = "";
  spacerTop = document.createElement("div");
  spacerTop.className = "wheel-picker-spacer";
  picker.appendChild(spacerTop);

  items = options.map((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "wheel-picker-item";
    button.textContent = option.label;
    button.dataset.index = String(index);
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", "false");
    picker.appendChild(button);
    return button;
  });

  spacerBottom = document.createElement("div");
  spacerBottom.className = "wheel-picker-spacer";
  picker.appendChild(spacerBottom);

  requestAnimationFrame(() => {
    resize();
    scrollToIndex(getIndex());
    sync(false);
  });

  picker.addEventListener("click", (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }
    const index = Number(target.dataset.index);
    if (!Number.isFinite(index)) {
      return;
    }
    suppressScroll = true;
    setIndex(index);
    onSelect?.();
    close();
  });

  let touchStartY = 0;
  let touchMoved = false;
  let touchTarget: HTMLButtonElement | null = null;

  picker.addEventListener(
    "touchstart",
    (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) {
        return;
      }
      touchStartY = touch.clientY;
      touchMoved = false;
      const target = event.target;
      touchTarget = target instanceof HTMLButtonElement ? target : null;
    },
    { passive: true },
  );

  picker.addEventListener(
    "touchmove",
    (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) {
        return;
      }
      if (Math.abs(touch.clientY - touchStartY) > 6) {
        touchMoved = true;
        touchTarget = null;
      }
    },
    { passive: true },
  );

  picker.addEventListener(
    "touchend",
    () => {
      if (touchMoved || !touchTarget) {
        return;
      }
      const index = Number(touchTarget.dataset.index);
    if (!Number.isFinite(index)) {
      return;
    }
    suppressScroll = true;
    setIndex(index);
    onSelect?.();
    close();
  },
    { passive: true },
  );

  picker.addEventListener("scroll", () => {
    if (suppressScroll) {
      suppressScroll = false;
      return;
    }
    isScrolling = true;
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
    scrollTimeout = setTimeout(() => {
      isScrolling = false;
      sync(true);
    }, 120);

    const center = picker.scrollTop + picker.clientHeight / 2;
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    items.forEach((item, index) => {
      const itemCenter = item.offsetTop + item.offsetHeight / 2;
      const distance = Math.abs(center - itemCenter);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    if (bestIndex !== getIndex()) {
      setIndex(bestIndex, false);
    }
  });

  picker.addEventListener("dblclick", (event) => {
    event.preventDefault();
  });

  let lastTouchEnd = 0;
  picker.addEventListener(
    "touchend",
    (event: TouchEvent) => {
      const now = performance.now();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    },
    { passive: false },
  );

  const open = () => {
    isOpen = true;
    field.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
    requestAnimationFrame(() => {
      resize();
      sync(true);
    });
  };

  const close = () => {
    isOpen = false;
    field.classList.remove("is-open");
    trigger.setAttribute("aria-expanded", "false");
  };

  if (bindTrigger) {
    trigger.addEventListener("click", () => {
      if (isOpen) {
        close();
        return;
      }
      wheelPickers.forEach((entry) => entry.close());
      open();
    });
  }

  return {
    sync,
    resize,
    isScrolling: () => isScrolling,
    close,
    open,
    isOpen: () => isOpen,
    contains: (target: Node) => field.contains(target),
  };
}

function updateAudioSettings() {
  const timeSignature = TIME_SIGNATURES[state.timeSignatureNumeratorIndex];
  const subdivision = SUBDIVISIONS[state.subdivisionIndex];

  audio.update({
    bpm: state.bpm,
    beatsPerBar: timeSignature.beatsPerBar,
    subdivisionsPerBeat: subdivision.perBeat,
    soundProfile: SOUND_PROFILES[state.soundProfileIndex],
    volume: volumeFromControl(state.volumeControl),
  });
}

function randomMuteRampProgress() {
  if (!state.randomMuteEnabled) {
    return null;
  }
  const rampBars = rampBarsFromSpeed(state.randomMuteRampSpeed);
  if (rampBars <= 0) {
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
  return Math.min(1, Math.max(0, barsElapsed / rampBars));
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
  const rampBars = rampBarsFromSpeed(state.randomMuteRampSpeed);
  if (rampBars <= 0) {
    return target;
  }
  const rampFactor = Math.min(1, Math.max(0, barsElapsed / rampBars));
  return target * rampFactor;
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
    volume: volumeFromControl(state.volumeControl),
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

function volumeFromControl(value: number) {
  const clamped = Math.min(VOLUME_MAX, Math.max(VOLUME_MIN, value));
  const normalized = (clamped - VOLUME_MIDPOINT) / VOLUME_MIDPOINT;
  return Math.pow(VOLUME_MAX_GAIN, normalized);
}

function setVolume(nextValue: number) {
  const clamped = Math.min(VOLUME_MAX, Math.max(VOLUME_MIN, Math.round(nextValue)));
  state.volumeControl = clamped;
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

let wheelAngle = 0;

function updateWheelDisplay() {
  tempoWheel.setAttribute("aria-valuenow", String(state.bpm));
  tempoWheel.style.setProperty("--wheel-angle", `${wheelAngle}deg`);
}

function rampBarsFromSpeed(speed: number) {
  const clamped = Math.min(100, Math.max(1, speed));
  if (clamped >= 100) {
    return 0;
  }
  const ratio = (100 - clamped) / 99;
  return Math.max(2, Math.round(ratio * 32));
}

function layoutGridColumns() {
  subdivisionGrid.style.setProperty("--grid-columns", String(totalSubdivisions()));
}

function readThemePreference(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_PREFERENCE_KEY);
    if (value === "light" || value === "dark" || value === "system") {
      return value;
    }
  } catch {
    // Ignore storage errors.
  }
  return "system";
}

function writeThemePreference(preference: ThemePreference) {
  try {
    localStorage.setItem(THEME_PREFERENCE_KEY, preference);
  } catch {
    // Ignore storage errors.
  }
}

function applyThemePreference(preference: ThemePreference) {
  if (preference === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", preference);
  }
}

function updateThemeToggleLabel(preference: ThemePreference) {
  themeToggle.textContent =
    preference === "system" ? "Auto" : preference === "dark" ? "Dark" : "Light";
}

function syncAccentPlacement() {
  const isMobile = window.matchMedia("(max-width: 720px)").matches;
  if (isMobile) {
    if (accentBlock.parentElement !== selectors) {
      selectors.appendChild(accentBlock);
    }
    accentBlock.classList.remove("is-inline");
  } else {
    if (accentBlock.parentElement !== accentHost) {
      accentHost.appendChild(accentBlock);
    }
    accentBlock.classList.add("is-inline");
  }
}

function bindClickOutsideClose(
  panel: HTMLElement,
  disclosure: HTMLElement,
  onClose?: () => void,
) {
  document.addEventListener("click", (event: MouseEvent) => {
    if (!panel.classList.contains("is-open")) {
      return;
    }
    const target = event.target as Node | null;
    if (!target) {
      return;
    }
    if (panel.contains(target) || disclosure.contains(target)) {
      return;
    }
    panel.classList.remove("is-open");
    disclosure.setAttribute("aria-expanded", "false");
    onClose?.();
  });
}

function closeAccentPanel() {
  accentPanel.classList.remove("is-open");
  accentDisclosure.setAttribute("aria-expanded", "false");
  accentWheelPicker?.close();
}

function openAccentPanel() {
  wheelPickers.forEach((picker) => picker.close());
  accentPanel.classList.add("is-open");
  accentDisclosure.setAttribute("aria-expanded", "true");
  accentWheelPicker?.open();
}

function attachWheelControls() {
  if (!window.matchMedia("(max-width: 720px)").matches) {
    return;
  }

  let isActive = false;
  let lastAngle = 0;
  let moved = false;
  let lastTapTime = 0;
  let tapIntervals: number[] = [];
  let lastTouchEnd = 0;
  const TAP_TIMEOUT_MS = 2000;
  const TAP_MIN_INTERVAL_MS = 120;
  const TAP_MAX_INTERVAL_MS = 2000;
  const MAX_TAP_SAMPLES = 5;

  const registerTap = () => {
    const now = performance.now();
    if (lastTapTime && now - lastTapTime > TAP_TIMEOUT_MS) {
      tapIntervals = [];
    }
    if (lastTapTime) {
      const interval = now - lastTapTime;
      if (interval >= TAP_MIN_INTERVAL_MS && interval <= TAP_MAX_INTERVAL_MS) {
        tapIntervals.push(interval);
        if (tapIntervals.length > MAX_TAP_SAMPLES) {
          tapIntervals.shift();
        }
        const average =
          tapIntervals.reduce((total, value) => total + value, 0) / tapIntervals.length;
        const bpm = Math.round(60000 / average);
        setTempo(bpm);
      }
    }
    lastTapTime = now;
  };

  const handlePointer = (event: PointerEvent) => {
    if (!isActive) {
      return;
    }
    event.preventDefault();
    const angle = angleFromPointer(event, tempoWheel);
    let delta = angle - lastAngle;
    if (delta > 180) {
      delta -= 360;
    } else if (delta < -180) {
      delta += 360;
    }
    if (Math.abs(delta) > 2) {
      moved = true;
    }
    lastAngle = angle;
    const bpmDelta = Math.round(delta * BPM_PER_DEGREE);
    if (bpmDelta !== 0) {
      moved = true;
      setTempo(state.bpm + bpmDelta);
      wheelAngle += bpmDelta / BPM_PER_DEGREE;
      updateWheelDisplay();
    }
  };

  const handlePointerUp = (event: PointerEvent) => {
    if (!isActive) {
      return;
    }
    tempoWheel.releasePointerCapture(event.pointerId);
    isActive = false;
    if (!moved) {
      registerTap();
    }
  };

  tempoWheel.addEventListener("pointerdown", (event: PointerEvent) => {
    isActive = true;
    tempoWheel.setPointerCapture(event.pointerId);
    lastAngle = angleFromPointer(event, tempoWheel);
    wheelAngle = (wheelAngle % 360 + 360) % 360;
    moved = false;
    handlePointer(event);
  });
  tempoWheel.addEventListener("pointermove", handlePointer);
  tempoWheel.addEventListener("pointerup", handlePointerUp);
  tempoWheel.addEventListener("pointercancel", handlePointerUp);
  tempoWheel.addEventListener("dblclick", (event) => {
    event.preventDefault();
  });
  tempoWheel.addEventListener(
    "touchend",
    (event: TouchEvent) => {
      const now = performance.now();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    },
    { passive: false },
  );
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

  wheelPickers = [
    createWheelPicker({
      field: numeratorPicker.parentElement as HTMLDivElement,
      trigger: numeratorTrigger,
      picker: numeratorPicker,
      options: TIME_SIGNATURES,
      getIndex: () => state.timeSignatureNumeratorIndex,
      setIndex: setTimeSignatureNumeratorIndex,
    }),
    createWheelPicker({
      field: denominatorPicker.parentElement as HTMLDivElement,
      trigger: denominatorTrigger,
      picker: denominatorPicker,
      options: DENOMINATORS.map((value) => ({ label: String(value) })),
      getIndex: () => state.timeSignatureDenominatorIndex,
      setIndex: setTimeSignatureDenominatorIndex,
    }),
    createWheelPicker({
      field: subdivisionPicker.parentElement as HTMLDivElement,
      trigger: subdivisionTrigger,
      picker: subdivisionPicker,
      options: SUBDIVISIONS,
      getIndex: () => state.subdivisionIndex,
      setIndex: setSubdivisionIndex,
    }),
    createWheelPicker({
      field: soundProfilePicker.parentElement as HTMLDivElement,
      trigger: soundProfileTrigger,
      picker: soundProfilePicker,
      options: SOUND_PROFILES,
      getIndex: () => state.soundProfileIndex,
      setIndex: setSoundProfile,
    }),
  ];

  accentWheelPicker = createWheelPicker({
    field: accentWheelField,
    trigger: accentBarsTrigger,
    picker: accentBarsPicker,
    options: ACCENT_BARS.map((value) => ({ label: String(value) })),
    getIndex: () => state.accentBarsIndex,
    setIndex: setAccentBarsIndex,
    bindTrigger: false,
    onSelect: () => {
      closeAccentPanel();
    },
  });
  window.addEventListener("resize", () => {
    wheelPickers.forEach((picker) => picker.resize());
    accentWheelPicker?.resize();
  });

  let themePreference = readThemePreference();
  applyThemePreference(themePreference);
  updateThemeToggleLabel(themePreference);

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
  prefersDark.addEventListener("change", () => {
    if (themePreference === "system") {
      updateThemeToggleLabel(themePreference);
    }
  });

  themeToggle.addEventListener("click", () => {
    const next =
      themePreference === "system"
        ? "dark"
        : themePreference === "dark"
          ? "light"
          : "system";
    themePreference = next;
    writeThemePreference(themePreference);
    applyThemePreference(themePreference);
    updateThemeToggleLabel(themePreference);
  });

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
  syncAccentPlacement();

  togglePlay.addEventListener("click", () => {
    void togglePlayback();
  });

  const accentMedia = window.matchMedia("(max-width: 720px)");
  accentMedia.addEventListener("change", syncAccentPlacement);

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
      closeAccentPanel();
      render();
      return;
    }
    state.accentEnabled = true;
    state.accentConfigured = true;
    openAccentPanel();
    render();
  });

  bindClickOutsideClose(accentPanel, accentDisclosure, () => {
    accentWheelPicker?.close();
  });
  bindClickOutsideClose(trainerPanel, trainerDisclosure);
  bindClickOutsideClose(randomMutePanel, randomMuteDisclosure);

  timeSignatureNumeratorSelect.addEventListener("change", (event: Event) => {
    const target = event.target as HTMLSelectElement | null;
    if (!target) {
      return;
    }
    setTimeSignatureNumeratorIndex(Number(target.value));
  });

  timeSignatureDenominatorSelect.addEventListener("change", (event: Event) => {
    const target = event.target as HTMLSelectElement | null;
    if (!target) {
      return;
    }
    setTimeSignatureDenominatorIndex(Number(target.value));
  });

  subdivisionSelect.addEventListener("change", (event: Event) => {
    const target = event.target as HTMLSelectElement | null;
    if (!target) {
      return;
    }
    setSubdivisionIndex(Number(target.value));
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

  randomMuteRampInput.addEventListener("input", () => {
    const nextValue = Number(randomMuteRampInput.value);
    if (!Number.isFinite(nextValue)) {
      return;
    }
    state.randomMuteRampSpeed = Math.min(100, Math.max(1, Math.round(nextValue)));
    state.randomMuteConfigured = true;
    render();
  });

  volumeInput.addEventListener("input", () => {
    const nextValue = Number(volumeInput.value);
    if (!Number.isFinite(nextValue)) {
      return;
    }
    setVolume(nextValue);
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
    setAccentBarsIndex(Number(target.value));
    closeAccentPanel();
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

  document.addEventListener("click", (event: MouseEvent) => {
    const target = event.target as Node | null;
    if (!target) {
      return;
    }
    wheelPickers.forEach((picker) => {
      if (!picker.isOpen()) {
        return;
      }
      if (picker.contains(target)) {
        return;
      }
      picker.close();
    });
  });
}

initSoundStates();
setupControls();
render();
