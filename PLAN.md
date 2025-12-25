# Metronome Web App Plan

## Goals
- Build a local, browser-based metronome in plain JavaScript with minimal dependencies.
- Keep the architecture PWA-ready for later Android publishing (offline-capable, installable).

## Core Features
- Tempo control: change BPM via scroll/trackpad and via keybindings.
- Subdivisions: support quarter, eighth, sixteenth, triplets, etc.
- Time signatures / bar types: e.g., 4/4, 3/4, 6/8 with configurable accents.
- Visual playback: highlight the currently active subdivision while playing.
- Per-subdivision sound state: click a subdivision to cycle sound A → sound B → muted.

## UX & Interaction
- Primary controls: start/stop, BPM display with step buttons, subdivision selector, time signature selector.
- Scroll interaction: hover BPM control and scroll to adjust.
- Keybindings:
  - Space: start/stop
  - j/k: BPM −/+
  - J/K (shifted): BPM −/+ by 5
- Subdivision selector: menu/dropdown (no keybinding needed).
- Playback display: single-bar grid with clickable subdivisions; highlight current subdivision; beat boundaries grouped.

## Audio Engine
- Use Web Audio API.
- Generate two simple sounds (e.g., sine click vs. square click) to avoid asset files.
- Scheduler: look-ahead timer with precise scheduling to avoid drift.
- Each scheduled tick picks sound A/B/mute based on subdivision state.

## Data Model
- Tempo (BPM), time signature (beats per bar, note value).
- Subdivision count per beat.
- Per-subdivision sound state array for current bar.
- Playback state and current tick index.

## PWA Readiness
- App shell structure with static assets.
- Manifest and service worker (later phase).
- Avoid external CDNs to simplify offline support.

## Project Structure (proposed)
- `index.html` (UI layout)
- `styles.css` (layout + animation)
- `src/app.js` (state + UI + input)
- `src/audio.js` (audio scheduling)
- `src/ui.js` (render + updates)

## Milestones
1. Skeleton UI with controls and subdivision grid.
2. Web Audio scheduler with precise timing.
3. Interaction: scroll/keybindings, per-subdivision cycling.
4. Visual highlight synced to audio.
5. PWA-ready structure (manifest + service worker) if desired.
