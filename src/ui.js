const SOUND_STATES = ["A", "B", "mute"];

export function createUI({
  tempoValue,
  tempoWheelValue,
  tempoUp,
  tempoDown,
  togglePlay,
  timeSignatureSelect,
  subdivisionSelect,
  subdivisionGrid,
}) {
  function setPlayState(isPlaying) {
    togglePlay.textContent = isPlaying ? "Stop" : "Start";
    togglePlay.classList.toggle("is-playing", isPlaying);
  }

  function setTempoDisplay(bpm) {
    tempoValue.textContent = String(bpm);
    if (tempoWheelValue) {
      tempoWheelValue.textContent = String(bpm);
    }
  }

  function populateSelect(select, options) {
    select.innerHTML = "";
    options.forEach((option, index) => {
      const el = document.createElement("option");
      el.value = String(index);
      el.textContent = option.label;
      select.appendChild(el);
    });
  }

  function setSelectValue(select, index) {
    select.value = String(index);
  }

  function renderSubdivisionGrid({
    totalSubdivisions,
    subdivisionsPerBeat,
    soundStates,
    activeIndex,
  }) {
    subdivisionGrid.innerHTML = "";
    for (let i = 0; i < totalSubdivisions; i += 1) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "subdivision-cell";
      cell.dataset.index = String(i);
      const label = soundStates[i] === "mute" ? "-" : soundStates[i];
      cell.textContent = label;
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

  function nextSoundState(current) {
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
