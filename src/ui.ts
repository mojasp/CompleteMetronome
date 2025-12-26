import type { SoundState } from "./types.js";

const SOUND_STATES: SoundState[] = ["A", "B", "mute"];

type UIElements = {
  tempoValue: HTMLElement;
  tempoInput: HTMLInputElement | null;
  tempoWheelValue: HTMLElement | null;
  togglePlay: HTMLButtonElement;
  subdivisionSelect: HTMLSelectElement;
  subdivisionGrid: HTMLDivElement;
  beatGrid: HTMLDivElement;
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
  togglePlay,
  subdivisionSelect,
  subdivisionGrid,
  beatGrid,
}: UIElements) {
  let subdivisionCells: HTMLButtonElement[] = [];
  let beatCells: HTMLDivElement[] = [];
  let lastActiveIndex = -1;

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
    if (subdivisionCells.length !== totalSubdivisions) {
      subdivisionGrid.innerHTML = "";
      subdivisionCells = [];
      for (let i = 0; i < totalSubdivisions; i += 1) {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "subdivision-cell";
        cell.dataset.index = String(i);
        cell.textContent = "";
        subdivisionGrid.appendChild(cell);
        subdivisionCells.push(cell);
      }
    }

    subdivisionCells.forEach((cell, i) => {
      const soundState = soundStates[i] ?? "mute";
      const ariaLabel = soundState === "A" ? "Accent" : soundState === "B" ? "Regular" : "Mute";
      cell.setAttribute("aria-label", ariaLabel);
      cell.classList.toggle("sound-a", soundState === "A");
      cell.classList.toggle("sound-b", soundState === "B");
      cell.classList.toggle("sound-mute", soundState === "mute");
      cell.classList.toggle("is-beat-boundary", i % subdivisionsPerBeat === 0);
      cell.classList.toggle("is-active", i === activeIndex);
    });

    lastActiveIndex = activeIndex;
  }

  function renderBeatGrid({ totalBeats, activeIndex }: { totalBeats: number; activeIndex: number }) {
    if (beatCells.length !== totalBeats) {
      beatGrid.innerHTML = "";
      beatCells = [];
      for (let i = 0; i < totalBeats; i += 1) {
        const cell = document.createElement("div");
        cell.className = "beat-cell";
        beatGrid.appendChild(cell);
        beatCells.push(cell);
      }
    }

    beatCells.forEach((cell, i) => {
      cell.classList.toggle("is-active", i === activeIndex);
    });
  }

  function setBeatGridVisible(visible: boolean) {
    beatGrid.classList.toggle("is-hidden", !visible);
  }

  function nextSoundState(current: SoundState) {
    const idx = SOUND_STATES.indexOf(current);
    return SOUND_STATES[(idx + 1) % SOUND_STATES.length];
  }

  function setActiveSubdivision(activeIndex: number) {
    if (!subdivisionCells.length || activeIndex === lastActiveIndex) {
      return;
    }
    const prev = subdivisionCells[lastActiveIndex];
    if (prev) {
      prev.classList.remove("is-active");
    }
    const next = subdivisionCells[activeIndex];
    if (next) {
      next.classList.add("is-active");
    }
    lastActiveIndex = activeIndex;
  }

  function setActiveBeat(activeIndex: number) {
    if (!beatCells.length) {
      return;
    }
    beatCells.forEach((cell, i) => {
      cell.classList.toggle("is-active", i === activeIndex);
    });
  }

  return {
    setPlayState,
    setTempoDisplay,
    populateSelect,
    setSelectValue,
    renderSubdivisionGrid,
    renderBeatGrid,
    setBeatGridVisible,
    nextSoundState,
    setActiveSubdivision,
    setActiveBeat,
  };
}
