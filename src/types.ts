export type SoundState = "A" | "B" | "mute";

export type SoundProfileTone = {
  type?: OscillatorType;
  frequency?: number;
  volume?: number;
  decay?: number;
  duration?: number;
};

export type SoundProfile = {
  accent: SoundProfileTone;
  regular: SoundProfileTone;
};
