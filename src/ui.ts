import type { SoundState } from "./types.js";

const SOUND_STATES: SoundState[] = ["A", "B", "mute"];

type UIElements = {
  tempoValue: HTMLElement;
  tempoInput: HTMLInputElement | null;
  tempoWheelValue: HTMLElement | null;
  tempoUp: HTMLButtonElement;
  tempoDown: HTMLButtonElement;
  togglePlay: HTMLButtonElement;
  timeSignatureSelect: HTMLSelectElement;
  subdivisionSelect: HTMLSelectElement;
  subdivisionGrid: HTMLDivElement;
};

type SelectOption = { label: string };

type SubdivisionGridState = {
  totalSubdivisions: number;
  subdivisionsPerBeat: number;
  soundStates: SoundState[];
  activeIndex: number;
};

export function createUI({
  tempoValue,
  tempoInput,
  tempoWheelValue,
  tempoUp,
  tempoDown,
  togglePlay,
  timeSignatureSelect,
  subdivisionSelect,
  subdivisionGrid,
}: UIElements) {
  function setPlayState(isPlaying: boolean) {
    togglePlay.textContent = isPlaying ? "Stop" : "Start";
    togglePlay.classList.toggle("is-playing", isPlaying);
  }

  function setTempoDisplay(bpm: number) {
    tempoValue.textContent = String(bpm);
    if (tempoInput && document.activeElement !== tempoInput) {
      tempoInput.value = String(bpm);
    }
    if (tempoWheelValue) {
      tempoWheelValue.textContent = String(bpm);
    }
  }

  function populateSelect(select: HTMLSelectElement, options: SelectOption[]) {
    select.innerHTML = "";
    options.forEach((option, index) => {
      const el = document.createElement("option");
      el.value = String(index);
      el.textContent = option.label;
      select.appendChild(el);
    });
  }

  function setSelectValue(select: HTMLSelectElement, index: number) {
    select.value = String(index);
  }

  function renderSubdivisionGrid({
    totalSubdivisions,
    subdivisionsPerBeat,
    soundStates,
    activeIndex,
  }: SubdivisionGridState) {
    subdivisionGrid.innerHTML = "";
    for (let i = 0; i < totalSubdivisions; i += 1) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "subdivision-cell";
      cell.dataset.index = String(i);
      cell.textContent = "";
      const ariaLabel = soundStates[i] === "A" ? "Accent" : soundStates[i] === "B" ? "Regular" : "Mute";
      cell.setAttribute("aria-label", ariaLabel);
      cell.classList.add(soundStates[i] === "A" ? "sound-a" : "sound-b");
      if (soundStates[i] === "mute") {
        cell.classList.add("sound-mute");
      }
      if (i === activeIndex) {
        cell.classList.add("is-active");
      }
      if (i % subdivisionsPerBeat === 0) {
        cell.classList.add("is-beat-boundary");
      }
      subdivisionGrid.appendChild(cell);
    }
  }

  function nextSoundState(current: SoundState) {
    const idx = SOUND_STATES.indexOf(current);
    return SOUND_STATES[(idx + 1) % SOUND_STATES.length];
  }

  return {
    setPlayState,
    setTempoDisplay,
    populateSelect,
    setSelectValue,
    renderSubdivisionGrid,
    nextSoundState,
  };
}
